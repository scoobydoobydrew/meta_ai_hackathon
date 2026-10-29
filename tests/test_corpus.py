import json
from pathlib import Path

from cellproof.corpus.europepmc import download, select, xml_to_text
from cellproof.eval.heldout import load

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "data" / "heldout" / "gupta2023_heldout_draft.json"
MANIFEST = ROOT / "data" / "corpus" / "manifest.json"

JATS = """<article><front><article-meta>
<title-group><article-title>Checkpoint <italic>kinase</italic> signalling</article-title></title-group>
<abstract><p>ATR activates CHK1.</p></abstract></article-meta></front>
<body><sec><title>Results</title><p>CHK1 phosphorylates <xref>CDC25</xref> and so blocks CDC25 activity.</p>
<fig><caption><p>Figure 1. A scheme of the pathway.</p></caption></fig></sec></body>
<back><ref-list><ref><mixed-citation>Do not include this reference.</mixed-citation></ref></ref-list></back></article>"""


def test_xml_to_text_keeps_title_abstract_body_and_captions_but_not_references():
    text = xml_to_text(JATS)
    assert text.startswith("TITLE: Checkpoint kinase signalling")
    assert "ABSTRACT: ATR activates CHK1." in text
    assert "## Results" in text and "CHK1 phosphorylates CDC25 and so blocks CDC25 activity." in text
    assert "CAPTION: Figure 1. A scheme of the pathway." in text
    assert "reference" not in text


def _search_reply(*records):
    return json.dumps({"resultList": {"result": list(records)}}).encode()


def record(pmcid, licence="cc by", title="A paper."):
    return {"pmcid": pmcid, "license": licence, "title": title, "pubYear": "2020", "doi": "10.1/x"}


def test_select_skips_excluded_unlicensed_and_repeated_papers_and_stops_at_the_limit():
    replies = {
        "qa": [record("PMC1"), record("PMC2", licence=None), record("PMC3"), record("PMC4"), record("PMC5")],
        "qb": [record("PMC3"), record("PMC6")],
    }

    def fetch(url):
        for name, records in replies.items():
            if f"query={name}" in url:
                return _search_reply(*records)
        raise AssertionError(url)

    chosen = select({"a": "qa", "b": "qb"}, excluded={"PMC4"}, per_query=2, fetch=fetch)
    assert [(c["pmcid"], c["query"]) for c in chosen] == [("PMC1", "a"), ("PMC3", "a"), ("PMC6", "b")]
    assert chosen[0]["title"] == "A paper"  # trailing full stop removed


def test_download_records_a_failure_and_continues(tmp_path):
    def fetch(url):
        if "PMC2" in url:
            raise OSError("HTTP 500")
        return JATS.encode()

    manifest = [{"pmcid": "PMC1"}, {"pmcid": "PMC2"}]
    failed = download(manifest, tmp_path, fetch=fetch, pause=0)
    assert failed == ["PMC2"] and "error" in manifest[1]
    assert (tmp_path / "PMC1.txt").exists() and manifest[0]["chars"] > 50


def test_the_committed_manifest_never_contains_a_held_out_source_paper():
    if not MANIFEST.exists():
        return
    held_out = {s["pmcid"] for s in load(DRAFT)["sources"].values()}
    corpus = {e["pmcid"] for e in json.loads(MANIFEST.read_text(encoding="utf-8"))["papers"]}
    assert len(held_out) == 7 and not (held_out & corpus)
