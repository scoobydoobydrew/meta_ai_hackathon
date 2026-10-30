import datetime
import json
from pathlib import Path

import typer

from cellproof.corpus.europepmc import PER_QUERY, QUERIES, download, select
from cellproof.eval.heldout import load as load_heldout
from cellproof.extract.claims import build_prompt, extract_paper
from cellproof.extract.stats import LABELS, labelling_sample, load_records
from cellproof.extract.stats import summarize as summarize_extractions
from cellproof.meta_client import DEFAULT_MODEL, PRICES, complete, cost_usd

app = typer.Typer(no_args_is_help=True, help="CellProof: LLM-proposed rules, solver-verified.")


@app.callback()
def main() -> None:
    """CellProof command line."""


@app.command()
def smoke() -> None:
    """Call the Meta Model API once and print the reply."""
    res = complete("Reply with the word: ok")
    typer.echo(f"{res.text!r}  model={res.model}  from_cache={res.from_cache}")


@app.command()
def corpus(
    out: Path = typer.Option(Path("data/raw/corpus"), help="Where the full texts go (git-ignored)."),
    manifest: Path = typer.Option(Path("data/corpus/manifest.json"), help="Committed list of what was downloaded."),
    heldout: Path = typer.Option(Path("data/heldout/gupta2023_heldout.json"), help="Its source papers are excluded."),
) -> None:
    """Select open-access papers by the rules in corpus/europepmc.py, download their texts, write the manifest."""
    excluded = {source["pmcid"] for source in load_heldout(heldout)["sources"].values()}
    papers = select(QUERIES, excluded=excluded)
    failed = download(papers, out)
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(
        json.dumps(
            {
                "retrieved": datetime.date.today().isoformat(),
                "source": "Europe PMC REST API, open access subset",
                "per_query": PER_QUERY,
                "queries": QUERIES,
                "excluded_heldout_sources": sorted(excluded),
                "failed": failed,
                "papers": papers,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    typer.echo(f"{len(papers)} papers selected, {len(failed)} failed, manifest at {manifest}")


@app.command()
def extract(
    model: str = typer.Option(DEFAULT_MODEL, help="Standard model id."),
    kind: str = typer.Option("mechanism", help="mechanism (molecule on molecule) or stimulus (DNA damage on molecule)."),
    limit: int = typer.Option(0, help="Only the first N papers of the manifest (0 = all)."),
    dry_run: bool = typer.Option(False, help="Estimate tokens and cost, call nothing."),
    texts: Path = typer.Option(Path("data/raw/corpus")),
    manifest: Path = typer.Option(Path("data/corpus/manifest.json")),
    out: Path = typer.Option(Path("data/extractions"), help="One JSON per paper, under <out>/<model>/."),
) -> None:
    """Muse Spark extracts mechanism claims from every corpus paper. The only command that spends money."""
    papers = json.loads(manifest.read_text(encoding="utf-8"))["papers"]
    papers = [p for p in papers if (texts / f"{p['pmcid']}.txt").exists()][: limit or None]
    price = PRICES.get(model)
    if dry_run:
        tokens = sum(len(build_prompt(p["pmcid"], (texts / f"{p['pmcid']}.txt").read_text(encoding="utf-8"), kind)) for p in papers) // 4
        typer.echo(f"{len(papers)} papers, about {tokens:,} input tokens (chars/4), at least ${tokens * price[1] / 1e6:.2f} input only")
        return
    target = out / (model if kind == "mechanism" else f"{model}-{kind}")
    target.mkdir(parents=True, exist_ok=True)
    spent = 0.0
    for p in papers:
        result = extract_paper(p["pmcid"], (texts / f"{p['pmcid']}.txt").read_text(encoding="utf-8"), model=model, kind=kind)
        cost = 0.0 if result.llm.from_cache else cost_usd(result.llm.usage, model)
        spent += cost
        record = {
            "pmcid": p["pmcid"],
            "title": p["title"],
            "model": model,
            "kind": kind,
            "counts": result.counts,
            "grounded": [c.model_dump() for c in result.grounded],
            "ungrounded": [c.model_dump() for c in result.ungrounded],
            "outcome_level": [c.model_dump() for c in result.outcome_level],
            "usage": result.llm.usage,
            "from_cache": result.llm.from_cache,
        }
        (target / f"{p['pmcid']}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        typer.echo(f"{p['pmcid']:<12} {json.dumps(result.counts)}  cached={result.llm.from_cache}  ${cost:.3f}")
    typer.echo(f"spent this run: ${spent:.3f}")


@app.command()
def augment(
    arms: str = typer.Option("naive,verified,repaired", help="Comma-separated: naive, verified, repaired."),
    min_papers: str = typer.Option("1,2", help="Comma-separated: keep only edges supported by at least this many papers."),
    model: str = typer.Option(DEFAULT_MODEL, help="Model for the repair step."),
    out_models: Path = typer.Option(Path("data/models")),
    out_results: Path = typer.Option(Path("results")),
) -> None:
    """Ground the claims, build the edges, apply them in each arm, and write the networks and decision logs."""
    from cellproof.formalize.augment import run
    from cellproof.formalize.claims_to_edges import build_edges, load_pass
    from cellproof.formalize.edits import select_new_nodes
    from cellproof.formalize.entities import Grounder, Hgnc
    from cellproof.formalize.summary import summarize_records
    from cellproof.network.bnet import format_bnet, load_bnet
    from cellproof.verify.checker import check
    from cellproof.verify.repair import make_repair

    base = load_bnet("data/base/gupta2023.bnet")
    hgnc = Hgnc()
    sets = {"mechanism": load_pass("data/extractions/muse-spark-1.3"), "stimulus": load_pass("data/extractions/muse-spark-1.3-stimulus")}
    edges, dropped, names = build_edges(sets, Grounder(hgnc))
    hgnc.save()
    new_nodes, why = select_new_nodes(edges, set(base))
    out_models.mkdir(parents=True, exist_ok=True)
    out_results.mkdir(parents=True, exist_ok=True)
    summary = {"new_nodes": new_nodes, "why_selected": why, "claims_dropped": dict(dropped), "edges": len(edges), "runs": {}}
    for k in (int(x) for x in min_papers.split(",")):
        for arm in arms.split(","):
            rules, records = run(base, edges, new_nodes, arm=arm, min_papers=k, repair=make_repair(model) if arm == "repaired" else None)
            failing = sorted({f.case for f in check(rules).failures})
            tag = "" if model == DEFAULT_MODEL or arm != "repaired" else "_" + model.split("-")[1]  # repaired_wonder_min2
            name = f"{arm}{tag}_min{k}"
            header = f"# CellProof augmentation arm={arm} min_papers={k} new_nodes={','.join(new_nodes)}; every change is in results/augment_{name}.json\n"
            (out_models / f"{name}.bnet").write_text(header + format_bnet(rules), encoding="utf-8")
            (out_results / f"augment_{name}.json").write_text(json.dumps(records, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
            summary["runs"][name] = {**summarize_records(records), "nodes": len(rules), "verification_cases_failing": failing}
            typer.echo(f"{name:18s} {json.dumps(summary['runs'][name])}")
    summary_name = "augmentation_summary.json" if model == DEFAULT_MODEL else f"augmentation_summary_{model.split('-')[1]}.json"
    (out_results / summary_name).write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


@app.command()
def score(
    heldout: Path = typer.Option(Path("data/heldout/gupta2023_heldout.json")),
    networks: str = typer.Option(
        "base=data/base/gupta2023.bnet,naive_min2=data/models/naive_min2.bnet,verified_min2=data/models/verified_min2.bnet,"
        "repaired_min2=data/models/repaired_min2.bnet,naive_min1=data/models/naive_min1.bnet,"
        "verified_min1=data/models/verified_min1.bnet,repaired_min1=data/models/repaired_min1.bnet",
        help="name=path pairs, comma separated.",
    ),
    out: Path = typer.Option(Path("results/m1_heldout.md")),
) -> None:
    """M1: score each network on the held-out set, per claim. Refuses a set whose status is DRAFT."""
    from cellproof.eval.heldout import load
    from cellproof.eval.report import markdown, score_networks
    from cellproof.network.bnet import load_bnet

    doc = load(heldout)
    loaded = {pair.split("=")[0]: load_bnet(pair.split("=")[1]) for pair in networks.split(",")}
    scored = score_networks(doc, loaded)["rows"]
    out.parent.mkdir(parents=True, exist_ok=True)
    table = markdown(doc, scored)
    out.write_text(f"Held-out set status: {doc['status']}\n\n{table}", encoding="utf-8")
    out.with_suffix(".json").write_text(json.dumps(scored, indent=1) + "\n", encoding="utf-8")
    typer.echo(table)


@app.command()
def verify() -> None:
    """Rebuild every table from the cached model outputs, offline: extraction totals, the augmentation arms (M2, M3) and the
    held-out scores (M1). A request that is not in the cache is an error, so this can never spend money or drift."""
    import os

    os.environ["CELLPROOF_OFFLINE"] = "1"
    for name in ("muse-spark-1.3", "muse-spark-1.3-stimulus"):
        typer.echo(f"== extraction totals: {name}")
        extract_stats(Path("data/extractions") / name)
    typer.echo("== augmentation arms (M2, M3), replayed from cache")
    augment(arms="naive,verified,repaired", min_papers="1,2", model=DEFAULT_MODEL, out_models=Path("data/models"), out_results=Path("results"))
    augment(arms="repaired", min_papers="1,2", model="muse-wonder-1.0", out_models=Path("data/models"), out_results=Path("results"))
    typer.echo("== held-out scores (M1)")
    score(
        heldout=Path("data/heldout/gupta2023_heldout.json"),
        networks="base=data/base/gupta2023.bnet,naive_min2=data/models/naive_min2.bnet,verified_min2=data/models/verified_min2.bnet,"
        "repaired_min2=data/models/repaired_min2.bnet,naive_min1=data/models/naive_min1.bnet,verified_min1=data/models/verified_min1.bnet,"
        "repaired_min1=data/models/repaired_min1.bnet",
        out=Path("results/m1_heldout.md"),
    )
    interventions(
        networks="base=data/base/gupta2023.bnet,repaired_min2=data/models/repaired_min2.bnet", max_size=2, out=Path("results/interventions.md")
    )
    for recorded_path in sorted(Path("results").glob("llm_search_*.json")):
        typer.echo(f"== the search, AI alone, replayed from cache: {recorded_path.name}")
        recorded = json.loads(recorded_path.read_text(encoding="utf-8"))
        search_baseline(calls=recorded["calls"], model=recorded["model"], effort=recorded["effort"], network=Path(f"data/models/{recorded['network']}.bnet"),
                        out=recorded_path, timeout=60.0, retries=4, budget=recorded["summary"]["max_output_tokens"],
                        stalled=",".join(str(s) for s in recorded.get("stalled_seeds", [])))
    from cellproof.report.build import write as write_report
    from cellproof.results_md import render

    Path("results/RESULTS.md").write_text(render(), encoding="utf-8")
    typer.echo("wrote results/RESULTS.md")
    typer.echo(f"wrote {write_report()}")


@app.command()
def interventions(
    networks: str = typer.Option("base=data/base/gupta2023.bnet,repaired_min2=data/models/repaired_min2.bnet"),
    max_size: int = typer.Option(2),
    out: Path = typer.Option(Path("results/interventions.md")),
) -> None:
    """Minimal sets of knock-outs / gain-of-function that leave apoptosis as the only fate under damage, per network, with
    a step-by-step explanation of the first set that is new in the last network. Hypotheses for the lab, not treatments."""
    from cellproof.analysis.explain import explain
    from cellproof.analysis.interventions import all_attractors_are_fixed_points, describe, minimal_sets
    from cellproof.network.bnet import load_bnet

    loaded = {pair.split("=")[0]: load_bnet(pair.split("=")[1]) for pair in networks.split(",")}
    found = {name: minimal_sets(rules, max_size) for name, rules in loaded.items()}
    names = list(loaded)
    last, first = names[-1], names[0]
    lines = [f"# Minimal intervention sets (up to {max_size} changes) that leave apoptosis as the only fate under DNA damage", "",
             "Exhaustive and exact; readout nodes are not offered as targets. Hypotheses about the model, for lab testing; not treatments.", "",
             "| network | minimal sets | single changes | pairs |", "|---|---|---|---|"]
    for name in names:
        s = found[name]
        lines.append(f"| {name} | {len(s)} | {sum(len(x) == 1 for x in s)} | {sum(len(x) == 2 for x in s)} |")
    new_nodes = sorted(set(loaded[last]) - set(loaded[first]))
    only_last = [s for s in found[last] if s not in found[first]]
    lines += ["", f"Nodes in `{last}` but not in `{first}`: {', '.join(new_nodes) or 'none'}.",
              f"Sets found in `{last}` and not in `{first}`: {len(only_last)}; of these, {sum(any(n in new_nodes for n, _ in s) for s in only_last)} involve a new node.", ""]
    for s in only_last[:15]:
        lines.append(f"- {describe(s)}" + ("" if all_attractors_are_fixed_points(loaded[last], dict(s)) else "  (has an oscillating attractor)"))
    if only_last:
        lines += ["", f"### Why `{describe(only_last[0])}` works in `{last}`", "", "```", explain(loaded[last], dict(only_last[0])), "```"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    typer.echo("\n".join(lines[:12]))


@app.command("search-baseline")
def search_baseline(
    calls: int = typer.Option(5, help="Requests to the model, each with the rules shown in another order."),
    model: str = typer.Option(DEFAULT_MODEL),
    effort: str = typer.Option("minimal", help="Reasoning effort. At low, medium and high one call did not answer within 7 to 15 minutes."),
    network: Path = typer.Option(Path("data/models/repaired_min2.bnet"), help="The network the exhaustive search runs on."),
    out: Path = typer.Option(None, help="Default: results/llm_search_<effort>.json."),
    timeout: float = typer.Option(60.0, help="Seconds to wait for one attempt. A normal answer takes 10 to 30 s; some requests stall, so a late one is abandoned and asked again."),
    retries: int = typer.Option(4, help="Further attempts after a stall."),
    budget: int = typer.Option(12000, help="max_output_tokens: reasoning and answer share it; a request that runs out counts as unanswered."),
    stalled: str = typer.Option("", help="Seeds asked but never answered (stalled API), comma separated, recorded in the results and not counted."),
) -> None:
    """The AI-alone arm of the intervention search: the model names sets of one or two changes, the exact solver judges every one.
    Spends a few cents the first time (the answers are cached; `verify` replays them for free). Writes results/llm_search.json."""
    import os

    from cellproof.analysis.llm_search import ask, evaluate
    from cellproof.meta_client import make_client
    from cellproof.network.bnet import load_bnet

    rules = load_bnet(network)
    client = None if os.environ.get("CELLPROOF_OFFLINE") == "1" else make_client().with_options(timeout=timeout, max_retries=retries)
    attempts = ask(rules, calls, model=model, effort=effort, budget=budget, client=client)
    result = evaluate(rules, attempts, model, effort, network.stem, budget)
    result["stalled_seeds"] = [int(s) for s in stalled.split(",") if s.strip()]  # asked, never answered, not counted: a record, not a measurement
    out = out or Path(f"results/llm_search_{effort}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    typer.echo(json.dumps(result["summary"], indent=1))


@app.command()
def bench(calls: int = typer.Option(3, help="Calls per model.")) -> None:
    """Latency and cost of one repair call per model, same prompt, cache bypassed. Spends a few cents; writes results/model_bench.json."""
    import statistics
    import tempfile
    import time

    from cellproof.formalize.claims_to_edges import build_edges, load_pass
    from cellproof.formalize.edits import classify_edge, select_new_nodes
    from cellproof.formalize.entities import Grounder, Hgnc
    from cellproof.network.bnet import load_bnet
    from cellproof.verify.accept import evaluate_rule
    from cellproof.verify.repair import EFFORT, TEXT_FORMAT, build_prompt

    base = load_bnet("data/base/gupta2023.bnet")
    edges, _, _ = build_edges({"mechanism": load_pass("data/extractions/muse-spark-1.3"), "stimulus": load_pass("data/extractions/muse-spark-1.3-stimulus")}, Grounder(Hgnc()))
    rules = {**base, "ATR": "DNA_damage", "CHK1": "ATR"}  # the state in which CHK1 inhibits Cdc25 is proposed
    proposal = classify_edge(rules, edges["CHK1|inhibits|Cdc25"])
    prompt = build_prompt(proposal, evaluate_rule(rules, proposal.node, proposal.new_rule, proposal.edge), [], rules)
    result = {}
    for model in ("muse-spark-1.3", "muse-wonder-1.0"):
        seconds, tokens, costs = [], [], []
        for _ in range(calls):
            with tempfile.TemporaryDirectory() as fresh:
                start = time.perf_counter()
                answer = complete(prompt, model=model, cache_dir=Path(fresh), text=TEXT_FORMAT, reasoning={"effort": EFFORT})
                seconds.append(time.perf_counter() - start)
            tokens.append((answer.usage or {}).get("output_tokens", 0))
            costs.append(cost_usd(answer.usage, model))
        result[model] = {"calls": calls, "median_seconds": round(statistics.median(seconds), 1),
                         "median_output_tokens": int(statistics.median(tokens)), "median_cost_usd": round(statistics.median(costs), 4)}
        typer.echo(f"{model}: {result[model]}")
    Path("results/model_bench.json").write_text(json.dumps(result, indent=1) + "\n", encoding="utf-8")


@app.command()
def scaling(timeout: float = typer.Option(120.0), sizes: str = typer.Option("30,50,100,200,400")) -> None:
    """M6: seconds to compute fixed points and attractors against network size, with a timeout. Writes results/scaling.json."""
    from cellproof.analysis.scaling import table

    rows = table([int(s) for s in sizes.split(",")], [0, 1, 2], timeout)
    Path("results/scaling.json").write_text(json.dumps(rows, indent=1) + "\n", encoding="utf-8")
    for row in rows:
        typer.echo(json.dumps(row))


@app.command()
def report(
    out: Path = typer.Option(Path("results/report.html")),
    fragment: Path = typer.Option(None, help="Also write the page without its document wrapper (for publishing as an artifact)."),
) -> None:
    """Build the interactive report page from the files the pipeline wrote and from the exact solver."""
    from cellproof.report.build import write

    typer.echo(f"wrote {write(out, fragment)}")


@app.command()
def explain(
    edge: str = typer.Argument(..., help="An edge id such as 'CHK1|inhibits|Cdc25'."),
    run: Path = typer.Option(Path("results/augment_repaired_min1.json"), help="Decision log written by `cellproof augment`."),
) -> None:
    """Print the whole story of one edge: papers and quotes, the template rule, the solver's counterexample, each repair
    attempt and the verdict. Everything shown is read from the log; nothing is recomputed."""
    records = json.loads(run.read_text(encoding="utf-8"))
    record = next((r for r in records if r["edge"] == edge), None)
    if record is None:
        raise typer.Exit(f"{edge} is not in {run}; edges there: {', '.join(r['edge'] for r in records[:8])}, ...")
    typer.echo(f"EDGE {record['edge']}   status: {record['status']}   papers: {record['papers']}")
    for s in record["support"][:5]:
        typer.echo(f"  [{s['pmcid']}] ({s['pass']}, {s['context'][:50]}) \"{s['quote'][:200]}\"")
    if "template_rule" in record:
        typer.echo(f"NODE {record['node']}\n  current:  {record['old_rule']}\n  template: {record['template_rule']}")
    for number, attempt in enumerate(record.get("attempts", [])):
        if attempt["source"] == "llm_answer":
            typer.echo(f"  model says: {attempt['explanation']}")
            continue
        verdict = "ACCEPTED" if attempt["accepted"] else "REJECTED " + ",".join(attempt["reasons"])
        typer.echo(f"ATTEMPT {number} ({attempt['source']}): {attempt['rule']}\n  solver: {verdict} {attempt.get('effect') or ''}")
        for message in attempt["messages"][:2]:
            typer.echo(f"    - {message[:300]}")
    if record["status"] == "accepted" and "final_rule" in record:
        typer.echo(f"FINAL RULE of {record['node']}: {record['final_rule']}")


@app.command("extract-stats")
def extract_stats(directory: Path = typer.Option(Path("data/extractions/muse-spark-1.3"))) -> None:
    """Totals over the saved extractions (no API call)."""
    typer.echo(json.dumps(summarize_extractions(load_records(directory)), indent=2))


@app.command("label-sample")
def label_sample(
    directory: Path = typer.Option(Path("data/extractions/muse-spark-1.3")),
    out: Path = typer.Option(Path("data/labels/m4_sample.csv")),
) -> None:
    """Write the 50-claim sample the human labels by hand (M4). Refuses to overwrite a labelled file."""
    import csv

    if out.exists() and any(row["label"] for row in csv.DictReader(out.open(encoding="utf-8"))):
        raise typer.Exit(f"{out} already holds labels; not overwriting")
    rows = labelling_sample(load_records(directory))
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    typer.echo(f"{len(rows)} claims written to {out}; labels allowed: {', '.join(LABELS)}")


if __name__ == "__main__":
    app()
