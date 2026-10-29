import typer

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


if __name__ == "__main__":
    app()
