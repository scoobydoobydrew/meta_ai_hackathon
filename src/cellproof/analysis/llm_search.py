"""The language model alone, asked for what the exhaustive search finds.

Muse Spark gets the network the solver searches (the checked one), the fates and the goal, and must name sets of one or two
changes after which an irradiated cell has apoptosis as its only fate. It cannot run code. Every answer is then judged by the
exact solver, so nothing the model says is trusted: this is the "AI alone" arm of the search, `minimal_sets` is the "solver
alone" arm. Each call sees the rules in a different order, so that the calls are independent requests. No held-out outcome
reaches this module.
"""
from __future__ import annotations

import json
import random
from itertools import combinations
from typing import Any

from cellproof.analysis.interventions import READOUT_NODES, fates, minimal_sets, search_space
from cellproof.meta_client import DEFAULT_MODEL, complete, cost_usd

EFFORT = "minimal"  # one call each at low (7 minutes), medium and high (about 15 minutes each) had not answered when they were stopped; minimal answers in about 30 s
PER_CALL = 10
# Reasoning and answer share this budget (Responses API, max_output_tokens; with a tiny value the API answers `incomplete` at once, so it
# is honoured). A typical answer at minimal effort needs 4,000 to 9,000 tokens. A request that runs out before its answer is complete
# counts as unanswered: it is reported, and not counted as a wrong guess. Some requests also stall for minutes without a cause we can
# see, so the client gives each attempt a minute and retries (see the CLI).
MAX_OUTPUT_TOKENS = 12_000

SCHEMA = {
    "type": "object",
    "properties": {
        "proposals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "changes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {"node": {"type": "string"}, "value": {"type": "integer"}},
                            "required": ["node", "value"],
                            "additionalProperties": False,
                        },
                    },
                    "reason": {"type": "string"},
                },
                "required": ["changes", "reason"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["proposals"],
    "additionalProperties": False,
}
TEXT_FORMAT = {"format": {"type": "json_schema", "name": "intervention_sets", "schema": SCHEMA, "strict": True}}

PROMPT = """You know Boolean models of cell signalling. Below is a published Boolean network of the DNA damage response (Gupta et al. 2023) with four kinases added from the literature. You cannot run code: reason about the network yourself.

NETWORK. One line per node, "node, rule". The rule gives the node's next value from other nodes: ! is not, & is and, | is or, and 1 means active. A STABLE STATE gives every node a value 0 or 1 such that each node equals its rule. DNA_damage is the only input and is held at 1: the cell has been irradiated.

{network}
FATES. A stable state is read as a fate from these nodes:
- apoptosis: p53_K, BAX and Caspase are 1 and ULK1_Beclin1 is 0
- autophagy: p53_K, BAX, Caspase and ULK1_Beclin1 are all 1
- senescence: p53_A, p21, mTORC1 and mTORC2 are 1, and it is not apoptosis or autophagy
- arrest: p53_A, p21 and Wip1 are 1, and it is none of the above
- anything else is not a fate
Without any change the irradiated network has several stable states with different fates.

GOAL. Find a SET of one or two changes after which every stable state of the irradiated network is apoptosis, and there is at least one. A change is either KNOCK-OUT (the node is held at 0) or FORCE-ON (the node is held at 1); a held node ignores its rule. The two changes of a pair must be on different nodes. You may not change the nodes that define the fates: {readout}.

Propose {k} different sets, the most likely first. An exact solver will check each one; only a set that really leaves apoptosis as the only fate counts. Give value 0 for a knock-out and 1 for a force-on.
"""


def build_prompt(rules: dict[str, str], seed: int, per_call: int = PER_CALL) -> str:
    items = list(rules.items())
    random.Random(seed).shuffle(items)
    network = "".join(f"{node}, {rule}\n" for node, rule in items)
    return PROMPT.format(network=network, readout=", ".join(sorted(READOUT_NODES)), k=per_call)


