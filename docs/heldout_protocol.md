# Held-out set: protocol (draft)

Status 2026-10-29. **Draft, not frozen.** The draft file is `data/heldout/gupta2023_heldout_draft.json`.
No model has been run on any item: not the base network, not an augmented one, not an LLM.
The commit that adds this file is the proof of that ordering.

## What the set is for

Outcomes from the literature on perturbing the DNA damage response, used **only** to score the final networks (M1).
They never enter the verification loop and never reach the LLM. The verification set is separate (the Gupta et al. 2023
cases in `tests/test_phenotypes.py`).

## Outcome vocabulary, fixed before any run

The network's five phenotypes (`src/cellproof/network/phenotypes.py`): proliferation, arrest, senescence, autophagy,
apoptosis, plus one more readout, `g2_arrest`, added on 2026-10-29 with the human's approval and before any item was run:
a fixed point shows it when `DNA_damage` is 1 and `Cdc2_CycB` is 0. It is judged apart from `classify`, so a fixed
point can be "arrest" and also show `g2_arrest`. A perturbation sets nodes to 0 and the stimulus sets `DNA_damage`
(IR = 1, none = 0).

Each claim in an item has a readout and a polarity (`present`, `absent`, `increased`, `decreased`, `unchanged`) and is
put into exactly one category by `cellproof.eval.heldout.claim_category`, from the item text alone:

| Category | Meaning | Scored? |
|---|---|---|
| `scoreable` | present/absent claim on one of the five phenotypes, perturbed node is in the base network | yes |
| `scoreable_with_new_nodes` | same, but the perturbed node (ATR, CHK1, DNA-PK) is not in the base network | base: not expressible; augmented: yes if it adds the node |
| `needs_readout` | a readout the network does not define; none in the current draft since `g2_arrest` was added | no |
| `survival_level` | clonogenic survival / radiosensitisation: the network has no survival output | no, in either network |
| `direction_only` | "increased", "decreased" or "unchanged" with a partial change (or none annotated): an attractor set has no frequencies | no |

A direction claim is scoreable (by contrast, see the scoring rule) only if its hand-annotated `magnitude` is `complete`
(the readout fully disappears or fully appears) or `none` (the paper says explicitly that nothing changed).
`partial` stays `direction_only`.

## What is in the draft (produced by `summarize`, 2026-10-29, after adding `g2_arrest` and adopting D6)

14 items, 25 claims, from 7 papers. Perturbed node is in the base network for 8 of 14 items.

| Category | Claims |
|---|---|
| scoreable | 7 |
| scoreable_with_new_nodes | 3 |
| needs_readout | 0 |
| survival_level | 11 |
| direction_only (partial changes) | 4 |

**10 of 25 claims can be scored, 7 of them on the base network.** Most of the radiosensitisation literature
reports survival, which a phenotype network cannot express. That is a result about the approach, and the README must say so.
It is also far too few claims to show an improvement statistically; any M1 number from this set must be reported as counts.

**Correction.** An earlier version of this protocol, and a message to the human, said that adding `g2_arrest` would make
8 more claims scoreable (13 of 25). That was wrong. Seven of the 8 G2 claims say "reduced", "unchanged" or "increased",
so they fell under `direction_only`, and adding the readout made exactly one claim scoreable (H04). The step from 6 to 10
comes from D6 below, which was a separate decision.

## Scoring rule, fixed now (implemented in `src/cellproof/eval/score.py`)

For each claim take the *setting* = stimulus + the claim's `backgrounds` (node settings for the cell line's own
genotype, such as p53 = 0 for a p53-null line; default one empty background) + the item's perturbation. The outcome of a
setting is the set of phenotypes of its fixed points (`classify`), plus `g2_arrest` if any fixed point shows it.
Fixed points that match no definition, and networks with non-fixed-point attractors, are flagged `unclassified` /
`complex_attractor` and count for no phenotype.

- **absolute** (`present`, `absent`): correct if the readout is in (not in) the outcome of the perturbed setting.
- **contrast** (`complete` or `none` direction claims): the reference is the same setting without the perturbation.
  `decreased` is correct if the readout is in the reference and not in the perturbed outcome, `increased` for the reverse,
  `unchanged` if its status is the same in both.
- A claim with several backgrounds is correct only if it is correct in every one.
- A claim whose perturbed or background nodes are not in the network is **not expressible**, not wrong.

Report per claim: correct, wrong, or not expressible. Never merge the three.

Baselines to report next to every score (`baseline_verdict`): the no-information baseline that pretends the perturbation
does nothing (the unperturbed network answers every absolute claim; every contrast claim is answered "unchanged"), and a
coin flip.

**Guard.** `score_doc` refuses to score a set whose status starts with `DRAFT`, so no number can come from this file
before the freeze. Its tests use synthetic items built from cases in the Gupta paper.

## Leakage and selection, disclosed

- **Corpus exclusion.** These papers must not be in the extraction corpus: PMC2906734, PMC3789084, PMC3167033,
  PMC5342109, PMC6116113, PMC3997448, PMC3687028. Extraction prompts ask for mechanisms only.
