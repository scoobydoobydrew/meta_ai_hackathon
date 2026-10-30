import re
import shutil
import subprocess
from pathlib import Path

import pytest

from cellproof.analysis.explain import forced_steps
from cellproof.analysis.interventions import minimal_sets, search_space
from cellproof.network.bnet import load_bnet
from cellproof.network.logic import influence_edges
from cellproof.report.build import WEB, _json, parts, render, render_fragment
from cellproof.report.data import FAILURE, FATE_CODES, _structured, domino, interventions, lab_table, llm_search_block, story_block
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


def test_the_bench_story_is_built_from_the_solver_and_its_three_acts_are_true_of_the_data():
    story = story_block(BASE, set(influence_edges(BASE)))
    assert story is not None and set(story["versions"]) == {"A", "B", "C"} and set(story["lab"]) == {"A", "B", "C"}
    assert all(c["A"]["ok"] for c in story["cases"])  # the published model reproduces what its own paper reports
    assert not all(c["B"]["ok"] for c in story["cases"])  # the edit applied unchecked breaks a known behaviour
    assert all(c["C"]["ok"] for c in story["cases"])  # the repaired edit keeps all ten
    patch = story["patch"]
    assert patch["edge"] == "CHK1|inhibits|Cdc25" and patch["template"] != patch["final"] and patch["quotes"] and patch["explanation"]
    assert "Rule is" not in patch["explanation"]  # the model's reasoning, not its restatement of the rule


def test_the_page_carries_the_bench_and_its_script_parses(tmp_path):
    head, body, script = parts({"x": 1})
    assert 'id="bench"' in body and 'id="bLamps"' in body and "CPBench" in script
    assert 'id="heroMol"' in body and 'id="heroStory"' in body and "makeHelix" in script and "makeStory" in script and "makePoster" in script and "makeDish" in script
    node = shutil.which("node")
    if node is None:
        pytest.skip("node is not installed")
    page = tmp_path / "page.js"
    page.write_text(script.split("<script>", 1)[1].rsplit("</script>", 1)[0], encoding="utf-8")
    result = subprocess.run([node, "--check", str(page)], capture_output=True, text=True)
    assert result.returncode == 0, result.stderr


def test_the_headers_story_numbers_are_the_solvers_own():
    out = interventions({"published": BASE, "augmented": BASE})
    space = out["space"]
    assert space["total"] == search_space(BASE, 2) and space["found"] == len(out["augmented"]) and space["seconds"] >= 0
    assert 0 < space["found"] < space["total"]


def test_the_ai_alone_marks_of_the_header_agree_with_the_solvers_summary():
    rules = load_bnet(Path(__file__).resolve().parents[1] / "data" / "models" / "repaired_min2.bnet")
    block = llm_search_block(rules)
    if block is None:
        pytest.skip("results/llm_search_*.json has not been written")
    arm = block["arms"][block["best"]]
    s = arm["summary"]
    assert all(0 <= m["i"] < search_space(rules, 2) for m in arm["marks"]) and len({m["i"] for m in arm["marks"]}) == s["distinct"] == len(arm["marks"])
    assert sum(m["w"] for m in arm["marks"]) == s["works"] and sum(m["m"] for m in arm["marks"]) == s["minimal_hits"] <= s["works"]
    assert s["answered"] + s["out_of_budget"] == s["requests"]


def test_the_chain_reaction_is_forced_steps_that_depend_on_the_two_switches():
    rules = load_bnet(Path(__file__).resolve().parents[1] / "data" / "models" / "repaired_min2.bnet")
    d = domino(rules, [[[n, v] for n, v in s] for s in minimal_sets(rules, 2)])
    assert d and len(d["set"]) == 2 and any(v == 0 for _, v in d["set"]) and d["chain"]
    steps, _ = forced_steps(rules, {"DNA_damage": 1, **{n: v for n, v in d["set"]}})
    forced, cause = {s.node: s for s in steps}, {n for n, _ in d["set"]}
    for node, value in d["chain"]:  # each gene is forced by a rule that reads something the switches (or an earlier gene) changed
        assert forced[node].value == value and any(n in cause for n, _ in forced[node].because)
        cause.add(node)
    assert d["forced"] == len(steps) and d["genes"] == len(rules) - 1 and d["combos"] == 2 ** d["genes"]
    assert 0 <= d["loops"] == d["genes"] - 2 - len(steps)


def test_the_header_tells_its_story_in_six_beats_and_names_its_sources():
    body = (WEB / "body.html").read_text(encoding="utf-8")
    assert [int(b) for b in re.findall(r'class="beat" data-b="(\d)"', body)] == [1, 2, 3, 4, 5, 6]
    assert "Radiotherapy is commonly used to treat a variety of solid tumors." in body and "PMC3167033" in body
    assert "NP-hard" in body and "Akutsu et al. 2007" in body  # the difficulty is stated with its source, in the markup as well as in the texts


def test_both_languages_have_the_same_texts_and_every_label_in_the_markup_has_one():
    js = (WEB / "bench.js").read_text(encoding="utf-8")
    text = js.split("  const TEXT = {\n", 1)[1].split("\n  let lang", 1)[0]
    english, greek = text.split("\n    el: {\n")

    def quoted(block: str) -> set[str]:
        return set(re.findall(r'"([a-z0-9]+(?:\.[A-Za-z0-9]+)+)":', block))

    bare = ("rail", "dmg", "nodmg", "known", "says", "atleast", "match", "nomatch", "notexp", "expected")
    assert quoted(english) == quoted(greek) and quoted(english)
    for key in bare:
        assert re.search(rf"\b{key}: ", english) and re.search(rf"\b{key}: ", greek), key
    markup = (WEB / "body.html").read_text(encoding="utf-8")
    for key in set(re.findall(r'data-i18n(?:-html)?="([^"]+)"', markup)):
        assert key in quoted(english), key
