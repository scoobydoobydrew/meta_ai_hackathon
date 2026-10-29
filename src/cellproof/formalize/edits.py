"""From evidence edges to candidate edits of the network's rules, and which new nodes are worth adding.

The conversion is deterministic. Its conventions are modelling choices, stated here so that they can be argued with:
  activates (A -> B)   rule(B) := (rule(B)) | A          A is an additional sufficient activator
  inhibits  (A -| B)   rule(B) := (rule(B)) & !A         A is a dominant inhibitor
  requires  (A needs B) rule(A) := (rule(A)) & B         B is necessary for A
  a new node B with a first activating edge A -> B gets the rule `A`; further activators are OR-ed in.
Nothing is changed when the claim is already represented: the same sign already acts directly (present), or a longer route
with the same sign exists (implied, the transitive shortcut), and a claim of the opposite sign to the published model
(conflict) is reported instead of edited, since accepting it would remove an influence the base paper justifies.
"""
from __future__ import annotations

from dataclasses import dataclass

from cellproof.formalize.claims_to_edges import Edge
from cellproof.network.logic import implies_var, influence, path_with_sign

INPUT = "DNA_damage"


@dataclass(frozen=True)
class Proposal:
    edge: Edge
    node: str  # the node whose rule changes (or is created)
    old_rule: str | None  # None when the node is new
    new_rule: str
    kind: str  # anchor | activator | inhibitor | requirement

    @property
    def introduces(self) -> bool:
        return self.old_rule is None


@dataclass(frozen=True)
class Skip:
    edge: Edge
    reason: str  # present | implied | conflict | input | not_available | needs_activator
    detail: str = ""

    @property
    def deferred(self) -> bool:
        return self.reason in ("not_available", "needs_activator")


def classify_edge(rules: dict[str, str], edge: Edge) -> Proposal | Skip:
    source, target, effect = edge.source, edge.target, edge.effect
    if target == INPUT:
        return Skip(edge, "input", "the input node is not regulated")
    if source not in rules:
        return Skip(edge, "not_available", f"{source} is not in the network yet")
    if effect == "requires":
        if target not in rules:
            return Skip(edge, "not_available", f"{target} is not in the network yet")
        if source == INPUT:
            return Skip(edge, "input", "the input node is not regulated")
        if implies_var(rules[source], target):
            return Skip(edge, "present", f"{source} already needs {target}")
        return Proposal(edge, source, rules[source], f"({rules[source]}) & {target}", "requirement")

    sign, opposite = ("+", "-") if effect == "activates" else ("-", "+")
    if target not in rules:
        if effect != "activates":
            return Skip(edge, "needs_activator", "a new node needs an activating edge first")
        return Proposal(edge, target, None, source, "anchor")
    signs = influence(rules[target], source)
    if sign in signs:
        return Skip(edge, "present", f"{source} already acts on {target} with sign {sign}")
    if opposite in signs:
        return Skip(edge, "conflict", f"the base rule of {target} has {source} with sign {opposite}")
    route = path_with_sign(rules, source, target, sign)
    if route:
        return Skip(edge, "implied", " -> ".join(route))
    if effect == "activates":
        return Proposal(edge, target, rules[target], f"({rules[target]}) | {source}", "activator")
    return Proposal(edge, target, rules[target], f"({rules[target]}) & !{source}", "inhibitor")


def select_new_nodes(edges: dict[str, Edge], base_nodes: set[str], min_papers: int = 2) -> tuple[list[str], dict[str, dict]]:
    """New nodes that are wired in both directions with support from at least `min_papers` papers per edge: an incoming
    activating edge from a node already available, and an outgoing edge to one. Repeats until nothing more qualifies, so a
    chain such as ATR -> CHK1 is found even though CHK1's activator is itself new."""
    available = set(base_nodes)
    genes = {e.source for e in edges.values()} | {e.target for e in edges.values()}
    candidates = sorted(genes - base_nodes)
    selected: list[str] = []
    reasons: dict[str, dict] = {}
    changed = True
    while changed:
        changed = False
        for gene in candidates:
            if gene in selected:
                continue
            incoming = [e for e in edges.values() if e.target == gene and e.effect == "activates" and e.source in available and e.papers >= min_papers]
            outgoing = [e for e in edges.values() if e.source == gene and e.target in available and e.target != gene and e.papers >= min_papers]
            if incoming and outgoing:
                selected.append(gene)
                available.add(gene)
                reasons[gene] = {"in": [(e.id, e.papers) for e in incoming], "out": [(e.id, e.papers) for e in outgoing]}
                changed = True
    return selected, reasons