- **Corpus is not clean of similar experiments.** The queries (in `corpus/europepmc.py`) exclude papers that use the words
  radiosensitisation or clonogenic, and the list was fixed by topic and citation count before any text was read. Some
  corpus papers still report G2 checkpoint results under irradiation with ATM, ATR or DNA-PK inhibition, in other cell
  lines than the held-out ones (for example PMC6547644). They are not the held-out sources, and the extractor is asked
  for mechanisms (A activates / inhibits B) only. Whether such mechanisms legitimately explain a held-out result is exactly
  what the experiment tests, but the overlap in topic is a fact the reader should know. A first attempt with
  Europe PMC's default order was discarded unused after the titles showed unrelated tissues; it was never extracted.
- **Selection bias, in the direction that favours the thesis.** I searched by base-network node, so sources were not picked
  by outcome. But I had read the base rules, and I know from them that apoptosis needs `p53_K`, which needs `p53`.
  H03 (apoptosis in p53-null cells) was therefore chosen partly because the base network should get it wrong. H01 should
  be got right by the base. Per-claim reporting, not an aggregate, is what keeps this honest. The human should add items
  without looking at the rules.
- **Reading was indirect.** Every claim was read through a page-summarising fetch tool, not by a person.
  Some sources disagree internally (for example H08: the authors say U87 is refractory, yet the two enhancement ratios
  are 3.0 and 3.2). Every locator and claim needs a human check before the freeze.
- **Genuine disagreement is kept**: H13 reports G2 abrogation in one line and not in the other, and the same paper reports
  similar reductions in both in asynchronous cultures. Halaçlı 2013 (H03, H04) conflicts with the classic finding that
  p53 is needed to sustain G2 arrest; that classic paper was not read.

## Approximations, applied uniformly

Inhibitor, knockdown, mutation with LOH, and null are all modelled as the node set to 0. Nutlin-3 is modelled as Mdm2 loss
although it blocks the MDM2-p53 interaction. ATM inhibition is modelled as loss of the merged `ATM_pH2AX` node.
These are recorded per item in `perturbation.approximation`.

## Decisions for the human before the freeze

- **D1. Decided by the human on 2026-10-29: add `g2_arrest`.** It rests on the Gupta paper's own text, which describes
  Cdc2-CycB and Wee1 as G2/M arrest mechanisms: `g2_arrest` = `Cdc2_CycB` OFF with `DNA_damage` ON. Fixed before any run,
  applied identically to every network. It is one more hand-chosen readout, after the PUMA choice. For the record: in the
  four damaged wild-type fixed points printed earlier, `Cdc2_CycB` is OFF in all of them, so in the wild type `g2_arrest`
  does not separate the four fates; only perturbations can switch it off.
- **D6. Decided on 2026-10-29: score direction claims by contrast, strictly.** The human delegated the choice ("do what
  you think best"); it was taken by the assistant and is recorded as such. Eight claims say a readout was reduced,
  unchanged or increased relative to the same cells without the perturbation (the claim's `vs`). Only complete
  abolitions, complete appearances and explicit "no change" are scored (4 of the 8: H06 both claims, the second claim of
  H09, the second claim of H13). The other four are partial reductions (24%, 36%, "significantly reversed") or increases
  from a nonzero baseline (H14), which a presence/absence model cannot represent; they stay `direction_only`.
  The `magnitude` of each was annotated by hand from the claim's own statement, once, and is part of the item file.
  Cost, stated plainly: a second scoring convention chosen after seeing the claims. Its effect on the count is 6 to 10
  of 25; results are always reported per claim, and the absolute-only subset (6 claims) can be reported separately.
- **D6b. Backgrounds.** The two H06 claims share one perturbation (Wee1 loss) but one line is p53-null and the other
  wild type, so scoring them under one setting would make them contradict each other. Claims therefore carry a
  `backgrounds` annotation (p53 = 0 for H1299, empty for A549, both for U2OS wild type and dominant-negative). Dominant-
  negative p53 is modelled as p53 = 0, and A549 "wild type" ignores its other lesions. Added together with D6.
- **D2. Accepted by the assistant on 2026-10-29 (delegated).** The approximations above stand.
- **D3. More items.** Phenotype-level knockout data (apoptosis present or absent after irradiation in null cells) would
  be scoreable, unlike survival data. This search was not done. Open.
- **D4. Still the human's, and not delegable.** Check every locator and claim against the papers. An assistant reading
  its own summaries cannot stand in for this. Until it is done, every number computed from this set is provisional.
- **D5. Pre-extraction snapshot, taken 2026-10-29** (see below). This is a snapshot that proves ordering, not the final
  freeze: the final freeze follows D4. Changes after the snapshot are listed in the amendment log.

## Snapshot before extraction, and amendment log

The corpus download and the Muse Spark extraction start only after this snapshot. The extraction prompts ask for
mechanisms only and the seven source papers are excluded from the corpus, so the held-out outcomes cannot reach the
extractor. The SHA-256 of `data/heldout/gupta2023_heldout_draft.json` is recorded in `data/heldout/draft.sha256`, a test
fails when the file stops matching it, and the commit is tagged `heldout-pre-extraction`.

Amendment log (any later change to the item file, with the reason; updating the hash file is the sign of an amendment):

- none yet.

## Not found or not done

AKT/PTEN (only survival-level sources surfaced), Wip1 with irradiation (only combinations with other drugs surfaced),
a photon-irradiation HCT116 p21-/- study, the original Bunz 1998 paper, the original MK-1775 radiosensitisation
phenotype data beyond Bridges 2011, and DNA-PK with p53 status. Poehlmann 2011 (PMC3823197) was excluded because it uses
hydrogen peroxide, not radiation.
