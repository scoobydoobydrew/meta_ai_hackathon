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
    return OpenAI(base_url=BASE_URL, api_key=key)


def cache_key(model: str, prompt: Any, params: dict[str, Any]) -> str:
    blob = json.dumps(
        {"model": model, "input": prompt, "params": params}, sort_keys=True, default=str
    )
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


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
        "request": {"model": model, "input": prompt, "params": params},
        "text": r.output_text,
        "model": model,
        "usage": usage,
    }
    cache_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rec, indent=2, ensure_ascii=False, default=str), encoding="utf-8")
    return LLMResult(r.output_text, False, model, usage)
