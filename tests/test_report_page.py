from pathlib import Path

from cellproof.network.bnet import load_bnet
from cellproof.report.build import _json, parts, render, render_fragment
from cellproof.report.data import FAILURE, FATE_CODES, _structured, lab_table
from cellproof.report.layout import NODE_ORDER, NODES

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")


def test_embedded_data_cannot_close_the_script_tag():
    text = _json({"quote": "</script><!-- x"})
    assert "</script>" not in text and "<!--" not in text


def test_the_page_has_a_title_style_body_and_script_and_the_fragment_has_no_document_wrapper():
    head, body, script = parts({"x": 1})
    assert "<title>CellProof</title>" in head and "<style>" in head and "id=\"net\"" in body and "const D =" in script
    assert "<!doctype" not in render_fragment({"x": 1}) and render({"x": 1}).startswith("<!doctype html>")


def test_every_node_of_the_base_network_has_a_position_and_the_input_comes_first():
    assert set(BASE) <= set(NODES) and NODE_ORDER[0] == "DNA_damage" and len(NODE_ORDER) == 34


def test_lab_table_encodes_the_solvers_fixed_points():
    table = lab_table(BASE, 1, pairs=False)
    assert "" in table and "TUG1=0" in table
    flat = table["TUG1=0"]
    assert len(flat) == 2 and flat[1] >> 1 == FATE_CODES["apoptosis"]  # TUG1 knocked out: apoptosis only (Gupta et al. Figure 3)
    assert not (flat[0] >> NODE_ORDER.index("TUG1")) & 1  # the knocked-out gene is off in the stored state
    fates = {code >> 1 for code in table[""][1::2]}
    assert fates == {FATE_CODES[f] for f in ("arrest", "senescence", "autophagy", "apoptosis")}


def test_solver_messages_are_parsed_into_structured_counterexamples():
    message = (
        "V04 (Figure 3, TUG1 KO); setting {'DNA_damage': 1, 'TUG1': 0}: unexpected; expected phenotypes ['apoptosis'] (exact), "
        "found ['apoptosis', 'senescence']; witness fixed point {'p53': 1, 'CHK1': 1}"
    )
    assert FAILURE.match(message)
    parsed = _structured(message)
    assert parsed["case"] == "V04" and parsed["found"] == ["apoptosis", "senescence"] and parsed["witness"]["CHK1"] == 1
    assert _structured("the rule of AKT loses influences")["text"].startswith("the rule")
