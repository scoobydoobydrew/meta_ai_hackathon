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

The top of the page plays a story of about 50 seconds (each beat stays long enough to read) over a close-up of DNA, in six beats that loop: a ray breaks the DNA
("Radiation breaks DNA"); a dish of cells takes four fates ("Not every damaged cell dies"); two gene switches flip and every cell
of a fresh dish dies ("Flip the right genes", the goal: a combination of genes to switch off, or on); new rules keep coming and
each can change which combinations work ("New rules change which genes to flip": a rule is a link between two genes; a small
network of genes where papers arrive one after another and each brings a link, with the 11 combinations of the published list
as dots under it: unchecked, two of the links make the dots go out, none of the old ones is left and a few others appear, with the
number of known experiments that model breaks; then each rule is checked first, one is struck out, the old ones come back; the
genes' placement and the cards are illustration, the counts and which dot goes out are the solver's); a field of dots, one per
combination of one or two genes, which zooms out as sets of up to five genes are counted, with the NP-hard note and its source;
the AI's guesses judged by the solver, then the solver's scan leaving a few glowing dots ("The AI proposes. The solver decides.").
Reload the page so that it starts on the first beat, let it play under the one line above (do not read the captions out), then
press *Play*. Keep the mouse pointer off the header while it plays: it stands still while the pointer is over its words or
pictures (a pause mark shows next to the little bars), and it carries on when the pointer leaves. The little bars under the
words jump to a beat, and the pointer over them does not hold it. Say it plainly if asked: the solver alone does solve this small
model in seconds; what it cannot do is read the papers, and the count of candidates explodes as the model or the sets grow. And
the AI alone is not useless: asked directly for the genes, it was right for most of its guesses and found some of the 11, but
nothing checks it, a quarter of its guesses were wrong, and its edits to the model, unchecked, break 7 or 8 of the 10 known
experiments. Read the exact counts off the scoreboard, they are computed when the page is built.

**0:15 to 1:20. The bench (press *Play the 60-second story*; talk over the captions, do not read them out).**
The page walks through by itself, in plain words, one idea at a time (the captions are on the stage; each says what the
picture shows, nothing needs a glossary):
1. "Radiation damages the DNA of a cell." (the dish)
2. "Then every cell picks one fate: it pauses, ages, recycles itself or dies." (the dish is irradiated; which fates are possible
   is the solver's exact answer, not a simulation)
3. "Switch off one gene, TUG1, and every cell dies. Finding genes like this is the goal." (the paper reports this one)
4. "Inside the cell, genes switch each other on and off. This is our model of it." (the poster view)
5. "But the model is missing links that the papers know. An AI reads 36 papers and finds them. One new link: CHK1 switches off
   CDC25C."
6. "Is the AI right? An exact checker, the solver, replays 10 experiments with known results. Three of them now come out wrong:
   the AI's link was not safe."
7. "The AI sees which ones, and rewrites the link. Now all ten come out right. The checker decided, not the AI."
8. "Honest limit: on 10 outcomes from papers the AI never read, the model is no better than before." Then: "The AI proposes.
   The solver decides."

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
