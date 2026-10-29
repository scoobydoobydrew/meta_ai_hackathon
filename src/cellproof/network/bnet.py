"""Minimal .bnet reader: lines of `target, rule`, `#` comments, optional `targets, factors` header."""
from __future__ import annotations

import re
from pathlib import Path

_NAME = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def parse_bnet(text: str) -> dict[str, str]:
    rules: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        target, _, rule = (part.strip() for part in line.partition(","))
        if target == "targets":
            continue
        if target in rules:
            raise ValueError(f"duplicate target {target!r}")
        rules[target] = rule
    return rules


def load_bnet(path: str | Path) -> dict[str, str]:
    return parse_bnet(Path(path).read_text(encoding="utf-8"))


def format_bnet(rules: dict[str, str]) -> str:
    return "targets, factors\n" + "".join(f"{node}, {rule}\n" for node, rule in rules.items())


def regulators(rule: str) -> set[str]:
    return set(_NAME.findall(rule))
