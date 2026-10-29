# Limitations, stated plainly

This is a research prototype that ranks hypotheses for lab testing. It makes no clinical claim and gives no medical advice.

**The model**
- A Boolean network is a discrete abstraction of continuous, stochastic biology. It has no dose, no time course and no
  frequencies: a phenotype is present or absent. Claims that a cell line was "reduced by 24%" cannot be tested and are not scored.
- There is one base model (Gupta et al. 2023, 30 nodes). Everything here depends on it, including its own choices (for
  example, the paper contradicts itself about PUMA in the apoptosis readout; we follow Section 3.2, which is a choice).
- The new nodes (ATR, CHK1, CHK2, DNA-PK) were chosen by a mechanical rule from the corpus, not by a biologist, and are
  wired by the conventions of `formalize/edits.py` (an extra activator is OR-ed in, an inhibitor is AND-NOT-ed in). Those are
  modelling conventions, not facts. With redundant activators the model tends to predict "no effect" for a single kinase, whatever the
  papers say about dominance in a given cell line.

**The evidence**
- Claims are extracted by a language model. A quote that is found verbatim in the paper shows that the model copied faithfully,
  not that it read correctly. Extraction accuracy (M4) needs a human to label 50 claims and had not been done when this was written.
- The corpus is 36 open-access papers chosen by topic and citation count, many of them not about the DNA damage response in
  human cells. Some report experiments similar to the held-out ones in other cell lines.
- Literature can be inconsistent, incomplete or specific to a cell type; the model has one context.

**The solver and the loop**
- The solver catches contradictions with the ten verification cases (and the G2 regression), not every error. Those cases
  come from the same paper as the base model, so they test that augmentation does not break what that paper reports.
- A rule can pass the cases by being gated so that its new term is never true where the cases look. The loop therefore
  refuses a repair that changes no prediction in a small panel of scenarios ("vacuous"), but passing the panel is still not
  evidence that the rule is biologically right. Accepted means "consistent with the checks", nothing more.
- Edits are applied one at a time in a fixed order; a different order can give a different network.

**The evaluation**
- The held-out set has 23 claims, 10 of them scoreable. That is far too few for a statistic, so results are counts per claim.
- Most radiosensitisation results are about survival, which this network cannot express; that is a finding about the approach.
- The set was written by the assistant from papers it chose, knowing the base rules. Per-claim reporting and a no-information
  baseline are the guard. A human has not yet checked that each quote supports its claim (D4); until then all M1 numbers are provisional.
- No claim in the held-out set tests the DNA-PK node.
- Scaling (M6) was measured on synthetic networks and on cascades added to the base network; no larger published model was tried.
