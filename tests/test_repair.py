import json
from pathlib import Path

from cellproof.formalize.claims_to_edges import Edge
from cellproof.formalize.edits import classify_edge
from cellproof.network.bnet import load_bnet
from cellproof.verify.accept import evaluate_rule
from cellproof.verify.repair import build_prompt, make_repair, normalise

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")
RULES = {**BASE, "ATR": "DNA_damage", "CHK1": "ATR"}
SUPPORT = {"pmcid": "PMC9", "quote": "Chk1 inactivates CDC25 phosphatases.", "context": "review", "location": "x", "pass": "mechanism"}
EDGE = Edge("CHK1", "inhibits", "Cdc25", [SUPPORT])


class _Resp:
    def __init__(self, text):
        self.output_text, self.usage = text, None


class FakeClient:
    def __init__(self, answer):
        self.answer, self.calls = answer, []
        self.responses = self

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return _Resp(json.dumps(self.answer))


def failing():
    proposal = classify_edge(RULES, EDGE)
    return proposal, evaluate_rule(RULES, proposal.node, proposal.new_rule, EDGE)


def test_the_prompt_carries_the_claim_the_rules_and_the_solvers_counterexample():
    proposal, decision = failing()
    prompt = build_prompt(proposal, decision, [], RULES)
    for needle in ("CHK1 inhibits Cdc25", "Chk1 inactivates CDC25 phosphatases.", BASE["Cdc25"], "& !CHK1", "V04",
                   "senescence", "'CHK1': 1", "switch Cdc25 off and never on", "give_up"):
        assert needle in prompt, needle
    assert "VE-821" not in prompt and "H1299" not in prompt  # nothing from the held-out set


def test_repair_returns_the_normalised_rule_and_logs_the_models_explanation(tmp_path):
    proposal, decision = failing()
    answer = {"rule": f"Cdc25, ({BASE['Cdc25']}) AND NOT (CHK1 AND NOT p53)", "explanation": "only without p53", "give_up": False}
    client, history = FakeClient(answer), []
    rule = make_repair(client=client, cache_dir=tmp_path)(proposal, decision, history, RULES)
    assert rule == f"({BASE['Cdc25']}) & !(CHK1 & !p53)"
    assert history[-1]["explanation"] == "only without p53" and history[-1]["give_up"] is False
    assert client.calls[0]["reasoning"] == {"effort": "medium"} and client.calls[0]["text"]["format"]["strict"] is True
    assert evaluate_rule(RULES, "Cdc25", rule, EDGE).accepted


def test_giving_up_returns_none(tmp_path):
    proposal, decision = failing()
    client = FakeClient({"rule": "", "explanation": "impossible", "give_up": True})
    assert make_repair(client=client, cache_dir=tmp_path)(proposal, decision, [], RULES) is None


def test_normalise_accepts_words_and_a_node_prefix():
    assert normalise("Cdc25, a AND NOT b OR c.", "Cdc25") == "a & !b | c"
