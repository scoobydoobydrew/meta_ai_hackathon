"""Assemble the report page: one self-contained HTML file (data, style and script inline; only the fonts come from Google Fonts,
with system fallbacks). `render_fragment` gives the same page without the document wrapper, for publishing as an artifact."""
from __future__ import annotations

import json
from pathlib import Path

from cellproof.report.data import ROOT, collect

WEB = Path(__file__).parent / "web"
FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"


def _json(data: dict) -> str:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/").replace("<!--", "<\\!--")


def parts(data: dict) -> tuple[str, str, str]:
    head = (
        "<title>CellProof</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n"
        f"<link rel=\"stylesheet\" href=\"{FONTS}\">\n<style>\n{(WEB / 'style.css').read_text(encoding='utf-8')}\n</style>\n"
    )
    body = (WEB / "body.html").read_text(encoding="utf-8")
    code = "\n".join((WEB / name).read_text(encoding="utf-8") for name in ("core.js", "sections.js", "bench.js"))
    script = f"<script>\nconst D = {_json(data)};\n{code}\n</script>\n"
    return head, body, script


def render_fragment(data: dict) -> str:
    return "".join(parts(data))


def render(data: dict) -> str:
    head, body, script = parts(data)
    return (
        "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
        f"{head}</head>\n<body>\n{body}{script}</body>\n</html>\n"
    )


def write(out: Path | None = None, fragment: Path | None = None) -> Path:
    data = collect()
    out = out or ROOT / "results" / "report.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render(data), encoding="utf-8")
    if fragment:
        fragment.write_text(render_fragment(data), encoding="utf-8")
    return out
