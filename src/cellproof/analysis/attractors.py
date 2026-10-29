"""Fixed points and attractors of a Boolean network given as {node: rule} (bnet syntax)."""
from __future__ import annotations

import biodivine_aeon as aeon
import mpbn

from cellproof.network.bnet import format_bnet
from cellproof.network.phenotypes import classify


def perturb(rules: dict[str, str], setting: dict[str, int]) -> dict[str, str]:
    """Clamp nodes to 0 or 1: loss of function is 0 (KO), gain of function is 1 (E1)."""
    unknown = set(setting) - set(rules)
    if unknown:
        raise KeyError(f"not nodes of the network: {sorted(unknown)}")
    return {**rules, **{node: str(int(value)) for node, value in setting.items()}}


def fixed_points(rules: dict[str, str]) -> list[dict[str, int]]:
    return [{k: int(v) for k, v in fp.items()} for fp in mpbn.MPBooleanNetwork(rules).fixedpoints()]


def attractor_sizes(rules: dict[str, str]) -> list[int]:
    """State counts of the asynchronous attractors; all 1 means every attractor is a fixed point."""
    # from_bnet declares every variable of a rule as an essential regulator; a rule such as `(!a | b) & b` ignores `a`,
    # so the regulatory graph is re-inferred from the update functions before the graph is built.
    network = aeon.BooleanNetwork.from_bnet(format_bnet(rules)).infer_valid_graph()
    graph = aeon.AsynchronousGraph(network)
    return sorted(int(a.vertices().cardinality()) for a in aeon.Attractors.attractors(graph))


def phenotypes(rules: dict[str, str]) -> set[str | None]:
    """Phenotype of every fixed point; None marks a fixed point that matches no definition."""
    return {classify(fp) for fp in fixed_points(rules)}
