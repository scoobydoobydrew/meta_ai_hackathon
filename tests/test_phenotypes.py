"""The base network against the cases the Gupta et al. 2023 paper reports for its own model.

These cases are the seed of the verification set: perturbations applied with DNA damage ON,
E1 = node clamped to 1 (gain of function), KO = node clamped to 0 (loss of function).
Table 1 rows 8 and 9 are not tested: their readouts ("inhibition of proliferation", "DNA repair") are not phenotypes.
"""
from pathlib import Path

import pytest

from cellproof.analysis.attractors import attractor_sizes, fixed_points, perturb, phenotypes
from cellproof.network.bnet import load_bnet
from cellproof.network.phenotypes import PHENOTYPES, READOUTS, classify, g2_arrest

BNET = Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet"
ALL_FOUR = {"arrest", "senescence", "autophagy", "apoptosis"}


@pytest.fixture(scope="module")
def rules():
    return load_bnet(BNET)


def test_wild_type_fixed_points_map_one_to_one_onto_the_papers_phenotypes(rules):
    without = [classify(fp) for fp in fixed_points(perturb(rules, {"DNA_damage": 0}))]
    with_damage = [classify(fp) for fp in fixed_points(perturb(rules, {"DNA_damage": 1}))]
    assert without == ["proliferation"]
    assert sorted(with_damage) == sorted(ALL_FOUR)


@pytest.mark.parametrize(
    "state, expected",
    [
        ({"DNA_damage": 0}, "proliferation"),
        ({"DNA_damage": 1, "p53_A": 1, "p21": 1, "Wip1": 1}, "arrest"),
        ({"DNA_damage": 1, "p53_A": 1, "p21": 1, "Wip1": 1, "mTORC1": 1, "mTORC2": 1}, "senescence"),
        ({"DNA_damage": 1, "p53_K": 1, "BAX": 1, "Caspase": 1}, "apoptosis"),
        ({"DNA_damage": 1, "p53_K": 1, "BAX": 1, "Caspase": 1, "ULK1_Beclin1": 1}, "autophagy"),
        ({"DNA_damage": 1, "p53_A": 1, "p21": 1}, None),
        ({"DNA_damage": 1}, None),
    ],
)
def test_classify(state, expected):
    assert classify(state) == expected


@pytest.mark.parametrize(
    "state, expected",
    [
        ({"DNA_damage": 1, "Cdc2_CycB": 0}, True),
        ({"DNA_damage": 1, "Cdc2_CycB": 1}, False),
        ({"DNA_damage": 0, "Cdc2_CycB": 0}, False),  # no damage, no checkpoint
        ({"DNA_damage": 0, "Cdc2_CycB": 1}, False),
    ],
)
def test_g2_arrest_readout(state, expected):
    assert g2_arrest(state) is expected


def test_wild_type_g2_arrest_follows_the_input_only(rules):
    # So in the wild type g2_arrest cannot separate the four fates; only perturbations can switch it off.
    assert [g2_arrest(fp) for fp in fixed_points(perturb(rules, {"DNA_damage": 0}))] == [False]
    assert all(g2_arrest(fp) for fp in fixed_points(perturb(rules, {"DNA_damage": 1})))


def test_readouts_are_the_five_phenotypes_plus_g2_arrest():
    assert READOUTS[-1] == "g2_arrest" and READOUTS[:-1] == tuple(PHENOTYPES)


@pytest.mark.parametrize(
    "setting, expected",
    [
        pytest.param({"TUG1": 1}, ALL_FOUR, id="TUG1 E1 (Fig 3)"),
        pytest.param({"TUG1": 0}, {"apoptosis"}, id="TUG1 KO (Fig 3)"),
        pytest.param({"miR221": 1}, {"apoptosis"}, id="miR-221 E1 (Fig 3)"),
        pytest.param({"miR221": 1, "TUG1": 0}, {"apoptosis"}, id="miR-221 E1 + TUG1 KO (Fig 3)"),
        pytest.param({"TUG1": 1, "miR221": 0}, ALL_FOUR, id="TUG1 E1 + miR-221 KO (Fig 3)"),
        pytest.param({"p53": 1, "PTEN": 0}, {"senescence", "apoptosis"}, id="p53 E1 + PTEN KO (Table 1 rows 1,4)"),
        pytest.param({"PTEN": 1, "WWP1": 0}, ALL_FOUR, id="PTEN E1 + WWP1 KO (Table 1 row 10, a prediction)"),
    ],
)
def test_model_reproduces_the_papers_reported_phenotypes(rules, setting, expected):
    r = perturb(rules, {"DNA_damage": 1, **setting})
    assert phenotypes(r) == expected
    assert attractor_sizes(r) == [1] * len(expected)  # every attractor is a fixed point


def test_pten_overexpression_covers_what_the_cited_studies_saw(rules):
    # Table 1 rows 2,3,5,6,7 list arrest, autophagy and apoptosis across studies for PTEN E1.
    # The model also produces senescence there, which Table 1 does not list for these studies.
    assert phenotypes(perturb(rules, {"DNA_damage": 1, "PTEN": 1})) >= {"arrest", "autophagy", "apoptosis"}
