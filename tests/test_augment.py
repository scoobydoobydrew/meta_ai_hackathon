from pathlib import Path

from cellproof.formalize.augment import run
from cellproof.formalize.claims_to_edges import Edge
from cellproof.formalize.summary import summarize_records
from cellproof.network.bnet import load_bnet
from cellproof.verify.checker import check

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")


def edge(source, effect, target, papers):
    support = [{"pmcid": f"PMC{i}", "quote": "q", "context": "c", "location": "l", "pass": "test"} for i in range(papers)]
    return Edge(source, effect, target, support)


EDGES = {
    e.id: e
    for e in [
        edge("DNA_damage", "activates", "ATR", 3),
        edge("ATR", "activates", "CHK1", 5),
        edge("DNA_damage", "activates", "CHK1", 2),  # a shortcut once ATR -> CHK1 is in
        edge("CHK1", "inhibits", "Cdc25", 4),  # contradicts the Figure 3 phenotypes when applied by template
        edge("Wip1", "activates", "Mdm2", 1),  # the opposite sign to the base rule
    ]
}
NEW = ["ATR", "CHK1"]
PASSING_REPAIR = lambda p, d, history, rules: f"({p.old_rule}) & !(CHK1 & !p53)"  # noqa: E731


def test_naive_applies_everything_and_breaks_the_verification_cases():
    rules, records = run(BASE, EDGES, NEW, arm="naive")
    assert "!CHK1" in rules["Cdc25"]
    assert not check(rules).ok
    assert summarize_records(records)["accepted"] == 3


def test_verified_keeps_the_cases_and_the_strongest_activator_creates_the_new_node():
    rules, records = run(BASE, EDGES, NEW, arm="verified")
    assert check(rules).ok
    assert rules["ATR"] == "DNA_damage" and rules["CHK1"] == "ATR"  # not DNA_damage: ATR -> CHK1 has more papers
    by_edge = {r["edge"]: r for r in records}
    assert by_edge["DNA_damage|activates|CHK1"]["status"] == "skipped_implied"
    assert by_edge["Wip1|activates|Mdm2"]["status"] == "skipped_conflict"
    rejected = by_edge["CHK1|inhibits|Cdc25"]
    assert rejected["status"] == "rejected" and rejected["template_failed"] and "V04" in rejected["attempts"][0]["messages"][0]
    assert rules["Cdc25"] == BASE["Cdc25"]
    s = summarize_records(records)
    assert (s["accepted"], s["rejected"], s["template_failed"], s["repaired"]) == (2, 1, 1, 0)


def test_repaired_accepts_a_rule_that_passes_and_counts_it_as_a_repair():
    rules, records = run(BASE, EDGES, NEW, arm="repaired", repair=PASSING_REPAIR)
    assert check(rules).ok and "!(CHK1 & !p53)" in rules["Cdc25"]
    s = summarize_records(records)
    assert (s["accepted"], s["rejected"], s["repaired"], s["repair_success_rate"]) == (3, 0, 1, 1.0)
    assert s["template_contradiction_rate"] == 0.333


def test_a_repair_that_gives_up_or_keeps_failing_stays_rejected_after_k_attempts():
    calls = []

    def stubborn(p, d, history, rules):
        calls.append(1)
        return f"({p.old_rule}) & !CHK1"  # the same failing rule again

    _, records = run(BASE, EDGES, NEW, arm="repaired", repair=stubborn, max_attempts=3)
    assert len(calls) == 3
    assert next(r for r in records if r["edge"] == "CHK1|inhibits|Cdc25")["status"] == "rejected"
    _, records = run(BASE, EDGES, NEW, arm="repaired", repair=lambda *a: None)
    assert summarize_records(records)["repaired"] == 0


def test_min_papers_drops_weak_edges_before_anything_is_decided():
    _, records = run(BASE, EDGES, NEW, arm="verified", min_papers=3)
    assert {r["edge"] for r in records} == {"DNA_damage|activates|ATR", "ATR|activates|CHK1", "CHK1|inhibits|Cdc25"}
