"""Step-by-step explanation of an intervention, derived from the rules and re-checked by the solver.

Part 1, forced consequences: starting from the intervention and the damage input, a node is forced when its rule has the
same value for every value of the nodes that are not yet forced. Each step names the rule and the values that force it, so a
reader can check it by hand. Part 2, what propagation cannot decide (feedback loops, several stable states): the solver
enumerates all fixed points of the perturbed network and the fates they correspond to. The explanation never says more than
these two parts; nothing in it is written by a language model.
"""
from __future__ import annotations

from dataclasses import dataclass

from cellproof.analysis.attractors import fixed_points, perturb
from cellproof.network.bnet import regulators
from cellproof.network.logic import assignments, evaluate
from cellproof.network.phenotypes import classify


@dataclass(frozen=True)
class Step:
    node: str
    value: int
    rule: str
    because: tuple[tuple[str, int], ...]  # the forced nodes the rule reads, with their values


def forced_steps(rules: dict[str, str], setting: dict[str, int]) -> tuple[list[Step], dict[str, int]]:
    forced = dict(setting)
    steps: list[Step] = []
    changed = True
    while changed:
        changed = False
        for node in sorted(rules):
            if node in forced:
                continue
            free = sorted(r for r in regulators(rules[node]) if r not in forced and r != node)
            values = {evaluate(rules[node], {**forced, **a}) for a in assignments(free)} if node not in regulators(rules[node]) else set()
            if len(values) == 1:
                forced[node] = values.pop()
                reads = tuple(sorted((r, forced[r]) for r in regulators(rules[node]) if r in forced and r != node))
                steps.append(Step(node, forced[node], rules[node], reads))
                changed = True
    return steps, forced


def explain(rules: dict[str, str], intervention: dict[str, int]) -> str:
    setting = {"DNA_damage": 1, **intervention}
    steps, forced = forced_steps(rules, setting)
    lines = [f"Intervention: {', '.join(f'{n} = {v}' for n, v in intervention.items())}, with DNA damage present.", "Forced consequences:"]
    for s in steps:
        lines.append(f"  {s.node} = {s.value}   because {s.node} = {s.rule}   with {', '.join(f'{n}={v}' for n, v in s.because) or 'no inputs'}")
    undecided = sorted(set(rules) - set(forced))
    points = fixed_points(perturb(rules, setting))
    fates = sorted({str(classify(fp)) for fp in points})
    lines.append(f"Not decided by propagation ({len(undecided)} nodes): {', '.join(undecided) or 'none'}.")
    lines.append(f"The solver enumerates all fixed points of the perturbed network: {len(points)}, with fates {', '.join(fates)}.")
    return "\n".join(lines)
