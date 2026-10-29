"""Grounded claims -> edges between nodes, with the evidence behind each.

An edge is (source node, effect, target node). Claims whose two ends are the same node (the base merges ATM with H2AX,
so "ATM phosphorylates H2AX" is a self-loop) are set aside. Every dropped claim is counted under a reason, never lost.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from cellproof.extract.stats import load_records
from cellproof.formalize.entities import Grounder


@dataclass
class Edge:
    source: str
    effect: str
    target: str
    support: list[dict] = field(default_factory=list)  # {pmcid, quote, context, location, pass}

    @property
    def papers(self) -> int:
        return len({s["pmcid"] for s in self.support})

    @property
    def id(self) -> str:
        return f"{self.source}|{self.effect}|{self.target}"


def build_edges(record_sets: dict[str, list[dict]], grounder: Grounder) -> tuple[dict[str, Edge], Counter, list[dict]]:
    """record_sets maps a pass name to its saved extraction records. Returns edges by id, drop counts, and the grounding
    of every distinct name seen (for the report)."""
    edges: dict[str, Edge] = {}
    dropped: Counter = Counter()
    names: dict[str, dict] = defaultdict(lambda: {"claims": 0})
    for pass_name, records in record_sets.items():
        for record in records:
            for claim in record["grounded"]:
                ends = [grounder.ground(claim["source"]), grounder.ground(claim["target"])]
                for raw, grounding in zip((claim["source"], claim["target"]), ends):
                    names[raw]["claims"] += 1
                    names[raw]["kind"], names[raw]["node"], names[raw]["detail"] = grounding.kind, grounding.node, grounding.detail
                kinds = {g.kind for g in ends}
                if kinds - {"base", "new"}:
                    dropped["an end is ambiguous or unmapped"] += 1
                    continue
                source, target = ends[0].node, ends[1].node
                if source == target:
                    dropped["both ends are the same node"] += 1
                    continue
                edge = Edge(source, claim["effect"], target)
                edge = edges.setdefault(edge.id, edge)
                edge.support.append(
                    {"pmcid": record["pmcid"], "quote": claim["evidence_quote"], "context": claim["context"],
                     "location": claim["location"], "pass": pass_name}
                )
    rows = [{"name": n, **d} for n, d in sorted(names.items(), key=lambda kv: -kv[1]["claims"])]
    return edges, dropped, rows


def load_pass(directory: str | Path) -> list[dict]:
    return load_records(Path(directory))
