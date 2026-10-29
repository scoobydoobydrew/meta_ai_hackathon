from pathlib import Path

import pytest

from cellproof.eval.heldout import POLARITIES, claim_category, load, nodes_in_base, summarize
from cellproof.network.bnet import load_bnet

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "data" / "heldout" / "gupta2023_heldout_draft.json"
BASE_NODES = set(load_bnet(ROOT / "data" / "base" / "gupta2023.bnet"))


@pytest.fixture(scope="module")
def doc():
    return load(DRAFT)


def test_draft_is_labelled_as_a_draft(doc):
    assert doc["status"].startswith("DRAFT")


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
    assert not any(in_base[i] for i in ("H09", "H12", "H14"))  # ATR, CHK1, DNA_PK are not nodes


@pytest.mark.parametrize(
    "claim, in_base, expected",
    [
        ({"readout": "clonogenic_survival", "polarity": "decreased"}, True, "survival_level"),
        ({"readout": "g2_arrest", "polarity": "present"}, True, "scoreable"),
        ({"readout": "g2_arrest", "polarity": "decreased"}, True, "direction_only"),
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
