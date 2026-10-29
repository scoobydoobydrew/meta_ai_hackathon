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
apoptosis. A perturbation sets nodes to 0 and the stimulus sets `DNA_damage` (IR = 1, none = 0).

Each claim in an item has a readout and a polarity (`present`, `absent`, `increased`, `decreased`, `unchanged`) and is
put into exactly one category by `cellproof.eval.heldout.claim_category`, from the item text alone:

| Category | Meaning | Scored? |
|---|---|---|
| `scoreable` | present/absent claim on one of the five phenotypes, perturbed node is in the base network | yes |
| `scoreable_with_new_nodes` | same, but the perturbed node (ATR, CHK1, DNA-PK) is not in the base network | base: not expressible; augmented: yes if it adds the node |
| `needs_readout` | G2 checkpoint claims: the network has no such readout | no, unless the human adds one (decision D1) |
| `survival_level` | clonogenic survival / radiosensitisation: the network has no survival output | no, in either network |
| `direction_only` | "increased" or "decreased" on a phenotype: an attractor set has no frequencies | no |

## What is in the draft (produced by `summarize`, 2026-10-29)

14 items, 25 claims, from 7 papers. Perturbed node is in the base network for 8 of 14 items.

| Category | Claims |
|---|---|
| scoreable | 4 |
| scoreable_with_new_nodes | 1 |
| needs_readout | 8 |
| survival_level | 11 |
| direction_only | 1 |

**Only 5 of 25 claims can be scored today, 4 of them on the base network.** Most of the radiosensitisation literature
reports survival, which a phenotype network cannot express. That is a result about the approach, and the README must say so.
It is also far too few claims to show an improvement statistically; any M1 number from this set must be reported as counts.

## Scoring rule, fixed now

For a `scoreable` claim, compute the fixed points of the perturbed network, classify each with `classify`, and take
the set of phenotypes. `present` is correct if the phenotype is in the set, `absent` if it is not. Fixed points that match no
definition, and networks with non-fixed-point attractors, are reported as `unclassified` and count for no phenotype.
Report per claim: correct, wrong, or not expressible. Never merge the three.

Baselines to report next to every score: the wild-type damaged network's phenotype set applied to every claim, and a coin flip.

## Leakage and selection, disclosed

- **Corpus exclusion.** These papers must not be in the extraction corpus: PMC2906734, PMC3789084, PMC3167033,
  PMC5342109, PMC6116113, PMC3997448, PMC3687028. Extraction prompts ask for mechanisms only.
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

- **D1. A `g2_arrest` readout?** It would make 8 more claims scoreable (13 of 25). A candidate that rests on the Gupta
  paper's own text, which describes Cdc2-CycB and Wee1 as G2/M arrest mechanisms: `g2_arrest` = `Cdc2_CycB` OFF with
  `DNA_damage` ON. It would be fixed before any run and applied identically to every network. The cost: one more
  hand-chosen readout, after the PUMA choice already made.
- **D2.** Accept the approximations above.
- **D3. More items.** Phenotype-level knockout data (apoptosis present or absent after irradiation in null cells) would
  be scoreable, unlike survival data. This search was not done.
- **D4.** Check every locator and claim against the papers.
- **D5.** Freeze with a tagged commit and a SHA-256 of the file; changing it afterwards needs the human's approval.

## Not found or not done

AKT/PTEN (only survival-level sources surfaced), Wip1 with irradiation (only combinations with other drugs surfaced),
a photon-irradiation HCT116 p21-/- study, the original Bunz 1998 paper, the original MK-1775 radiosensitisation
phenotype data beyond Bridges 2011, and DNA-PK with p53 status. Poehlmann 2011 (PMC3823197) was excluded because it uses
hydrogen peroxide, not radiation.
