"""Full texts of the held-out source papers, fetched by this code (not summarised by a tool), so that every claim in the
held-out set can carry a verbatim quote that is checked to occur in the paper.

The texts are saved git-ignored (data/raw/heldout_texts). They are used only to quote and to locate sentences; they never
reach the extraction corpus or any prompt.
"""
from __future__ import annotations

import re
import urllib.request
from pathlib import Path

from cellproof.corpus.europepmc import full_text_xml, xml_to_text
from cellproof.extract.claims import normalize

TEXTS = Path(__file__).resolve().parents[3] / "data" / "raw" / "heldout_texts"


EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id={number}&rettype=xml&tool=cellproof-hackathon&email={email}"


def _efetch_xml(pmcid: str, email: str = "rigoutsosandreas@gmail.com") -> str:
    """NCBI E-utilities, the documented programmatic route to PMC; used when Europe PMC answers with an error."""
    url = EFETCH.format(number=pmcid.removeprefix("PMC"), email=email)
    request = urllib.request.Request(url, headers={"User-Agent": "cellproof-hackathon/0.1"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read().decode("utf-8")


def fetch_text(pmcid: str, directory: Path = TEXTS) -> str:
    """Europe PMC first, then E-utilities. A paper whose full text neither serves is returned as an empty string."""
    path = directory / f"{pmcid}.txt"
    if not path.exists():
        directory.mkdir(parents=True, exist_ok=True)
        text = ""
        for source in (full_text_xml, _efetch_xml):
            try:
                text = xml_to_text(source(pmcid))
            except Exception:  # noqa: BLE001, S112  a 500 or a missing body: try the next route
                continue
            if "\n## " in text or len(text) > 15_000:  # has a body, not just a title and abstract
                break
            text = ""
        path.write_text(text, encoding="utf-8")
    return path.read_text(encoding="utf-8")


def sentences(text: str) -> list[str]:
    flat = " ".join(text.split())
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z(\[])", flat) if s.strip()]


def find(text: str, *patterns: str) -> list[str]:
    """Sentences that match every pattern (case-insensitive regular expressions)."""
    compiled = [re.compile(p, re.IGNORECASE) for p in patterns]
    return [s for s in sentences(text) if all(c.search(s) for c in compiled)]


def passage(text: str, start: str, max_words: int = 45) -> str | None:
    """The verbatim text from `start` to the end of its sentence (or `max_words` words), or None when `start` is absent or
    occurs more than once. A sentence ends at ., ! or ? followed by a space or a capital letter (abstract sections in the
    XML run together without a space)."""
    flat = " ".join(text.split())
    first = flat.find(start)
    if first < 0 or flat.find(start, first + 1) >= 0:
        return None
    tail = flat[first:]
    end = re.search(r"(?<!Fig)(?<!Figs)(?<!al)(?<!vs)[.!?](?=\s|[A-Z])", tail)
    sentence = tail[: end.end()] if end else tail
    words = sentence.split()
    return " ".join(words[:max_words])


def quote_in_text(quote: str, text: str) -> bool:
    folded = normalize(quote)
    return len(folded) >= 15 and folded in normalize(text)
