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
    heldout: Path = typer.Option(Path("data/heldout/gupta2023_heldout_draft.json"), help="Its source papers are excluded."),
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
        tokens = sum(len(build_prompt(p["pmcid"], (texts / f"{p['pmcid']}.txt").read_text(encoding="utf-8"))) for p in papers) // 4
        typer.echo(f"{len(papers)} papers, about {tokens:,} input tokens (chars/4), at least ${tokens * price[1] / 1e6:.2f} input only")
        return
    target = out / model
    target.mkdir(parents=True, exist_ok=True)
    spent = 0.0
    for p in papers:
        result = extract_paper(p["pmcid"], (texts / f"{p['pmcid']}.txt").read_text(encoding="utf-8"), model=model)
        cost = 0.0 if result.llm.from_cache else cost_usd(result.llm.usage, model)
        spent += cost
        record = {
            "pmcid": p["pmcid"],
            "title": p["title"],
            "model": model,
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
