"""Everything the report page shows, collected from the files the pipeline wrote and from the exact solver.
No number on the page is typed by hand: if a file is missing, the section says so.
"""
from __future__ import annotations

import ast
import csv
import glob
import hashlib
import json
import re
import subprocess
import time
from itertools import combinations
from pathlib import Path

from cellproof.analysis.attractors import fixed_points, perturb
from cellproof.analysis.interventions import READOUT_NODES, minimal_sets, search_space
from cellproof.analysis.llm_search import candidate_sets
from cellproof.eval.heldout import load as load_heldout
from cellproof.eval.heldout import summarize
from cellproof.extract.stats import load_records, summarize as summarize_extractions
from cellproof.meta_client import cost_usd
from cellproof.network.bnet import load_bnet
from cellproof.network.logic import influence_edges
from cellproof.network.phenotypes import classify, g2_arrest
from cellproof.report.layout import FATES, GROUPS, HALOS, HEIGHT, NEW_NODES, NODE_ORDER, NODES, WIDTH
from cellproof.verify.checker import check, check_case, load_cases

ROOT = Path(__file__).resolve().parents[3]
FATE_CODES = {"proliferation": 0, "arrest": 1, "senescence": 2, "autophagy": 3, "apoptosis": 4, None: 5}

NETWORKS = {  # key -> (label, path); the lab offers these three
    "published": ("Published model", ROOT / "data" / "base" / "gupta2023.bnet"),
    "unchecked": ("Edits applied unchecked", ROOT / "data" / "models" / "naive_min2.bnet"),
    "augmented": ("Verified and repaired", ROOT / "data" / "models" / "repaired_min2.bnet"),
}
ARMS = [  # key, label, path; for the verification heat map
    ("published", "Published model", ROOT / "data" / "base" / "gupta2023.bnet"),
    ("naive_min1", "Unchecked, all edges", ROOT / "data" / "models" / "naive_min1.bnet"),
    ("naive_min2", "Unchecked, ≥2 papers", ROOT / "data" / "models" / "naive_min2.bnet"),
    ("verified_min1", "Solver only, all edges", ROOT / "data" / "models" / "verified_min1.bnet"),
    ("verified_min2", "Solver only, ≥2 papers", ROOT / "data" / "models" / "verified_min2.bnet"),
    ("repaired_min1", "Solver and repair, all edges", ROOT / "data" / "models" / "repaired_min1.bnet"),
    ("repaired_min2", "Solver and repair, ≥2 papers", ROOT / "data" / "models" / "repaired_min2.bnet"),
]

FAILURE = re.compile(
    r"^(V\d\d) \((.*?)\); setting (\{.*?\}): (\w+); expected phenotypes (\[.*?\]) \((\w+)\), found (\[.*?\])(?:; witness fixed point (\{.*\}))?$"
)


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def _git(*args: str) -> str:
    try:
        return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:  # noqa: BLE001
        return ""


# ---------------------------------------------------------------- networks and the exact solver's table

def network_block(label: str, rules: dict[str, str], base_edges: set) -> dict:
    edges = [[s, t, 1 if sign == "+" else -1, int((s, t, sign) not in base_edges)] for s, t, sign in influence_edges(rules) if s != t]
    return {"label": label, "nodes": [n for n in NODE_ORDER if n in rules], "rules": {n: rules[n] for n in NODE_ORDER if n in rules}, "edges": edges}


def _encode(state: dict[str, int]) -> int:
    return sum(1 << i for i, n in enumerate(NODE_ORDER) if state.get(n))


