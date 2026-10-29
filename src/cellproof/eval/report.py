"""M1: the per-claim table of base and augmented networks against the held-out set, and its totals.

Every number is a count of claims. Nothing is averaged, and not-expressible is never merged with wrong.
"""
from __future__ import annotations

from collections import Counter

from cellproof.eval.score import CORRECT, NOT_EXPRESSIBLE, WRONG, score_doc

SYMBOL = {CORRECT: "correct", WRONG: "WRONG", NOT_EXPRESSIBLE: "n/e", None: ""}


def score_networks(doc: dict, networks: dict[str, dict[str, str]]) -> dict:
    """{network name: rows}, rows as returned by score_doc, plus the claim texts for the table."""
    scored = {name: score_doc(doc, rules) for name, rules in networks.items()}
    return {"rows": scored}


def totals(rows: list[dict], key: str = "verdict") -> dict[str, int]:
    counts = Counter(r[key] for r in rows if r["category"] in ("scoreable", "scoreable_with_new_nodes"))
    return {CORRECT: counts[CORRECT], WRONG: counts[WRONG], NOT_EXPRESSIBLE: counts[NOT_EXPRESSIBLE]}


def markdown(doc: dict, scored: dict[str, list[dict]]) -> str:
    names = list(scored)
    claims = {(i["id"], n): c for i in doc["items"] for n, c in enumerate(i["claims"])}
    first = scored[names[0]]
    scoreable = [r for r in first if r["category"] in ("scoreable", "scoreable_with_new_nodes")]
    head = "| claim | readout | polarity | how scored | " + " | ".join(names) + " | no-information baseline |"
    lines = [head, "|" + "---|" * (len(names) + 5)]
    for index, row in enumerate(scoreable):
        claim = claims[(row["item"], row["claim"])]
        cells = []
        for name in names:
            match = next(r for r in scored[name] if (r["item"], r["claim"]) == (row["item"], row["claim"]))
            cells.append(SYMBOL[match["verdict"]])
        baseline = SYMBOL[next(r for r in scored[names[0]] if (r["item"], r["claim"]) == (row["item"], row["claim"]))["baseline"]]
        lines.append(
            f"| {row['item']}.{row['claim'] + 1} | {claim['readout']} | {claim['polarity']} | {row['mode']} | "
            + " | ".join(cells) + f" | {baseline} |"
        )
    lines.append("")
    lines.append("| network | correct | wrong | not expressible | of scoreable claims |")
    lines.append("|---|---|---|---|---|")
    for name in names:
        t = totals(scored[name])
        lines.append(f"| {name} | {t[CORRECT]} | {t[WRONG]} | {t[NOT_EXPRESSIBLE]} | {len(scoreable)} |")
    b = totals(first, "baseline")
    lines.append(f"| no-information baseline | {b[CORRECT]} | {b[WRONG]} | {b[NOT_EXPRESSIBLE]} | {len(scoreable)} |")
    return "\n".join(lines) + "\n"
