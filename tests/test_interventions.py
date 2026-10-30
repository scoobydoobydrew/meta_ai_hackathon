from itertools import combinations
from pathlib import Path

from cellproof.analysis.interventions import READOUT_NODES, all_attractors_are_fixed_points, describe, fates, minimal_sets, search_space
from cellproof.network.bnet import load_bnet

BASE = load_bnet(Path(__file__).resolve().parents[1] / "data" / "base" / "gupta2023.bnet")


def test_the_search_finds_the_two_single_interventions_the_gupta_paper_reports():
    # TUG1 knock-out and miR-221 overexpression give apoptosis only (Figure 3 of the paper; verification cases V04 and V05).
    sets = minimal_sets(BASE, max_size=1)
    assert (("TUG1", 0),) in sets and (("miR221", 1),) in sets
    for found in sets:
        assert fates(BASE, dict(found)) == {"apoptosis"}


def test_sets_are_minimal_and_never_offer_readout_nodes():
    sets = minimal_sets(BASE, max_size=2)
    singles = [set(s) for s in sets if len(s) == 1]
    assert all(not (single <= set(s)) for s in sets if len(s) == 2 for single in singles)
    assert all(node not in {"BAX", "Caspase", "p53_K"} for s in sets for node, _ in s)


def test_the_search_space_is_the_number_of_sets_the_search_visits():
    # the header of the report says "N changes to try"; N must be what minimal_sets really looks at
    genes = sorted(n for n in BASE if n not in READOUT_NODES)
    literals = [(n, v) for n in genes for v in (0, 1)]
    visited = sum(1 for size in (1, 2) for combo in combinations(literals, size) if len({n for n, _ in combo}) == size)
    assert search_space(BASE, 2) == visited and search_space(BASE, 1) == 2 * len(genes)


def test_a_reported_set_has_no_oscillating_attractor():
    assert all_attractors_are_fixed_points(BASE, {"TUG1": 0}) and describe((("TUG1", 0), ("miR221", 1))) == "TUG1 KO + miR221 E1"
