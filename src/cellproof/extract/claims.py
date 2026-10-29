"""Muse Spark reads one paper and returns mechanism claims: {source, target, effect, context, evidence_quote, location}.

Only mechanisms (one molecule acting on another). Outcomes (survival, sensitivity to radiation or a drug, cell fate)
are never asked for, and a claim that names one anyway is set aside, counted and reported rather than dropped silently.
Every claim must also carry a quote that is found verbatim in the paper text; a claim whose quote cannot be found is
"ungrounded" and is not used. Both checks are mechanical and involve no model.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel

from cellproof.meta_client import DEFAULT_MODEL, LLMResult, complete

Effect = Literal["activates", "inhibits", "requires"]
EFFORT = "low"  # bulk extraction; reasoning tokens are billed as output (docs/meta_api_notes.md)


class Claim(BaseModel):
    source: str
    target: str
    effect: Effect
    context: str
    evidence_quote: str
    location: str


class Extraction(BaseModel):
    claims: list[Claim]


PROMPT = """You extract molecular mechanisms from one scientific paper about the DNA damage response.

A mechanism is one molecule acting on another: a protein, gene, RNA or small molecule (the source) activates,
inhibits, or is required by (requires) another (the target). Examples of the kind of statement: "ATM phosphorylates
CHK2" (ATM activates CHK2); "WIP1 dephosphorylates p53" (WIP1 inhibits p53); "CDC25 is required for CDK1 activation"
(CDK1 requires CDC25).

Rules:
- effect "activates": the source switches the target on, stabilises it, or raises its activity or level.
  effect "inhibits": the source switches the target off, degrades it, or lowers its activity or level.
  effect "requires": the source cannot act or be active without the target.
- Use the official gene or protein symbol for source and target (for example TP53 written as p53 if the paper does,
  MDM2, CHEK1 as CHK1). Do not write a modification as a separate molecule: "phospho-p53" is p53.
- Report only what this paper states or shows, not what the reader might infer. If the paper only cites a mechanism
  from other work, you may still report it, and say so in "context".
- Do NOT extract outcomes: cell survival, colony formation, sensitivity or resistance to radiation or to a drug,
  tumour growth, or the fraction of cells that die, arrest or senesce. Only molecule-on-molecule mechanisms.
- "evidence_quote" must be copied exactly, character for character, from the paper text below: one sentence or less,
  at most 40 words. Do not paraphrase, shorten with ellipses, or join separate sentences.
- "context" is the cell type, species, or condition the statement holds in, as the paper gives it (for example
  "cultured human cells, 2 h after a DNA-damaging agent", "in vitro kinase assay", "review statement").
- "location" is the section heading or the figure or table caption the quote comes from.
- Be exhaustive: report every distinct source-target-effect statement the paper makes, including those in the
  discussion and in figure and table captions. Several claims may share one sentence. Do not report the same
  source-target-effect twice.
- If the paper contains no such mechanism, return an empty list. Do not invent claims to fill the list.

PAPER ({pmcid}):
{text}
"""

SCHEMA = {
    "type": "object",
    "properties": {
        "claims": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "target": {"type": "string"},
                    "effect": {"type": "string", "enum": ["activates", "inhibits", "requires"]},
                    "context": {"type": "string"},
                    "evidence_quote": {"type": "string"},
                    "location": {"type": "string"},
                },
                "required": ["source", "target", "effect", "context", "evidence_quote", "location"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["claims"],
    "additionalProperties": False,
}
TEXT_FORMAT = {"format": {"type": "json_schema", "name": "mechanism_claims", "schema": SCHEMA, "strict": True}}

# Words that mark a phenotype or an experimental outcome rather than a molecule. "Apoptosis-inducing factor" and
# "autophagy-related" gene names are molecules, so those compounds are blanked before the test.
OUTCOME = re.compile(
    r"(\b(survival|viability|resistan\w*|apopto\w*|cell death|senescen\w*|autophag\w*|proliferat\w*|"
    r"cell growth|tumou?r growth|arrest|colony|clonogenic|cell fate)\b|\w*sensiti[vsz]\w*)"
)
MOLECULE_COMPOUND = re.compile(r"\b(apoptosis|autophagy)-(inducing|related)\b")


def normalize(text: str) -> str:
    """Case, whitespace, dashes, quotes and Unicode forms folded so that a copied quote can be found again."""
    text = unicodedata.normalize("NFKC", text).lower()
    text = re.sub(r"[‐-―−]", "-", text)
    text = re.sub(r"[‘’“”]", "'", text.replace('"', "'"))
    return " ".join(text.split())


def is_grounded(claim: Claim, paper_text: str) -> bool:
    quote = normalize(claim.evidence_quote)
    return len(quote) >= 15 and quote in normalize(paper_text)


def names_an_outcome(claim: Claim) -> bool:
    names = MOLECULE_COMPOUND.sub("", f"{claim.source} | {claim.target}".lower())
    return OUTCOME.search(names) is not None


@dataclass(frozen=True)
class PaperResult:
    pmcid: str
    grounded: list[Claim]
    ungrounded: list[Claim]
    outcome_level: list[Claim]  # grounded, but the source or target is a phenotype: set aside
    llm: LLMResult

    @property
    def counts(self) -> dict[str, int]:
        return {
            "proposed": len(self.grounded) + len(self.ungrounded) + len(self.outcome_level),
            "grounded": len(self.grounded),
            "ungrounded": len(self.ungrounded),
            "outcome_level": len(self.outcome_level),
        }


def build_prompt(pmcid: str, text: str) -> str:
    return PROMPT.format(pmcid=pmcid, text=text)


def extract_paper(pmcid: str, text: str, *, model: str = DEFAULT_MODEL, **kwargs) -> PaperResult:
    result = complete(
        build_prompt(pmcid, text), model=model, text=TEXT_FORMAT, reasoning={"effort": EFFORT}, **kwargs
    )
    claims = Extraction.model_validate(json.loads(result.text)).claims
    grounded, ungrounded, outcome_level = [], [], []
    for claim in claims:
        if not is_grounded(claim, text):
            ungrounded.append(claim)
        elif names_an_outcome(claim):
            outcome_level.append(claim)
        else:
            grounded.append(claim)
    return PaperResult(pmcid, grounded, ungrounded, outcome_level, result)
