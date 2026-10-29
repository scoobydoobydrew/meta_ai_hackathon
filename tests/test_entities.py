"""Name grounding, offline: uses the committed HGNC cache (data/ontology/hgnc_cache.json), never the network."""
import os

import pytest

from cellproof.formalize.entities import Grounder, Hgnc, key


@pytest.fixture(scope="module")
def grounder():
    previous = os.environ.get("CELLPROOF_OFFLINE")
    os.environ["CELLPROOF_OFFLINE"] = "1"
    try:
        yield Grounder(Hgnc())
    finally:
        if previous is None:
            os.environ.pop("CELLPROOF_OFFLINE", None)
        else:
            os.environ["CELLPROOF_OFFLINE"] = previous


@pytest.mark.parametrize(
    "name, kind, node",
    [
        ("p53", "base", "p53"),
        ("TP53", "base", "p53"),
        ("p21", "base", "p21"),
        ("p21Cip1/Waf1", "base", "p21"),
        ("CDKN1A", "base", "p21"),
        ("pRB", "base", "RB"),
        ("ATM", "base", "ATM_pH2AX"),
        ("γH2AX", "base", "ATM_pH2AX"),
        ("H2AX", "base", "ATM_pH2AX"),
        ("Cdc2", "base", "Cdc2_CycB"),
        ("CDK1/cyclin B", "base", "Cdc2_CycB"),
        ("CDC25C", "base", "Cdc25"),
        ("Akt", "base", "AKT"),
        ("Wip1", "base", "Wip1"),
        ("PPM1D", "base", "Wip1"),
        ("miR-221", "base", "miR221"),
        ("ionizing radiation", "base", "DNA_damage"),
        ("DNA double-strand breaks", "base", "DNA_damage"),
        ("DSBs induced by ionizing radiation", "base", "DNA_damage"),
        ("Chk1", "new", "CHK1"),
        ("CHK2", "new", "CHK2"),
        ("DNA-PKcs", "new", "DNA_PK"),
        ("DNA-PK", "new", "DNA_PK"),
        ("ATR", "new", "ATR"),
        ("NBS1", "new", "NBN"),  # HGNC lists NBS1 as an alias of NLRP2; the override fixes it
        ("PARP-1", "new", "PARP1"),  # an approved symbol under another spelling beats an alias
    ],
)
def test_grounding(grounder, name, kind, node):
    result = grounder.ground(name)
    assert (result.kind, result.node) == (kind, node)


@pytest.mark.parametrize(
    "name",
    ["mTOR", "Cdc25A", "ROS", "DREAM", "CDKs", "DNA damage and DNA replication stress", "replication stress", "UV", "cisplatin"],
)
def test_names_that_must_not_be_mapped(grounder, name):
    assert grounder.ground(name).kind in ("ambiguous", "unmapped")


def test_key_folds_case_spaces_and_punctuation():
    assert key("p21 Cip1/Waf1") == key("P21CIP1-WAF1") == "p21cip1waf1"
    assert key("γ-H2AX") == "gammah2ax"
