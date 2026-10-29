# Mechanism extraction: what was run and what it means

Run 2026-10-29 with `muse-spark-1.3` (Standard), `reasoning.effort = low`, strict JSON schema output, on the 36 papers of
`data/corpus/manifest.json`. All totals below come from `cellproof extract-stats`; rerun it for the current figures.

## What the run produced

- 536 proposed claims in 36 papers; 535 grounded, 1 ungrounded, 0 outcome-level. One paper (a 1996 abstract-length text)
  gave no claim, which is the right answer.
- Raw responses are in `cache/` (keyed by model, prompt, parameters; long prompts are stored as a hash only). The readable
  per-paper files are in `data/extractions/muse-spark-1.3/`. `CELLPROOF_OFFLINE=1` replays them without the API.
- Spend: the 36 calls in the saved files cost about $1.32 by the price table in `meta_client.py`; one earlier pilot of two
  papers under a first, less exhaustive prompt (6 and 2 claims, about $0.04) was superseded and its cache entries remain
  in `cache/`. The first dry-run estimate of $0.49 counted input tokens only; output (mostly reasoning tokens) cost more
  than the input.

## What the numbers do not say

- **"Grounded" means only that the quote is found verbatim in the paper.** It does not mean the claim is a correct reading
  of the quote. Whether the source, target and direction are right is metric M4, which needs a human: `cellproof
  label-sample` wrote `data/labels/m4_sample.csv` (50 claims, seeded sample drawn before anyone looked at the claims).
  Until it is labelled there is no extraction accuracy, and none may be quoted.
- The 99.8% grounded rate says the model copies quotes faithfully; it says nothing about biology.
- Many claims are from papers about viruses, nanoparticles or neurons; they are about molecules that are not in the base
  network and will be set aside at formalisation (the name-to-node step), which is where the real yield is measured.
- Names are free text ("Chk1", "CHEK1", "checkpoint kinase 1"). They are not yet mapped to network nodes.

## Prompt choices, in order

1. First prompt: mechanisms only, quote copied exactly. 8 claims from 2 papers.
2. Added "be exhaustive: every distinct source-target-effect statement". 29 claims from the same 2 papers (23 and 6).
   This was the only prompt change, made after seeing two papers' output, before the other 34 were read. No claim was
   edited by hand.