def lab_table(rules: dict[str, str], damage: int, pairs: bool) -> dict[str, list[int]]:
    """{setting: [state, code, state, code, ...]} with state a bit set over NODE_ORDER and code = fate * 2 + (G2 arrest)."""
    free = [n for n in NODE_ORDER if n in rules and n != "DNA_damage"]
    literals = [(n, v) for n in free for v in (0, 1)]
    settings = [()] + [(lit,) for lit in literals]
    if pairs:
        settings += [(a, b) for a, b in combinations(literals, 2) if a[0] != b[0]]
    table: dict[str, list[int]] = {}
    for setting in settings:
        key = ",".join(f"{n}={v}" for n, v in sorted(setting))
        points = fixed_points(perturb(rules, {"DNA_damage": damage, **dict(setting)}))
        flat: list[int] = []
        for state, code in sorted((_encode(fp), FATE_CODES[classify(fp)] * 2 + int(g2_arrest(fp))) for fp in points):
            flat += [state, code]
        table[key] = flat
    return table


def cached_lab(name: str, rules: dict[str, str], pairs: bool = True) -> dict:
    digest = hashlib.sha256(json.dumps(rules, sort_keys=True).encode()).hexdigest()[:16]
    path = ROOT / "results" / ".cache" / f"lab_{name}{'' if pairs else '_singles'}_{digest}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    table = {"d1": lab_table(rules, 1, pairs=pairs), "d0": lab_table(rules, 0, pairs=False)}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(table, separators=(",", ":")), encoding="utf-8")
    return table


# ---------------------------------------------------------------- decision logs

def _structured(message: str) -> dict:
    match = FAILURE.match(message)
    if not match:
        return {"text": message[:500]}
    case, origin, setting, problem, expected, how, found, witness = match.groups()
    return {
        "case": case, "origin": origin, "setting": ast.literal_eval(setting), "problem": problem,
        "expected": ast.literal_eval(expected), "match": how, "found": ast.literal_eval(found),
        "witness": ast.literal_eval(witness) if witness else None,
    }


def case_file(name: str) -> list[dict]:
    records = _read(ROOT / "results" / f"augment_{name}.json") or []
    out = []
    for r in records:
        item = {
            "id": r["edge"], "papers": r["papers"], "status": r["status"], "kind": r.get("kind"), "node": r.get("node"),
            "old": r.get("old_rule"), "template": r.get("template_rule"), "final": r.get("final_rule"), "effect": r.get("effect"),
            "repaired": bool(r.get("repaired")), "detail": r.get("detail", ""),
            "support": [{"pmcid": s["pmcid"], "quote": s["quote"][:330], "context": s["context"][:100], "pass": s["pass"]} for s in r["support"][:4]],
            "attempts": [],
        }
        for a in r.get("attempts", []):
            if a["source"] == "llm_answer":
                item["attempts"].append({"source": "explanation", "text": a["explanation"][:900], "gave_up": a["give_up"]})
            else:
                item["attempts"].append({
                    "source": a["source"], "rule": a["rule"], "accepted": a["accepted"], "reasons": a["reasons"], "effect": a.get("effect"),
                    "failures": [_structured(m) for m in a["messages"][:3]],
                })
        out.append(item)
    return out


# ---------------------------------------------------------------- the rest

def verification() -> dict:
    cases = load_cases()
    matrix: dict[str, dict[str, list[str]]] = {}
    for key, _, path in ARMS:
        if not path.exists():
            continue
        found: dict[str, list[str]] = {}
        for f in check(load_bnet(path)).failures:
            found.setdefault(f.case, []).append(f.problem)
        matrix[key] = found
    return {
        "cases": [{"id": c.id, "origin": c.origin, "setting": {**c.stimulus, **c.perturbation}, "expected": sorted(c.phenotypes), "match": c.match} for c in cases],
        "matrix": matrix,
        "arms": [{"key": k, "label": label} for k, label, p in ARMS if p.exists()],
    }


