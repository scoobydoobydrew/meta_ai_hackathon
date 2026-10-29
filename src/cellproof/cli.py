import datetime
import json
from pathlib import Path

import typer

from cellproof.corpus.europepmc import PER_QUERY, QUERIES, download, select
from cellproof.eval.heldout import load as load_heldout
from cellproof.meta_client import complete

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


if __name__ == "__main__":
    app()
