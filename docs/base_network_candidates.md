# Base network candidates

Status 2026-10-29. **Candidate A (Gupta et al. 2023) was chosen as the base network by the human on 2026-10-29.**
It is verified from its supplement (see the last sections).
For B and C everything below comes from reading article text and is **not verified from a model file**;
no node count for them may be quoted until it is counted from a file.

| | A. Gupta et al. 2023 | B. Tian et al. 2013 | C. Rodriguez et al. 2015 (FA/BRCA + CHKREC) |
|---|---|---|---|
| Venue | Cells 12(7):1085, doi 10.3390/cells12071085 | PLoS One 8(9):e72303, doi 10.1371/journal.pone.0072303 | Venue inferred from URL tbiomed.biomedcentral.com/articles/10.1186/s12976-015-0011-4 (Cell Collective model); authorship not checked against the paper |
| Article license | CC BY 4.0 | CC BY | not checked |
| Model file | Supplement: Data File S1 (.sbml), Table S1 (rules). Zip 5.3 MB | Supplement File S1 (DOCX, tables only, no machine-readable model found) | Cell Collective; ID and license not confirmed |
| Size, as stated | 29 components + 1 input (DNA damage) | 206 nodes (203 + 1 input + 2 outputs); paper says 738 interactions in the abstract and 677 in the Methods | not checked |
| ATM | yes (merged node "ATM-H2AX") | yes | yes |
| ATR | **no** | yes | yes |
| CHK1 | **no** | yes | yes |
| CHK2 | in the text, standalone node not confirmed | yes | not checked |
| WEE1 | yes | not mentioned in the part read | not checked |
| DNA-PK | **no** | not mentioned in the part read | not checked |
| Outputs | arrest, senescence, autophagy, apoptosis | apoptosis, senescence | not checked |
| Validation in paper | GOF/LOF of TUG1, miR-221, p53, PTEN vs HeLa, MCF-7, NSCLC data | in-silico p53 knockouts, 31 tested | not checked |
| Tool | GINsim 3.0.0b | not stated in the part read | Cell Collective |

Not reached: the GINsim model repository (ginsim.org returned "Socket is closed" twice). Not yet searched: BioModels.

## Reading

- **A is the best primary candidate.** Small enough to analyse exactly, CC BY, ships as SBML.
  It lacks ATR, CHK1 and DNA-PK, which is the "published model misses mechanisms the literature knows" story.
- **B is a scaling candidate (M6)**, not a base: 206 nodes is far past what the previous project's exact engine
  handled (about 21 free nodes), and its model is only in DOCX tables.
- **C is unexamined.**

## Evaluation problem to decide before freezing the held-out set

Radiosensitisation targets named in `Claude.md` (ATR, CHK1, DNA-PK) are not nodes of candidate A.
A perturbation of a node the base network does not contain cannot be predicted by it, so
"augmented beats base" on those outcomes would be true by construction and prove nothing.

Proposed scoring: three outcomes per held-out item, **correct / wrong / not expressible**, reported separately.
Choose the headline held-out items among perturbations of nodes that *exist* in the base network
(e.g. WEE1, ATM, p53, PTEN, MDM2, CHK2 if present) whose outcome depends on a mechanism the base model lacks.
This is a decision for the human, and it must be taken before the split is frozen.

## Candidate A, verified from the supplement

**How it was obtained.** PMC answers scripted downloads with a proof-of-work page ("Preparing to download");
that check was not bypassed. The same supplement came from the Europe PMC REST API
(`.../europepmc/webservices/rest/PMC10093226/supplementaryFiles`, 6.3 MB bundle holding
`cells-12-01085-s001.zip`, 5.5 MB). Kept locally under `data/raw/` (git-ignored).

**What is in it.** Contrary to the article text, there is no SBML. The supplement has `Data File S1.pdf`
(34 pages, no text layer, not machine-readable), `Table S1.pdf` (rules and references) and
`Table S2.xlsx` (rules as plain text, edge justifications and references).