def heldout() -> dict | None:
    scored = _read(ROOT / "results" / "m1_heldout.json")
    path = ROOT / "data" / "heldout" / "gupta2023_heldout.json"
    if not scored or not path.exists():
        return None
    doc = load_heldout(path)
    base_nodes = set(load_bnet(NETWORKS["published"][1]))
    names = list(scored)
    claims = []
    for row in scored[names[0]]:
        if row["category"] not in ("scoreable", "scoreable_with_new_nodes"):
            continue
        item = next(i for i in doc["items"] if i["id"] == row["item"])
        claim = item["claims"][row["claim"]]
        source = doc["sources"][item["source"]]
        claims.append({
            "id": f"{row['item']}.{row['claim'] + 1}", "readout": claim["readout"], "polarity": claim["polarity"], "mode": row["mode"],
            "perturbation": item["perturbation"]["nodes"], "stimulus": item["stimulus"], "context": item["context"][:160],
            "statement": claim["statement"], "quote": claim["quote"], "cite": source["cite"], "pmcid": source["pmcid"],
            "verdicts": {n: next(r for r in scored[n] if (r["item"], r["claim"]) == (row["item"], row["claim"]))["verdict"] for n in names},
            "baseline": row["baseline"],
            "no_stable_state": {n: bool(next(r for r in scored[n] if (r["item"], r["claim"]) == (row["item"], row["claim"]))["no_stable_state"]) for n in names},
        })
    totals = {n: {v: sum(1 for c in claims if c["verdicts"][n] == v) for v in ("correct", "wrong", "not_expressible")} for n in names}
    categories = dict(summarize(doc, base_nodes))
    return {
        "status": doc["status"], "networks": names, "claims": claims, "totals": totals, "categories": categories, "papers": len(doc["sources"]),
        "all_claims": sum(len(i["claims"]) for i in doc["items"]), "baseline": {v: sum(1 for c in claims if c["baseline"] == v) for v in ("correct", "wrong", "not_expressible")},
    }


def api_usage() -> dict:
    n = i = o = r = 0
    cost = 0.0
    for f in glob.glob(str(ROOT / "cache" / "*.json")):
        rec = json.loads(Path(f).read_text(encoding="utf-8"))
        u = rec.get("usage") or {}
        n += 1
        i += u.get("input_tokens", 0)
        o += u.get("output_tokens", 0)
        r += (u.get("output_tokens_details") or {}).get("reasoning_tokens", 0)
        cost += cost_usd(u, rec["model"])
    return {"requests": n, "input_tokens": i, "output_tokens": o, "reasoning_tokens": r, "estimated_usd": round(cost, 2)}


def interventions(networks: dict[str, dict[str, str]]) -> dict:
    out: dict = {}
    seconds = {}
    for key in ("published", "augmented"):
        start = time.perf_counter()
        out[key] = [[[n, v] for n, v in s] for s in minimal_sets(networks[key], 2)]
        seconds[key] = time.perf_counter() - start
    out["readout"] = sorted(READOUT_NODES)  # genes that define the outcome: forcing one of them is not an intervention
    # the header's story: how many changes the solver tried on the checked network, how long it took here, how many it kept, and how the
    # count grows with the number of genes changed at once (a projection at the speed measured here, not a measurement)
    rules = networks["augmented"]
    total = search_space(rules, 2)
    sizes = {str(k): search_space(rules, k) for k in range(1, 6)}
    order = {frozenset(c): i for i, c in enumerate(candidate_sets(rules, 2))}
    out["space"] = {
        "total": total, "seconds": round(seconds["augmented"], 1), "found": len(out["augmented"]), "genes": sum(1 for n in rules if n not in READOUT_NODES),
        "sizes": sizes, "projected_seconds": {k: round(seconds["augmented"] * n / total) for k, n in sizes.items()},
        "keep": sorted(order[frozenset(map(tuple, s))] for s in out["augmented"]),
    }
    return out


EFFORTS = ["minimal", "low", "medium", "high", "xhigh", "max"]


