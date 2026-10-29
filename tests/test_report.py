from pathlib import Path

from cellproof.eval.report import markdown, score_networks, totals
from cellproof.network.bnet import load_bnet

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")
STIMULI = {"IR": {"DNA_damage": 1}, "none": {"DNA_damage": 0}}


def claim(readout, polarity, **extra):
    return {"readout": readout, "polarity": polarity, "vs": "x", "statement": "x", "quote": "q", **extra}


def doc():
    return {
        "status": "FROZEN (test fixture)",
        "stimulus_mapping": STIMULI,
        "items": [
            {"id": "T1", "stimulus": "IR", "perturbation": {"nodes": {"TUG1": 0}},
             "claims": [claim("apoptosis", "present"), claim("autophagy", "present")]},
            {"id": "T2", "stimulus": "IR", "perturbation": {"nodes": {"ATR": 0}},
             "claims": [claim("g2_arrest", "decreased", magnitude="complete")]},
        ],
    }


def test_per_claim_table_and_totals_keep_not_expressible_apart():
    augmented = {**BASE, "ATR": "DNA_damage"}
    scored = score_networks(doc(), {"base": BASE, "augmented": augmented})["rows"]
    assert totals(scored["base"]) == {"correct": 1, "wrong": 1, "not_expressible": 1}
    assert totals(scored["augmented"])["not_expressible"] == 0  # ATR exists now, whatever it then predicts
    text = markdown(doc(), scored)
    assert "| T1.1 | apoptosis | present | absolute |" in text and "n/e" in text
    assert "| base | 1 | 1 | 1 | 3 |" in text
    assert "no-information baseline" in text
