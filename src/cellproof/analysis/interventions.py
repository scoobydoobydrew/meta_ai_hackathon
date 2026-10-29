"""Minimal intervention sets: which small sets of knock-outs (node = 0) or gain-of-function (node = 1) leave apoptosis as the
only fate of a damaged cell?

The search is exhaustive over sets up to `max_size` literals, each checked exactly (complete fixed-point enumeration), and a
set is minimal if no proper subset already works. Nodes that define the phenotype readouts are not offered as targets,
since fixing them is the definition of the outcome, not an intervention. A hit is a hypothesis about the model, to be tested
in the lab; it is not a treatment suggestion.
"""
from __future__ import annotations

from itertools import combinations

from cellproof.analysis.attractors import attractor_sizes, fixed_points, perturb
from cellproof.network.phenotypes import classify

# The nodes classify() reads, plus the input and the G2 readout node.
READOUT_NODES = frozenset({"DNA_damage", "p53_A", "p53_K", "p21", "Wip1", "mTORC1", "mTORC2", "ULK1_Beclin1", "BAX", "Caspase", "Cdc2_CycB"})

Literal = tuple[str, int]


def fates(rules: dict[str, str], setting: dict[str, int]) -> set[str | None]:
    return {classify(fp) for fp in fixed_points(perturb(rules, {"DNA_damage": 1, **setting}))}


def minimal_sets(rules: dict[str, str], max_size: int = 2, target: frozenset[str] = frozenset({"apoptosis"})) -> list[tuple[Literal, ...]]:
    """Minimal sets of literals after which the damaged network's fixed points are exactly the `target` fates."""
    nodes = sorted(n for n in rules if n not in READOUT_NODES)
    literals = [(n, v) for n in nodes for v in (0, 1)]
    found: list[frozenset[Literal]] = []
    for size in range(1, max_size + 1):
        for combo in combinations(literals, size):
            if len({n for n, _ in combo}) < size:
                continue
            chosen = frozenset(combo)
            if any(smaller <= chosen for smaller in found):
                continue
            if fates(rules, dict(combo)) == set(target):
                found.append(chosen)
    return [tuple(sorted(s)) for s in found]


def all_attractors_are_fixed_points(rules: dict[str, str], setting: dict[str, int]) -> bool:
    return all(size == 1 for size in attractor_sizes(perturb(rules, {"DNA_damage": 1, **setting})))


def describe(literals: tuple[Literal, ...]) -> str:
    return " + ".join(f"{n} {'KO' if v == 0 else 'E1'}" for n, v in literals)
