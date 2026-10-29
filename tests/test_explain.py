from pathlib import Path

from cellproof.analysis.explain import explain, forced_steps
from cellproof.network.bnet import load_bnet
from cellproof.network.logic import evaluate

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")


def test_tug1_knockout_forces_mir221_on_and_puma_off():
    steps, forced = forced_steps(BASE, {"DNA_damage": 1, "TUG1": 0})
    assert forced["miR221"] == 1 and forced["PUMA"] == 0 and forced["PTEN"] == 0 and forced["AKT"] == 1
    assert [s.node for s in steps].index("miR221") < [s.node for s in steps].index("PUMA")  # a cause comes before its effect


def test_every_step_follows_from_the_values_it_reads_for_any_value_of_the_rest():
    setting = {"DNA_damage": 1, "TUG1": 0}
    steps, forced = forced_steps(BASE, setting)
    for s in steps:
        reads = dict(s.because)
        free = [n for n in BASE if n not in reads]
        # the rule gives the same value whatever the other nodes are: sample a few extreme assignments of all other nodes
        for fill in (0, 1):
            assert evaluate(s.rule, {**{n: fill for n in free}, **reads}) == s.value


def test_text_reports_propagation_and_the_exhaustive_fixed_points():
    text = explain(BASE, {"TUG1": 0})
    assert "miR221 = 1" in text and "fates apoptosis" in text and "Not decided by propagation" in text
