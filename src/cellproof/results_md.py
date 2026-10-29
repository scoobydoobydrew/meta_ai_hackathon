"""results/RESULTS.md: every table the README quotes, rendered from the files the pipeline wrote. No number is typed here."""
from __future__ import annotations

import csv
import json
from pathlib import Path

from cellproof.extract.stats import load_records, summarize

ROOT = Path(__file__).resolve().parents[2]


def _load(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def extraction_section() -> str:
    lines = ["## Extraction (Muse Spark, Standard, reasoning effort low)", "",
             "| pass | papers | claims proposed | quote found in paper | quote not found | names an outcome | tokens in / out | cost (USD, price table) |",
             "|---|---|---|---|---|---|---|---|"]
    for label, name in (("molecule on molecule", "muse-spark-1.3"), ("DNA damage on molecule", "muse-spark-1.3-stimulus")):
        directory = ROOT / "data" / "extractions" / name
        if not directory.exists():
            continue
        s = summarize(load_records(directory))
        lines.append(
            f"| {label} | {s['papers']} | {s['proposed']} | {s['grounded']} | {s['ungrounded']} | {s['outcome_level']} | "
            f"{s['input_tokens']:,} / {s['output_tokens']:,} | {s['cost_usd_of_the_calls_in_these_files']:.2f} |"
        )
    lines += ["", "\"Quote found\" means the quoted sentence occurs verbatim in the paper. It does not mean the claim is a correct "
              "reading of it: that is M4, below.", ""]
    return "\n".join(lines)


def augmentation_section() -> str:
    summary = _load(ROOT / "results" / "augmentation_summary.json")
    if not summary:
        return "## Augmentation\n\nNot run yet.\n"
    lines = ["## Rule edits and the solver (M2, M3)", "",
             f"New nodes chosen by the mechanical rule: {', '.join(summary['new_nodes'])}. "
             f"{summary['edges']} edges between grounded names; claims dropped before that: {summary['claims_dropped']}.", "",
             "| arm | edges kept | proposals | accepted | rejected | template contradicts the cases | repaired | vacuous attempts | already present / implied / conflict | verification cases the final network fails |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for name, r in summary["runs"].items():
        checked = "template_failed" in r
        skipped = r["skipped"]
        lines.append(
            f"| {name} | {'≥' + name.split('min')[-1] + ' paper(s)'} | {r['edits_proposed']} | {r['accepted']} | {r['rejected']} | "
            + (f"{r['template_failed']} of {r['edits_proposed']} ({r['template_contradiction_rate']:.0%})" if checked else "not checked")
            + f" | {r.get('repaired', '')} | {r.get('vacuous_attempts', '')} | "
            f"{skipped.get('present', 0)} / {skipped.get('implied', 0)} / {skipped.get('conflict', 0)} | "
            f"{', '.join(r['verification_cases_failing']) or 'none'} |"
        )
    lines += ["", "*naive* applies every edit unchecked (the \"LLM only\" arm); *verified* applies an edit only if the solver accepts "
              "the template; *repaired* sends a rejected edit back to the model with the counterexample, up to 3 attempts, and "
              "accepts a repair only if it also changes some prediction (not vacuous).", ""]
    wonder = _load(ROOT / "results" / "augmentation_summary_wonder.json")
    if wonder:
        lines += ["### Model ablation (M5): the repair step with Muse Wonder instead of Muse Spark", "",
                  "| arm | model | template contradicts | repaired | vacuous attempts | accepted | rejected |", "|---|---|---|---|---|---|---|"]
        for model, data in (("muse-spark-1.3", summary["runs"]), ("muse-wonder-1.0", wonder["runs"])):
            for k in (1, 2):
                key = f"repaired_min{k}" if model == "muse-spark-1.3" else f"repaired_wonder_min{k}"
                if key in data:
                    r = data[key]
                    lines.append(f"| ≥{k} paper(s) | {model} | {r['template_failed']} | {r['repaired']} | {r['vacuous_attempts']} | {r['accepted']} | {r['rejected']} |")
        lines.append("")
    bench = _load(ROOT / "results" / "model_bench.json")
    if bench:
        lines += ["Latency and cost of one repair call, same prompt, no cache:", "", "| model | calls | median seconds | median output tokens | median cost (USD) |", "|---|---|---|---|---|"]
        for model, b in bench.items():
            lines.append(f"| {model} | {b['calls']} | {b['median_seconds']} | {b['median_output_tokens']} | {b['median_cost_usd']} |")
        lines.append("")
    return "\n".join(lines)


def heldout_section() -> str:
    path = ROOT / "results" / "m1_heldout.md"
    if not path.exists():
        return "## Held-out outcomes (M1)\n\nNot scored yet.\n"
    return "## Held-out outcomes (M1)\n\n" + path.read_text(encoding="utf-8") + "\n"


def interventions_section() -> str:
    path = ROOT / "results" / "interventions.md"
    if not path.exists():
        return "## Interventions\n\nNot computed yet.\n"
    body = path.read_text(encoding="utf-8").replace("# Minimal intervention", "## Minimal intervention", 1)
    return body


def labels_section() -> str:
    path = ROOT / "data" / "labels" / "m4_sample.csv"
    if not path.exists():
        return "## Extraction accuracy (M4)\n\nNo sample.\n"
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    labelled = [r for r in rows if r["label"].strip()]
    if not labelled:
        return f"## Extraction accuracy (M4)\n\nTBD: 0 of {len(rows)} sampled claims have been labelled by a human.\n"
    correct = sum(r["label"].strip() == "correct" for r in labelled)
    return f"## Extraction accuracy (M4)\n\n{correct} of {len(labelled)} labelled claims are `correct` (human labels, {len(rows)} sampled).\n"


def scaling_section() -> str:
    rows = _load(ROOT / "results" / "scaling.json")
    if not rows:
        return "## Scaling (M6)\n\nNot measured yet.\n"
    lines = ["## Scaling of the exact checker (M6)", "",
             "Fixed points (mpbn) and asynchronous attractors (AEON) of one network, 120 s limit per network, measured on the "
             "machine that wrote `results/scaling.json`. `random` networks are hard on purpose; `cascade` adds downstream chains "
             "to the base network.", "", "| family | nodes | seed | status | seconds | fixed points | attractors |", "|---|---|---|---|---|---|---|"]
    for r in rows:
        lines.append(f"| {r['family']} | {r['nodes']} | {r['seed']} | {r['status']} | {r['seconds']} | {r.get('fixed_points', '')} | {r.get('attractors', '')} |")
    lines.append("")
    return "\n".join(lines)


def render() -> str:
    parts = ["# Results", "", "Generated by `python -m cellproof.cli verify` from cached model outputs; do not edit by hand.", "",
             extraction_section(), augmentation_section(), heldout_section(), interventions_section(), labels_section(), scaling_section()]
    return "\n".join(parts)
