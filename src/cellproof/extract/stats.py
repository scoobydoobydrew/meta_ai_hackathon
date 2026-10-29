"""Totals over the per-paper extraction files, for the README and `make verify`. Every number is computed here."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from cellproof.meta_client import cost_usd


def load_records(directory: Path) -> list[dict]:
    return [json.loads(p.read_text(encoding="utf-8")) for p in sorted(directory.glob("*.json"))]


LABELS = ("correct", "wrong_direction", "wrong_entity", "not_a_mechanism", "quote_does_not_support")


def labelling_sample(records: list[dict], n: int = 50, seed: int = 20261029) -> list[dict]:
    """A seeded random sample of grounded claims for the human to label (metric M4). The model never labels them."""
    import random

    pool = [{**claim, "pmcid": r["pmcid"]} for r in records for claim in r["grounded"]]
    rows = random.Random(seed).sample(pool, min(n, len(pool)))
    return [{"id": f"L{i + 1:02d}", **row, "label": "", "note": ""} for i, row in enumerate(rows)]


def summarize(records: list[dict]) -> dict:
    counts: Counter = Counter()
    input_tokens = output_tokens = reasoning_tokens = 0
    cost = 0.0
    names: Counter = Counter()
    effects: Counter = Counter()
    for record in records:
        counts.update(record["counts"])
        usage = record["usage"] or {}
        input_tokens += usage.get("input_tokens", 0)
        output_tokens += usage.get("output_tokens", 0)
        reasoning_tokens += (usage.get("output_tokens_details") or {}).get("reasoning_tokens", 0)
        cost += cost_usd(usage, record["model"])
        for claim in record["grounded"]:
            effects[claim["effect"]] += 1
            names.update([claim["source"].lower(), claim["target"].lower()])
    return {
        "papers": len(records),
        "papers_without_claims": sum(1 for r in records if r["counts"]["proposed"] == 0),
        **counts,
        "distinct_names": len(names),
        "effects": dict(effects),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "reasoning_tokens": reasoning_tokens,
        "cost_usd_of_the_calls_in_these_files": round(cost, 3),
    }
