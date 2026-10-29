"""Counts over the decision records of one augmentation run. Every number reported for M2 and M3 comes from here."""
from __future__ import annotations

from collections import Counter


def summarize_records(records: list[dict]) -> dict:
    decided = [r for r in records if r["status"] in ("accepted", "rejected")]
    skipped = Counter(r["status"].removeprefix("skipped_") for r in records if r["status"].startswith("skipped_"))
    checked = [r for r in decided if r["attempts"]]  # the naive arm applies edits without checking them
    template_failed = [r for r in checked if r.get("template_failed")]
    repaired = [r for r in template_failed if r["status"] == "accepted"]
    by_effect = Counter(r.get("effect") for r in decided if r["status"] == "accepted")
    out = {
        "edits_proposed": len(decided),
        "accepted": sum(r["status"] == "accepted" for r in decided),
        "rejected": sum(r["status"] == "rejected" for r in decided),
        "skipped": dict(skipped),
        "accepted_by_effect": {k: v for k, v in by_effect.items() if k},
    }
    if checked:
        out.update(
            template_failed=len(template_failed),
            template_contradiction_rate=round(len(template_failed) / len(checked), 3),
            repaired=len(repaired),
            repair_success_rate=round(len(repaired) / len(template_failed), 3) if template_failed else None,
            llm_calls=sum(1 for r in decided for a in r["attempts"] if a["source"] == "llm" and a["rule"] is not None),
        )
    return out
