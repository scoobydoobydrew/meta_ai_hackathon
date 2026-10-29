# Held-out set: protocol

Status 2026-10-29: **frozen v1, human check pending.** The item file is `data/heldout/gupta2023_heldout.json`; its hash is
in `data/heldout/heldout.sha256` and a test fails if the file changes without a logged amendment (section at the end).
No network, base or augmented, and no LLM has been run on any item: the commit tagged `heldout-frozen-v1` precedes the first
scoring run. Every claim carries a verbatim quote found by code in the source paper; what a person still has to do is
check that each quote supports its claim (D4), and until then every number computed from this set is provisional.

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

After amendment 1 (below): 14 items, 23 claims, from 7 papers. Perturbed node is in the base network for 9 of 14 items.

| Category | Claims |
|---|---|
| scoreable | 8 |
| scoreable_with_new_nodes | 2 |
| needs_readout | 0 |
| survival_level | 10 |
| direction_only (partial changes) | 3 |

**10 of 23 claims can be scored, 8 of them on the base network.** Most of the radiosensitisation literature
reports survival, which a phenotype network cannot express. That is a result about the approach, and the README must say so.
It is also far too few claims to show an improvement statistically; any M1 number from this set must be reported as counts.

**Correction.** An earlier version of this protocol, and a message to the human, said that adding `g2_arrest` would make
8 more claims scoreable (13 of 25). That was wrong. Seven of the 8 G2 claims say "reduced", "unchanged" or "increased",
so they fell under `direction_only`, and adding the readout made exactly one claim scoreable (H04). The step from 6 to 10
comes from D6 below, which was a separate decision. (Before amendment 1 the counts were 7 + 3 + 4 + 11 of 25.)

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
  PMC5342109, PMC6116113, PMC4013513, PMC3687028. Extraction prompts ask for mechanisms only. (PMC3997448, H14's source,
  was in this list until amendment 1 and was never in the corpus.) A test checks the committed corpus manifest against the
  sources in the item file.
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
- **Reading.** The draft was first written from page summaries made by a fetch tool. Amendment 1 re-read the sources through
  the Europe PMC and NCBI E-utilities APIs, found a verbatim quote for every claim by code, and checked that each quote is
  in the paper. That exposed errors in the summaries (listed in the amendment log); they were corrected from the text, and
  no score existed to influence the corrections. A person still has to check that each quote supports its claim (D4).
- **Genuine disagreement.** Halaçlı 2013 (H03, H04) conflicts with the classic finding that p53 is needed to sustain G2
  arrest; that classic paper was not read. H13's paper concludes that abrogation of the G2 block by the CHK1 inhibitor is
  essentially identical in the p53-null and the p53 wild-type line, which is why its claims are partial reductions.

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
- **D3. More items: one fixed search, run once (amendment 1).** For eight perturbed genes (ATM, TP53, MDM2, PPM1D/Wip1,
  CHEK1, CHEK2, ATR, PRKDC/DNA-PK) Europe PMC was searched for open-access papers whose abstract has irradiation, a
  loss-of-function term and a phenotype term (apoptosis, cell cycle arrest, G2/M, G1 arrest, senescence, autophagy), sorted
  by citations, Creative Commons licence, not in the extraction corpus and not already a source; the first two per gene
  were read (16 papers). Most hits were off topic (a bioinformatics web tool, a muscle review, replication stress,
  temozolomide) or had only partial or timing differences (Wip1 depletion: apoptosis 41% vs 11%; miR-185/ATR: more
  apoptosis; Myc null fibroblasts: delayed arrest and cell death). One gave a clear complete change in a network node:
  Phesse 2014, Myc deletion abrogates the immediate wave of apoptosis after irradiation (H15). The set is therefore still
  small; the search was not extended after seeing that, and no network had been scored.
- **D4. Still the human's, and not delegable.** Check that each claim's quote supports the claim. With the quotes this is a
  reading task of 23 sentences, not a literature search. An assistant checking its own selection cannot stand in for it.
  Until it is done, every number computed from this set is provisional.
