"""M6: how the exact checker scales with network size, with a timeout, failures included.

Two families, both generated here from a seed (nothing is downloaded):
  random   n nodes, each rule an OR of up to two ANDs of up to three regulators chosen at random, signs at random. These are
           hard on purpose: random Boolean networks tend to have many attractors, so this measures the worst case.
  cascade  the Gupta et al. base network (30 nodes) with extra downstream chains, each node switched on by the previous one
           and held off by one earlier node, the shape of effector cascades. It grows n without changing the attractors of
           the core, so it measures the cost of size alone.
Each measurement runs in its own process and is killed at the timeout; the table reports seconds, or timeout, or the error.
"""
from __future__ import annotations

import multiprocessing as mp
import random
import time
from pathlib import Path

from cellproof.network.bnet import load_bnet

BASE = Path(__file__).resolve().parents[3] / "data" / "base" / "gupta2023.bnet"


def random_rules(n: int, seed: int) -> dict[str, str]:
    rng = random.Random(seed)
    names = [f"x{i}" for i in range(n)]
    rules = {}
    for name in names:
        terms = []
        for _ in range(rng.randint(1, 2)):
            regulators = rng.sample(names, rng.randint(1, 3))
            terms.append(" & ".join(("!" if rng.random() < 0.5 else "") + r for r in regulators))
        rules[name] = " | ".join(f"({t})" for t in terms)
    return rules


def cascade_rules(n: int, seed: int) -> dict[str, str]:
    rules = load_bnet(BASE)
    rng = random.Random(seed)
    nodes = list(rules)
    previous = "p53_A"
    for i in range(n - len(rules)):
        name = f"c{i}"
        rules[name] = f"{previous} & !{rng.choice(nodes)}"
        nodes.append(name)
        previous = name
    return rules


def _measure(kind: str, rules: dict[str, str], queue) -> None:
    try:
        from cellproof.analysis.attractors import attractor_sizes, fixed_points

        start = time.perf_counter()
        points = len(fixed_points(rules))
        middle = time.perf_counter()
        attractors = len(attractor_sizes(rules)) if kind == "full" else None
        queue.put({"fixed_points": points, "attractors": attractors, "mpbn_s": middle - start, "aeon_s": time.perf_counter() - middle})
    except Exception as error:  # noqa: BLE001
        queue.put({"error": f"{type(error).__name__}: {str(error)[:80]}"})


def measure(rules: dict[str, str], timeout: float, kind: str = "full") -> dict:
    """Fixed points (mpbn) and asynchronous attractors (AEON) of one network, killed after `timeout` seconds in total."""
    ctx = mp.get_context("spawn")
    queue = ctx.Queue()
    process = ctx.Process(target=_measure, args=(kind, rules, queue))
    start = time.perf_counter()
    process.start()
    process.join(timeout)
    if process.is_alive():
        process.kill()
        process.join()
        return {"status": "timeout", "seconds": timeout}
    result = queue.get() if not queue.empty() else {"error": "no result"}
    return {"status": "error" if "error" in result else "ok", "seconds": round(time.perf_counter() - start, 2), **result}


def table(sizes: list[int], seeds: list[int], timeout: float) -> list[dict]:
    rows = []
    for family, make in (("cascade", cascade_rules), ("random", random_rules)):
        for n in sizes:
            for seed in seeds:
                if family == "cascade" and n < 30:
                    continue
                rows.append({"family": family, "nodes": n, "seed": seed, **measure(make(n, seed), timeout)})
    return rows
