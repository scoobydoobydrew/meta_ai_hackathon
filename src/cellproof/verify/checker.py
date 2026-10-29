"""The exact check of a network against the verification set.

For each case the perturbed network's fixed points are enumerated completely (mpbn), every fixed point is classified into a
phenotype, and the asynchronous attractors are computed (AEON) to rule out oscillations. A mismatch comes back as a
counterexample: the case, what was expected, what was found, and a fixed point that shows it.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from cellproof.analysis.attractors import attractor_sizes, fixed_points, perturb
from cellproof.network.phenotypes import classify, g2_arrest

CASES = Path(__file__).resolve().parents[3] / "data" / "verification" / "gupta2023_cases.json"


@dataclass(frozen=True)
class Case:
    id: str
    origin: str
    stimulus: dict
    perturbation: dict
    phenotypes: frozenset[str]
    match: str  # exact | covers
    g2_arrest: bool | None = None


@dataclass(frozen=True)
class Failure:
    case: str
    problem: str  # missing | unexpected | unclassified | oscillation | g2_arrest
    expected: list[str]
    found: list[str]
    witness: dict | None = None  # a fixed point that shows it (all node values)

    def describe(self, case: Case, nodes: list[str] | None = None) -> str:
        setting = {**case.stimulus, **case.perturbation}
        text = (
            f"{self.case} ({case.origin}); setting {setting}: {self.problem}; expected phenotypes "
            f"{self.expected} ({case.match}), found {self.found}"
        )
        if self.witness is not None:
            shown = {n: v for n, v in self.witness.items() if nodes is None or n in nodes}
            text += f"; witness fixed point {shown}"
        return text


@dataclass
class Result:
    failures: list[Failure] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.failures


def load_cases(path: Path = CASES) -> list[Case]:
    doc = json.loads(path.read_text(encoding="utf-8"))
    return [
        Case(c["id"], c["from"], c["stimulus"], c["perturbation"], frozenset(c["phenotypes"]), c["match"], c.get("g2_arrest"))
        for c in doc["cases"]
    ]


def check_case(rules: dict[str, str], case: Case) -> list[Failure]:
    network = perturb(rules, {**case.stimulus, **case.perturbation})
    points = fixed_points(network)
    labelled = [(classify(fp), fp) for fp in points]
    found = sorted({p for p, _ in labelled if p})
    expected = sorted(case.phenotypes)
    failures = []

    def add(problem: str, witness: dict | None = None) -> None:
        failures.append(Failure(case.id, problem, expected, found, witness))

    for phenotype, fp in labelled:
        if phenotype is None:
            add("unclassified", fp)
            break
    if case.match == "exact":
        extra = [fp for p, fp in labelled if p and p not in case.phenotypes]
        if extra:
            add("unexpected", extra[0])
    missing = case.phenotypes - set(found)
    if missing:
        add("missing", points[0] if points else None)
    if case.g2_arrest is not None and any(g2_arrest(fp) for fp in points) != case.g2_arrest:
        add("g2_arrest", points[0] if points else None)
    if any(size > 1 for size in attractor_sizes(network)):
        add("oscillation")
    return failures


def check(rules: dict[str, str], cases: list[Case] | None = None) -> Result:
    result = Result()
    for case in cases or load_cases():
        result.failures.extend(check_case(rules, case))
    return result