**Counted, not quoted.** 30 nodes: the input `DNA_damage` plus 29 nodes with a rule in Table S2.
Every regulator in every rule resolves to one of these 30 nodes; the generator raises on anything else.

**Absent from the model** (checked against the 30 node ids): ATR, CHK1, CHK2, DNA-PK.
ATM exists only as the merged node `ATM_pH2AX`. WEE1 is a node, regulated only by AKT (`Wee1 = !AKT`).
The model has a single input, `DNA_damage`, and no radiation dose or time.

**Rules.** Table S1 and Table S2 were read side by side by eye; the 29 rules agree up to spelling and the order of
operands, except that Table S2's mTORC2 rule is missing its last `)`. The generator applies that fix for that one
node only and says so in the file header. This comparison was not done by machine.

**Behaviour reproduced.** With `DNA_damage = 0` there is 1 fixed point; with `DNA_damage = 1` there are 4,
no cyclic attractors. mpbn and pyboolnet give identical fixed-point sets; AEON (asynchronous) gives 1 and 4
singleton attractors. That is five in total, four under damage, the count the article reports
(taken from the article text as read on 2026-10-29, not re-checked against the PDF).
Each analysis takes about 0.05 s on 30 nodes, so no scaling problem at this size.

Whether the supplement carries the same CC BY 4.0 license as the article is not stated separately.

### Phenotypes and the paper's own cases

The four damaged fixed points map one-to-one onto the paper's four phenotypes (arrest, senescence, autophagy,
apoptosis); the undamaged one is proliferation. Node patterns are in `src/cellproof/network/phenotypes.py`.

**A decision that was ours, and that the paper does not settle.** The paper contradicts itself on PUMA. The Figure 2
legend lists PUMA among the active nodes for apoptosis and autophagy; Section 3.2 describes them without PUMA.
In three of the paper's own perturbations (TUG1 KO, miR-221 E1, both together) the model reaches a state with
p53_K, BAX and Caspase ON, ULK1 OFF and PUMA forced OFF (`PUMA = p53_K & !miR221`), and the paper calls that
"only apoptosis". We therefore follow Section 3.2 and do not require PUMA. The wild-type classification is the same
either way, so only perturbed cases depend on this. We chose it after seeing the mismatch, so it is a tuned
readout, and it must be fixed before the verification set is frozen and then applied uniformly.

**Reproduced** (DNA damage ON, all attractors are fixed points in each case; `tests/test_phenotypes.py`):

| Case (source in the paper) | Paper reports | Model |
|---|---|---|
| TUG1 E1; TUG1 E1 + miR-221 KO (Fig 3) | all four | all four |
| TUG1 KO; miR-221 E1; both (Fig 3) | apoptosis only | apoptosis only |
| p53 E1 + PTEN KO (Table 1 rows 1, 4) | senescence and apoptosis | exactly those two |
| PTEN E1 + WWP1 KO (Table 1 row 10, a prediction) | all four | all four |
| PTEN E1 (Table 1 rows 2, 3, 5, 6, 7) | arrest, autophagy, apoptosis across studies | those three plus senescence |

Not tested: Table 1 rows 8 and 9, whose readouts ("inhibition of proliferation", "DNA repair") are not phenotypes of
this network. The paper's Monte Carlo percentages (12% arrest, 18% senescence, 14% autophagy, 56% apoptosis) were
not reproduced: the initial states and update probabilities are not specified in the text we read. The text and the
Figure 4 legend also disagree on some percentages, and Sections 3.3 and 3.4 describe the double perturbation
inconsistently; the case table above uses the Figure 3 text.

How the definitions were read: from the article text through a fetch tool that summarises pages, twice, from two
sources (PMC and Europe PMC), with the same result. The Figure 2 legend itself was not viewed as an image.

Files: `data/base/gupta2023.bnet` (generated by `python -m cellproof.network.gupta2023 <supplement zip> <out.bnet>`),
tests in `tests/test_base_network.py` and `tests/test_phenotypes.py`.
