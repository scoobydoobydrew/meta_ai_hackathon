# Demo video script (3 minutes)

Record from `results/report.html` (open the file in a browser) and a terminal running `make verify`. Everything on screen
comes from cached model outputs, so there is no live-API risk. Numbers below are the ones in `results/RESULTS.md` at the time
of writing; read them off the page when recording, do not trust this file.

Before recording: the page speaks English and Greek and remembers the last choice (a browser set to Greek opens it in
Greek). Press **EN** in the top bar, then reload once to check. The page is dark or light by system setting; the top-bar moon
button switches it.

**0:00 to 0:15. The one line (say it and show it).**
"Before this week: a published 30-gene model of how a cell responds to DNA damage, open-access papers, and open-source
solvers. Built this week: an agent where Muse Spark reads the papers and proposes rules, and an exact solver decides which
ones the model can take."

The top of the page plays a 20-second story over a close-up of DNA, in four beats of about five seconds that loop: a ray breaks
the DNA ("Radiation breaks DNA"); a dish of cells takes four fates ("Not every damaged cell dies"); a field of dots, one per
change of one or two genes ("Which genes make it die?", with the count); the solver's scan leaves a few glowing dots ("The AI
proposes. The solver decides.", the count falling to the shortlist). Reload the page so that it starts on the first beat, let it
play under the one line above (do not read the captions out), then press *Play*. The little bars under the words jump to a beat.

**0:15 to 1:20. The bench (press *Play the 60-second story*; talk over the captions, do not read them out).**
The page walks through by itself, from the dish to the cell and then through five steps. What each caption stands for:
1. *Dish.* "A cell hit by radiation has to decide. The dish is irradiated and each cell pauses, ages, recycles itself or dies;
   which fates are possible is the solver's exact answer, not a simulation. Cut one gene, TUG1, and every cell dies, which
   is what the paper reports."
2. *Cell.* "Inside every cell, a circuit of genes decides: golden arrows switch genes on, teal bars switch them off." (the
   poster view)
3. *Patch.* "The model has no ATR or CHK1, but the papers know them. Muse Spark read 36 papers and quotes what they say.
   Plug in the new wire: CHK1 switches off CDC25C."
4. *Tests.* "An exact checker replays ten known experiments. Three break: on the right, the cells now also age, which no paper
   reports. The paper's dish is on the left."
5. *Repair.* "The AI gets the counterexample and rewrites the rule: CHK1 only acts together with CDK1/CycB. Ten of ten pass,
   and the two dishes now agree. The checker decided, not the AI."
6. *Audit.* "Reality check on ten outcomes from papers the AI never read: no better than the published model. We say so.
   Where the circuit never settles, marked with a star, its answers are not predictions." (the page clicks the p53 row: the
   cells flicker between fates and never settle)

If there is time, say one line about the sixth step, the hunt: "The solver knows all eleven ways to leave only death; two of
them are what the paper reports. Click genes and find them." Show one discovery (TUG1 out), then stop.

**1:20 to 2:00. Why you can trust it (scroll to the notebook).**
- "The cell": click *TUG1 knocked out*, then *p53 knocked out* ("no stable state: the network oscillates").
- "Case files": the CHK1 case is preselected. Show the papers, the template, the solver's counterexample, then the
  repair attempts. Click *ATR activates ATM/γH2AX*: "Here its first answer passed the cases but changed nothing, so the solver
  refused it as vacuous. The second one changed a prediction."

**2:00 to 2:30. The result (scroll to "Evidence").**
- Heat map: "Without the solver, 7 to 8 of ten known behaviours break. With it, none."
- "47% of the edits taken from papers contradict the published model."
- Audit table: say it straight. "The published model can answer 8 of the 10 scoreable outcomes. In 4 of them it has no
  stable state, so those verdicts are artifacts. On the other 4 it gets 2 right, the same as ignoring the perturbation. The
  added kinases change none of the verdicts. So this does not show better prediction. It shows where a published model
  and the literature disagree, and it does so automatically."

**2:30 to 3:00. Reproducibility and limits.**
- Terminal: `make verify`, which rebuilds every number with no API call.
- Limits, on screen: ten scoreable claims, written by me and not yet checked by a person; the model's repairs can pass the
  checks without being biologically right; no medical claims. "These are hypotheses for the lab."
