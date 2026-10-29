"""Muse Spark repairs a rule the solver rejected, using the counterexample.

The model sees: the claim and its evidence quotes, the node's current rule, the template edit and the solver's
counterexamples (which verification case failed, what was expected, what was found, a fixed point). It answers with one
rule in bnet syntax or gives up. The answer is never trusted: verify.accept re-checks it exactly, so a repair that
fails is just another logged attempt. Only the verification set is shown; the held-out set never reaches this module.
"""
from __future__ import annotations

import json
import re

from cellproof.formalize.edits import Proposal
from cellproof.meta_client import DEFAULT_MODEL, complete
from cellproof.verify.accept import Decision

EFFORT = "medium"

SCHEMA = {
    "type": "object",
    "properties": {
        "rule": {"type": "string"},
        "explanation": {"type": "string"},
        "give_up": {"type": "boolean"},
    },
    "required": ["rule", "explanation", "give_up"],
    "additionalProperties": False,
}
TEXT_FORMAT = {"format": {"type": "json_schema", "name": "rule_repair", "schema": SCHEMA, "strict": True}}

PROMPT = """You repair a Boolean network model of the DNA damage response (a published model, Gupta et al. 2023).
A claim read from the literature was turned into a rule change by a fixed template, and an exact solver rejected the
change: the edited network contradicts behaviours the model must keep (the verification cases). Propose another rule
for the node that still expresses the claim but passes those cases.

Rules are written with node names and the operators ! (not), & (and), | (or) and parentheses. A node is 1 when active.
DNA_damage is the only input. These are the nodes you may use: {nodes}

CLAIM: {source} {effect} {target}   ({n_papers} paper(s))
EVIDENCE:
{evidence}

NODE TO CHANGE: {node}
CURRENT RULE:   {node}, {old_rule}
TEMPLATE RULE (rejected): {node}, {template}

WHY IT WAS REJECTED (counterexamples from the solver; "setting" fixes nodes to 0 or 1, a phenotype is read from the
fixed points; the witness is a fixed point of the edited network):
{counterexamples}
{history}
Requirements, all checked by the solver afterwards:
- {sign_rule}
- Keep every influence the current rule has: every node in the current rule must still affect the new rule in the same way.
- Use only the nodes listed above. Do not use {node} in its own rule.
- You may restrict WHEN the claimed effect applies by combining it with other nodes, if the evidence context (cell
  type, condition) or the counterexample suggests a condition. Say which condition you chose and why. Do not invent a
  mechanism the evidence does not support.
- If no rule can both express the claim and pass the cases, set give_up to true and explain.

Answer as JSON: {{"rule": "<expression only, no node name and no comma>", "explanation": "...", "give_up": false}}.
"""


def _sign_rule(p: Proposal) -> str:
    edge = p.edge
    if edge.effect == "requires":
        return f"The new rule of {edge.source} must be 0 whenever {edge.target} is 0 ({edge.source} requires {edge.target})."
    sign = "switch {t} on and never off" if edge.effect == "activates" else "switch {t} off and never on"
    return f"{edge.source} must be able to {sign.format(t=edge.target)}: it acts on {edge.target} only in the direction '{edge.effect}'."


def _evidence(p: Proposal) -> str:
    lines = []
    for s in p.edge.support[:4]:
        lines.append(f'- {s["pmcid"]} ({s["context"][:80]}): "{s["quote"]}"')
    return "\n".join(lines)


def build_prompt(p: Proposal, decision: Decision, history: list[dict], rules: dict[str, str]) -> str:
    previous = [h for h in history if h["source"] == "llm" and h["rule"]]
    past = ""
    if previous:
        past = "\nEARLIER ATTEMPTS THAT ALSO FAILED:\n" + "\n".join(
            f"- {h['rule']}  ->  {h['reasons']}: {(h['messages'] or [''])[0][:300]}" for h in previous
        ) + "\n"
    return PROMPT.format(
        nodes=", ".join(sorted(rules)), source=p.edge.source, effect=p.edge.effect, target=p.edge.target,
        n_papers=p.edge.papers, evidence=_evidence(p), node=p.node, old_rule=p.old_rule, template=p.new_rule,
        counterexamples="\n".join(f"- {m}" for m in decision.messages[:4]), history=past, sign_rule=_sign_rule(p),
    )


def normalise(rule: str, node: str) -> str:
    rule = rule.strip().rstrip(".;")
    rule = re.sub(rf"^{re.escape(node)}\s*,\s*", "", rule)
    rule = re.sub(r"\bAND\b", "&", rule, flags=re.IGNORECASE)
    rule = re.sub(r"\bOR\b", "|", rule, flags=re.IGNORECASE)
    rule = re.sub(r"\bNOT\s+", "!", rule, flags=re.IGNORECASE)
    return rule


def make_repair(model: str = DEFAULT_MODEL, effort: str = EFFORT, **kwargs):
    """Returns the callback augment.run expects. `kwargs` (client, cache_dir) go to meta_client.complete."""

    def repair(p: Proposal, decision: Decision, history: list[dict], rules: dict[str, str]) -> str | None:
        result = complete(
            build_prompt(p, decision, history, rules), model=model, text=TEXT_FORMAT, reasoning={"effort": effort}, **kwargs
        )
        answer = json.loads(result.text)
        history.append({"source": "llm_answer", "explanation": answer["explanation"], "give_up": answer["give_up"],
                        "cached": result.from_cache, "usage": result.usage})
        if answer["give_up"] or not answer["rule"].strip():
            return None
        return normalise(answer["rule"], p.node)

    return repair
