# CellProof (working title)

**LLM-proposed rules, solver-verified: repairing a cell-signalling model under formal verification.**

Project brief for the **Meta Global AI Developer Hackathon**: Indie track, theme "Push the Frontier".
This file is also the instruction set for the AI coding assistant working in this repo. Read all of it before writing code.

---

## 0. Hard rules (non-negotiable)

Source: organizer's written guidance (Cerebral Valley, Oct 27) plus the participant guide.

1. **Fresh repo, hackathon work only.** This repo is new and public. It contains only work done during the event. No code and no git history from any earlier project. Do **not** read, copy, or paraphrase-copy anything from any other local folder or repo. If something like it existed before kickoff, it is rewritten from scratch here.
2. **Commit early and often** with descriptive messages (the history is the proof of work). Never rewrite history, never force-push, never squash the whole project into one commit.
3. **Meta models must be core**, not decorative: the Meta Model API (Muse Spark, optionally Muse Wonder) is part of the main pipeline.
4. **Third-party code/data is fine as declared dependencies** (installed, not vendored). Record name, source and license in `THIRD_PARTY.md`. Do not use code, data or assets we lack rights to.
5. **No secrets in the repo.** Keys live in `.env` (git-ignored). `.env.example` lists variable names only. Run a secret scan before making the repo public.
6. **Not medical advice.** This is a research tool that prioritises hypotheses for lab testing. No patient-facing output, no clinical-efficacy claims.
7. **Honest numbers only.** Every number in the README, video or slides must be produced by a script in this repo (`make verify`). If unknown, write "TBD". Do not write biology facts into code or docs from memory; every mechanism must come from a cited source.
8. **Deadline:** submit by **Wed Nov 4, 9:00 PM ET** (= Thu Nov 5, 04:00 Greece). Target: submit the evening of Nov 3. Public repo + public video link + 3-minute demo video.
9. **The video opens with one line** stating what pre-existed and what was built this week.

---

## 1. Pitch (one paragraph)

Boolean network models of cell signalling are powerful but incomplete: they miss mechanisms that the literature already knows. We build an agent in which **Muse Spark reads papers and proposes mechanistic rules, and an exact solver accepts or rejects each rule** against known wild-type and mutant phenotypes, returning a counterexample on failure so the model can repair the rule. Verified rules augment a published model of the DNA-damage response. We then test, on **held-out outcomes the model never saw**, whether the augmented network predicts what the unaugmented one missed. The LLM proposes; the solver decides; the whole result is reproducible with one command.

Why this is a good use of an LLM: reading text and figures and turning them into formal rules is something the solver cannot do; checking them exactly is something the LLM cannot do.

---

## 2. System design

| Stage | What happens | Tools |
|---|---|---|
| A. Corpus | Download open-access full texts on DNA-damage response and radiation. Store IDs + text locally. | Europe PMC REST API (open-access subset only) |
| B. Extraction | Muse Spark reads each paper (text/PDF) and outputs structured claims: `{source, target, effect (activates/inhibits/requires), context, evidence_quote, location}`. **Only mechanisms. Never extract radiosensitisation outcomes** (those are the held-out test). | Meta Model API, structured output |
| C. Formalisation | Claims -> candidate Boolean update rules. Deterministic converter first; LLM only for ambiguous cases. | Python |
| D. Verification loop | Each candidate rule is checked against the *verification set* of phenotypes (wild-type + mutants). Contradiction -> counterexample (trace or unsat core) -> back to the LLM -> repair, at most K attempts. Log every step. | clingo / pyboolnet / Z3 |
| E. Augmentation | Accepted rules are merged into the base published model. Versioned model files. | Python |
| F. Analysis | Attractors, trap spaces, minimal intervention sets that remove the survival attractor. | pyboolnet / clingo / mpbn / AEON.py (check what installs) |
| G. Evaluation | Compare base vs augmented network on the **held-out set**. Ablations (section 5). | pytest + scripts |
| H. Optional | Pathway **figure -> candidate edges** with Muse Spark vision; precision/recall against a curated reference network. | Meta Model API |
| I. Explanations | Each reported intervention comes with a step-by-step explanation whose steps are re-checked against the model's rules. Write fresh. | Python + LLM wording |

