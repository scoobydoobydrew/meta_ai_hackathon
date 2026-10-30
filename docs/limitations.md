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

**The pictures**
- The DNA at the top of the page, its story (the dish of cells, the field of dots) and, on the bench, the dish and the cell with its
  membrane are illustrations. The helix is not structure data: shapes, colours and the way they sit are decoration. The dots
  in the story are one per set of one or two changes that the solver tried; their positions are arbitrary, only their number
  and the number that stay lit are real, and the seconds shown are the time the solver took on the machine that built the page.
  "Not every damaged cell dies" is what the published model's stable states say (the four fates are all reachable), not a
  measurement on real cells. "Each one is a lab experiment" is about how a candidate would have to be tested; no lab time or
  cost is claimed anywhere. The one sentence about radiotherapy is a quotation (Bridges et al. 2011), given as context. What the bench shows
  comes from the solver: which fates the circuit allows, whether it settles at all, which fate the paper does not expect,
  which genes are on in a stable state. The number, size and position of the cells, the proportion of each fate (the model
  gives possibilities, not percentages) and the purple cell around the network are not data.
- The "hunt" lists every set of one or two changes (readout genes excluded) that leaves only death in the model. Those are
  hypotheses about the model; two of them (TUG1 knocked out, miR-221 forced on) are what the base paper itself reports.

**The difficulty, and what the header does and does not claim**
- "Controlling a Boolean network is NP-hard in general" is a result of Akutsu, Hayashida, Ching and Ng (J Theor Biol 2007;244:670-679,
  doi 10.1016/j.jtbi.2006.09.023): finding a control strategy that leads to a desired global state is NP-hard, and stays so for
  restricted network structures. Our task (sets of at most two changes after which every stable state is apoptosis) is a relative
  of that problem, not the same one; we cite the general result and claim no complexity class for this exact variant. Sedghamiz et
  al. (Front Physiol 2019;10:241, CC BY) write that finding intervention sets exhaustively is feasible on small networks and
  difficult on larger ones, which is the situation here.
- The header does **not** say that a solver alone cannot solve this model: the exhaustive search over all of its sets of up to two
  changes takes seconds. It shows how the count grows with the number of genes changed at once (sets of up to 3, 4 and 5 changes,
  counted by the same enumeration as the search) and what that would cost at the speed measured for up to two changes. Those
  times are projections ("projected" on the page), not measurements; the one we could check, sets of up to three changes, took 57 s
  measured against 66 s projected (the search skips supersets of sets already found, so the projection errs on the high side).
  What a solver alone cannot do is read the papers: the published model lacks ATR, CHK1, CHK2 and DNA-PK, which the literature
  knows. M6 measures a different limit: on random networks the exact checker timed out at 30 s from 50 nodes up (one of three
  seeds at 50, all at 100 and more), while networks shaped like the published one scaled to 400 nodes in about 12 s.
- Of the 11 shortlisted sets, three are knock-outs (PTEN, RB, TUG1); the other eight force a gene on, and all four pairs include
  one forced-on gene. The header therefore says "switch off, or on", not "switch off".

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
