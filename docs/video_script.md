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

**0:15 to 1:15. The bench (press *Play the 50-second story*; talk over the captions, do not read them out).**
The page walks through five steps by itself. What each caption stands for:
1. *Circuit.* "A cell hit by radiation has to decide. Four fates are possible; the lamps are the solver's exact answer, not a
   simulation. Cut one wire, TUG1, and only death is left, which is what the paper reports."
2. *Patch.* "The model has no ATR or CHK1, but the papers know them. Muse Spark read 36 papers and quotes what they say.
   Plug in the new wire: CHK1 switches off CDC25C."
3. *Tests.* "An exact checker replays ten known experiments. Three break: the cell now also ages, which no paper reports."
4. *Repair.* "The AI gets the counterexample and rewrites the rule: CHK1 only acts together with CDK1/CycB. Ten of ten pass.
   The checker decided, not the AI."
5. *Audit.* "Reality check on ten outcomes from papers the AI never read: no better than the published model. We say so.
   Where the circuit never settles, marked with a star, its answers are not predictions." (the page clicks the p53 row: all
   lamps go dark)

**1:15 to 2:00. Why you can trust it (scroll to the notebook; click *Open the circuit* first if you want the full network).**
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