- **D5. Freeze.** Two points in the git history: the tag `heldout-pre-extraction` (before any extraction) and the tag
  `heldout-frozen-v1` (after amendment 1, before any scoring). Changes after the freeze are listed in the amendment log and
  need the human's approval; the log below shows what each did to the set.

## Snapshot before extraction, and amendment log

The corpus download and the Muse Spark extraction start only after this snapshot. The extraction prompts ask for
mechanisms only and the seven source papers are excluded from the corpus, so the held-out outcomes cannot reach the
extractor. The SHA-256 of `data/heldout/gupta2023_heldout.json` is recorded in `data/heldout/heldout.sha256`, a test
fails when the file stops matching it, and the commit is tagged `heldout-pre-extraction`.

Amendment log (any change to the item file, with the reason; updating the hash file is the sign of an amendment):

- **Amendment 1, 2026-10-29, before the first scoring run.** Hash before: `b7d55b84...4914c` (tag `heldout-pre-extraction`).
  Done by `scripts/amend_heldout_quotes.py` after the two extractions and the augmentation arms had been run, so the
  assistant knew which nodes entered the augmented networks (ATR, CHK1, CHK2, DNA-PK) and the edit counts, but no held-out
  score existed. What it changed, and why:
  1. Every claim got a verbatim quote, found by code in the full text from Europe PMC or NCBI E-utilities.
  2. H07 claim 2 narrowed to the heterozygous line, the only case the quoted sentence covers.
  3. H08: the caveat "U87 is relatively refractory" does not occur in the text and was removed; the text says the two lines
     "were similarly radiosensitized". The enhancement ratios 3.0 and 3.2 were dropped, being unquoted.
  4. H13: the paper concludes that abrogation of the G2 block by the CHK1 inhibitor is "essentially identical" in the
     p53-null and the p53 wild-type line, so "unchanged in A549 at 4 h" compared different time points. Both claims are now
     partial reductions, which are not scored. This removed the only CHK1 claim that was scoreable.
  5. H14 dropped: no full text is served for its source, and its three claims (increased G2/M, increased apoptosis,
     survival) were not scoreable.
  6. H15 added from the fixed search of D3 (Myc deletion abrogates apoptosis after irradiation).
  Effect on the counts: 25 claims, 10 scoreable (7 on the base network) became 23 claims, 10 scoreable (8 on the base).
  Hash after: in `data/heldout/heldout.sha256` for the frozen file (the status line was then changed from DRAFT to FROZEN).

## Analysis fixed before the first scoring run

- **Networks scored** (`cellproof score`): the base network; and from `cellproof augment` the three arms *naive* (every
  edit applied unchecked), *verified* (solver-checked, no repair) and *repaired* (rejected edits sent back to Muse Spark
  with the counterexample, K = 3), each with edges supported by at least 2 papers (`min2`) and by at least 1 (`min1`).
- **Headline**: `repaired_min2` against the base network, `naive_min2` and the no-information baseline, claim by claim.
  `min1` and the other arms are reported next to it, not instead of it.
- **Reported**: the per-claim table and the counts of correct, wrong and not expressible, nothing else. No percentage and no
  claim of improvement is made from counts this small; the README says what the table shows and what it cannot.
- A result that is bad for the thesis is reported as it is. The set, the rules and the arms are not changed after the first run
  except by a logged amendment with the human's approval.

## Not found or not done

AKT/PTEN (only survival-level sources surfaced), Wip1 with irradiation (only combinations with other drugs surfaced),
a photon-irradiation HCT116 p21-/- study, the original Bunz 1998 paper, the original MK-1775 radiosensitisation
phenotype data beyond Bridges 2011, and DNA-PK with p53 status. Poehlmann 2011 (PMC3823197) was excluded because it uses
hydrogen peroxide, not radiation. DNA-PK has no item left (H14 was dropped), so nothing in this set tests the DNA-PK node.
