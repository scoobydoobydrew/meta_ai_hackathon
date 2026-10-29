from pathlib import Path

import pytest

from cellproof.formalize.claims_to_edges import Edge
from cellproof.network.bnet import load_bnet
from cellproof.verify.accept import evaluate_rule

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")
WITH_CHK1 = {**BASE, "ATR": "DNA_damage", "CHK1": "ATR"}
OLD_CDC25 = BASE["Cdc25"]
CHK1_INHIBITS_CDC25 = Edge("CHK1", "inhibits", "Cdc25", [])


def test_a_new_node_with_an_activator_is_accepted_as_an_introduction():
    decision = evaluate_rule(BASE, "ATR", "DNA_damage", Edge("DNA_damage", "activates", "ATR", []))
    assert decision.accepted and decision.effect == "introduces"


def test_the_template_for_chk1_inhibits_cdc25_contradicts_the_figure_3_phenotypes():
    decision = evaluate_rule(WITH_CHK1, "Cdc25", f"({OLD_CDC25}) & !CHK1", CHK1_INHIBITS_CDC25)
    assert not decision.accepted and decision.reasons == ["verification"]
    text = " ".join(decision.messages)
    assert "V04" in text and "senescence" in text and "'CHK1': 1" in text  # which case, what was found, a witness state
    assert {f.case for f in decision.failures} >= {"V04", "V05", "V06"}


def test_a_rule_that_drops_the_claim_is_unfaithful_not_a_repair():
    decision = evaluate_rule(WITH_CHK1, "Cdc25", OLD_CDC25, CHK1_INHIBITS_CDC25)
    assert not decision.accepted and decision.reasons == ["unfaithful"]


def test_a_rule_that_loses_a_base_influence_is_rejected_before_the_solver_runs():
    edge = Edge("AKT", "requires", "mTORC2", [])
    decision = evaluate_rule(BASE, "AKT", f"({BASE['AKT']}) & mTORC2", edge)
    assert not decision.accepted and decision.reasons == ["structure"] and "PTEN" in decision.messages[0]


@pytest.mark.parametrize(
    "candidate, reason",
    [
        (f"({OLD_CDC25}) & !CHK1 & !Nonexistent", "ill_formed"),
        (f"({OLD_CDC25}) & !CHK1 & !Cdc25", "ill_formed"),  # its own node
        (f"({OLD_CDC25}) & !(CHK1 | !CHK1)", "unfaithful"),  # CHK1 cancels out: the rule is constant 0, CHK1 has no effect
        (f"({OLD_CDC25}) | CHK1", "unfaithful"),  # CHK1 would switch Cdc25 on, but the claim says it inhibits
    ],
)
def test_malformed_and_unfaithful_candidates(candidate, reason):
    decision = evaluate_rule(WITH_CHK1, "Cdc25", candidate, CHK1_INHIBITS_CDC25)
    assert not decision.accepted and decision.reasons == [reason]


def test_a_conditional_version_that_passes_the_cases_is_accepted_and_labelled_by_what_it_changes():
    # CHK1 inhibits Cdc25 only where p53 is absent: consistent with all ten cases, and it changes the p53-null fixed points.
    active = evaluate_rule(WITH_CHK1, "Cdc25", f"({OLD_CDC25}) & !(CHK1 & !p53)", CHK1_INHIBITS_CDC25)
    assert active.accepted and active.effect == "active"
    # Conditioned on AMPK_MAPK it passes the cases too, but AMPK_MAPK is on only where ATM_pH2AX is on, and then the old rule
    # is already off: the claimed effect never shows. That is why the label exists: passing the cases is not mattering.
    vacuous = f"({OLD_CDC25}) & !(CHK1 & AMPK_MAPK)"
    other = evaluate_rule(WITH_CHK1, "Cdc25", vacuous, CHK1_INHIBITS_CDC25)
    assert other.accepted and other.effect == "neutral"


def test_a_repair_must_be_active_a_vacuous_one_is_refused_with_the_reason_to_feed_back():
    vacuous = f"({OLD_CDC25}) & !(CHK1 & AMPK_MAPK)"
    refused = evaluate_rule(WITH_CHK1, "Cdc25", vacuous, CHK1_INHIBITS_CDC25, require_active=True)
    assert not refused.accepted and refused.reasons == ["vacuous"] and "never met where it matters" in refused.messages[0]
    active = evaluate_rule(WITH_CHK1, "Cdc25", f"({OLD_CDC25}) & !(CHK1 & !p53)", CHK1_INHIBITS_CDC25, require_active=True)
    assert active.accepted and active.effect == "active"
