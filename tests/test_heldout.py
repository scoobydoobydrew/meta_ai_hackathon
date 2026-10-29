import hashlib
from pathlib import Path

import pytest

from cellproof.eval.heldout import DIRECTIONS, MAGNITUDES, POLARITIES, claim_category, load, nodes_in_base, summarize
from cellproof.eval.sources import quote_in_text
from cellproof.network.bnet import load_bnet

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "data" / "heldout" / "gupta2023_heldout.json"
TEXTS = ROOT / "data" / "raw" / "heldout_texts"
BASE_NODES = set(load_bnet(ROOT / "data" / "base" / "gupta2023.bnet"))


@pytest.fixture(scope="module")
def doc():
    return load(DRAFT)


def test_the_set_is_frozen_and_says_the_human_check_is_pending(doc):
    assert doc["status"].startswith("FROZEN v1") and "D4" in doc["status"]


def test_item_file_matches_the_recorded_snapshot_hash():
    # Editing the items is allowed, but only as a logged amendment: update heldout.sha256 and the log in
    # docs/heldout_protocol.md in the same commit.
    recorded = (ROOT / "data" / "heldout" / "heldout.sha256").read_text(encoding="ascii").split()[0]
    actual = hashlib.sha256(DRAFT.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    assert actual == recorded, "held-out items changed after the snapshot: log the amendment and update heldout.sha256"


def test_ids_are_unique_and_sources_exist(doc):
    ids = [item["id"] for item in doc["items"]]
    assert len(ids) == len(set(ids))
    for item in doc["items"]:
        assert item["source"] in doc["sources"], item["id"]
        assert item["stimulus"] in doc["stimulus_mapping"], item["id"]


def test_every_claim_is_well_formed(doc):
    for item in doc["items"]:
        assert item["claims"], item["id"]
        for claim in item["claims"]:
            assert claim["polarity"] in POLARITIES, item["id"]
            assert claim["vs"] and claim["statement"], item["id"]


def test_perturbation_nodes_marked_by_membership_in_the_base_network(doc):
    in_base = {item["id"]: nodes_in_base(item, BASE_NODES) for item in doc["items"]}
    assert in_base["H01"] and in_base["H05"] and in_base["H08"]  # p53, Wee1, ATM_pH2AX
    assert in_base["H15"]  # Myc
    assert not any(in_base[i] for i in ("H09", "H10", "H12", "H13"))  # ATR and CHK1 are not nodes of the base network


@pytest.mark.parametrize(
    "claim, in_base, expected",
    [
        ({"readout": "clonogenic_survival", "polarity": "decreased"}, True, "survival_level"),
        ({"readout": "g2_arrest", "polarity": "present"}, True, "scoreable"),
        ({"readout": "g2_arrest", "polarity": "decreased"}, True, "direction_only"),
        ({"readout": "g2_arrest", "polarity": "decreased", "magnitude": "partial"}, True, "direction_only"),
        ({"readout": "g2_arrest", "polarity": "decreased", "magnitude": "complete"}, True, "scoreable"),
        ({"readout": "g2_arrest", "polarity": "unchanged", "magnitude": "none"}, False, "scoreable_with_new_nodes"),
        ({"readout": "mitotic_catastrophe", "polarity": "present"}, True, "needs_readout"),
        ({"readout": "apoptosis", "polarity": "increased"}, True, "direction_only"),
        ({"readout": "apoptosis", "polarity": "present"}, True, "scoreable"),
        ({"readout": "apoptosis", "polarity": "absent"}, False, "scoreable_with_new_nodes"),
    ],
)
def test_claim_category_rules(claim, in_base, expected):
    assert claim_category(claim, in_base) == expected


def test_every_claim_gets_exactly_one_category(doc):
    counts = summarize(doc, BASE_NODES)
    assert sum(counts.values()) == sum(len(item["claims"]) for item in doc["items"])


def test_direction_claims_on_phenotypes_carry_a_consistent_magnitude(doc):
    for item in doc["items"]:
        for claim in item["claims"]:
            if claim["readout"] == "clonogenic_survival" or claim["polarity"] not in DIRECTIONS:
                continue
            assert claim.get("magnitude") in MAGNITUDES, item["id"]
            assert (claim["polarity"] == "unchanged") == (claim["magnitude"] == "none"), item["id"]


def test_backgrounds_are_nodes_of_the_base_network(doc):
    for item in doc["items"]:
        for claim in item["claims"]:
            for background in claim.get("backgrounds", []):
                assert set(background) <= BASE_NODES, item["id"]


def test_counts_with_strict_contrast_scoring(doc):
    # Decision D6, adopted 2026-10-29: only complete changes and explicit "no change" are scored by contrast.
    # Counts after amendment 1 (H14 dropped, H13 reread, H15 added).
    assert dict(summarize(doc, BASE_NODES)) == {
        "scoreable": 8,
        "scoreable_with_new_nodes": 2,
        "direction_only": 3,
        "survival_level": 10,
    }


def test_every_claim_has_a_quote_and_every_source_has_a_licence_note(doc):
    for item in doc["items"]:
        for claim in item["claims"]:
            assert claim.get("quote") and len(claim["quote"].split()) <= 60, item["id"]
    for source in doc["sources"].values():
        assert source["pmcid"].startswith("PMC") and source["license"], source


@pytest.mark.skipif(not TEXTS.exists(), reason="source texts are git-ignored; fetched by scripts/amend_heldout_quotes.py")
def test_every_quote_occurs_in_its_source_paper(doc):
    for item in doc["items"]:
        text = (TEXTS / f"{doc['sources'][item['source']]['pmcid']}.txt").read_text(encoding="utf-8")
        for claim in item["claims"]:
            assert quote_in_text(claim["quote"], text), (item["id"], claim["quote"][:80])
