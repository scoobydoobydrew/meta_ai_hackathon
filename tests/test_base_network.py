"""Checks on the committed Gupta et al. 2023 base network (data/base/gupta2023.bnet).

The paper reports five fixed points in total, four of them under DNA damage. Reproducing that count
in three independent tools is our evidence that the rules were transferred correctly.
"""
from pathlib import Path

import biodivine_aeon as aeon
import mpbn
import pytest
from pyboolnet.prime_implicants import bnet_text2primes
from pyboolnet.trap_spaces import compute_steady_states

from cellproof.network.bnet import load_bnet, regulators
from cellproof.network.gupta2023 import NODES, translate

BNET = Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet"


@pytest.fixture(scope="module")
def rules():
    return load_bnet(BNET)


def _bnet_text(rules, damage):
    lines = ["targets, factors"]
    lines += [f"{n}, {damage if n == 'DNA_damage' else r}" for n, r in rules.items()]
    return "\n".join(lines) + "\n"


def _states(fixedpoints):
    return {tuple(sorted((k, int(v)) for k, v in fp.items())) for fp in fixedpoints}


def _mpbn_fixedpoints(rules, damage):
    return _states(mpbn.MPBooleanNetwork({**rules, "DNA_damage": str(damage)}).fixedpoints())


def test_node_count_and_order(rules):
    assert list(rules) == NODES
    assert len(rules) == 30  # 1 input + 29 nodes with a rule in Table S2


def test_input_is_the_only_constant_node(rules):
    assert rules["DNA_damage"] == "DNA_damage"
    assert [n for n, r in rules.items() if r == n] == ["DNA_damage"]


def test_every_regulator_is_a_defined_node(rules):
    for node, rule in rules.items():
        assert regulators(rule) <= set(rules), node


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("(NOT Wip1 OR p53) AND NOT ATM_pH2AX", "(!Wip1 | p53) & !ATM_pH2AX"),
        ("NOT (Cdc2_CycB AND Cdc25)", "!(Cdc2_CycB & Cdc25)"),
        ("NOT mTOR2 AND NOT mTOR1 AND ULK1", "!mTORC2 & !mTORC1 & ULK1_Beclin1"),
        ("p53-k OR p53-A", "p53_K | p53_A"),
        ("NOT miR-221 AND ATM-pH2AX", "!miR221 & ATM_pH2AX"),
    ],
)
def test_translate_resolves_the_paper_spellings(raw, expected):
    assert translate(raw) == expected


@pytest.mark.parametrize("raw", ["NOT Foo", "(p53 AND Wip1", "p53 AND Wip1)"])
def test_translate_refuses_to_guess(raw):
    with pytest.raises(ValueError):
        translate(raw)


def test_without_damage_there_is_one_fixed_point(rules):
    assert len(_mpbn_fixedpoints(rules, 0)) == 1


def test_with_damage_there_are_four_fixed_points(rules):
    assert len(_mpbn_fixedpoints(rules, 1)) == 4


@pytest.mark.parametrize("damage", [0, 1])
def test_mpbn_and_pyboolnet_agree_on_fixed_points(rules, damage):
    primes = bnet_text2primes(_bnet_text(rules, damage))
    assert _states(compute_steady_states(primes)) == _mpbn_fixedpoints(rules, damage)


@pytest.mark.parametrize("damage, expected", [(0, 1), (1, 4)])
def test_aeon_asynchronous_attractors_are_exactly_the_fixed_points(rules, damage, expected):
    graph = aeon.AsynchronousGraph(aeon.BooleanNetwork.from_bnet(_bnet_text(rules, damage)))
    attractors = aeon.Attractors.attractors(graph)
    assert [int(a.vertices().cardinality()) for a in attractors] == [1] * expected
