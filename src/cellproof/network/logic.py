"""Boolean rules in bnet syntax (`!`, `&`, `|`): evaluation, influence signs, implication, and the influence graph.

Rules in this project have a dozen variables at most, so every question is answered by looking at all assignments,
which is exact and needs no solver.
"""
from __future__ import annotations

import itertools
from collections import deque
from functools import lru_cache

from cellproof.network.bnet import regulators

Sign = str  # "+" or "-"


def _python(expr: str) -> str:
    return expr.replace("!", " not ").replace("&", " and ").replace("|", " or ").strip()


@lru_cache(maxsize=None)
def _compiled(expr: str):
    return tuple(sorted(regulators(expr))), compile(_python(expr), "<rule>", "eval")


def evaluate(expr: str, state: dict[str, int]) -> int:
    names, code = _compiled(expr)
    return int(bool(eval(code, {"__builtins__": {}}, {n: bool(state[n]) for n in names})))  # noqa: S307


def assignments(names):
    for values in itertools.product((0, 1), repeat=len(names)):
        yield dict(zip(names, values))


@lru_cache(maxsize=None)
def influence(expr: str, var: str) -> frozenset[Sign]:
    """The signs with which `var` affects the rule: "+" if switching it on can switch the rule on, "-" if it can
    switch the rule off. Empty when the rule does not depend on `var`."""
    names, _ = _compiled(expr)
    if var not in names:
        return frozenset()
    others = [n for n in names if n != var]
    signs = set()
    for state in assignments(others):
        low, high = evaluate(expr, {**state, var: 0}), evaluate(expr, {**state, var: 1})
        if high > low:
            signs.add("+")
        elif high < low:
            signs.add("-")
    return frozenset(signs)


@lru_cache(maxsize=None)
def implies_var(expr: str, var: str) -> bool:
    """Whenever the rule is on, `var` is on (var is necessary for the rule)."""
    names, _ = _compiled(expr)
    if var not in names:
        return False
    return all(state[var] for state in assignments(names) if evaluate(expr, state))


def equivalent(a: str, b: str) -> bool:
    names = sorted(regulators(a) | regulators(b))
    return all(evaluate(a, s) == evaluate(b, s) for s in assignments(names))


def influence_edges(rules: dict[str, str]) -> list[tuple[str, str, Sign]]:
    """(regulator, target, sign) for every dependence of a rule on a node."""
    return [(r, t, s) for t, rule in rules.items() for r in sorted(regulators(rule)) for s in sorted(influence(rule, r))]


def path_with_sign(rules: dict[str, str], source: str, target: str, sign: Sign, max_len: int = 4) -> list[str] | None:
    """A path of two or more influence edges from source to target whose signs multiply to `sign`, or None. The direct
    edge is deliberately not considered: this answers "is the claim already implied by a longer route?"."""
    out: dict[str, list[tuple[str, Sign]]] = {}
    for r, t, s in influence_edges(rules):
        out.setdefault(r, []).append((t, s))
    queue = deque([(source, "+", [source])])
    seen = {(source, "+")}
    while queue:
        node, acc, path = queue.popleft()
        if len(path) - 1 >= max_len:
            continue
        for nxt, s in out.get(node, []):
            composed = "+" if acc == s else "-"
            if nxt == target:
                if len(path) >= 2 and composed == sign:
                    return [*path, nxt]
                continue
            if (nxt, composed) not in seen and nxt != source:
                seen.add((nxt, composed))
                queue.append((nxt, composed, [*path, nxt]))
    return None
