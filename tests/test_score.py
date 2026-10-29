"""The scoring harness, exercised on synthetic items built from cases the Gupta et al. 2023 paper reports.

The held-out draft itself is never scored here: score_doc refuses a DRAFT set.
"""
from pathlib import Path

import pytest

from cellproof.eval.heldout import load
from cellproof.eval.score import CORRECT, NOT_EXPRESSIBLE, WRONG, outcome, score_doc, verdict
from cellproof.network.bnet import load_bnet

ROOT = Path(__file__).resolve().parents[1]
RULES = load_bnet(ROOT / "data" / "base" / "gupta2023.bnet")
STIMULI = {"IR": {"DNA_damage": 1}, "none": {"DNA_damage": 0}}


def item(nodes, **extra):
    return {"id": "T", "stimulus": "IR", "perturbation": {"nodes": nodes}, **extra}


def claim(readout, polarity, **extra):
    return {"readout": readout, "polarity": polarity, "vs": "x", "statement": "x", **extra}


def test_a_draft_set_is_refused():
    with pytest.raises(ValueError, match="DRAFT"):
        score_doc(load(ROOT / "data" / "heldout" / "gupta2023_heldout_draft.json"), RULES)


def test_outcome_of_the_paper_case_tug1_knockout():
    # test_phenotypes: TUG1 KO under damage gives apoptosis only (Fig 3 of the paper).
    result = outcome(RULES, {"DNA_damage": 1, "TUG1": 0})
    assert result.readouts == {"apoptosis", "g2_arrest"}
    assert not result.unclassified and not result.complex_attractor


@pytest.mark.parametrize(
    "the_claim, expected",
    [
        (claim("apoptosis", "present"), CORRECT),
        (claim("senescence", "absent"), CORRECT),
        (claim("autophagy", "present"), WRONG),
        (claim("apoptosis", "absent"), WRONG),
        (claim("arrest", "decreased", magnitude="complete"), CORRECT),  # in the wild type, gone with the knockout
        (claim("apoptosis", "unchanged", magnitude="none"), CORRECT),  # in both
        (claim("arrest", "unchanged", magnitude="none"), WRONG),
        (claim("apoptosis", "increased", magnitude="complete"), WRONG),  # already there in the wild type
    ],
)
def test_verdicts_for_tug1_knockout(the_claim, expected):
    assert verdict(the_claim, item({"TUG1": 0}), RULES, STIMULI) == expected


def test_a_node_the_network_lacks_is_not_expressible_not_wrong():
    assert verdict(claim("apoptosis", "absent"), item({"ATR": 0}), RULES, STIMULI) == NOT_EXPRESSIBLE


def test_background_is_the_reference_of_a_contrast_and_must_hold_in_every_background():
    # With TUG1 already knocked out, miR-221 overexpression changes nothing the readouts can see.
    unchanged = claim("apoptosis", "unchanged", magnitude="none", backgrounds=[{"TUG1": 0}])
    assert verdict(unchanged, item({"miR221": 1}), RULES, STIMULI) == CORRECT
    both = claim("apoptosis", "unchanged", magnitude="none", backgrounds=[{"TUG1": 0}, {}])
    assert verdict(both, item({"miR221": 1}), RULES, STIMULI) == CORRECT
    # Without the background, miR-221 overexpression removes the other three fates (arrest present in wild type).
    assert verdict(claim("arrest", "decreased", magnitude="complete"), item({"miR221": 1}), RULES, STIMULI) == CORRECT
    mixed = claim("arrest", "decreased", magnitude="complete", backgrounds=[{"TUG1": 0}, {}])
    assert verdict(mixed, item({"miR221": 1}), RULES, STIMULI) == WRONG  # arrest is already absent with TUG1 KO


def test_score_doc_rows_and_baseline():
    doc = {
        "status": "FROZEN (test fixture)",
        "stimulus_mapping": STIMULI,
        "items": [
            item(
                {"TUG1": 0},
                id="T1",
                claims=[
                    claim("apoptosis", "present"),
                    claim("senescence", "absent"),
                    claim("arrest", "decreased", magnitude="partial"),
                    claim("clonogenic_survival", "decreased"),
                ],
            ),
            item({"ATR": 0}, id="T2", claims=[claim("apoptosis", "absent")]),
        ],
    }
    rows = score_doc(doc, RULES)
    assert [(r["item"], r["claim"], r["category"], r["verdict"]) for r in rows] == [
        ("T1", 0, "scoreable", CORRECT),
        ("T1", 1, "scoreable", CORRECT),
        ("T1", 2, "direction_only", None),
        ("T1", 3, "survival_level", None),
        ("T2", 0, "scoreable_with_new_nodes", NOT_EXPRESSIBLE),
    ]
    # The no-information baseline (perturbation ignored) gets the first right and the second wrong, since the wild type
    # shows senescence.
    assert [r["baseline"] for r in rows[:2]] == [CORRECT, WRONG]
    assert rows[4]["baseline"] == WRONG  # the wild type shows apoptosis, so the baseline answer "absent" is wrong
