from pathlib import Path

from cellproof.analysis.interventions import READOUT_NODES, minimal_sets, search_space
from cellproof.analysis.llm_search import PER_CALL, build_prompt, candidate_sets, evaluate, judge
from cellproof.network.bnet import load_bnet

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")
MINIMAL = {frozenset(s) for s in minimal_sets(BASE, 1)}


def test_the_prompt_states_the_goal_and_the_rules_of_the_game_and_shows_every_rule_in_a_different_order():
    first, second = build_prompt(BASE, 0), build_prompt(BASE, 1)
    assert first != second
    lines = lambda text: {line for line in text.splitlines() if line.partition(",")[0] in BASE}  # noqa: E731
    assert lines(first) == lines(second) == {f"{n}, {r}" for n, r in BASE.items()}
    for needed in ("KNOCK-OUT", "FORCE-ON", "apoptosis", f"Propose {PER_CALL} different sets", "You cannot run code"):
        assert needed in first
    assert all(node in first.split("You may not change")[1].split("\n")[0] for node in READOUT_NODES)


def test_the_candidate_sets_are_exactly_the_ones_the_search_space_counts():
    assert len(candidate_sets(BASE, 2)) == search_space(BASE, 2) and len(candidate_sets(BASE, 1)) == search_space(BASE, 1)


def test_the_counts_for_larger_sets_are_the_enumeration_too():
    # the header counts sets of up to 3, 4 and 5 changes with the same formula; check it by brute force where that is cheap
    tiny = {f"g{i}": f"g{i}" for i in range(5)} | {"DNA_damage": "DNA_damage"}
    for k in (1, 2, 3, 4):
        assert len(candidate_sets(tiny, k)) == search_space(tiny, k)
    assert search_space(tiny, 3) == 5 * 2 + 10 * 4 + 10 * 8


def test_the_solver_judges_the_form_and_the_content_of_a_proposal():
    assert judge(BASE, [("TUG1", 0)], MINIMAL)["works"] and judge(BASE, [("TUG1", 0)], MINIMAL)["minimal"]  # TUG1 knocked out: apoptosis only (Gupta et al. Figure 3)
    wrong = judge(BASE, [("AKT", 0)], MINIMAL)
    assert wrong["valid"] and not wrong["works"] and not wrong["minimal"]
    for changes, problem in (([], "no change"), ([("TUG1", 0), ("AKT", 0), ("Myc", 0)], "more than two changes"), ([("TUG1", 0), ("TUG1", 1)], "same node twice"),
                             ([("NOT_A_GENE", 0)], "unknown node"), ([("BAX", 1)], "a node that defines the fates"), ([("TUG1", 2)], "value is not 0 or 1")):
        verdict = judge(BASE, changes, MINIMAL)
        assert not verdict["valid"] and verdict["problem"] == problem and not verdict["works"]


def test_evaluation_counts_distinct_proposals_and_reads_them_against_the_base_rate():
    answer = [{"changes": [{"node": "TUG1", "value": 0}], "reason": "a"}, {"changes": [{"node": "TUG1", "value": 0}], "reason": "again"},
              {"changes": [{"node": "BAX", "value": 1}], "reason": "forbidden"}, {"changes": [{"node": "AKT", "value": 0}], "reason": "b"}]
    result = evaluate(BASE, [{"seed": 0, "cached": True, "usage": None, "cost_usd": 0.0, "answer": answer}], "model", "high", "base")
    s = result["summary"]
    assert (s["proposals"], s["malformed"], s["distinct"], s["minimal_hits"]) == (4, 1, 2, 1)
    assert s["works"] >= 1 and s["first_guesses"] == 1 and s["first_guesses_work"] == 1
    assert s["candidates"] == search_space(BASE, 2) and 0 < s["minimal"] <= s["working_candidates"] < s["candidates"]
    assert [r["repeat"] for r in result["attempts"][0]["proposals"]] == [False, True, False, False]
