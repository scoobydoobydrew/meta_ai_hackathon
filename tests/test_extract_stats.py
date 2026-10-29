from pathlib import Path

import pytest

from cellproof.extract.claims import Claim, is_grounded
from cellproof.extract.stats import load_records, summarize

ROOT = Path(__file__).resolve().parents[1]
EXTRACTIONS = ROOT / "data" / "extractions" / "muse-spark-1.3"
TEXTS = ROOT / "data" / "raw" / "corpus"


def record(pmcid, grounded=(), ungrounded=(), usage=None):
    return {
        "pmcid": pmcid, "model": "muse-spark-1.3", "grounded": list(grounded), "ungrounded": list(ungrounded),
        "outcome_level": [],
        "counts": {"proposed": len(grounded) + len(ungrounded), "grounded": len(grounded),
                   "ungrounded": len(ungrounded), "outcome_level": 0},
        "usage": usage,
    }


def test_summarize_adds_up():
    claim = {"source": "ATR", "target": "CHK1", "effect": "activates"}
    usage = {"input_tokens": 1_000_000, "output_tokens": 0, "output_tokens_details": {"reasoning_tokens": 0}}
    totals = summarize([record("A", [claim, {**claim, "effect": "inhibits"}], usage=usage), record("B")])
    assert totals["papers"] == 2 and totals["papers_without_claims"] == 1
    assert totals["grounded"] == 2 and totals["effects"] == {"activates": 1, "inhibits": 1}
    assert totals["distinct_names"] == 2 and totals["cost_usd_of_the_calls_in_these_files"] == 1.25


@pytest.mark.skipif(not EXTRACTIONS.exists(), reason="no extractions saved")
def test_saved_extractions_are_well_formed_and_counts_add_up():
    records = load_records(EXTRACTIONS)
    assert records
    for r in records:
        for bucket in ("grounded", "ungrounded", "outcome_level"):
            for c in r[bucket]:
                Claim.model_validate(c)
        assert r["counts"]["proposed"] == sum(len(r[b]) for b in ("grounded", "ungrounded", "outcome_level"))


@pytest.mark.skipif(not (EXTRACTIONS.exists() and TEXTS.exists()), reason="texts are git-ignored; needs `cellproof corpus`")
def test_every_saved_grounded_quote_is_in_its_paper():
    for r in load_records(EXTRACTIONS):
        text = (TEXTS / f"{r['pmcid']}.txt").read_text(encoding="utf-8")
        for c in r["grounded"]:
            assert is_grounded(Claim.model_validate(c), text), (r["pmcid"], c["evidence_quote"])
