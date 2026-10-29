"""Thin Meta Model API client with an on-disk response cache.

Only `extract` is meant to spend money. Everything else replays the cache with
CELLPROOF_OFFLINE=1, where a cache miss raises instead of calling the API.
Cache hits are flagged (`from_cache`) so a replay can never pass for a live run.
"""
from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

BASE_URL = "https://api.meta.ai/v1"
DEFAULT_MODEL = "muse-spark-1.3"
CACHE_DIR = Path(__file__).resolve().parents[2] / "cache"


# USD per 1M tokens, Standard mode: (cached input, input, output). https://dev.meta.ai/docs/pricing-rate-limits, read
# 2026-10-29. Reasoning tokens are billed as output. Whether cached_tokens is a subset of input_tokens is assumed (as in
# the OpenAI usage format), not stated; a first, uncached call is unaffected.
PRICES = {"muse-spark-1.3": (0.15, 1.25, 4.25), "muse-wonder-1.0": (0.20, 4.00, 20.00)}


def cost_usd(usage: dict[str, Any] | None, model: str) -> float:
    if not usage or model not in PRICES:
        return 0.0
    cached_rate, input_rate, output_rate = PRICES[model]
    cached = (usage.get("input_tokens_details") or {}).get("cached_tokens") or 0
    fresh = usage.get("input_tokens", 0) - cached
    return (cached * cached_rate + fresh * input_rate + usage.get("output_tokens", 0) * output_rate) / 1e6


class CacheMiss(RuntimeError):
    """Offline mode is on and the request is not in the cache."""


@dataclass(frozen=True)
class LLMResult:
    text: str
    from_cache: bool
    model: str
    usage: dict[str, Any] | None


def make_client() -> OpenAI:
    load_dotenv()
    key = os.environ.get("MODEL_API_KEY")
    if not key:
        raise RuntimeError("MODEL_API_KEY is not set (copy .env.example to .env)")
    # The OpenAI SDK does not read MODEL_API_KEY by itself, so pass it explicitly.
    # The SDK retries 429 and 5xx with backoff and honours Retry-After (the docs advise 3 to 5 attempts).
    return OpenAI(base_url=BASE_URL, api_key=key, max_retries=4)


def cache_key(model: str, prompt: Any, params: dict[str, Any]) -> str:
    blob = json.dumps(
        {"model": model, "input": prompt, "params": params}, sort_keys=True, default=str
    )
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


MAX_RECORDED_INPUT_CHARS = 20_000


def _recorded_input(prompt: Any) -> Any:
    """Small prompts are stored verbatim; a long one (a paper's full text) is stored as its hash and length, so the
    committed cache does not republish third-party text. The cache key still covers the whole prompt."""
    blob = json.dumps(prompt, sort_keys=True, default=str)
    if len(blob) <= MAX_RECORDED_INPUT_CHARS:
        return prompt
    return {"sha256": hashlib.sha256(blob.encode("utf-8")).hexdigest(), "chars": len(blob), "stored": False}


def complete(
    prompt: Any,
    *,
    model: str = DEFAULT_MODEL,
    client: OpenAI | None = None,
    cache_dir: Path = CACHE_DIR,
    **params: Any,
) -> LLMResult:
    """One Responses API call, served from the cache when the request was seen before.

    `params` go to `responses.create` unchanged and are part of the cache key.
    """
    key = cache_key(model, prompt, params)
    path = cache_dir / f"{key}.json"
    if path.exists():
        rec = json.loads(path.read_text(encoding="utf-8"))
        return LLMResult(rec["text"], True, rec["model"], rec.get("usage"))

    if os.environ.get("CELLPROOF_OFFLINE") == "1":
        raise CacheMiss(f"offline mode and no cached response for {key[:12]}")

    client = client or make_client()
    r = client.responses.create(model=model, input=prompt, **params)
    usage = getattr(r, "usage", None)
    usage = usage.model_dump(mode="json") if usage is not None else None
    rec = {
        "request": {"model": model, "input": _recorded_input(prompt), "params": params},
        "text": r.output_text,
        "model": model,
        "usage": usage,
    }
    cache_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rec, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    return LLMResult(r.output_text, False, model, usage)
