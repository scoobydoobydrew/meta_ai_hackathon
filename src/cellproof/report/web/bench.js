/* CellProof report, part 3: the test bench. The whole pipeline as five clickable steps on one stage. Every lamp and light comes from
   the exact solver's tables in D.story (three versions of the circuit, ten known experiments, one real patch); the texts exist in
   English and Greek, the notebook below stays in English. `quoted` and `proposed` are defined in sections.js. */
(function bench() {
  const ST = D.story, root = $("#bench");
  if (!ST) { root.remove(); return; }
  const grid = $("#benchGrid"), box = $("#bBox"), svgEl = $("#bNet"), HO_ = D.heldout;
  const CASES = ST.cases, PATCH = ST.patch, VERS = ["A", "B", "C"];
  const [SRC, , DST] = PATCH.edge.split("|");
  const GATE = [...new Set(toks(PATCH.final).filter((x) => /^[A-Za-z_]/.test(x) && !toks(PATCH.template).includes(x)))];
  const SPOT = new Set(["DNA_damage", "ATR", SRC, DST, ...GATE]);
  const NEW_LIST = ((D.summary && D.summary.new_nodes) || []).map(pretty).join(", ");
  const N0 = D.networks.published.nodes.length, PLAY_S = 64;
  const SCI = { proliferation: "proliferation", arrest: "arrest", senescence: "senescence", autophagy: "autophagy", apoptosis: "apoptosis" };
  /* the hunt: the exact solver found every set of one or two changes (readout genes excluded) after which every cell dies */
  const INTERV = ((D.interventions || {}).augmented || []).map((s) => s.map(([n, v]) => [n, v])), READOUT = new Set((D.interventions || {}).readout || []), HUNT = INTERV.length > 0;
  const setName = (s) => s.map(([n, v]) => `${pretty(n)} ${v ? "ON" : "✕"}`).join(" + ");

  /* ---------------------------------------------------------------- texts */
  const TEXT = {
    en: {
      "nav.bench": "Bench", "play.short": "▶ Play", "play.stop": "■ Stop",
      "hero.h1": "A cell hit by radiation has to <em>decide.</em>",
      "hero.lede": (n) => `A published model of that decision has ${n} genes and misses what the papers know. An AI reads the papers and proposes new wires. An exact checker decides which ones the circuit can take.`,
      "hero.play": (n, s) => `▶ Play the ${s}-second story`, "hero.try": "Try it yourself",
      "bench.eyebrow": "The test bench", "bench.h2": "Five steps. One circuit. The checker decides.",
      "how.sum": "What am I looking at?",
      "how.circuit": "Circuit", "how.circuit.d": (n) => `The gene network of a cell: ${n} genes that switch each other on and off.`,
      "how.wire": "Wire", "how.wire.d": "One regulation: gene A switches gene B on, or off.",
      "how.lamp": "Lamp", "how.lamp.d": "A fate the cell can end in. Lit means the checker found a stable state with that fate.",
      "how.checker": "Checker", "how.checker.d": "An exact solver. It does not guess: it lists every stable state.",
      "how.dish": "Dish", "how.dish.d": "Cells in a dish stand for the circuit: each cell shows one fate the circuit allows. An illustration, with no percentages.",
      "ctl.damage": "DNA damage", "ctl.open": "Open the circuit", "ctl.close": "Close the circuit", "chip": (n) => `cell model · ${n} genes`,
      "scale.dish": "Dish", "scale.circuit": "Circuit", "scale.dna": "DNA", "irr.go": "Irradiate", "irr.again": "Irradiate again", "irr.replay": "Replay",
      "vial.none": "Control", "vial.tug1": "TUG1 cut", "vial.mir": "miR-221 on", "vial.p53": "p53 out", "cmp.paper": "Paper: known result",
      "dish.note": "Illustration: each cell shows one fate the model allows. The model gives possibilities, not percentages.", "dish.empty": "no cells left",
      "tip.idle": "A healthy cell. Irradiate the dish and watch it decide.", "tip.cell": "Click to look inside this cell.", "tip.osc": "No stable state: this cell keeps flipping between fates.",
      "dock.circuit": "Open the circuit, then click a gene to cut it; click again to force it on.",
      "dna.go": "Follow the signal →", "dna.hint0": "Press Irradiate to damage the DNA.", "dna.note": "In the model, damaged DNA switches on these genes:",
      "dna.papers": (n) => `${n} papers`, "dna.pub": "published model",
      rail: ["Cells", "Patch", "Tests", "Repair", "Audit", "Hunt"],
      "a6.t": "The hunt", "a6.h": (n) => `Cut or switch on one or two genes so that every cell dies. The checker knows exactly ${n} ways. How many can you find?`,
      "a6.how": "On the circuit, click a gene: once to cut it, twice to force it on, three times to clear it. Two genes at most.",
      "a6.none": "Pick a gene to start.", "a6.never": "The circuit never settles here, so no cell reaches any fate.", "a6.trivial": "Only death, but it works by forcing the death machinery itself. That does not count.",
      "a6.odd": "Only death, but this is not one of the checker's sets.", "a6.some": (list) => `Not yet. Still reachable: ${list}.`, "a6.again": (name) => `${name}: you found this one already.`,
      "a6.bigger": (name) => `Only death, but ${name} alone already does it.`, "a6.smaller": "Only death, but a smaller set already does it. Try the genes one at a time.", "a6.new": (name, paper) => `New discovery: ${name}${paper ? " · in the base paper" : ""}`, "a6.hintmsg": (g) => `Hint: ${g} is part of an answer.`,
      "a6.paper": "in the base paper", "a6.model": "model's hypothesis", "a6.slot1": "1 gene", "a6.slot2": "2 genes",
      "a6.hint": "Hint", "a6.dish": "See it in the dish", "a6.reset": "Reset", "a6.note": "These are hypotheses about the model, for lab testing. Not treatments.",
      "a6.tease": (n) => `Challenge: can you make every cell die? The checker knows ${n} ways.`, "a6.go": "Start the hunt →",
      "fate.proliferation": "Divides", "fate.arrest": "Pauses", "fate.senescence": "Ages", "fate.autophagy": "Recycles", "fate.apoptosis": "Dies",
      "a1.t": "A dish of cells", "a1.h": "Radiation hits a dish of cells and each cell decides: pause, age, recycle or die. Press Irradiate, then try a treatment.",
      "cut.none": "No change", "cut.tug1": "Cut TUG1", "cut.mir": "Switch on miR-221", "cut.p53": "Remove p53",
      "a1.tip": "Click a cell to look inside it.", "a1.next": "Next: the circuit has a gap →",
      "st.only": (x) => `Only “${x}” is reachable.`, "st.many": (n, list) => `${n} fates are reachable: ${list}.`,
      "st.never": "The circuit never settles: it keeps oscillating, so no lamp stays on.", "st.nofate": "A stable state exists, but it matches none of the five fates.",
      "st.unknown": "This combination was not precomputed.",
      "why.sum": "Why does it end like this?", "why.because": "because", "why.none": "Nothing is forced by the input alone: the feedback loops decide.",
      "a2.t": "The patch", "a2.h": (list) => `The model has no ${list}. The papers know them.`,
      "a2.read": (n) => `Let the AI read ${n} papers`, "cnt.papers": "papers read", "cnt.claims": "claims proposed", "cnt.quotes": "quotes found word for word",
      "a2.found": (q, k) => `One of ${q} quoted claims. ${k} papers agree.`, "a2.wire": (a, b) => `Proposed wire: ${a} switches ${b} off`,
      "a2.more": (n) => `${n} more quotes`, "a2.plug": "Plug the wire in, unchecked",
      "a2.plugged": "Plugged in, unchecked. Try an old experiment: cut TUG1 and watch the lamps.", "a2.next": "Next: test it on 10 known experiments →",
      "a3.t": "The tests", "a3.h": "Ten experiments whose outcome is known from the base paper. The checker replays each one on the patched circuit.",
      "a3.run": "Run the 10 known experiments", "a3.res": (p, f) => `${p} of 10 pass, ${f} fail.`, "a3.click": "Click a red light to see what went wrong.",
      "a3.allpass": "All 10 pass.", "a3.next": "Send the failures to the AI →",
      dmg: "damage", nodmg: "no damage", known: "Known from the paper", says: "The circuit says", atleast: "at least", match: "matches", nomatch: "does not match",
      notexp: "not expected", expected: "expected",
      "a4.t": "The repair", "a4.h": "The checker sends the AI the claim, its quotes and the counterexample. The AI answers:", "a4.think": "The AI is thinking…",
      "a4.own": "In the AI's own words", "a4.gate": "Both must be on to switch it off.", "a4.fix": "Plug in the new version and re-run",
      "a4.done": (p) => `${p} of 10 pass. The checker decided, not the AI.`, "a4.cheat": "Can the AI cheat?",
      "a4.cheat.d": "Once it offered a rule that passed all ten tests but changed no prediction at all, so it fixed nothing. The checker refused it as vacuous:",
      "a4.next": "Next: reality check →",
      "a5.t": "Reality check", "a5.h": (n) => `${n} outcomes from papers the AI never read. Did the checked circuit predict them better?`,
      "sc.pub": "Published model", "sc.aug": "Checked edits", "sc.base": "Ignoring the experiment", "sc.of": (n) => `correct of ${n}`,
      "a5.no": "No. It did not predict better, and we say so.",
      "a5.hollow": (h, c) => `${h} of the ${c} answers the published model can give come from settings where it never settles (*). Those are not predictions.`,
      "a5.worked": (a, b, z) => `What worked: without the checker, the edits broke ${a}–${b} of the 10 known experiments. With it: ${z}.`,
      "a5.nb": "Open the lab notebook ↓", "a5.again": "Play again", "a5.restart": "Start over", "a5.click": "Click a row for the quote.", "a5.noaudit": "The held-out set has not been scored.",
      "cap.1": "A cell hit by radiation has to decide.", "cap.2": "Four fates are possible.", "cap.3": "Cut one wire, TUG1: only death is left.",
      "cap.d1": "Inside each cell, damaged DNA is the signal.", "cap.d2": "The signal runs through a circuit of genes.",
      "cap.4": "But the circuit has gaps. The papers know more.", "cap.5": (n) => `An AI reads ${n} papers and quotes what they say.`,
      "cap.6": (a, b) => `Plug in the new wire: ${a} switches off ${b}.`, "cap.7": "An exact checker replays 10 known experiments.",
      "cap.8": (f) => `${f} break. The checker shows exactly which.`, "cap.9": "The AI gets the counterexample and rewrites the rule.",
      "cap.10": "Ten of ten pass. The checker decided, not the AI.", "cap.11": "Reality check: no better than before. We say so.",
      "cap.11b": "Where the circuit never settles (*), its answers are not predictions.", "cap.12": "The AI proposes. The solver decides.",
    },
    el: {
      "nav.bench": "Εργαστήριο", "play.short": "▶ Παίξε", "play.stop": "■ Στοπ",
      "hero.h1": "Ένα κύτταρο που δέχεται ακτινοβολία πρέπει να <em>αποφασίσει.</em>",
      "hero.lede": (n) => `Ένα δημοσιευμένο μοντέλο αυτής της απόφασης έχει ${n} γονίδια και του λείπουν όσα ξέρει η βιβλιογραφία. Ένα AI διαβάζει τα papers και προτείνει νέα καλώδια. Ένας ακριβής ελεγκτής αποφασίζει ποια χωράνε στο κύκλωμα.`,
      "hero.play": (n, s) => `▶ Παίξε την ιστορία (${s} δλ)`, "hero.try": "Δοκίμασέ το",
      "bench.eyebrow": "Το εργαστήριο δοκιμών", "bench.h2": "Πέντε βήματα. Ένα κύκλωμα. Αποφασίζει ο ελεγκτής.",
      "how.sum": "Τι βλέπω εδώ;",
      "how.circuit": "Κύκλωμα", "how.circuit.d": (n) => `Το δίκτυο γονιδίων ενός κυττάρου: ${n} γονίδια που ανάβουν και σβήνουν το ένα το άλλο.`,
      "how.wire": "Καλώδιο", "how.wire.d": "Μία ρύθμιση: το γονίδιο Α ανάβει ή σβήνει το γονίδιο Β.",
      "how.lamp": "Λυχνία", "how.lamp.d": "Μια μοίρα στην οποία μπορεί να καταλήξει το κύτταρο. Αναμμένη σημαίνει ότι ο ελεγκτής βρήκε σταθερή κατάσταση με αυτή τη μοίρα.",
      "how.checker": "Ελεγκτής", "how.checker.d": "Ένας ακριβής solver. Δεν μαντεύει: απαριθμεί κάθε σταθερή κατάσταση.",
      "how.dish": "Τρυβλίο", "how.dish.d": "Τα κύτταρα σε ένα τρυβλίο παριστάνουν το κύκλωμα: κάθε κύτταρο δείχνει μία μοίρα που επιτρέπει το κύκλωμα. Εικονογράφηση, χωρίς ποσοστά.",
      "ctl.damage": "Βλάβη DNA", "ctl.open": "Άνοιξε το κύκλωμα", "ctl.close": "Κλείσε το κύκλωμα", "chip": (n) => `μοντέλο κυττάρου · ${n} γονίδια`,
      "scale.dish": "Τρυβλίο", "scale.circuit": "Κύκλωμα", "scale.dna": "DNA", "irr.go": "Ακτινοβόληση", "irr.again": "Ξανά ακτινοβόληση", "irr.replay": "Επανάληψη",
      "vial.none": "Μάρτυρας", "vial.tug1": "Κομμένο TUG1", "vial.mir": "Αναμμένο miR-221", "vial.p53": "Χωρίς p53", "cmp.paper": "Paper: γνωστό αποτέλεσμα",
      "dish.note": "Εικονογράφηση: κάθε κύτταρο δείχνει μία μοίρα που επιτρέπει το μοντέλο. Το μοντέλο δίνει ενδεχόμενα, όχι ποσοστά.", "dish.empty": "δεν έμεινε κανένα κύτταρο",
      "tip.idle": "Ένα υγιές κύτταρο. Ακτινοβόλησε το τρυβλίο και δες το να αποφασίζει.", "tip.cell": "Κάνε κλικ για να δεις μέσα στο κύτταρο.", "tip.osc": "Καμία σταθερή κατάσταση: το κύτταρο αλλάζει συνεχώς μοίρα.",
      "dock.circuit": "Άνοιξε το κύκλωμα και κάνε κλικ σε γονίδιο για να το κόψεις· ξανά κλικ για να το ανάψεις.",
      "dna.go": "Ακολούθησε το σήμα →", "dna.hint0": "Πάτα Ακτινοβόληση για να πάθει βλάβη το DNA.", "dna.note": "Στο μοντέλο, η βλάβη του DNA ανάβει αυτά τα γονίδια:",
      "dna.papers": (n) => `${n} papers`, "dna.pub": "δημοσιευμένο μοντέλο",
      rail: ["Κύτταρα", "Μπάλωμα", "Δοκιμές", "Διόρθωση", "Έλεγχος", "Κυνήγι"],
      "a6.t": "Το κυνήγι", "a6.h": (n) => `Κόψε ή άναψε ένα ή δύο γονίδια ώστε να πεθαίνουν όλα τα κύτταρα. Ο ελεγκτής ξέρει ακριβώς ${n} τρόπους. Πόσους βρίσκεις;`,
      "a6.how": "Στο κύκλωμα, κάνε κλικ σε ένα γονίδιο: μία φορά το κόβεις, δύο φορές το αναγκάζεις να ανάψει, τρεις φορές το καθαρίζεις. Το πολύ δύο γονίδια.",
      "a6.none": "Διάλεξε ένα γονίδιο για να ξεκινήσεις.", "a6.never": "Το κύκλωμα δεν σταθεροποιείται εδώ, οπότε κανένα κύτταρο δεν φτάνει σε μοίρα.", "a6.trivial": "Μόνο θάνατος, αλλά επειδή αναγκάζεις τον ίδιο τον μηχανισμό θανάτου. Δεν μετράει.",
      "a6.odd": "Μόνο θάνατος, αλλά δεν είναι από τις λύσεις του ελεγκτή.", "a6.some": (list) => `Όχι ακόμα. Ακόμα προσιτά: ${list}.`, "a6.again": (name) => `${name}: αυτό το βρήκες ήδη.`,
      "a6.bigger": (name) => `Μόνο θάνατος, αλλά το ${name} μόνο του το κάνει ήδη.`, "a6.smaller": "Μόνο θάνατος, αλλά ένα μικρότερο σύνολο το κάνει ήδη. Δοκίμασε τα γονίδια ένα-ένα.", "a6.new": (name, paper) => `Νέα ανακάλυψη: ${name}${paper ? " · στο αρχικό paper" : ""}`, "a6.hintmsg": (g) => `Βοήθεια: το ${g} είναι μέρος μιας λύσης.`,
      "a6.paper": "στο αρχικό paper", "a6.model": "υπόθεση του μοντέλου", "a6.slot1": "1 γονίδιο", "a6.slot2": "2 γονίδια",
      "a6.hint": "Βοήθεια", "a6.dish": "Δες το στο τρυβλίο", "a6.reset": "Μηδενισμός", "a6.note": "Υποθέσεις για το μοντέλο, για δοκιμή στο εργαστήριο. Όχι θεραπείες.",
      "a6.tease": (n) => `Πρόκληση: μπορείς να κάνεις όλα τα κύτταρα να πεθάνουν; Ο ελεγκτής ξέρει ${n} τρόπους.`, "a6.go": "Ξεκίνα το κυνήγι →",
      "fate.proliferation": "Διαιρείται", "fate.arrest": "Παύση", "fate.senescence": "Γήρανση", "fate.autophagy": "Ανακύκλωση", "fate.apoptosis": "Θάνατος",
      "a1.t": "Ένα τρυβλίο με κύτταρα", "a1.h": "Η ακτινοβολία χτυπά ένα τρυβλίο με κύτταρα και κάθε κύτταρο αποφασίζει: παύση, γήρανση, ανακύκλωση ή θάνατος. Πάτα Ακτινοβόληση και μετά δοκίμασε μια επέμβαση.",
      "cut.none": "Καμία αλλαγή", "cut.tug1": "Κόψε το TUG1", "cut.mir": "Άναψε το miR-221", "cut.p53": "Βγάλε το p53",
      "a1.tip": "Κάνε κλικ σε ένα κύτταρο για να δεις μέσα του.", "a1.next": "Επόμενο: το κύκλωμα έχει ένα κενό →",
      "st.only": (x) => `Μένει μόνο: «${x}».`, "st.many": (n, list) => `Προσιτές μοίρες (${n}): ${list}.`,
      "st.never": "Το κύκλωμα δεν σταθεροποιείται ποτέ: ταλαντώνεται, οπότε καμία λυχνία δεν μένει αναμμένη.", "st.nofate": "Υπάρχει σταθερή κατάσταση, αλλά δεν ταιριάζει σε καμία από τις πέντε μοίρες.",
      "st.unknown": "Αυτός ο συνδυασμός δεν έχει υπολογιστεί από πριν.",
      "why.sum": "Γιατί καταλήγει έτσι;", "why.because": "επειδή", "why.none": "Το input μόνο του δεν επιβάλλει τίποτα: αποφασίζουν οι βρόχοι ανάδρασης.",
      "a2.t": "Το μπάλωμα", "a2.h": (list) => `Στο μοντέλο λείπουν τα ${list}. Τα papers τα ξέρουν.`,
      "a2.read": (n) => `Άσε το AI να διαβάσει ${n} papers`, "cnt.papers": "papers διαβάστηκαν", "cnt.claims": "ισχυρισμοί", "cnt.quotes": "αποσπάσματα κατά λέξη",
      "a2.found": (q, k) => `Ένας από τους ${q} ισχυρισμούς με απόσπασμα. Συμφωνούν ${k} papers.`, "a2.wire": (a, b) => `Προτεινόμενο καλώδιο: το ${a} σβήνει το ${b}`,
      "a2.more": (n) => `${n} ακόμη αποσπάσματα`, "a2.plug": "Σύνδεσε το καλώδιο, χωρίς έλεγχο",
      "a2.plugged": "Συνδέθηκε, χωρίς έλεγχο. Δοκίμασε ένα παλιό πείραμα: κόψε το TUG1 και δες τις λυχνίες.", "a2.next": "Επόμενο: δοκίμασέ το σε 10 γνωστά πειράματα →",
      "a3.t": "Οι δοκιμές", "a3.h": "Δέκα πειράματα με γνωστό αποτέλεσμα από το αρχικό paper. Ο ελεγκτής τα ξαναπαίζει στο μπαλωμένο κύκλωμα.",
      "a3.run": "Τρέξε τα 10 γνωστά πειράματα", "a3.res": (p, f) => `Περνούν ${p} από 10, αποτυγχάνουν ${f}.`, "a3.click": "Κάνε κλικ σε μια κόκκινη λυχνία για να δεις τι πήγε στραβά.",
      "a3.allpass": "Περνούν και τα 10.", "a3.next": "Στείλε τις αποτυχίες στο AI →",
      dmg: "βλάβη", nodmg: "χωρίς βλάβη", known: "Γνωστό από το paper", says: "Το κύκλωμα λέει", atleast: "τουλάχιστον", match: "ταιριάζει", nomatch: "δεν ταιριάζει",
      notexp: "δεν αναμενόταν", expected: "αναμενόταν",
      "a4.t": "Η επιδιόρθωση", "a4.h": "Ο ελεγκτής στέλνει στο AI τον ισχυρισμό, τα αποσπάσματα και το αντιπαράδειγμα. Το AI απαντά:", "a4.think": "Το AI σκέφτεται…",
      "a4.own": "Με τα λόγια του AI", "a4.gate": "Πρέπει να είναι και τα δύο αναμμένα για να το σβήσουν.", "a4.fix": "Σύνδεσε τη νέα έκδοση και ξανατρέξε",
      "a4.done": (p) => `Περνούν ${p} από 10. Αποφάσισε ο ελεγκτής, όχι το AI.`, "a4.cheat": "Μπορεί το AI να εξαπατήσει;",
      "a4.cheat.d": "Μία φορά πρότεινε έναν κανόνα που περνούσε και τις δέκα δοκιμές αλλά δεν άλλαζε καμία πρόβλεψη, άρα δεν διόρθωνε τίποτα. Ο ελεγκτής τον απέρριψε ως κενό:",
      "a4.next": "Επόμενο: έλεγχος στην πράξη →",
      "a5.t": "Έλεγχος στην πράξη", "a5.h": (n) => `${n} αποτελέσματα από papers που το AI δεν διάβασε ποτέ. Τα προέβλεψε καλύτερα το ελεγμένο κύκλωμα;`,
      "sc.pub": "Δημοσιευμένο μοντέλο", "sc.aug": "Ελεγμένες αλλαγές", "sc.base": "Αγνοώντας το πείραμα", "sc.of": (n) => `σωστά από ${n}`,
      "a5.no": "Όχι. Δεν προέβλεψε καλύτερα, και το λέμε ανοιχτά.",
      "a5.hollow": (h, c) => `${h} από τις ${c} απαντήσεις που μπορεί να δώσει το δημοσιευμένο μοντέλο προέρχονται από καταστάσεις όπου δεν σταθεροποιείται ποτέ (*). Δεν είναι προβλέψεις.`,
      "a5.worked": (a, b, z) => `Τι δούλεψε: χωρίς τον ελεγκτή, οι αλλαγές χάλασαν ${a}–${b} από τα 10 γνωστά πειράματα. Με τον ελεγκτή: ${z}.`,
      "a5.nb": "Άνοιξε το σημειωματάριο ↓", "a5.again": "Παίξε ξανά", "a5.restart": "Από την αρχή", "a5.click": "Κάνε κλικ σε μια γραμμή για το απόσπασμα.", "a5.noaudit": "Το held-out set δεν έχει βαθμολογηθεί.",
      "cap.1": "Ένα κύτταρο που δέχεται ακτινοβολία πρέπει να αποφασίσει.", "cap.2": "Τέσσερις μοίρες είναι πιθανές.", "cap.3": "Κόβουμε ένα καλώδιο, το TUG1: μένει μόνο ο θάνατος.",
      "cap.d1": "Μέσα σε κάθε κύτταρο, το σήμα είναι το κατεστραμμένο DNA.", "cap.d2": "Το σήμα τρέχει σε ένα κύκλωμα γονιδίων.",
      "cap.4": "Αλλά το κύκλωμα έχει κενά. Τα papers ξέρουν περισσότερα.", "cap.5": (n) => `Ένα AI διαβάζει ${n} papers και παραθέτει τι λένε.`,
      "cap.6": (a, b) => `Συνδέουμε το νέο καλώδιο: το ${a} σβήνει το ${b}.`, "cap.7": "Ένας ακριβής ελεγκτής ξαναπαίζει 10 γνωστά πειράματα.",
      "cap.8": (f) => `Αποτυγχάνουν ${f}. Ο ελεγκτής δείχνει ακριβώς ποια.`, "cap.9": "Το AI παίρνει το αντιπαράδειγμα και ξαναγράφει τον κανόνα.",
      "cap.10": "Περνούν και τα δέκα. Αποφάσισε ο ελεγκτής, όχι το AI.", "cap.11": "Έλεγχος στην πράξη: όχι καλύτερα από πριν. Το λέμε ανοιχτά.",
      "cap.11b": "Όπου το κύκλωμα δεν σταθεροποιείται (*), οι απαντήσεις του δεν είναι προβλέψεις.", "cap.12": "Το AI προτείνει. Ο solver αποφασίζει.",
    },
  };
  let lang = "en";
  try { const s = localStorage.getItem("cellproof-lang"); lang = s === "el" || s === "en" ? s : /^el/i.test(navigator.language || "") ? "el" : "en"; } catch (e) { /* storage may be blocked */ }
  const T = (k, ...a) => { const v = TEXT[lang][k] ?? TEXT.en[k]; return typeof v === "function" ? v(...a) : v ?? k; };
  const fname = (f) => T("fate." + f);

  /* ---------------------------------------------------------------- state */
  const initial = () => ({ act: 1, reach: 1, ver: "A", scale: "dish", damage: 0, irr: 0, perts: [], fate: null, variant: 0, open: null, read: false, reading: false, plugged: false,
    answered: false, thinking: false, fixed: false, run: {}, sel: null, claim: null, whyOpen: false, status: "", playing: false, verdict: null, lastFind: null });
  const st = initial();
  let found = new Set();  /* the hunt's progress outlives a restart, and a reload when storage allows it */
  try { found = new Set(JSON.parse(localStorage.getItem("cellproof-hunt") || "[]")); } catch (e) { /* storage may be blocked */ }
  const saveFound = () => { try { localStorage.setItem("cellproof-hunt", JSON.stringify([...found])); } catch (e) { /* ignore */ } };
  const ui = new Set(), script = new Set();
  let raf = 0;
  const later = (set, fn, ms) => { const id = setTimeout(() => { set.delete(id); fn(); }, ms); set.add(id); return id; };
  const clearSet = (set) => { set.forEach(clearTimeout); set.clear(); };
  const clearUi = () => { clearSet(ui); cancelAnimationFrame(raf); st.reading = false; box.classList.remove("scan"); };

  /* ---------------------------------------------------------------- the solver's tables */
  const pertKey = (perts) => perts.map(([n, v]) => `${n}=${v}`).sort().join(",");
  const decode = (flat) => { const out = []; for (let i = 0; i < flat.length; i += 2) out.push({ state: flat[i], fate: fateOfCode(flat[i + 1]) }); return out; };
  const caseFor = (key, damage, perts) => (VERS.includes(key)
    ? CASES.find((c) => (c.setting.DNA_damage ?? 0) === damage && pertKey(Object.entries(c.setting).filter(([n]) => n !== "DNA_damage")) === pertKey(perts)) : null);
  const tableOf = (key) => ST.lab[key] || D.lab[key];
  function points(key, damage, perts) {
    const c = caseFor(key, damage, perts);
    if (c) return decode(c[key].states);
    const flat = (tableOf(key)[damage ? "d1" : "d0"] || {})[pertKey(perts)];
    return flat ? decode(flat) : null;
  }
  const netKey = () => (st.act >= 5 ? "augmented" : st.ver);
  const rackVer = () => (st.act === 4 && st.fixed ? "C" : "B");
  const rackOf = (v) => (st.run[v] ||= { shown: 0, done: false, running: false });
  const failing = (v) => CASES.filter((c) => !c[v].ok);

  /* ---------------------------------------------------------------- the stage */
  const net = makeNet(svgEl, $("#bTip"), { node: onNode }, "A");
  let built = "A";
  const frame = svg("rect", { class: "chipframe", x: 8, y: 18, width: 984, height: 672, rx: 40 });
  svgEl.insertBefore(frame, svgEl.firstChild);
  const frameLabel = svg("text", { class: "chiplabel", x: 36, y: 676 }, svgEl);
  const pulseG = svg("g", { class: "pulses" }, svgEl);
  const dish = makeDish($("#bDish"), { tip: $("#bTip"), label: cellTip, onCell });
  const dna = makeDna($("#bDna"));

  /* signals running along the wires whose source gene is on in the stable state being shown */
  let pulses = [], pulseLast = 0, pulseAcc = 0, pulsing = false;
  const lens = new WeakMap();
  function spawn() {
    const live = net.edges().filter((e) => e.path.classList.contains("on") && !e.path.classList.contains("fdim"));
    if (!live.length) return;
    const e = live[(Math.random() * live.length) | 0];
    let len = lens.get(e.path); if (len === undefined) { len = e.path.getTotalLength(); lens.set(e.path, len); }
    pulses.push({ e, len, c: svg("circle", { class: "pulse", r: 4.4 }, pulseG), t0: performance.now(), dur: 520 + Math.random() * 380 });
  }
  function pulseFrame(now) {
    if (!pulsing) return;
    pulseAcc += Math.min(80, now - pulseLast); pulseLast = now;
    while (pulseAcc > 130) { pulseAcc -= 130; if (pulses.length < 34) spawn(); }
    pulses = pulses.filter((p) => {
      const k = (now - p.t0) / p.dur;
      if (k >= 1) { p.c.remove(); return false; }
      const pt = p.e.path.getPointAtLength(p.len * k);
      p.c.setAttribute("cx", pt.x); p.c.setAttribute("cy", pt.y); p.c.style.opacity = Math.sin(Math.PI * k).toFixed(2);
      return true;
    });
    requestAnimationFrame(pulseFrame);
  }
  /* only the level in view is animated, and only while the bench is on screen */
  let inView = true, shownScale = st.scale;
  function syncLoops() {
    const live = inView && !document.hidden && !reduced, want = (s) => live && st.scale === s;
    if (want("circuit") && !pulsing) { pulsing = true; pulseLast = performance.now(); requestAnimationFrame(pulseFrame); } else if (!want("circuit")) pulsing = false;
    if (want("dish")) dish.start(); else dish.stop();
    if (want("dna")) dna.start(); else dna.stop();
  }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; syncLoops(); }, { threshold: 0.15 }).observe(box);
  document.addEventListener("visibilitychange", syncLoops);
  function cellTip(c) { return c.osc ? esc(T("tip.osc")) : c.act ? `<b>${esc(fname(c.act))}</b> · ${esc(SCI[c.act])}<br>${esc(T("tip.cell"))}` : esc(T("tip.idle")); }
  function onCell(c) { if (st.playing) return; st.fate = c.act || null; st.variant = 0; setScale("circuit"); }
  const papersFor = (s, t) => { const w = ((D.summary && D.summary.why_selected) || {})[t], hit = w && w.in.find(([e]) => e.startsWith(s + "|")); return hit ? hit[1] : 0; };
  const sensorsFor = (key) => NET(key).edges.filter((e) => e[0] === "DNA_damage" && e[1] !== "DNA_damage").map(([, t, , isNew]) => ({ label: pretty(t), isNew: !!isNew, sub: isNew ? T("dna.papers", papersFor("DNA_damage", t)) : T("dna.pub") }));
  const compareNow = () => (st.act === 3 || st.act === 4) && !!caseFor(netKey(), st.damage, st.perts);

  const inPaper = (s) => CASES.some((c) => c.expected.length === 1 && c.expected[0] === "apoptosis" && (c.setting.DNA_damage ?? 0) === 1 && pertKey(Object.entries(c.setting).filter(([n]) => n !== "DNA_damage")) === pertKey(s));
  /* what the current cuts do, in the checker's words; a discovery is recorded once, when the cuts are made */
  function huntVerdict() {
    if (!st.perts.length) return { kind: "none" };
    const pts = points("augmented", 1, st.perts);
    if (!pts) return { kind: "unknown" };
    if (!pts.length) return { kind: "never" };
    const fates = FATES.filter((f) => pts.some((p) => p.fate === f));
    if (!pts.every((p) => p.fate === "apoptosis")) return { kind: "some", fates };
    if (st.perts.some(([n]) => READOUT.has(n))) return { kind: "trivial" };
    const hit = INTERV.find((s) => pertKey(s) === pertKey(st.perts));
    if (hit) { const k = pertKey(hit), fresh = !found.has(k); if (fresh) { found.add(k); saveFound(); st.lastFind = k; later(ui, () => { st.lastFind = null; }, 1200); burst(); } return { kind: fresh ? "new" : "again", set: hit }; }
    const subs = INTERV.filter((s) => s.every(([n, v]) => st.perts.some(([m, w]) => m === n && w === v))), known = subs.find((s) => found.has(pertKey(s)));
    return known ? { kind: "bigger", set: known } : subs.length ? { kind: "smaller" } : { kind: "odd" };  /* name a smaller answer only if the player already has it */
  }
  const burstEl = $("#bBurst");
  function burst() { burstEl.classList.remove("go"); void burstEl.offsetWidth; burstEl.classList.add("go"); }
  function onNode(n) {
    if (st.playing) return;
    if (st.act === 6) {  /* in the hunt up to two genes can be cut or forced on at once */
      if (n === "DNA_damage") return;
      const i = st.perts.findIndex(([m]) => m === n);
      if (i >= 0) { if (st.perts[i][1] === 0) st.perts[i][1] = 1; else st.perts.splice(i, 1); } else { st.perts.push([n, 0]); if (st.perts.length > 2) st.perts.shift(); }
      st.fate = null; st.variant = 0; st.verdict = huntVerdict(); render(); return;
    }
    if (n === "DNA_damage") { toggleDamage(); return; }
    const i = st.perts.findIndex(([m]) => m === n);
    st.perts = i < 0 || st.perts.length > 1 ? [[n, 0]] : st.perts[i][1] === 0 ? [[n, 1]] : [];
    st.sel = null; st.fate = null; st.variant = 0; render();
  }
  function toggleDamage() { st.damage = st.damage ? 0 : 1; if (st.perts.length > 1) st.perts = st.perts.slice(0, 1); st.sel = null; st.fate = null; st.variant = 0; render(); }

  function paintStage() {
    const key = netKey();
    if (key !== built) { net.build(key); built = key; pulses.forEach((p) => p.c.remove()); pulses = []; }
    net.focus((st.act === 2 && st.plugged) || st.act === 4 ? SPOT : null);  /* the patch is the story of steps 2 and 4: once plugged in, everything else recedes */
    frameLabel.textContent = T("chip", NET(key).nodes.length);
    const pts = points(key, st.damage, st.perts), present = new Set(pts ? pts.map((p) => p.fate).filter(Boolean) : []);
    const c = caseFor(key, st.damage, st.perts);
    const bad = c && c.match !== "covers" ? FATES.filter((f) => present.has(f) && !c.expected.includes(f)) : [];
    const miss = c ? c.expected.filter((f) => !present.has(f)) : [];
    const fate = st.fate && present.has(st.fate) ? st.fate : bad[0] || FATES.find((f) => present.has(f)) || null;
    const ofFate = pts ? pts.filter((p) => p.fate === fate) : [], shown = ofFate.length ? ofFate[st.variant % ofFate.length] : null;
    net.paint({ values: shown ? Object.fromEntries(ORDER.map((n, i) => [n, bit(shown.state, i)])) : null, lit: fate ? `var(--f-${fate})` : "var(--fg)", clamped: Object.fromEntries(st.perts), fatesPresent: present, fatesSel: fate });
    const names = FATES.filter((f) => present.has(f)).map(fname);
    st.status = !pts ? T("st.unknown") : !pts.length ? T("st.never") : !names.length ? T("st.nofate") : names.length === 1 ? T("st.only", names[0]) : T("st.many", names.length, names.join(", "));
    $("#bStatus").textContent = st.status + (bad.length ? ` ✕ ${bad.map(fname).join(", ")}: ${T("notexp")}.` : "");
    $("#bLamps").replaceChildren(...FATES.map((f) => {
      const on = present.has(f), isBad = bad.includes(f), isMiss = miss.includes(f), count = pts ? pts.filter((p) => p.fate === f).length : 0;
      const b = h(`<button type="button" class="lamp5 fate-${f}${on ? " on" : ""}${isBad ? " bad" : ""}${isMiss ? " miss" : ""}${on && fate === f ? " sel" : ""}"${on ? "" : " disabled"} aria-pressed="${on && fate === f}"><span class="led"></span><b>${esc(fname(f))}</b><small>${esc(isBad ? "✕ " + T("notexp") : isMiss ? T("expected") : SCI[f] + (count > 1 ? ` ×${count}` : ""))}</small></button>`);
      b.addEventListener("click", () => { st.variant = st.fate === f ? st.variant + 1 : 0; st.fate = f; paintStage(); });
      return b;
    }));
    /* the dish and the DNA show the same experiment as the circuit; each is rebuilt only when the experiment itself changes */
    const compare = compareNow(), layout = compare ? "compare" : "single";
    box.dataset.scale = st.scale; box.dataset.layout = layout;
    if (st.scale === "dish") {
      const fates = FATES.filter((f) => present.has(f)), osc = !!pts && pts.length === 0;
      dish.run({ sig: [key, st.damage, pertKey(st.perts), layout, st.irr].join("|"), layout, damage: !!st.damage, treated: st.perts.length > 0,
        dishes: compare ? [{ fates: c.expected, title: T("cmp.paper"), empty: T("dish.empty") }, { fates, osc, bad, title: T("says"), empty: T("dish.empty") }] : [{ fates, osc, bad, empty: T("dish.empty") }] });
      dish.spot(st.fate && present.has(st.fate) ? st.fate : null);
    } else if (st.scale === "dna") dna.run({ sig: [key, st.damage, st.irr].join("|"), damaged: !!st.damage, sensors: sensorsFor(key) });
    renderDock(compare); syncLoops();
  }

  /* ---------------------------------------------------------------- the panel of the current step */
  const PRESETS = [["none", "cut.none", []], ["tug1", "cut.tug1", [["TUG1", 0]]], ["mir", "cut.mir", [["miR221", 1]]], ["p53", "cut.p53", [["p53", 0]]]];
  /* the tool strip under the stage: treatments and the radiation source for the dish, the same source for the DNA, the open/close switch for the circuit */
  const buildVials = () => $("#bVials").replaceChildren(...PRESETS.map(([id, , perts]) => {
    const v = h(`<button type="button" class="vial${id === "none" ? " ctl" : ""}" data-id="${id}"><span class="tube"><i class="liq"></i></span><span>${esc(T("vial." + id))}</span></button>`);
    v.dataset.key = pertKey(perts); v.addEventListener("click", () => { if (!st.playing) setCut(id); });
    return v;
  }));
  function renderDock(compare) {
    const s = st.scale;
    $("#bVials").hidden = !(s === "dish" && !compare);
    $$(".vial", $("#bVials")).forEach((v) => v.setAttribute("aria-pressed", String(st.damage === 1 && pertKey(st.perts) === v.dataset.key)));
    $("#bIrr").hidden = s === "circuit";
    $("#bIrrTxt").textContent = T(compare ? "irr.replay" : st.damage ? "irr.again" : "irr.go");
    $("#bIrr").classList.toggle("nudge", !st.damage && !compare);
    $("#bFollow").hidden = s !== "dna";
    $("#bOpen").hidden = s !== "circuit";
    $("#bDockHint").textContent = s === "circuit" ? T("dock.circuit") : s === "dna" ? T(st.damage ? "dna.note" : "dna.hint0") : "";
    $("#bNote").hidden = s !== "dish"; $("#bNote").textContent = T("dish.note");
  }
  const btn = (act, label, cls = "", arg = "") => `<button type="button" class="btn ${cls}" data-do="${act}"${arg ? ` data-arg="${esc(arg)}"` : ""}>${label}</button>`;
  const presetRow = () => `<div class="b-row">${PRESETS.map(([id, key, perts]) => `<button type="button" class="tab" data-do="cut" data-arg="${id}" aria-pressed="${st.damage === 1 && pertKey(st.perts) === pertKey(perts)}">${esc(T(key))}</button>`).join("")}</div>`;
  const chips = (list, badSet = []) => list.map((f) => `<span class="chip fate-${f}${badSet.includes(f) ? " badchip" : ""}"><i></i>${esc(fname(f))}</span>`).join(" ");
  const caseLabel = (c) => {
    const p = Object.entries(c.setting).filter(([n]) => n !== "DNA_damage");
    return p.length ? p.map(([n, v]) => `${pretty(n)} ${v ? "ON" : "✕"}`).join(" + ") : c.setting.DNA_damage ? T("dmg") : T("nodmg");
  };
  function whyBlock() {
    const steps = forcedSteps(st.ver, { DNA_damage: st.damage, ...Object.fromEntries(st.perts) }).slice(0, 14);
    const rows = steps.length ? steps.map((s, i) => `<div class="step"><em>${i + 1}</em><span><b>${esc(pretty(s.node))}</b> = ${s.value} <em>${esc(T("why.because"))} ${esc(s.node)} = ${esc(s.rule)} (${s.reads.map(([r, v]) => esc(pretty(r)) + "=" + v).join(", ")})</em></span></div>`).join("") : `<div class="hint">${esc(T("why.none"))}</div>`;
    return `<details class="b-why"${st.whyOpen ? " open" : ""}><summary>${esc(T("why.sum"))}</summary><div class="steps">${rows}</div></details>`;
  }
  const quoteCard = () => {
    const q = PATCH.quotes;
    return `<div class="b-card"><small>${esc(T("a2.found", fmt(quoted), PATCH.papers))}</small><q>“${esc(q[0].quote)}”</q><small class="mono">${esc(q[0].pmcid)}</small>
      ${q.length > 1 ? `<details><summary>${esc(T("a2.more", q.length - 1))}</summary>${q.slice(1).map((x) => `<q>“${esc(x.quote)}”</q><small class="mono">${esc(x.pmcid)}</small>`).join("")}</details>` : ""}
      <div class="b-wire"><i></i>${esc(T("a2.wire", pretty(SRC), pretty(DST)))}</div></div>`;
  };
  const gateSvg = () => (GATE.length ? `<svg class="gate" viewBox="0 0 430 112" role="img" aria-label="${esc(pretty(SRC))} AND ${esc(pretty(GATE[0]))} switch off ${esc(pretty(DST))}"><title>${esc(pretty(SRC))} AND ${esc(pretty(GATE[0]))} ⊣ ${esc(pretty(DST))}</title>
      <text class="gt" x="104" y="34" text-anchor="end">${esc(pretty(SRC))}</text><line class="gw" x1="112" y1="30" x2="200" y2="30"/>
      <text class="gt" x="104" y="86" text-anchor="end">${esc(pretty(GATE[0]))}</text><line class="gw" x1="112" y1="82" x2="200" y2="82"/>
      <path class="gb" d="M200,12 H226 A44,44 0 0 1 226,100 H200 Z"/><text class="gt b" x="224" y="56" text-anchor="middle" dominant-baseline="central">AND</text>
      <line class="gw out" x1="270" y1="56" x2="330" y2="56"/><text class="gt b" x="340" y="61">⊣ ${esc(pretty(DST))}</text></svg>` : "");
  const claimLabel = (c) => `${Object.entries(c.perturbation).map(([n, v]) => pretty(n) + (v ? " ON" : " ✕")).join(" + ")} → ${c.readout === "g2_arrest" ? "G2 arrest" : c.readout}: ${c.polarity}`;
  const dots = (v, star) => `<span class="vd ${v}">${v === "correct" ? "✓" : v === "wrong" ? "✕" : "–"}${star ? "*" : ""}</span>`;

  function auditBlock() {
    if (!HO_) return `<p class="b-hint">${esc(T("a5.noaudit"))}</p>`;
    const pub = "base", aug = HO_.networks.includes("repaired_min2") ? "repaired_min2" : HO_.networks[HO_.networks.length - 1], N = HO_.claims.length;
    const can = HO_.claims.filter((c) => c.verdicts[pub] !== "not_expressible"), hollow = can.filter((c) => c.no_stable_state[pub]).length;
    const naive = Object.keys(D.verification.matrix).filter((k) => k.startsWith("naive")).map((k) => Object.keys(D.verification.matrix[k]).length);
    const checked = Object.keys(D.verification.matrix).filter((k) => k.startsWith("verified") || k.startsWith("repaired")).map((k) => Object.keys(D.verification.matrix[k]).length);
    const rows = HO_.claims.map((c, i) => `<button type="button" class="cl${st.claim === i ? " sel" : ""}" data-do="claim" data-arg="${i}"><span>${esc(claimLabel(c))}</span>${dots(c.verdicts[pub], c.no_stable_state[pub])}${dots(c.verdicts[aug], c.no_stable_state[aug])}${dots(c.baseline, false)}</button>`).join("");
    const score = (ix, value, label) => `<div><b>${value}</b><small><span class="ix">${ix}</span> ${esc(label)}<br>${esc(T("sc.of", N))}</small></div>`;
    const c = st.claim === null ? null : HO_.claims[st.claim];
    const picked = c ? `<div class="b-card"><small>${esc(c.id)} · ${esc(c.cite)} · <a href="https://europepmc.org/article/PMC/${esc(c.pmcid)}" target="_blank" rel="noopener">${esc(c.pmcid)}</a></small><q class="say">“${esc(c.quote)}”</q><span>${esc(st.status)}</span></div>` : "";
    return `<p class="b-hint">${esc(T("a5.h", N))}</p>
      <div class="score">${score(1, HO_.totals[pub].correct, T("sc.pub"))}${score(2, HO_.totals[aug].correct, T("sc.aug"))}${score(3, HO_.baseline.correct, T("sc.base"))}</div>
      <div class="b-card"><b>${esc(T("a5.no"))}</b><span>${esc(T("a5.hollow", hollow, can.length))}</span>${naive.length ? `<span>${esc(T("a5.worked", Math.min(...naive), Math.max(...naive), checked.length ? Math.max(...checked) : 0))}</span>` : ""}</div>
      <div class="b-actions">${btn("notebook", esc(T("a5.nb")), "primary")}${btn("again", esc(T("a5.again")))}${HUNT ? btn("hunt", esc(T("a6.go"))) : ""}${btn("restart", esc(T("a5.restart")))}</div>
      <div class="claims10"><div class="cl head"><span>${esc(T("a5.click"))}</span><span>1</span><span>2</span><span>3</span></div>${rows}</div>${picked}`;
  }

  function panelHTML() {
    const done = (v) => rackOf(v).done;
    const tease = HUNT ? `<div class="b-card tease"><span>${esc(T("a6.tease", INTERV.length))}</span><div>${btn("hunt", esc(T("a6.go")), "small")}</div></div>` : "";
    if (st.act === 1) return `<h3>${T("a1.t")}</h3><p class="b-hint">${T("a1.h")}</p>${presetRow()}<p class="b-status">${esc(st.status)}</p>${whyBlock()}<p class="hint">${esc(T("a1.tip"))}</p><div class="b-actions">${btn("next", T("a1.next"), "primary")}</div>${tease}`;
    if (st.act === 2) {
      if (st.reading) return `<h3>${T("a2.t")}</h3><div class="b-count"><div><b id="cnt0">0</b><small>${esc(T("cnt.papers"))}</small></div><div><b id="cnt1">0</b><small>${esc(T("cnt.claims"))}</small></div><div><b id="cnt2">0</b><small>${esc(T("cnt.quotes"))}</small></div></div>`;
      if (!st.read) return `<h3>${T("a2.t")}</h3><p class="b-hint">${T("a2.h", NEW_LIST)}</p><div class="b-actions">${btn("read", esc(T("a2.read", D.meta.corpus_papers)), "primary")}</div>`;
      if (!st.plugged) return `<h3>${T("a2.t")}</h3>${quoteCard()}<div class="b-actions">${btn("plug", esc(T("a2.plug")), "primary")}</div>`;
      return `<h3>${T("a2.t")}</h3><p class="b-hint">${T("a2.plugged")}</p>${presetRow()}<p class="b-status">${esc(st.status)}</p><div class="b-actions">${btn("next", T("a2.next"), "primary")}</div>`;
    }
    if (st.act === 3) {
      const r = rackOf("B"), bad = failing("B").length;
      if (!r.running && !r.done) return `<h3>${T("a3.t")}</h3><p class="b-hint">${T("a3.h")}</p><div class="b-actions">${btn("run", esc(T("a3.run")), "primary")}</div>`;
      if (!r.done) return `<h3>${T("a3.t")}</h3><p class="b-hint">${T("a3.h")}</p>`;
      return `<h3>${T("a3.t")}</h3><p class="b-hint"><b>${esc(bad ? T("a3.res", 10 - bad, bad) : T("a3.allpass"))}</b> ${bad ? esc(T("a3.click")) : ""}</p><div class="b-actions">${btn("next", T("a3.next"), "primary")}</div>`;
    }
    if (st.act === 4) {
      if (!st.answered) return `<h3>${T("a4.t")}</h3><p class="b-hint">${T("a4.h")}</p><p class="b-hint"><i>${T("a4.think")}</i></p>`;
      const answer = `<div class="b-card"><small>${esc(T("a4.own"))}</small><q class="say">“${esc(PATCH.explanation)}”</q>${gateSvg()}<small>${esc(T("a4.gate"))}</small><div class="rule">${ruleHTML(PATCH.template, PATCH.final)}</div></div>`;
      if (!st.fixed) return `<h3>${T("a4.t")}</h3><p class="b-hint">${T("a4.h")}</p>${answer}<div class="b-actions">${btn("fix", esc(T("a4.fix")), "primary")}</div>`;
      const v = ST.vacuous;
      return `<h3>${T("a4.t")}</h3>${done("C") ? `<p class="b-hint"><b>${esc(T("a4.done", 10 - failing("C").length))}</b></p>` : `<p class="b-hint">…</p>`}${answer}
        ${v ? `<details class="b-card"><summary>${esc(T("a4.cheat"))}</summary><span>${esc(T("a4.cheat.d"))}</span><div class="rule">${ruleHTML(v.old, v.rule)}</div></details>` : ""}
        <div class="b-actions">${btn("next", T("a4.next"), "primary")}</div>`;
    }
    if (st.act === 6) return `<h3>${T("a6.t")}</h3>${huntBlock()}`;
    return `<h3>${T("a5.t")}</h3>${auditBlock()}`;
  }
  function verdictText(v) {
    const m = { none: () => T("a6.none"), unknown: () => T("st.unknown"), never: () => T("a6.never"), trivial: () => T("a6.trivial"), odd: () => T("a6.odd"), some: () => T("a6.some", v.fates.map(fname).join(", ")),
      again: () => T("a6.again", setName(v.set)), bigger: () => T("a6.bigger", setName(v.set)), smaller: () => T("a6.smaller"), new: () => T("a6.new", setName(v.set), inPaper(v.set)), hint: () => T("a6.hintmsg", pretty(v.node)) };
    return (m[v.kind] || m.none)();
  }
  function huntBlock() {
    const keys = INTERV.map(pertKey), k = keys.filter((x) => found.has(x)).length, v = st.verdict || { kind: "none" };
    const items = INTERV.slice().sort((a, b) => a.length - b.length || setName(a).localeCompare(setName(b))).map((s) => (found.has(pertKey(s))
      ? `<span class="hchip got${st.lastFind === pertKey(s) ? " fresh" : ""}"><b>${esc(setName(s))}</b><small>${esc(T(inPaper(s) ? "a6.paper" : "a6.model"))}</small></span>`
      : `<span class="hchip lock"><b>?</b><small>${esc(T(s.length === 1 ? "a6.slot1" : "a6.slot2"))}</small></span>`)).join("");
    return `<p class="b-hint">${esc(T("a6.h", INTERV.length))}</p><p class="hint">${esc(T("a6.how"))}</p>
      <div class="hunt-meter"><b>${k}<span>/${INTERV.length}</span></b><div class="bar"><i style="width:${(100 * k) / INTERV.length}%"></i></div></div>
      <p class="b-status hunt-msg ${v.kind}">${esc(verdictText(v))}</p><div class="hunt-grid">${items}</div>
      <div class="b-actions">${btn("hint", esc(T("a6.hint")), "small")}${btn("huntdish", esc(T("a6.dish")), "small")}${btn("huntreset", esc(T("a6.reset")), "small")}</div><p class="hint">${esc(T("a6.note"))}</p>`;
  }
  function renderPanel() {
    const el = $("#bPanel"), a = document.activeElement, keep = a && el.contains(a) && a.dataset.do ? [a.dataset.do, a.dataset.arg] : null;
    el.innerHTML = panelHTML();
    const why = $(".b-why", el); if (why) why.addEventListener("toggle", () => (st.whyOpen = why.open));
    if (keep) { const again = $$("[data-do]", el).find((x) => x.dataset.do === keep[0] && x.dataset.arg === keep[1]); if (again) again.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- the rack of ten known experiments */
  function renderRack() {
    const el = $("#bRack"), v = rackVer();
    el.hidden = st.act < 3 || st.act > 4;
    if (el.hidden) return;
    const r = rackOf(v);
    el.replaceChildren(...CASES.map((c, i) => {
      const on = r.done || i < r.shown, pass = on && c[v].ok;
      const b = h(`<button type="button" class="led10${on ? (pass ? " pass" : " fail") : ""}${st.sel === c.id ? " sel" : ""}"${on ? "" : " disabled"} aria-label="${c.id} ${esc(caseLabel(c))}"><b>${c.id}</b><span class="m">${on ? (pass ? "✓" : "✕") : "·"}</span><span>${esc(caseLabel(c))}</span></button>`);
      b.addEventListener("click", () => selectCase(c.id));
      return b;
    }));
  }
  function selectCase(id) {
    const c = CASES.find((x) => x.id === id); if (!c) return;
    st.sel = id; st.damage = c.setting.DNA_damage ? 1 : 0; st.perts = Object.entries(c.setting).filter(([n]) => n !== "DNA_damage").map(([n, v]) => [n, v]);
    st.fate = null; st.variant = 0; render();
  }
  function renderDetail() {
    const el = $("#bDetail"), c = CASES.find((x) => x.id === st.sel);
    if (!c || st.act < 3 || st.act > 4) { el.replaceChildren(); return; }
    const v = rackVer(), found = [...new Set(decode(c[v].states).map((p) => p.fate).filter(Boolean))], bad = c.match === "covers" ? [] : found.filter((f) => !c.expected.includes(f));
    el.replaceChildren(h(`<div class="b-card"><small>${esc(c.id)} · ${esc(c.origin)}</small>
      <div class="fatepair"><span class="faint">${esc(T("known"))}${c.match === "covers" ? ` (${esc(T("atleast"))})` : ""}</span> ${chips(c.expected)}</div>
      <div class="fatepair"><span class="faint">${esc(T("says"))}</span> ${found.length ? chips(found, bad) : "–"} <span class="pill ${c[v].ok ? "good" : "bad"}">${esc(c[v].ok ? T("match") : T("nomatch"))}</span></div></div>`));
  }

  /* ---------------------------------------------------------------- steps */
  function renderRail() {
    $("#bRail").replaceChildren(...T("rail").slice(0, HUNT ? 6 : 5).map((label, i) => {
      const n = i + 1, li = h(`<li><button type="button"${n === st.act ? ' aria-current="step"' : ""} class="${n === 6 ? "bonus " : ""}${n < st.reach && n !== st.act && n !== 6 ? "done" : ""}"${n > st.reach && n !== 6 ? " disabled" : ""}><b>${n}</b><span class="lbl">${esc(label)}</span></button></li>`);
      li.firstElementChild.addEventListener("click", () => { if (!st.playing) go(n); });
      return li;
    }));
  }
  function render() {
    box.dataset.open = (st.open ?? st.act >= 5) ? "1" : "0";  /* closed by default, open for the audit and the hunt, and whatever the viewer chose since the last step */
    if (shownScale !== st.scale) { $("#bTip").classList.remove("show"); shownScale = st.scale; }  /* a tooltip from the level just left must not linger */
    $$("#bScale button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scale === st.scale)));
    $("#bDamage").setAttribute("aria-pressed", String(!!st.damage));
    $("#bOpen").setAttribute("aria-pressed", String(box.dataset.open === "1"));
    $("#bOpenTxt").textContent = T(box.dataset.open === "1" ? "ctl.close" : "ctl.open");
    paintStage(); renderRail(); renderPanel(); renderRack(); renderDetail();
  }
  function go(n) {
    clearUi();
    st.act = n; st.reach = Math.max(st.reach, Math.min(n, 5)); st.sel = null; st.claim = null; st.open = null; st.fate = null; st.variant = 0; st.verdict = null;
    st.ver = n === 1 ? "A" : n === 2 ? (st.plugged ? "B" : "A") : n === 3 ? "B" : n === 4 ? (st.fixed ? "C" : "B") : "C";
    if (n === 3) st.plugged = true;
    if (n === 2 || n >= 5 || st.perts.length > 1) st.perts = [];  /* an old cut does not carry into a new step; a pair of cuts is only for the tests */
    if (n > 1) st.damage = 1;  /* every step after the first is about irradiated cells */
    st.scale = n === 1 ? "dish" : n === 4 && caseFor(st.ver, st.damage, st.perts) ? "dish" : "circuit";  /* cells to start with, wires for the patch, cells again to compare a failed test with the paper */
    if (n === 4 && !st.answered) { st.thinking = true; later(ui, () => { st.thinking = false; st.answered = true; renderPanel(); }, reduced ? 150 : 1500); }
    render();
  }
  function doRead() {
    if (st.read || st.reading) return;
    st.reading = true; box.classList.add("scan"); renderPanel();
    const t0 = performance.now(), dur = reduced ? 150 : 2400, to = [D.meta.corpus_papers, proposed, quoted];
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;
      to.forEach((v, i) => { const el = $("#cnt" + i); if (el) el.textContent = fmt(Math.round(v * e)); });
      if (k < 1) raf = requestAnimationFrame(tick);
      else { st.reading = false; st.read = true; box.classList.remove("scan"); renderPanel(); }
    };
    raf = requestAnimationFrame(tick);
  }
  function doPlug() {
    if (st.plugged) return;
    st.plugged = true; st.ver = "B"; st.perts = []; st.sel = null; render();
    later(ui, () => net.wireFlash(SRC, DST), 60);
  }
  function doRun(v) {
    const r = rackOf(v); if (r.running) return;
    r.shown = 0; r.done = false; r.running = true; st.sel = null; render();
    const step = () => {
      r.shown++;
      if (r.shown >= 10) {
        r.running = false; r.done = true;
        const f = failing(v)[0];
        if (f) { st.scale = "dish"; selectCase(f.id); renderPanel(); return; }  /* the paper's dish next to the circuit's dish */
      }
      renderRack(); renderPanel();
      if (!r.done) later(ui, step, reduced ? 15 : 170);
    };
    later(ui, step, reduced ? 15 : 300);
  }
  function doFix() {
    if (st.fixed) return;
    st.fixed = true; st.ver = "C"; st.sel = null; render();
    later(ui, () => net.wireFlash(SRC, DST), 60);
    doRun("C");
  }
  function setCut(id) {  /* treat, then irradiate; asking again repeats the experiment on a fresh dish */
    const p = PRESETS.find((x) => x[0] === id); if (!p) return;
    st.damage = 1; st.perts = p[2].map((x) => [...x]); st.sel = null; st.fate = null; st.variant = 0; st.irr++; render();
  }
  function irradiate() { if (st.playing) return; st.damage = 1; st.irr++; st.sel = null; st.fate = null; st.variant = 0; render(); }
  function setScale(s) { if (s === st.scale) return; st.scale = s; render(); }
  function reset() { stop(); clearUi(); Object.assign(st, initial()); built = null; render(); }
  const ACT = {
    next: () => go(st.act + 1), cut: setCut, read: doRead, plug: doPlug, run: () => doRun("B"), fix: doFix, hunt: () => go(6),
    hint: () => {  /* name one gene of an answer not found yet, and make it blink on the circuit */
      const left = INTERV.filter((s) => !found.has(pertKey(s))); if (!left.length) return;
      const n = left[0][0][0]; st.verdict = { kind: "hint", node: n }; render(); net.flash(n); later(ui, () => net.flash(n), 500); later(ui, () => net.flash(n), 1000);
    },
    huntdish: () => { st.irr++; st.scale = "dish"; render(); },
    huntreset: () => { found = new Set(); saveFound(); st.perts = []; st.verdict = null; st.fate = null; render(); },
    notebook: () => $("#notebook").scrollIntoView({ behavior: reduced ? "auto" : "smooth" }), again: () => play(), restart: () => { reset(); },
    claim: (i) => {  /* show what the checked circuit does in the setting of that outcome, and the paper's words */
      const c = HO_.claims[+i];
      st.claim = +i; st.scale = "dish"; st.damage = c.stimulus === "none" ? 0 : 1; st.perts = Object.entries(c.perturbation).map(([n, v]) => [n, v]); st.fate = null; st.variant = 0; render();
      if (innerWidth <= 1020) box.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
    },
  };
  $("#bPanel").addEventListener("click", (ev) => { const b = ev.target.closest("[data-do]"); if (b && !b.disabled && !st.playing) ACT[b.dataset.do](b.dataset.arg); });
  $("#bDamage").addEventListener("click", () => { if (!st.playing) toggleDamage(); });
  $("#bOpen").addEventListener("click", () => { if (!st.playing) { st.open = box.dataset.open !== "1"; render(); } });
  $("#bIrr").addEventListener("click", irradiate);
  $("#bFollow").addEventListener("click", () => { if (!st.playing) setScale("circuit"); });
  $$("#bScale button").forEach((b) => b.addEventListener("click", () => { if (!st.playing) setScale(b.dataset.scale); }));

  /* ---------------------------------------------------------------- presentation mode: the same actions, on a timer, with captions */
  const cap = $("#bCaption");
  const say = (key, ...a) => { cap.dataset.key = key; cap.dataset.args = JSON.stringify(a); cap.textContent = T(key, ...a); cap.classList.add("show"); };
  const refreshCaption = () => { if (cap.dataset.key) cap.textContent = T(cap.dataset.key, ...JSON.parse(cap.dataset.args || "[]")); };
  function stop() {
    clearSet(script); st.playing = false; grid.classList.remove("playing"); $("#bStop").hidden = true; cap.classList.remove("show"); delete cap.dataset.key;
  }
  function play() {
    clearSet(script); clearUi(); Object.assign(st, initial()); built = null; render();
    st.playing = true; grid.classList.add("playing"); $("#bStop").hidden = false;
    grid.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });  /* stage and lamps together in one screen */
    /* a descent in magnification (dish, DNA, circuit), then the five steps */
    const fails = failing("B").length, hollow = HO_ ? HO_.claims.findIndex((c) => c.no_stable_state.base) : -1, S = [
      [600, () => say("cap.1")], [3000, () => { say("cap.2"); irradiate(); }], [8200, () => { say("cap.3"); setCut("tug1"); }],
      [13800, () => { say("cap.d1"); setScale("dna"); }], [18200, () => { say("cap.d2"); setScale("circuit"); }],
      [22000, () => { say("cap.4"); go(2); }], [24200, () => { say("cap.5", D.meta.corpus_papers); doRead(); }],
      [28800, () => { say("cap.6", pretty(SRC), pretty(DST)); doPlug(); }], [31000, () => setCut("tug1")],
      [33800, () => { say("cap.7"); go(3); }], [35000, () => doRun("B")], [38800, () => say("cap.8", fails)],
      [43200, () => { say("cap.9"); go(4); }], [48200, () => { say("cap.10"); doFix(); }],
      [52500, () => { say("cap.11"); go(5); }], [56500, () => { if (hollow >= 0) { say("cap.11b"); ACT.claim(hollow); } }],
      [60500, () => say("cap.12")], [PLAY_S * 1000, () => stop()],
    ];
    S.forEach(([ms, fn]) => later(script, fn, ms));
  }
  $("#bStop").addEventListener("click", stop);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && st.playing) stop(); });
  for (const id of ["playTop", "playHero"]) $("#" + id).addEventListener("click", play);

  /* ---------------------------------------------------------------- language */
  function applyStatic() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => (el.textContent = T(el.dataset.i18n, N0, PLAY_S)));
    $$("[data-i18n-html]").forEach((el) => (el.innerHTML = T(el.dataset.i18nHtml, N0, PLAY_S)));
    $("#langTxt").textContent = lang === "en" ? "ΕΛ" : "EN";
    $("#bHow").replaceChildren(...["dish", "circuit", "wire", "lamp", "checker"].map((k) => h(`<div><b>${esc(T("how." + k))}</b><span>${esc(T("how." + k + ".d", N0))}</span></div>`)));
    const aria = lang === "en"
      ? ["The gene circuit of a cell. Lamps below show which fates it can reach.", "A culture dish of cells reacting to radiation.", "A strand of DNA damaged by radiation."]
      : ["Το κύκλωμα γονιδίων ενός κυττάρου. Οι λυχνίες από κάτω δείχνουν ποιες μοίρες μπορεί να φτάσει.", "Ένα τρυβλίο με κύτταρα που αντιδρούν στην ακτινοβολία.", "Ένα κομμάτι DNA που έπαθε βλάβη από ακτινοβολία."];
    ["#bNet", "#bDish", "#bDna"].forEach((id, i) => $(id).setAttribute("aria-label", aria[i]));
    buildVials();
  }
  $("#lang").addEventListener("click", () => {
    lang = lang === "en" ? "el" : "en";
    try { localStorage.setItem("cellproof-lang", lang); } catch (e) { /* ignore */ }
    applyStatic(); refreshCaption(); render();
  });

  /* the header: a dish that is irradiated again and again with the circuit's real fates, over the faint network */
  (function heroLoop() {
    const cv = $("#heroDish"), v2 = CASES.find((c) => c.id === "V02");
    if (!cv || !v2) return;
    const four = [...new Set(decode(v2.A.states).map((p) => p.fate).filter(Boolean))], timers = new Set();
    const hd = makeDish(cv, { onCell: () => $("#bench").scrollIntoView({ behavior: reduced ? "auto" : "smooth" }) });
    let n = 0, live = false;
    const neutral = () => hd.run({ sig: "h" + ++n, layout: "single", damage: false, treated: false, dishes: [{ fates: [] }] });
    const cycle = () => { neutral(); later(timers, () => hd.fire({ sig: "h" + n + "f", fates: four }), 2800); later(timers, cycle, 11000); };
    if (reduced) { hd.run({ sig: "h", layout: "single", damage: true, treated: false, dishes: [{ fates: four }] }); return; }
    new IntersectionObserver((es) => {
      const on = es[0].isIntersecting && !document.hidden;
      if (on && !live) { live = true; hd.start(); cycle(); } else if (!on && live) { live = false; hd.stop(); clearSet(timers); }
    }, { threshold: 0.2 }).observe(cv);
  })();

  applyStatic(); render();
  window.CPBench = { play, stop, go, reset, state: st };
})();
