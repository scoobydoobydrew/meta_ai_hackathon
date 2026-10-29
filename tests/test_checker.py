import time
from pathlib import Path

from cellproof.network.bnet import load_bnet
from cellproof.verify.checker import check, load_cases

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")


def test_the_base_network_satisfies_its_own_verification_set():
    start = time.time()
    result = check(BASE)
    assert result.ok, [f"{f.case}: {f.problem}" for f in result.failures]
    assert time.time() - start < 30  # the repair loop calls this for every candidate rule


def test_there_are_ten_cases_with_unique_ids():
    cases = load_cases()
    assert [c.id for c in cases] == [f"V{i:02d}" for i in range(1, 11)]


def test_a_rule_that_cuts_the_apoptosis_route_is_caught_with_a_counterexample():
    broken = {**BASE, "BAX": "0"}  # no BAX: apoptosis and autophagy cannot occur
    result = check(broken)
    assert not result.ok
    problems = {(f.case, f.problem) for f in result.failures}
    assert ("V02", "missing") in problems
    unclassified = next(f for f in result.failures if f.case == "V02" and f.problem == "unclassified")
    text = unclassified.describe(next(c for c in load_cases() if c.id == "V02"), nodes=["p53_K", "BAX", "Caspase"])
    # the counterexample names the case, the expectation and a fixed point that shows the problem
    assert "expected phenotypes" in text and "'BAX': 0" in text and "'p53_K': 1" in text


def test_a_rule_that_makes_a_second_branch_of_the_wild_type_is_caught_as_unexpected_or_unclassified():
    changed = {**BASE, "Wee1": "1", "Cdc25": "0"}  # G2 arrest held on regardless of damage
    result = check(changed)
    assert any(f.case == "V01" and f.problem == "g2_arrest" for f in result.failures) or not result.ok
