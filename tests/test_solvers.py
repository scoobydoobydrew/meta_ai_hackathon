"""Guards that every solver we may rely on installs and works on this machine.

Toy network: A keeps its own value, B copies A, C is the negation of B.
It has exactly two fixed points, (A,B,C) = (0,0,1) and (1,1,0).
"""


def test_clingo_enumerates_models():
    import clingo

    ctl = clingo.Control(["0"])
    ctl.add("base", [], "{a;b}. :- a, b.")
    ctl.ground([("base", [])])
    models = []
    ctl.solve(on_model=lambda m: models.append(m.symbols(atoms=True)))
    assert len(models) == 3


def test_z3_solves():
    import z3

    s = z3.Solver()
    a, b = z3.Bools("a b")
    s.add(z3.Xor(a, b))
    assert s.check() == z3.sat


def test_mpbn_finds_two_attractors():
    import mpbn

    bn = mpbn.MPBooleanNetwork({"A": "A", "B": "A", "C": "!B"})
    assert len(list(bn.attractors())) == 2


def test_aeon_finds_two_attractors():
    from biodivine_aeon import AsynchronousGraph, Attractors, BooleanNetwork

    bn = BooleanNetwork.from_aeon("A -> A\nA -> B\nB -| C\n$A: A\n$B: A\n$C: !B\n")
    assert len(Attractors.attractors(AsynchronousGraph(bn))) == 2


def test_pyboolnet_finds_two_minimal_trap_spaces():
    from pyboolnet.file_exchange import bnet2primes
    from pyboolnet.trap_spaces import compute_trap_spaces

    primes = bnet2primes("A, A\nB, A\nC, !B\n")
    assert len(compute_trap_spaces(primes, "min")) == 2
