from cellproof.analysis.attractors import fixed_points
from cellproof.analysis.scaling import cascade_rules, measure, random_rules


def test_generators_are_seeded_and_have_the_requested_size():
    assert random_rules(20, 1) == random_rules(20, 1) and random_rules(20, 1) != random_rules(20, 2)
    assert len(random_rules(20, 1)) == 20 and len(cascade_rules(45, 1)) == 45


def test_a_cascade_does_not_change_the_core_fixed_points():
    core = {tuple(sorted((k, v) for k, v in fp.items() if not k.startswith("c"))) for fp in fixed_points(cascade_rules(40, 3))}
    plain = {tuple(sorted(fp.items())) for fp in fixed_points(cascade_rules(30, 3))}
    assert core == plain


def test_measure_reports_seconds_and_a_timeout_instead_of_hanging():
    ok = measure(cascade_rules(34, 0), timeout=120)
    assert ok["status"] == "ok" and ok["fixed_points"] >= 5 and ok["seconds"] < 120
    assert measure(cascade_rules(34, 0), timeout=0.01)["status"] == "timeout"
