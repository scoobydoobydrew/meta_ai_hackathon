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
            name = f"{arm}_min{k}"
            header = f"# CellProof augmentation arm={arm} min_papers={k} new_nodes={','.join(new_nodes)}; every change is in results/augment_{name}.json\n"
            (out_models / f"{name}.bnet").write_text(header + format_bnet(rules), encoding="utf-8")
            (out_results / f"augment_{name}.json").write_text(json.dumps(records, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
            summary["runs"][name] = {**summarize_records(records), "nodes": len(rules), "verification_cases_failing": failing}
            typer.echo(f"{name:18s} {json.dumps(summary['runs'][name])}")
    (out_results / "augmentation_summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


@app.command()
def score(
    heldout: Path = typer.Option(Path("data/heldout/gupta2023_heldout.json")),
    networks: str = typer.Option(
        "base=data/base/gupta2023.bnet,naive=data/models/naive_min2.bnet,verified=data/models/verified_min2.bnet,"
        "repaired=data/models/repaired_min2.bnet",
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
