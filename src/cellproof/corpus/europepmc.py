"""Open-access full texts from Europe PMC, for mechanism extraction.

Selection is by rule, fixed here before any download: each query below is run, hits are kept in Europe PMC's relevance
order if they carry a Creative Commons licence and are not one of the held-out source papers, and the first PER_QUERY
new ones per query are taken. Queries exclude radiosensitisation papers, so that outcome data is not in the corpus.
Texts are saved git-ignored (data/raw/corpus); only the manifest (ids, titles, licences, queries) is committed.
"""
from __future__ import annotations

import json
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections.abc import Callable
from pathlib import Path

API = "https://www.ebi.ac.uk/europepmc/webservices/rest"
USER_AGENT = "cellproof-hackathon/0.1 (research prototype)"
PER_QUERY = 6
NO_OUTCOMES = (
    "NOT (radiosensiti* OR radiosensitiz* OR clonogenic) "
    "NOT (TITLE:Retracted OR TITLE:Correction OR TITLE:Erratum OR TITLE:Retraction)"
)
# The first attempt used Europe PMC's default order, which put recent single-study papers on unrelated tissues first
# (an oocyte knockout, a renal injury model). Established, much-cited papers on the topic are better sources of
# mechanisms, and citation count says nothing about the outcomes any paper reports.
SORT = "CITED desc"

# name -> query. Mechanism topics of the base network (ATM, p53, Mdm2, Wee1, Cdc25, mTOR, apoptosis, autophagy, p21)
# and of the nodes it lacks (ATR, CHK1, CHK2, DNA-PK). Chosen by topic, never by what any paper reports as an outcome.
QUERIES = {
    "g2_checkpoint": f'(TITLE:"G2/M" OR TITLE:"G2 checkpoint" OR TITLE:"cell cycle checkpoint") AND (ABSTRACT:CHK1 OR ABSTRACT:WEE1 OR ABSTRACT:ATR) AND OPEN_ACCESS:y {NO_OUTCOMES}',
    "atm_atr_signalling": f'TITLE:(ATM OR ATR) AND ABSTRACT:"DNA damage response" AND OPEN_ACCESS:y {NO_OUTCOMES}',
    "p53_mdm2_wip1": f'TITLE:(p53 AND (MDM2 OR WIP1 OR p21)) AND OPEN_ACCESS:y {NO_OUTCOMES}',
    "dna_pk": f'TITLE:("DNA-PK" OR "DNA-PKcs") AND ABSTRACT:"DNA damage" AND OPEN_ACCESS:y {NO_OUTCOMES}',
    "senescence_mtor": f'TITLE:senescence AND ABSTRACT:(p53 AND mTOR) AND ABSTRACT:"DNA damage" AND OPEN_ACCESS:y {NO_OUTCOMES}',
    "apoptosis_autophagy": f'TITLE:(apoptosis OR autophagy) AND ABSTRACT:(p53 AND "DNA damage") AND OPEN_ACCESS:y {NO_OUTCOMES}',
}


def _get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def search(query: str, *, page_size: int = 40, fetch: Callable[[str], bytes] = _get) -> list[dict]:
    params = {"query": query, "format": "json", "resultType": "core", "pageSize": page_size, "sort": SORT}
    return json.loads(fetch(f"{API}/search?{urllib.parse.urlencode(params)}"))["resultList"]["result"]


def full_text_xml(pmcid: str, *, fetch: Callable[[str], bytes] = _get) -> str:
    return fetch(f"{API}/{pmcid}/fullTextXML").decode("utf-8")


def _words(element: ET.Element) -> str:
    return " ".join("".join(element.itertext()).split())


def xml_to_text(xml: str) -> str:
    """Title, abstract, body paragraphs with section headings, and figure and table captions. No references."""
    root = ET.fromstring(xml)
    parts: list[str] = []

    def add(label: str, element: ET.Element | None) -> None:
        if element is not None and _words(element):
            parts.append(f"{label}{_words(element)}")

    add("TITLE: ", root.find(".//article-meta/title-group/article-title"))
    for abstract in root.findall(".//article-meta/abstract"):
        add("ABSTRACT: ", abstract)

    def walk(node: ET.Element) -> None:
        for child in node:
            if child.tag == "sec":
                add("\n## ", child.find("title"))
                walk(child)
            elif child.tag == "p":
                add("", child)
            elif child.tag in ("fig", "table-wrap"):
                add("CAPTION: ", child.find("caption"))

    body = root.find(".//body")
    if body is not None:
        walk(body)
    return "\n".join(parts)


def select(
    queries: dict[str, str],
    *,
    excluded: set[str],
    per_query: int = PER_QUERY,
    fetch: Callable[[str], bytes] = _get,
) -> list[dict]:
    """The manifest entries, in query order. A paper found by an earlier query is not taken again."""
    chosen: dict[str, dict] = {}
    for name, query in queries.items():
        taken = 0
        for record in search(query, fetch=fetch):
            pmcid = record.get("pmcid")
            licence = (record.get("license") or "").lower()
            if taken == per_query:
                break
            if not pmcid or pmcid in chosen or pmcid in excluded or not licence.startswith("cc"):
                continue
            chosen[pmcid] = {
                "pmcid": pmcid,
                "doi": record.get("doi"),
                "title": (record.get("title") or "").rstrip("."),
                "year": record.get("pubYear"),
                "journal": record.get("journalTitle"),
                "license": licence,
                "query": name,
            }
            taken += 1
    return list(chosen.values())


def download(manifest: list[dict], out_dir: Path, *, fetch: Callable[[str], bytes] = _get, pause: float = 0.3) -> list[str]:
    """Save each text as <pmcid>.txt in out_dir and add its length to the entry. Returns the ids that failed."""
    out_dir.mkdir(parents=True, exist_ok=True)
    failed = []
    for entry in manifest:
        path = out_dir / f"{entry['pmcid']}.txt"
        try:
            if not path.exists():
                path.write_text(xml_to_text(full_text_xml(entry["pmcid"], fetch=fetch)), encoding="utf-8")
                time.sleep(pause)
            entry["chars"] = len(path.read_text(encoding="utf-8"))
        except Exception as error:  # a 500 from Europe PMC is common; record it, do not stop
            entry["error"] = f"{type(error).__name__}: {error}"
            failed.append(entry["pmcid"])
    return failed
