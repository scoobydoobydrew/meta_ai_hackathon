from pathlib import Path

from cellproof.network.bnet import load_bnet
from cellproof.network.logic import equivalent, evaluate, implies_var, influence, influence_edges, path_with_sign

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")


def test_evaluate_follows_bnet_precedence():
    assert evaluate("!a & b | c", {"a": 1, "b": 1, "c": 0}) == 0
    assert evaluate("!a & b | c", {"a": 0, "b": 1, "c": 0}) == 1
    assert evaluate("!(a & b)", {"a": 1, "b": 1}) == 0
    assert evaluate("1", {}) == 1 and evaluate("0", {}) == 0


def test_influence_signs():
    assert influence("a & !b", "a") == {"+"} and influence("a & !b", "b") == {"-"}
    assert influence("a ^ b".replace("^", "|"), "a") == {"+"}
    assert influence("(a & !b) | (!a & b)", "a") == {"+", "-"}  # a non-monotone rule
    assert influence("a & b", "c") == frozenset()


def test_base_rules_have_the_signs_table_s2_justifies():
    assert influence(BASE["Mdm2"], "p53") == {"+"} and influence(BASE["Mdm2"], "ATM_pH2AX") == {"-"}
    assert influence(BASE["Cdc25"], "Wee1") == {"-"}
    assert influence(BASE["Wee1"], "AKT") == {"-"}


def test_implies_var_and_equivalence():
    assert implies_var("a & b", "b") and not implies_var("a | b", "b") and not implies_var("a", "b")
    assert equivalent("a | (a & b)", "a") and not equivalent("a | b", "a & b")


def test_path_with_sign_finds_longer_routes_only():
    rules = {"b": "a", "c": "!b", "d": "c", "e": "a"}
    assert path_with_sign(rules, "a", "c", "-") == ["a", "b", "c"]
    assert path_with_sign(rules, "a", "d", "-") == ["a", "b", "c", "d"]
    assert path_with_sign(rules, "a", "c", "+") is None  # the only route is negative
    assert path_with_sign(rules, "a", "b", "+") is None  # the direct edge alone is not a longer route


def test_the_base_network_already_implies_p53_activates_p21_through_p53_a():
    assert path_with_sign(BASE, "p53", "p21", "+") is not None
    assert ("p53_A", "p21", "+") in influence_edges(BASE)
