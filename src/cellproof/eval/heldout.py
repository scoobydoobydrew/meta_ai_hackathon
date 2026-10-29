"""Held-out outcome items and how scoreable each claim is.

Scoreability is decided from the item text alone (is the perturbed node in the base network, is the readout one of the
network's phenotypes, is the claim a presence/absence claim). It never depends on running any model on the item.
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from cellproof.network.phenotypes import PHENOTYPES

POLARITIES = ("present", "absent", "increased", "decreased", "unchanged")
SURVIVAL = "clonogenic_survival"


def load(path: str | Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def nodes_in_base(item: dict, base_nodes: set[str]) -> bool:
    return set(item["perturbation"]["nodes"]) <= base_nodes


def claim_category(claim: dict, in_base: bool) -> str:
    """One of: survival_level, needs_readout, direction_only, scoreable, scoreable_with_new_nodes."""
    if claim["readout"] == SURVIVAL:
        return "survival_level"
    if claim["readout"] not in PHENOTYPES:
        return "needs_readout"
    if claim["polarity"] in ("increased", "decreased", "unchanged"):
        return "direction_only"
    return "scoreable" if in_base else "scoreable_with_new_nodes"


def summarize(doc: dict, base_nodes: set[str]) -> Counter:
    counts: Counter = Counter()
    for item in doc["items"]:
        in_base = nodes_in_base(item, base_nodes)
        for claim in item["claims"]:
            counts[claim_category(claim, in_base)] += 1
    return counts
