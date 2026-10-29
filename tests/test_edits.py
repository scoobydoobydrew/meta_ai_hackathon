from cellproof.formalize.claims_to_edges import Edge
from cellproof.formalize.edits import Proposal, classify_edge, select_new_nodes


def edge(source, effect, target, papers=1):
    support = [{"pmcid": f"PMC{i}", "quote": "q", "context": "c", "location": "l", "pass": "t"} for i in range(papers)]
    return Edge(source, effect, target, support)


RULES = {"DNA_damage": "DNA_damage", "a": "DNA_damage", "b": "a", "c": "!b & DNA_damage", "d": "a"}


def test_activator_inhibitor_and_requirement_conventions():
    activator = classify_edge(RULES, edge("b", "activates", "d"))
    assert isinstance(activator, Proposal) and activator.new_rule == "(a) | b" and activator.kind == "activator"
    assert activator.old_rule == "a" and not activator.introduces
    inhibitor = classify_edge(RULES, edge("c", "inhibits", "d"))
    assert inhibitor.new_rule == "(a) & !c" and inhibitor.kind == "inhibitor"
    requirement = classify_edge(RULES, edge("d", "requires", "c"))
    assert requirement.node == "d" and requirement.new_rule == "(a) & c" and requirement.kind == "requirement"


def test_present_conflict_implied_and_input():
    assert classify_edge(RULES, edge("a", "activates", "b")).reason == "present"
    assert classify_edge(RULES, edge("b", "activates", "c")).reason == "conflict"  # the base rule has b with sign -
    assert classify_edge(RULES, edge("a", "inhibits", "c")).reason == "implied"  # a -> b -| c
    assert classify_edge(RULES, edge("a", "activates", "DNA_damage")).reason == "input"
    assert classify_edge({**RULES, "e": "DNA_damage & a"}, edge("e", "requires", "a")).reason == "present"


def test_a_new_node_needs_an_activating_edge_from_a_node_that_exists():
    anchor = classify_edge(RULES, edge("b", "activates", "new"))
    assert isinstance(anchor, Proposal) and anchor.kind == "anchor" and anchor.new_rule == "b" and anchor.introduces
    assert classify_edge(RULES, edge("b", "inhibits", "new")).reason == "needs_activator"
    unknown = classify_edge(RULES, edge("ghost", "activates", "a"))
    assert unknown.reason == "not_available" and unknown.deferred


def test_select_new_nodes_follows_chains_and_needs_support_in_both_directions():
    edges = {
        e.id: e
        for e in [
            edge("a", "activates", "X", 3), edge("X", "activates", "b", 2),  # wired both ways: X
            edge("X", "activates", "Y", 2), edge("Y", "inhibits", "c", 2),  # Y only through X
            edge("a", "activates", "Z", 3),  # nothing leaves Z
            edge("W", "activates", "b", 5),  # nothing enters W
            edge("a", "activates", "V", 1), edge("V", "activates", "b", 1),  # one paper per edge: below the threshold
        ]
    }
    selected, why = select_new_nodes(edges, {"a", "b", "c"}, min_papers=2)
    assert selected == ["X", "Y"] and set(why) == {"X", "Y"}