def llm_search_block(rules: dict[str, str]) -> dict | None:
    """The AI-alone arms of the search (results/llm_search_<effort>.json, written by `cellproof search-baseline`): the numbers and, for each
    distinct valid proposal, which dot of the header's field (which set of changes) it is and whether the solver says it works. `best` is the
    arm with the highest reasoning effort, the model's best shot, which the header quotes."""
    order = {frozenset(c): i for i, c in enumerate(candidate_sets(rules, 2))}
    arms = {}
    for path in sorted((ROOT / "results").glob("llm_search_*.json")):
        doc = _read(path)
        marks, seen = [], set()
        for attempt in doc["attempts"]:
            for p in attempt["proposals"]:
                key = frozenset(map(tuple, p["changes"]))
                if p["valid"] and key not in seen:
                    seen.add(key)
                    marks.append({"i": order[key], "w": int(p["works"]), "m": int(p["minimal"])})
        arms[doc["effort"]] = {"model": doc["model"], "effort": doc["effort"], "calls": doc["calls"], "summary": doc["summary"], "marks": marks, "stalled": len(doc.get("stalled_seeds", []))}
    if not arms:
        return None
    answered = [e for e, a in arms.items() if a["summary"]["distinct"] > 0] or list(arms)  # an arm in which nothing was answered quotes nothing
    return {"best": max(answered, key=lambda e: EFFORTS.index(e) if e in EFFORTS else -1), "arms": arms}


def story_block(published: dict[str, str], base_edges: set) -> dict | None:
    """The three networks of the test-bench story (published; one unchecked edit; the repaired edit) and the ten verification cases run
    on each by the exact solver. Built from the real decision log of CHK1 inhibits CDC25C, not from a toy."""
    records = _read(ROOT / "results" / "augment_repaired_min2.json") or []
    chk1 = next((r for r in records if r["edge"] == "CHK1|inhibits|Cdc25"), None)
    if chk1 is None or "final_rule" not in chk1:
        return None
    anchor = {"ATR": "DNA_damage", "CHK1": "ATR"}  # the two anchors that existed when this edit was judged
    versions = {
        "A": published,
        "B": {**published, **anchor, "Cdc25": chk1["template_rule"]},
        "C": {**published, **anchor, "Cdc25": chk1["final_rule"]},
    }
    cases = []
    for case in load_cases():
        setting = {**case.stimulus, **case.perturbation}
        row = {"id": case.id, "origin": case.origin, "setting": setting, "expected": sorted(case.phenotypes), "match": case.match}
        for key, rules in versions.items():
            points = fixed_points(perturb(rules, setting))
            flat: list[int] = []
            for state, code in sorted((_encode(fp), FATE_CODES[classify(fp)] * 2 + int(g2_arrest(fp))) for fp in points):
                flat += [state, code]
            row[key] = {"ok": not check_case(rules, case), "states": flat}
        cases.append(row)
    attempts = [a for a in chk1["attempts"] if a["source"] == "llm_answer"]
    said = attempts[0]["explanation"].split(" Rule is ")[0] if attempts else ""  # the model's reasoning up to where it restates the rule
    said = said if len(said) <= 330 else said[:330].rsplit(" ", 1)[0] + "…"
    vacuous = next((r for r in records if r["edge"] == "ATR|activates|ATM_pH2AX"), None)
    first_vacuous = next((a for a in (vacuous or {}).get("attempts", []) if a["source"] == "llm" and "vacuous" in a["reasons"]), None)
    return {
        "versions": {k: network_block(k, r, base_edges) for k, r in versions.items()},
        "lab": {k: cached_lab(f"story_{k}", r, pairs=False) for k, r in versions.items()},
        "cases": cases,
        "patch": {
            "edge": chk1["edge"], "papers": chk1["papers"], "old": chk1["old_rule"], "template": chk1["template_rule"], "final": chk1["final_rule"],
            "quotes": [{"pmcid": s["pmcid"], "quote": s["quote"][:300], "context": s["context"][:90]} for s in chk1["support"][:3]],
            "explanation": said,
        },
        "vacuous": ({"edge": vacuous["edge"], "rule": first_vacuous["rule"], "old": vacuous["old_rule"]} if first_vacuous else None),
    }


