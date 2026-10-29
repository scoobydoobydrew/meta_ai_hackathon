"""Apply the candidate edits one at a time, in a fixed order, and keep a record of every decision.

Order: strongest evidence first (most distinct papers, then the edge id); an edge whose ends are not yet in the network (a
new node still waiting for its first activator) is deferred and retried until a full pass makes no progress.

Three arms, all from the same edges:
  naive      every edit is applied as proposed, nothing is checked ("LLM-only")
  verified   an edit is applied only if the solver accepts it (verify.accept)
  repaired   as verified, but a rejected edit goes back to Muse Spark with the counterexample, up to K attempts
"""
from __future__ import annotations

from collections.abc import Callable

from cellproof.formalize.claims_to_edges import Edge
from cellproof.formalize.edits import Proposal, Skip, classify_edge
from cellproof.verify.accept import Decision, evaluate_rule
from cellproof.verify.checker import Case, load_cases

# repair(proposal, decision, history, rules) -> a new candidate rule, or None when the model gives up
Repair = Callable[[Proposal, Decision, list[dict], dict[str, str]], "str | None"]


def edge_record(edge: Edge) -> dict:
    return {
        "edge": edge.id, "papers": edge.papers,
        "support": [{k: s[k] for k in ("pmcid", "quote", "context", "location", "pass")} for s in edge.support],
    }


def run(
    base_rules: dict[str, str],
    edges: dict[str, Edge],
    new_nodes: list[str],
    *,
    arm: str,
    cases: list[Case] | None = None,
    repair: Repair | None = None,
    max_attempts: int = 3,
    min_papers: int = 1,
) -> tuple[dict[str, str], list[dict]]:
    cases = cases or load_cases()
    rules = dict(base_rules)
    allowed = set(base_rules) | set(new_nodes)
    pending = sorted(
        (e for e in edges.values() if e.source in allowed and e.target in allowed and e.papers >= min_papers),
        key=lambda e: (-e.papers, e.id),
    )
    records: list[dict] = []
    patient = True  # a new node waits for its best-supported activator to enter the network before it is created
    while pending:
        progress = False
        for edge in list(pending):
            outcome = classify_edge(rules, edge)
            if isinstance(outcome, Skip):
                if outcome.deferred:
                    continue
                records.append({**edge_record(edge), "status": f"skipped_{outcome.reason}", "detail": outcome.detail})
            else:
                if patient and outcome.kind == "anchor" and any(
                    e is not edge and e.target == edge.target and e.effect == "activates" and e.papers > edge.papers
                    for e in pending
                ):
                    continue  # a better-supported activator of this new node is still waiting; retry in the next pass
                record = _decide(outcome, rules, arm, cases, repair, max_attempts)
                records.append(record)
                if record["status"] == "accepted":
                    rules[outcome.node] = record["final_rule"]
            pending.remove(edge)
            progress = True
        if not progress:
            if not patient:
                break
            patient = False
    for edge in pending:
        records.append({**edge_record(edge), "status": "skipped_not_available", "detail": "an end never entered the network"})
    return rules, records


def _decide(p: Proposal, rules: dict[str, str], arm: str, cases: list[Case], repair: Repair | None, max_attempts: int) -> dict:
    base = {**edge_record(p.edge), "kind": p.kind, "node": p.node, "old_rule": p.old_rule, "template_rule": p.new_rule}
    if arm == "naive":
        return {**base, "status": "accepted", "final_rule": p.new_rule, "attempts": []}
    decision = evaluate_rule(rules, p.node, p.new_rule, p.edge, cases)
    attempts = [{"source": "template", "rule": p.new_rule, **_summary(decision)}]
    if decision.accepted:
        return {**base, "status": "accepted", "final_rule": p.new_rule, "effect": decision.effect, "attempts": attempts}
    template_failed = True
    if arm == "repaired" and repair is not None:
        for _ in range(max_attempts):
            candidate = repair(p, decision, attempts, rules)
            if candidate is None:
                attempts.append({"source": "llm", "rule": None, "accepted": False, "reasons": ["gave_up"], "messages": []})
                break
            decision = evaluate_rule(rules, p.node, candidate, p.edge, cases)
            attempts.append({"source": "llm", "rule": candidate, **_summary(decision)})
            if decision.accepted:
                return {**base, "status": "accepted", "final_rule": candidate, "effect": decision.effect,
                        "repaired": True, "template_failed": template_failed, "attempts": attempts}
    return {**base, "status": "rejected", "template_failed": template_failed, "attempts": attempts}


def _summary(d: Decision) -> dict:
    return {"accepted": d.accepted, "reasons": d.reasons, "messages": d.messages[:6], "effect": d.effect}
