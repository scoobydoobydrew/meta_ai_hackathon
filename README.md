# CellProof

**LLM-proposed rules, solver-verified: repairing a cell-signalling model under formal verification.**

Meta Global AI Developer Hackathon, Indie track, "Push the Frontier". A research prototype. It prioritises hypotheses for lab
testing and gives no medical advice.

> **What pre-existed and what was built this week.** Pre-existing: the published 30-node Boolean model of the DNA damage
> response (Gupta et al. 2023, CC BY), the open-access papers, and the open-source solvers (clingo, mpbn, AEON, pyboolnet) and
> libraries listed in `THIRD_PARTY.md`. Built during the hackathon, in this repository only: everything in `src/`, `tests/`,
> `data/` (except the base model's rules, generated from its supplement by `src/cellproof/network/gupta2023.py`), `scripts/`
> and `docs/`.

## The idea

Boolean network models of cell signalling are powerful but incomplete: they miss mechanisms the literature already knows. A
language model can read papers and turn sentences into rules, but it cannot tell whether a rule breaks the model. An exact
solver can tell, but cannot read. CellProof joins them:

1. **Read.** Muse Spark reads each paper and returns mechanisms (`A activates / inhibits / is required by B`) with a quote.
   A quote that is not found verbatim in the paper is discarded.
2. **Ground.** Names are mapped to nodes through HGNC symbols and aliases. New nodes are added only if the evidence connects them
   to the network in both directions.
3. **Propose.** A fixed template turns each edge into a change of one rule.
4. **Verify.** An exact solver (complete fixed-point enumeration, attractor analysis) checks the edited network against ten
   known wild-type and mutant behaviours. A change that contradicts one comes back with a **counterexample**.
5. **Repair.** Muse Spark gets the claim, the evidence and the counterexample and proposes another rule. The solver checks it again;
   a repair that only restores the cases by making the new term inert is refused.
6. **Evaluate.** The augmented network is compared with the base network on held-out outcomes it never saw.

The model proposes; the solver decides. Every accepted or rejected rule is traceable to papers, quotes and a solver verdict:
`python -m cellproof.cli explain "CHK1|inhibits|Cdc25"`.

## Results

All numbers are produced by `make verify` and written to [`results/RESULTS.md`](results/RESULTS.md). Read the limits first:
[`docs/limitations.md`](docs/limitations.md).

RESULTS_PLACEHOLDER

## Reproduce

```bash
python -m venv .venv && .venv/bin/pip install -e .[dev]      # Python 3.11+
make test      # unit tests, no network
make verify    # rebuilds every table from cached model outputs; no API call, no cost; a cache miss is an error
make extract   # the only target that spends money: calls the Meta Model API for requests not yet in cache/
```

`.env` holds `MODEL_API_KEY` (never committed; see `.env.example`). Standard model IDs only, never `-contributor`.

## Layout

```
src/cellproof/
  meta_client.py     Meta Model API (Responses API) with an on-disk cache keyed by model, prompt and parameters
  corpus/            Europe PMC selection and download (open access, Creative Commons only)
  extract/           Muse Spark structured extraction, quote check, outcome filter
  formalize/         grounding (HGNC), edges, template edits, augmentation driver
  verify/            exact checker, acceptance rules, Muse Spark repair
  network/           bnet reader, base network from its supplement, phenotype definitions, Boolean logic
  analysis/          fixed points and attractors, scaling measurements
  eval/              held-out set, scoring, report
data/                base network, verification cases, held-out set (frozen), extractions, models, HGNC cache
docs/                protocol of the held-out set, limitations, notes on the Meta API and the extraction
```

## Honesty notes

- The held-out set (23 claims, 10 scoreable) was frozen before any network was scored; its history is in
  `docs/heldout_protocol.md`. A human has not yet checked that each quote supports its claim, so M1 is provisional.
- Extraction accuracy (M4) needs 50 claims labelled by a person (`data/labels/m4_sample.csv`) and is TBD until then.
- Third-party code and data are declared in `THIRD_PARTY.md`; paper texts are downloaded, not redistributed.
