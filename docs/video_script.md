# Demo video script (3 minutes)

Record from `results/report.html` (open the file in a browser) and a terminal running `make verify`. Everything on screen
comes from cached model outputs, so there is no live-API risk. Numbers below are the ones in `results/RESULTS.md` at the time
of writing; read them off the page when recording, do not trust this file.

**0:00 to 0:15. The one line (say it and show it).**
"Before this week: a published 30-gene model of how a cell responds to DNA damage, open-access papers, and open-source
solvers. Built this week: an agent where Muse Spark reads the papers and proposes rules, and an exact solver decides which
ones the model can take."

**0:15 to 0:45. The problem (hero, then "The cell").**
- Hero: "A damaged cell has to decide: pause, age, recycle itself, or die."
- Click *TUG1 knocked out*: apoptosis is the only fate, which is what the paper reports. "The solver enumerates every
  stable state exactly. This is not a simulation."
- Switch to *Verified and repaired*: "The published model has no ATR, CHK1, CHK2 or DNA-PK. The papers know them."

**0:45 to 1:45. The loop (scroll to "Case files", the CHK1 case is preselected).**
1. "Muse Spark read 36 papers twice. Every claim has a quote that exists word for word in its paper." Show the four quotes.
2. "CHK1 inhibits CDC25C: six papers agree. A fixed template turns it into one rule change."
3. "The solver says no." Show V04: TUG1 knock-out should give apoptosis only; with this rule senescence appears. Point at the
   lit genes of the counterexample.
4. "Muse Spark gets the counterexample and proposes a different rule." Read one line of its explanation. "The solver
   checks again and accepts."
5. Click *ATR activates ATM/γH2AX*: "Here its first answer passed the cases but changed nothing, so the solver refused it as
   vacuous. The second one changed a prediction."

**1:45 to 2:30. The result (scroll to "Evidence").**
- Heat map: "Without the solver, 7 to 8 of ten known behaviours break. With it, none."
- "47% of the edits taken from papers contradict the published model."
- Audit table: say it straight. "Against outcomes from seven papers the agent never read, the published model gets 3 of
  the 8 it can answer. The added kinases change none of those verdicts. So this does not show better prediction. It shows
  where a published model and the literature disagree, and it does so automatically."

**2:30 to 3:00. Reproducibility and limits.**
- Terminal: `make verify`, which rebuilds every number with no API call.
- Limits, on screen: ten scoreable claims, written by me and not yet checked by a person; the model's repairs can pass the
  checks without being biologically right; no medical claims. "These are hypotheses for the lab."
