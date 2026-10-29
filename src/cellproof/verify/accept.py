"""Does a candidate rule get in? Four checks, cheapest first, and a reason (with the solver's counterexample) when not.

  1. well-formed: the identifiers are nodes of the network, and the rule does not newly refer to its own node;
  2. faithful to the claim: the claimed source acts on the target with the claimed sign and no other (activates: "+"
     only; inhibits: "-" only), or, for "requires", the rule implies the required node. A rule that merely drops the
     claim can therefore not be "repaired" into acceptance;
  3. structure kept: every influence the old rule had is still there (the base paper justifies each in Table S2);
  4. the verification set: every case must come out as expected (verify.checker).

An accepted edit is labelled "active" if it changes the fixed points of some setting in a small panel (wild type with and
without damage, and the source and target each switched off and on), otherwise "neutral": consistent with everything we
test, but not shown to matter.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from cellproof.analysis.attractors import fixed_points, perturb
from cellproof.formalize.claims_to_edges import Edge
from cellproof.network.bnet import regulators
from cellproof.network.logic import implies_var, influence
from cellproof.verify.checker import Case, Failure, check, load_cases

DISPLAY = ["p53", "p53_A", "p53_K", "p21", "Wip1", "mTORC1", "mTORC2", "BAX", "Caspase", "ULK1_Beclin1", "Cdc2_CycB"]


@dataclass
class Decision:
    accepted: bool
    reasons: list[str] = field(default_factory=list)  # short codes: ill_formed | unfaithful | structure | verification
    messages: list[str] = field(default_factory=list)  # one readable line each, with counterexamples
    failures: list[Failure] = field(default_factory=list)
    effect: str | None = None  # active | neutral | introduces


def _faithful(edge: Edge, rule: str) -> str | None:
    if edge.effect == "requires":
        return None if implies_var(rule, edge.target) else f"the rule does not imply {edge.target}, which {edge.source} requires"
    signs = influence(rule, edge.source)
    want, other = ("+", "-") if edge.effect == "activates" else ("-", "+")
    if want not in signs:
        return f"{edge.source} no longer acts on {edge.target} with sign {want} ({edge.effect})"
    if other in signs:
        return f"{edge.source} acts on {edge.target} with both signs, but the claim is only '{edge.effect}'"
    return None


VACUOUS = (
    "the rule passes every verification case but changes no fixed point in any scenario tested (wild type with and "
    "without damage, and the nodes of the claim and of the rule each switched off and on): the condition you added is "
    "never met where it matters, so the claim is expressed in name only. Choose a condition that is met in at least one "
    "such scenario."
)


def evaluate_rule(
    rules: dict[str, str], node: str, candidate: str, edge: Edge, cases: list[Case] | None = None, require_active: bool = False
) -> Decision:
    """`require_active` is set for rules proposed by the model after a rejection: a repair that only restores the cases by
    making the claimed effect inert would otherwise count as a success."""
    cases = cases or load_cases()
    old = rules.get(node)
    unknown = regulators(candidate) - (set(rules) | {node})
    if unknown:
        return Decision(False, ["ill_formed"], [f"unknown identifiers in the rule: {sorted(unknown)}"])
    if node in regulators(candidate) and (old is None or node not in regulators(old)):
        return Decision(False, ["ill_formed"], [f"{node} must not appear in its own rule"])
    if node != (edge.source if edge.effect == "requires" else edge.target):
        return Decision(False, ["ill_formed"], ["the rule being edited is not the one this claim is about"])
    problem = _faithful(edge, candidate)
    if problem:
        return Decision(False, ["unfaithful"], [problem])
    if old is not None:
        lost = [(r, sorted(influence(old, r) - influence(candidate, r))) for r in sorted(regulators(old)) if not influence(old, r) <= influence(candidate, r)]
        if lost:
            return Decision(False, ["structure"], [f"the rule of {node} loses influences the base model has: {lost}"])
    after = {**rules, node: candidate}
    result = check(after, cases)
    if not result.ok:
        shown = sorted(set(DISPLAY) | regulators(candidate) | {node, edge.source, edge.target})
        by_id = {c.id: c for c in cases}
        messages = [f.describe(by_id[f.case], shown) for f in result.failures]
        return Decision(False, ["verification"], messages, result.failures)
    effect = "introduces" if old is None else behaviour_effect(rules, after, edge, node)
    if require_active and effect == "neutral":
        return Decision(False, ["vacuous"], [VACUOUS], effect=effect)
    return Decision(True, effect=effect)


def _panel(before: dict[str, str], after: dict[str, str], edge: Edge, node: str) -> list[dict[str, int]]:
    """Wild type with and without damage, and under damage each node the edit involves (the claim's ends and every node in
    the new rule) switched off and on, as single-node perturbations."""
    settings = [{"DNA_damage": 1}, {"DNA_damage": 0}]
    involved = dict.fromkeys((edge.source, edge.target, *sorted(regulators(after[node]))))
    for name in involved:
        if name in before and name != "DNA_damage":
            settings += [{"DNA_damage": 1, name: 0}, {"DNA_damage": 1, name: 1}]
    return settings


def behaviour_effect(before: dict[str, str], after: dict[str, str], edge: Edge, node: str) -> str:
    keep = set(before)
    for setting in _panel(before, after, edge, node):
        old = {frozenset((n, v) for n, v in fp.items() if n in keep) for fp in fixed_points(perturb(before, setting))}
        new = {frozenset((n, v) for n, v in fp.items() if n in keep) for fp in fixed_points(perturb(after, setting))}
        if old != new:
            return "active"
    return "neutral"