def grounding_examples() -> list[dict]:
    """How a few real names from the papers are resolved, computed by the same grounder the pipeline uses (offline)."""
    import os

    from cellproof.formalize.entities import Grounder, Hgnc

    previous = os.environ.get("CELLPROOF_OFFLINE")
    os.environ["CELLPROOF_OFFLINE"] = "1"
    try:
        grounder = Grounder(Hgnc())
        names = ["Chk1", "DNA-PKcs", "ATM", "γH2AX", "p21Cip1/Waf1", "ionizing radiation", "NBS1", "ROS", "mTOR", "Cdc25A", "UV"]
        return [{"name": n, "kind": g.kind, "node": g.node, "detail": g.detail} for n in names for g in [grounder.ground(n)]]
    finally:
        if previous is None:
            os.environ.pop("CELLPROOF_OFFLINE", None)
        else:
            os.environ["CELLPROOF_OFFLINE"] = previous


def check_seconds(rules: dict[str, str]) -> float:
    import time

    best = 1e9
    for _ in range(3):
        start = time.perf_counter()
        check(rules)
        best = min(best, time.perf_counter() - start)
    return round(best, 1)


def collect() -> dict:
    rules = {k: load_bnet(path) for k, (label, path) in NETWORKS.items() if path.exists()}
    base_edges = {(s, t, sign) for s, t, sign in influence_edges(rules["published"])}
    annotations = _read(ROOT / "data" / "base" / "gupta2023_annotations.json") or {"nodes": {}, "interactions": []}
    summary = _read(ROOT / "results" / "augmentation_summary.json")
    docket = {name: case_file(name) for name in ("repaired_min2", "repaired_min1") if (ROOT / "results" / f"augment_{name}.json").exists()}
    heldout_hash = (ROOT / "data" / "heldout" / "heldout.sha256").read_text(encoding="ascii").split()[0] if (ROOT / "data" / "heldout" / "heldout.sha256").exists() else ""
    extraction = {
        "mechanism": summarize_extractions(load_records(ROOT / "data" / "extractions" / "muse-spark-1.3")),
        "stimulus": summarize_extractions(load_records(ROOT / "data" / "extractions" / "muse-spark-1.3-stimulus")),
    }
    labels = ROOT / "data" / "labels" / "m4_sample.csv"
    label_rows = list(csv.DictReader(labels.open(encoding="utf-8"))) if labels.exists() else []
    return {
        "meta": {
            "commit": _git("rev-parse", "--short", "HEAD"), "tags": _git("tag", "--list", "heldout-*").split(), "heldout_sha256": heldout_hash,
            "corpus_papers": len((_read(ROOT / "data" / "corpus" / "manifest.json") or {"papers": []})["papers"]),
            "check_seconds": check_seconds(rules["augmented"]), "built": __import__("datetime").date.today().isoformat(),
        },
        "grounding_examples": grounding_examples(),
        "story": story_block(rules["published"], base_edges),
        "layout": {
            "width": WIDTH, "height": HEIGHT, "groups": GROUPS, "halos": HALOS, "new_nodes": NEW_NODES,
            "nodes": {n: {"group": g, "x": x, "y": y, "name": annotations["nodes"].get(n, "")} for n, (g, x, y) in NODES.items()},
            "fates": {k: {"label": lab, "x": x, "y": y, "defined_by": nodes} for k, (lab, x, y, nodes) in FATES.items()},
            "order": NODE_ORDER,
        },
        "networks": {k: network_block(NETWORKS[k][0], r, base_edges) for k, r in rules.items()},
        "lab": {k: cached_lab(k, r) for k, r in rules.items()},
        "justifications": {f"{a['regulator']}|{a['target']}": a["text"] for a in annotations["interactions"]},
        "extraction": extraction,
        "summary": summary,
        "wonder": _read(ROOT / "results" / "augmentation_summary_wonder.json"),
        "bench": _read(ROOT / "results" / "model_bench.json"),
        "docket": docket,
        "verification": verification(),
        "heldout": heldout(),
        "interventions": interventions(rules),
        "llm_search": llm_search_block(rules["augmented"]),
        "scaling": _read(ROOT / "results" / "scaling.json"),
        "api": api_usage(),
        "labels": {"sampled": len(label_rows), "labelled": sum(1 for r in label_rows if r["label"].strip())},
    }