Scaling to a bigger network (about 50+ nodes) is a **timeboxed stretch goal (half a day max)**. If it fails, record the limit and the cause as a result.

---

## 3. Meta Model API: what is verified

From the official docs (dev.meta.ai/docs):

- OpenAI-SDK compatible. Base URL `https://api.meta.ai/v1`. Key in env var `MODEL_API_KEY`. **The OpenAI SDK does not auto-read it: pass `api_key` explicitly.**
- Main protocol: **Responses API**. Chat Completions and Anthropic Messages are also supported.
- Models: `muse-spark-1.3` (default, recommended), `muse-wonder-1.0` (preview, stronger on long agentic work, same endpoints), `sam-3.1`, `muse-image-1.0` (not needed here). Muse Spark 1.3 takes text, image, video, PDF input; 1,048,576-token context; reasoning effort from `minimal` to `max`.
- Use the **Standard** model IDs (not `-contributor`): contributor mode lets Meta train on our content.
- Reasoning tokens count as output tokens. Use low reasoning effort for bulk extraction; test latency on day 1.
- To keep reasoning across tool-loop turns, pass `include: ["reasoning.encrypted_content"]` (Responses API).
- Pricing (Standard, `muse-spark-1.3`): $1.25 / M input tokens, $4.25 / M output tokens. Hackathon credit: $150 (claim before Nov 4; each participant claims their own; needs a card; set a spend limit on the Billing page).
- Prompt caching and token counting exist; see docs.

Minimal smoke test (put this in `src/cellproof/meta_client.py` and `tests/test_smoke.py`):

```python
import os
from openai import OpenAI

client = OpenAI(base_url="https://api.meta.ai/v1", api_key=os.environ["MODEL_API_KEY"])
r = client.responses.create(model="muse-spark-1.3", input="Reply with the word: ok")
print(r.output_text)
```

**Read these doc pages before implementing, and do not guess parameter names:**
- Structured output: https://dev.meta.ai/docs/structured-output
- Tool calling: https://dev.meta.ai/docs/tool-calling
- Reasoning: https://dev.meta.ai/docs/reasoning
- File handling (PDF upload): https://dev.meta.ai/docs/file-handling
- Image understanding: https://dev.meta.ai/docs/image-understanding
- Responses API: https://dev.meta.ai/docs/protocols/responses
- Agent patterns: https://dev.meta.ai/docs/cookbook/agent-patterns
- Pricing and rate limits: https://dev.meta.ai/docs/pricing-rate-limits
- Error handling: https://dev.meta.ai/docs/error-handling

If a doc page and this brief disagree, the doc page wins. Tell the human.

---

## 4. Rules for the coding assistant

- Work only inside this directory. Do not open other repos.
- Plan first, then small steps. After each step: run it, run tests, commit.
- Cache every LLM response on disk keyed by a hash of (model, prompt, params), so `make verify` is deterministic and free, and `make extract` is the only target that spends money.
- Pin dependency versions in `pyproject.toml` / lock file.
- Never invent API parameters, library functions or biology. If unsure, read the docs or ask the human.
- Mechanisms named below (ATR, CHK1, WEE1, DNA-PK as candidate radiosensitisation targets) are **hypotheses to be checked against sources**, not facts to hard-code.
- Keep outputs and logs readable: every accepted or rejected rule must be traceable to a paper, a quote and a solver verdict.
- Ask before: adding paid services, changing the evaluation split after it is frozen, or deleting data.

---

## 5. Evaluation protocol (decide now, freeze before looking at results)

**Data splits**
- *Verification set*: known wild-type/mutant phenotypes used **inside** the repair loop.
- *Held-out set*: radiosensitisation / knockout outcomes used **only** to score the final network. Freeze it in a commit before running extraction. Never feed held-out outcomes to the LLM or the loop.
- Extraction prompts ask for mechanisms only, so the LLM cannot leak the held-out answers.

**Metrics**
1. **M1, held-out outcome agreement**: base network vs augmented network (recall and precision of correctly predicted outcomes).
2. **M2, contradiction rate**: share of LLM-proposed rules that contradict verification phenotypes, LLM-only vs LLM+solver (after repair).
3. **M3, repair success**: fraction of rejected rules fixed within K attempts.
4. **M4, extraction accuracy**: on a hand-labelled sample of about 50 claims (checked by the human, not by an LLM).
5. **M5, model ablation**: Muse Spark vs Muse Wonder (accuracy, cost, latency). Optional: Muse Spark Open via a hosted provider.
6. **M6, scaling table**: nodes vs solver time (with timeout), including failures.

