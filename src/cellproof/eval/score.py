"""Scoring a network against held-out items, as fixed in docs/heldout_protocol.md.

A claim is scored in one of two ways (heldout.scoring_mode):
  absolute  present / absent: is the readout among the fixed points of the perturbed network?
  contrast  decreased / increased / unchanged, complete changes only: is the readout's status in the perturbed network
            different from (or, for unchanged, equal to) its status in the same network without the perturbation?
Each claim may name `backgrounds`, node settings for the cell line's own genotype (for example p53 = 0 for a p53-null
line). It is correct only if the verdict is right in every background; the reference of a contrast is the background alone.

Scoring a draft item set is refused: results must come from a frozen file.
"""
from __future__ import annotations

from dataclasses import dataclass

from cellproof.analysis.attractors import attractor_sizes, fixed_points, perturb
from cellproof.eval.heldout import claim_category, scoring_mode
from cellproof.network.phenotypes import classify, g2_arrest

CORRECT, WRONG, NOT_EXPRESSIBLE = "correct", "wrong", "not_expressible"


@dataclass(frozen=True)
class Outcome:
    readouts: frozenset[str]
    unclassified: bool  # some fixed point matches no phenotype definition (it counts for no phenotype)
    complex_attractor: bool  # some attractor is not a fixed point


def outcome(rules: dict[str, str], setting: dict[str, int]) -> Outcome:
    perturbed = perturb(rules, setting)
    points = fixed_points(perturbed)
    found = {classify(fp) for fp in points}
    shown = {name for name in found if name is not None}
    if any(g2_arrest(fp) for fp in points):
        shown.add("g2_arrest")
    return Outcome(frozenset(shown), None in found, any(size > 1 for size in attractor_sizes(perturbed)))


def _holds(claim: dict, perturbed: Outcome, reference: Outcome) -> bool:
    readout, polarity = claim["readout"], claim["polarity"]
    now, before = readout in perturbed.readouts, readout in reference.readouts
    if polarity == "present":
        return now
    if polarity == "absent":
        return not now
    if polarity == "decreased":
        return before and not now
    if polarity == "increased":
        return now and not before
    return now == before  # unchanged


def verdict(claim: dict, item: dict, rules: dict[str, str], stimulus_mapping: dict) -> str:
    backgrounds = claim.get("backgrounds", [{}])
    needed = set(item["perturbation"]["nodes"]).union(*backgrounds)
    if not needed <= set(rules):
        return NOT_EXPRESSIBLE
    stimulus = stimulus_mapping[item["stimulus"]]
    for background in backgrounds:
        reference = outcome(rules, {**stimulus, **background})
        perturbed = outcome(rules, {**stimulus, **background, **item["perturbation"]["nodes"]})
        if not _holds(claim, perturbed, reference):
            return WRONG
    return CORRECT


def baseline_verdict(claim: dict, item: dict, rules: dict[str, str], stimulus_mapping: dict) -> str:
    """The no-information baseline: pretend the perturbation does nothing. Absolute claims are answered by the
    unperturbed network under the same stimulus, contrast claims with "unchanged"."""
    backgrounds = claim.get("backgrounds", [{}])
    if not set().union(*backgrounds) <= set(rules):
        return NOT_EXPRESSIBLE
    stimulus = stimulus_mapping[item["stimulus"]]
    for background in backgrounds:
        reference = outcome(rules, {**stimulus, **background})
        if not _holds(claim, reference, reference):
            return WRONG
    return CORRECT


def score_doc(doc: dict, rules: dict[str, str], *, allow_draft: bool = False) -> list[dict]:
    """One row per claim: item, claim index, category, mode, verdict (None when the claim is not scoreable at all)
    and the baseline verdict."""
    if doc["status"].startswith("DRAFT") and not allow_draft:
        raise ValueError("refusing to score a DRAFT held-out set: freeze it first (docs/heldout_protocol.md)")
    names = set(rules)
    rows = []
    for item in doc["items"]:
        in_network = set(item["perturbation"]["nodes"]) <= names
        for index, claim in enumerate(item["claims"]):
            category = claim_category(claim, in_network)
            scored = category in ("scoreable", "scoreable_with_new_nodes")
            rows.append(
                {
                    "item": item["id"],
                    "claim": index,
                    "category": category,
                    "mode": scoring_mode(claim),
                    "verdict": verdict(claim, item, rules, doc["stimulus_mapping"]) if scored else None,
                    "baseline": baseline_verdict(claim, item, rules, doc["stimulus_mapping"]) if scored else None,
                }
            )
    return rows