def judge(rules: dict[str, str], changes: list[tuple[str, int]], minimal: set[frozenset]) -> dict[str, Any]:
    """The solver's verdict on one proposed set. `valid` is only about the form of the answer."""
    nodes = [n for n, _ in changes]
    problem = (
        "no change" if not changes else "more than two changes" if len(changes) > 2 else "same node twice" if len(set(nodes)) < len(nodes)
        else "unknown node" if any(n not in rules for n in nodes) else "a node that defines the fates" if any(n in READOUT_NODES for n in nodes)
        else "value is not 0 or 1" if any(v not in (0, 1) for _, v in changes) else ""
    )
    out: dict[str, Any] = {"changes": [list(c) for c in changes], "valid": not problem, "problem": problem, "works": False, "minimal": False, "fates": []}
    if problem:
        return out
    found = fates(rules, dict(changes))
    out["fates"] = sorted(str(f) for f in found)
    out["works"] = found == {"apoptosis"}
    out["minimal"] = frozenset(changes) in minimal
    return out


def candidate_sets(rules: dict[str, str], max_size: int = 2) -> list[tuple[tuple[str, int], ...]]:
    """Every set the exhaustive search visits (the same enumeration as minimal_sets)."""
    genes = sorted(n for n in rules if n not in READOUT_NODES)
    literals = [(n, v) for n in genes for v in (0, 1)]
    return [c for size in range(1, max_size + 1) for c in combinations(literals, size) if len({n for n, _ in c}) == size]


def ask(rules: dict[str, str], calls: int, model: str = DEFAULT_MODEL, effort: str = EFFORT, per_call: int = PER_CALL, budget: int = MAX_OUTPUT_TOKENS, **kwargs) -> list[dict[str, Any]]:
    """`calls` requests, each with the rules in another order; `kwargs` (client, cache_dir) go to meta_client.complete."""
    attempts = []
    for seed in range(calls):
        result = complete(build_prompt(rules, seed, per_call), model=model, text=TEXT_FORMAT, reasoning={"effort": effort}, max_output_tokens=budget, **kwargs)
        try:
            answer = json.loads(result.text)["proposals"]
        except (ValueError, KeyError):
            answer = None  # the budget ran out before the answer was complete
        attempts.append({"seed": seed, "cached": result.from_cache, "usage": result.usage, "cost_usd": round(cost_usd(result.usage, model), 4), "answer": answer})
    return attempts


def evaluate(rules: dict[str, str], attempts: list[dict[str, Any]], model: str, effort: str, network: str, budget: int = MAX_OUTPUT_TOKENS) -> dict[str, Any]:
    """The solver judges every proposal. Also the base rate: how many of all candidate sets leave only apoptosis, so that the
    model's hit rate can be read against picking a set at random."""
    minimal = {frozenset(s) for s in minimal_sets(rules, 2)}
    working = sum(fates(rules, dict(c)) == {"apoptosis"} for c in candidate_sets(rules, 2))
    judged, seen = [], {}
    for a in attempts:
        rows = []
        for p in a["answer"] or []:
            changes = [(c["node"], c["value"]) for c in p["changes"]]
            row = judge(rules, changes, minimal)
            row["reason"] = p["reason"]
            key = frozenset(changes)
            row["repeat"] = key in seen and row["valid"]
            if row["valid"]:
                seen.setdefault(key, row)
            rows.append(row)
        judged.append({"seed": a["seed"], "cached": a["cached"], "cost_usd": a["cost_usd"], "usage": a["usage"], "answered": a["answer"] is not None, "proposals": rows})
    rows = [r for a in judged for r in a["proposals"]]
    distinct = list(seen.values())
    total = len(candidate_sets(rules, 2))
    firsts = [next((r for r in a["proposals"] if r["valid"]), None) for a in judged if a["answered"]]  # each answered request's own best guess
    summary = {
        "requests": len(judged), "answered": sum(a["answered"] for a in judged), "out_of_budget": sum(not a["answered"] for a in judged), "max_output_tokens": budget,
        "proposals": len(rows), "malformed": sum(not r["valid"] for r in rows), "distinct": len(distinct),
        "first_guesses": len(firsts), "first_guesses_work": sum(bool(f and f["works"]) for f in firsts),
        "works": sum(r["works"] for r in distinct), "minimal_hits": sum(r["minimal"] for r in distinct),
        "candidates": total, "working_candidates": working, "minimal": len(minimal), "cost_usd": round(sum(a["cost_usd"] for a in judged), 2),
        "space": {str(k): search_space(rules, k) for k in range(1, 7)},
    }
    return {"model": model, "effort": effort, "network": network, "calls": len(judged), "attempts": judged, "summary": summary}