Report negative results. State limits plainly.

**Reproducibility:** `make verify` re-runs analysis and evaluation from cached LLM outputs and prints the results table. `make extract` re-calls the API.

---

## 6. Tech stack (verify installs on day 1)

- Python 3.11+, `uv` or venv, `openai`, `pydantic`, `pytest`, `typer`, `rich`.
- Solvers: `clingo`, `pyboolnet`, `mpbn`, `biodivine_aeon`, optionally `z3-solver`. **Check today what installs on this machine**; fall back to a clingo-only encoding if some do not.
- Base network: choose a published, openly licensed Boolean model of the DNA-damage response (GINsim repository, Cell Collective or BioModels). Record source, license and node count in `THIRD_PARTY.md`. Do not state a node count we have not verified.
- UI: CLI plus a static HTML report. Streamlit only if time remains.

---

## 7. Repo layout

```
.
├── README.md            # this file (copy to CLAUDE.md for Claude Code)
├── THIRD_PARTY.md
├── Makefile             # extract, verify, test
├── pyproject.toml
├── .env.example         # MODEL_API_KEY=
├── .gitignore           # .env, data/raw, caches if large
├── src/cellproof/
│   ├── meta_client.py
│   ├── corpus/          # Europe PMC download
│   ├── extract/         # Muse Spark structured extraction
│   ├── formalize/       # claims -> rules
│   ├── verify/          # solver checks + counterexamples + repair loop
│   ├── network/         # base model, augmentation, versions
│   ├── analysis/        # attractors, minimal interventions
│   ├── eval/            # splits, metrics, ablations
│   └── cli.py
├── data/                # small fixtures committed; big raw data ignored
├── cache/               # LLM response cache
├── results/             # generated tables and figures
├── tests/
└── docs/                # video script, limitations
```

---

## 8. Schedule (Oct 29 to Nov 4)

| Day | Goal |
|---|---|
| Thu 10/29 | New repo, `.env`, Meta client smoke test, installs checked, base network chosen (license!), base attractors reproduced. |
| Fri 10/30 | Corpus download, structured extraction working, 50-claim hand-labelled sample, **splits frozen and committed**. |
| Sat 10/31 | Verification + repair loop, LLM-only vs LLM+solver ablation. **Milestone: end-to-end works on a small subset.** |
| Sun 11/1 | Augmentation, base vs augmented on held-out set, Spark vs Wonder. |
| Mon 11/2 | Timeboxed scaling attempt; optional figure -> edges; results table final. |
| Tue 11/3 | README final, video recorded, repo/video public check, **submit if ready**. |
| Wed 11/4 | Buffer only. Submit well before 9 PM ET. |

If behind schedule, cut in this order: figure -> edges, Muse Wonder ablation, scaling, UI. Never cut the splits, the verification loop or `make verify`.

---

## 9. Demo video (3 minutes)

0:00 One line: what pre-existed and what was built this week.
0:15 Problem: a published model misses a mechanism the literature knows.
0:45 The agent reads papers, proposes rules; the solver rejects some and shows the counterexample; the model repairs.
1:45 Result: base vs augmented on held-out outcomes (real numbers from `make verify`).
2:30 `make verify` on screen, then limits stated plainly.

Record the pipeline from cached outputs so there is no live-API risk.

---

## 10. Limitations to state in the README and video

- Boolean networks are discrete abstractions of continuous, stochastic biology; no dose or time.
- One base model; results depend on it.
- Ground truth comes from literature and may be incomplete or inconsistent.
- The solver catches contradictions with the phenotypes we encoded, not every error.
- Outputs are hypotheses for experiments, not clinical claims.

---

## 11. Open decisions for the human (resolve on day 1)

- Which published base network, and its license.
- Which stress/outcome is the target (survival vs apoptosis after radiation).
- Which 20 to 40 open-access papers form the corpus.
- Which held-out outcomes, with their sources.
- Whether to ask the organizers (Discord #questions) about AI coding tools if the official rules restrict them.
