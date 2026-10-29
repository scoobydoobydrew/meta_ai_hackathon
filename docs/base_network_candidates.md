# Base network candidates

Status 2026-10-29. Everything under "as stated in the paper" comes from reading the article text and
is **not yet verified from the model file**. No node count may be quoted anywhere until it is counted from the file.

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

## Next step that needs a download

Fetch `cells-12-01085-s001.zip` (5.3 MB, PMC article 10093226, supplement), into its own empty directory,
then count nodes from the SBML, check that clingo/mpbn/AEON load it, and reproduce the paper's
wild-type fixed points (the paper reports five).
