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
  const N0 = D.networks.published.nodes.length, PLAY_S = 60;
  const SCI = { proliferation: "proliferation", arrest: "arrest", senescence: "senescence", autophagy: "autophagy", apoptosis: "apoptosis" };
  /* the hunt: the exact solver found every set of one or two changes (readout genes excluded) after which every cell dies */
  const INTERV = ((D.interventions || {}).augmented || []).map((s) => s.map(([n, v]) => [n, v])), READOUT = new Set((D.interventions || {}).readout || []), HUNT = INTERV.length > 0;
  const setName = (s) => s.map(([n, v]) => `${pretty(n)} ${v ? "ON" : "✕"}`).join(" + ");
  /* the header's numbers, all from the solver or from files the pipeline wrote: how many changes of one or two genes it tried and how long
     that took on the machine that built this page, how many it kept, how the count grows with the number of genes changed at once
     (and the time that would take at the same speed: a projection), what the model did when asked for the answer itself, and how
     many known experiments the unchecked edits break against the checked ones */
  const SPACE = (D.interventions || {}).space || {}, AIX = D.llm_search ? D.llm_search.arms[D.llm_search.best] : null, MATRIX = (D.verification || {}).matrix || {};
  const failCount = (pre) => Object.keys(MATRIX).filter((k) => k.startsWith(pre)).map((k) => Object.keys(MATRIX[k]).length);
  const HERO = {
    total: SPACE.total || 0, found: SPACE.found || 0, secs: Math.max(1, Math.round(SPACE.seconds || 0)), sizes: ["1", "2", "3", "4", "5"].map((k) => (SPACE.sizes || {})[k] || 0),
    proj: SPACE.projected_seconds || {}, keep: SPACE.keep || [], marks: AIX ? AIX.marks : [], ai: AIX ? AIX.summary : null, unchecked: failCount("naive"), checked: failCount("verified").concat(failCount("repaired")),
  };
  /* new rules keep coming and each can change which combinations work: the same search on the model with the rules read from the papers
     applied unchecked and on the checked one, how many of the published list each keeps, and the two runs replayed edit by edit, with
     the links each edit adds (report/data.py), next to the number of known experiments each model breaks (the verification matrix) */
  const DR0 = (D.interventions || {}).drift || null, NCASES = ((D.verification || {}).cases || []).length;
  const broke = (key) => (MATRIX[key] ? Object.keys(MATRIX[key]).length : null);
  const DRIFT = DR0 && DR0.runs && DR0.net && DR0.runs.unchecked.length && NCASES && broke("naive_min2") !== null && broke("repaired_min2") !== null
    ? { ...DR0, rules: DR0.runs.unchecked.length, papers: (D.meta || {}).corpus_papers || 0, cases: NCASES, broken: broke("naive_min2"), repaired: broke("repaired_min2") } : null;
  const DR = DRIFT || { published: 0, rules: 0, papers: 0, cases: 0, broken: 0, repaired: 0, unchecked: { sets: 0, kept: 0, new: 0 }, checked: { sets: 0, kept: 0, new: 0 } };
  /* the pair shown in the goal beat: the first shortlisted pair with one gene switched off and one forced on */
  const PAIR = INTERV.find((s) => s.length === 2 && s.some(([, v]) => v === 0)) || INTERV.find((s) => s.length === 2) || INTERV[0] || [];
  const UNCH = HERO.unchecked.length ? [Math.min(...HERO.unchecked), Math.max(...HERO.unchecked)] : null, CHK = HERO.checked.length ? Math.max(...HERO.checked) : 0;
  /* the shortlisted sets that the base paper itself reports (TUG1 knocked out, miR-221 forced on) and that the search rediscovers */
  const PAPER_SETS = [[["TUG1", 0]], [["miR221", 1]]].filter((s) => ((D.interventions || {}).published || []).some((q) => JSON.stringify(q) === JSON.stringify(s))).length;
  const range = (a, b) => (a === b ? `${a}` : `${a}–${b}`), joined = (parts) => parts.filter(Boolean).join(" · ");

  /* ---------------------------------------------------------------- texts */
  const TEXT = {
    en: {
      "nav.bench": "Bench", "play.short": "▶ Play", "play.stop": "■ Stop",
      "hero.sr": () => `CellProof: radiation breaks DNA and a damaged cell does not always die. The goal is a combination of genes to switch off, or on, that leaves only death. ${DRIFT ? `New rules keep coming and each can change which genes to flip: ${DR.rules} new rules from ${DR.papers} papers, added without checking, replaced all ${DR.published} combinations that worked with ${DR.unchecked.sets} others, while with each rule checked first the same ${DR.checked.sets} stayed. ` : ""}There are ${num(HERO.total)} combinations of one or two genes, ${num(HERO.sizes[4])} of up to five, and controlling a Boolean network is NP-hard in general (Akutsu et al. 2007). ${HERO.ai ? `Asked directly, an AI named ${HERO.ai.distinct} sets, ${HERO.ai.works} were right and it found ${HERO.ai.minimal_hits} of the ${HERO.ai.minimal} candidates. ` : ""}${UNCH ? `Its unchecked edits to the model break ${range(...UNCH)} of 10 known experiments. ` : ""}An exact solver finds all of them here but cannot read the papers. Together: ${HERO.found} candidates for the lab and ${CHK} of 10 known experiments broken. Hypotheses for experiments, not treatments.`,
      "hero.sa": () => `<b>AI alone:</b> ${joined([HERO.ai && `${HERO.ai.works} of ${HERO.ai.distinct} guesses right, ${HERO.ai.minimal_hits} of the ${HERO.ai.minimal} candidates found`, UNCH && `its edits break ${range(...UNCH)} of 10 known experiments`])}`,
      "hero.sb": () => `<b>Solver alone:</b> finds all ${HERO.found} and checks them, but cannot read the papers${HERO.proj["5"] ? `; ≈ ${dur(HERO.proj["5"])} for 5 changes (projected)` : ""}`,
      "hero.sc": () => `<b>Together:</b> ${HERO.found} candidates for the lab (${PAPER_SETS} in the base paper, the rest computed), ${CHK} of 10 known experiments broken`,
      "hero.b1": "Radiation <em>breaks</em> DNA.", "hero.b2": "Not every damaged cell <em>dies.</em>", "hero.n2": "In the published model. Illustration, not percentages.",
      "hero.b3": "Flip the right genes, and every cell <em>dies.</em>", "hero.s3": "The goal: a combination of genes to switch off, or on, that leaves only death.",
      "hero.n3": "Two genes here, an example from the model. Illustration.",
      "hero.bd": "New rules change <em>which genes to flip.</em>",
      "hero.sd": () => `A rule is a link between two genes, and papers keep adding them. Here, ${DR.rules} new rules from ${DR.papers} papers, unchecked, replaced all ${DR.published} combinations that worked.`,
      "hero.dl": () => `Check each rule first, and the same ${DR.checked.sets} stay.`,
      "hero.drn": "combinations that work", "hero.drb": (n) => `${n} of ${DR.cases} known experiments broken`,
      "hero.dra": (n) => `Unchecked · ${n} new rules`, "hero.drc": "Each rule checked first", "hero.drp": (n) => `${n} paper${n === 1 ? "" : "s"}`,
      "hero.b4": "Which combination? The search <em>explodes.</em>", "hero.n4": "combinations, each one a lab experiment", "hero.np": "<b>NP-hard</b> in general · Akutsu et al. 2007",
      "hero.stage": (k, t, proj) => `up to ${k} genes at once · solver ${proj ? "≈ " : ""}${t}${proj ? " (projected)" : ""}`,
      "hero.b5": "The AI proposes. The solver <em>decides.</em>", "hero.n5": "candidates left",
      "unit.s": "s", "unit.min": "min", "unit.h": "h",
      "hero.tag": "Illustration, not to scale. Hypotheses for experiments, not treatments.", "hero.step": (i, n) => `Part ${i} of ${n}`,
      "hero.play": (n, s) => `▶ Play the ${s}-second story`, "hero.try": "Try it yourself",
      "bench.eyebrow": "The test bench", "bench.h2": "Five steps. One circuit. The checker decides.",
      "ctl.damage": "DNA damage",
      "scale.dish": "Dish", "scale.circuit": "Cell", "irr.go": "Irradiate", "irr.again": "Irradiate again", "irr.replay": "Replay",
      "vial.none": "No change", "vial.tug1": "Switch off TUG1", "vial.mir": "Switch on miR-221", "vial.p53": "Remove p53", "cmp.paper": "Paper: known result",
      "dish.note": "Illustration. The model gives possible fates, not percentages.", "dish.empty": "no cells left",
      "tip.idle": "A healthy cell. Irradiate the dish and watch it decide.", "tip.cell": "Click to look inside this cell.", "tip.osc": "No stable state: this cell keeps flipping between fates.",
      "dock.circuit": "Click a gene to cut it. Click again to switch it on.", "lg.act": "switches on", "lg.inh": "switches off", "lg.new": "new link", "lg.on": "on", "lg.off": "off",
      rail: ["Cells", "New link", "Tests", "Fix", "Audit", "Hunt"],
      "a6.t": "The hunt", "a6.h": (n) => `Cut or switch on one or two genes so that every cell dies. The checker knows exactly ${n} ways. How many can you find?`,
      "a6.how": "On the circuit, click a gene: once to cut it, twice to force it on, three times to clear it. Two genes at most.",
      "a6.none": "Pick a gene to start.", "a6.never": "The circuit never settles here, so no cell reaches any fate.", "a6.trivial": "Only death, but it works by forcing the death machinery itself. That does not count.",
      "a6.odd": "Only death, but this is not one of the checker's sets.", "a6.some": (list) => `Not yet. Still reachable: ${list}.`, "a6.again": (name) => `${name}: you found this one already.`,
      "a6.bigger": (name) => `Only death, but ${name} alone already does it.`, "a6.smaller": "Only death, but a smaller set already does it. Try the genes one at a time.", "a6.new": (name, paper) => `New discovery: ${name}${paper ? " · in the base paper" : ""}`, "a6.hintmsg": (g) => `Hint: ${g} is part of an answer.`,
      "a6.paper": "in the base paper", "a6.model": "model's hypothesis", "a6.slot1": "1 gene", "a6.slot2": "2 genes",
      "a6.hint": "Hint", "a6.dish": "See it in the dish", "a6.reset": "Reset", "a6.note": "These are hypotheses about the model, for lab testing. Not treatments.",
      "a6.tease": (n) => `Challenge: can you make every cell die? The checker knows ${n} ways.`, "a6.go": "Start the hunt →",
      "fate.proliferation": "Divides", "fate.arrest": "Pauses", "fate.senescence": "Ages", "fate.autophagy": "Recycles", "fate.apoptosis": "Dies",
      "a1.t": "A dish of cells", "a1.h": "Press Irradiate, then switch a gene off or on.",
      "cut.none": "No change", "cut.tug1": "Switch off TUG1", "cut.mir": "Switch on miR-221", "cut.p53": "Remove p53",
      "a1.next": "Next: the model is missing a link →",
      "st.only": (x) => `Only “${x}” is reachable.`, "st.many": (n, list) => `${n} fates are reachable: ${list}.`,
      "st.never": "The circuit never settles: it keeps oscillating, so no lamp stays on.", "st.nofate": "A stable state exists, but it matches none of the five fates.",
      "st.unknown": "This combination was not precomputed.",
            "a2.t": "A missing link", "a2.h": (list) => `The model is missing some genes: ${list}. The papers know them.`,
      "a2.read": (n) => `Let the AI read ${n} papers`, "cnt.papers": "papers read", "cnt.claims": "claims proposed", "cnt.quotes": "quotes found word for word",
      "a2.found": (q, k) => `One of ${q} quoted claims. ${k} papers agree.`, "a2.wire": (a, b) => `Proposed link: ${a} switches ${b} off`,
      "a2.more": (n) => `${n} more quotes`, "a2.plug": "Add the link, unchecked",
      "a2.plugged": "Added, unchecked. Is it safe? Test it on experiments with known results.", "a2.next": "Next: test it on 10 known experiments →",
      "a3.t": "The tests", "a3.h": "Ten experiments with known results. The checker replays each one on the model.",
      "a3.run": "Run the 10 known experiments", "a3.res": (p, f) => `${p} of 10 pass, ${f} fail.`, "a3.click": "Click a red light to see what went wrong.",
      "a3.allpass": "All 10 pass.", "a3.next": "Send the failures to the AI →",
      dmg: "damage", nodmg: "no damage", known: "Known from the paper", says: "The circuit says", atleast: "at least", match: "matches", nomatch: "does not match",
      notexp: "not expected", expected: "expected",
      "a4.t": "The fix", "a4.h": "The AI gets the failed tests and answers:", "a4.think": "The AI is thinking…",
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
      "cap.1": "Radiation damages the DNA of a cell.", "cap.2": "Then every cell picks one fate: it pauses, ages, recycles itself or dies.",
      "cap.3": "Switch off one gene, TUG1, and every cell dies. Finding genes like this is the goal.",
      "cap.d1": "Inside the cell, genes switch each other on and off. This is our model of it.",
      "cap.4": "But the model is missing links that the papers know.", "cap.5": (n) => `An AI reads ${n} papers and finds them.`,
      "cap.6": (a, b) => `One new link: ${a} switches off ${b}.`, "cap.7": "Is the AI right? An exact checker, the solver, replays 10 experiments with known results.",
      "cap.8": (f) => `${f} of the 10 now come out wrong: the AI's link was not safe.`, "cap.9": "The AI sees which ones, and rewrites the link.",
      "cap.10": "Now all 10 come out right. The checker decided, not the AI.",
      "cap.11": "Honest limit: on 10 outcomes from papers the AI never read, the model is no better than before.", "cap.12": "The AI proposes. The solver decides.",
    },
    el: {
      "nav.bench": "Εργαστήριο", "play.short": "▶ Παίξε", "play.stop": "■ Στοπ",
      "hero.sr": () => `CellProof: η ακτινοβολία σπάει το DNA και ένα κύτταρο με βλάβη δεν πεθαίνει πάντα. Ο στόχος είναι ένας συνδυασμός γονιδίων να σβήσουν, ή να ανάψουν, ώστε να μείνει μόνο ο θάνατος. ${DRIFT ? `Νέοι κανόνες βγαίνουν συνέχεια και ο καθένας μπορεί να αλλάξει ποια γονίδια θα γυρίσεις: ${DR.rules} νέοι κανόνες από ${DR.papers} papers, χωρίς έλεγχο, αντικατέστησαν όλους τους ${DR.published} συνδυασμούς που δούλευαν με ${DR.unchecked.sets} άλλους, ενώ όταν κάθε κανόνας ελέγχθηκε πρώτα έμειναν οι ίδιοι ${DR.checked.sets}. ` : ""}Υπάρχουν ${num(HERO.total)} συνδυασμοί ενός ή δύο γονιδίων, ${num(HERO.sizes[4])} με έως πέντε, και ο έλεγχος ενός δικτύου Boole είναι γενικά NP-hard (Akutsu et al. 2007). ${HERO.ai ? `Όταν ρωτήθηκε απευθείας, ένα AI ονόμασε ${HERO.ai.distinct} σύνολα, τα ${HERO.ai.works} ήταν σωστά και βρήκε ${HERO.ai.minimal_hits} από τις ${HERO.ai.minimal} υποψήφιες. ` : ""}${UNCH ? `Οι ανέλεγκτες αλλαγές του στο μοντέλο χαλάνε ${range(...UNCH)} από 10 γνωστά πειράματα. ` : ""}Ένας ακριβής solver τις βρίσκει όλες εδώ αλλά δεν μπορεί να διαβάσει τα papers. Μαζί: ${HERO.found} υποψήφιες για το εργαστήριο και ${CHK} από 10 γνωστά πειράματα χαλασμένα. Υποθέσεις για πειράματα, όχι θεραπείες.`,
      "hero.sa": () => `<b>Μόνο AI:</b> ${joined([HERO.ai && `${HERO.ai.works} από ${HERO.ai.distinct} εικασίες σωστές, βρήκε ${HERO.ai.minimal_hits} από τις ${HERO.ai.minimal} υποψήφιες`, UNCH && `οι αλλαγές του χαλάνε ${range(...UNCH)} από 10 γνωστά πειράματα`])}`,
      "hero.sb": () => `<b>Μόνο solver:</b> βρίσκει και τις ${HERO.found} και τις ελέγχει, αλλά δεν διαβάζει τα papers${HERO.proj["5"] ? `· ≈ ${dur(HERO.proj["5"])} για 5 αλλαγές (εκτίμηση)` : ""}`,
      "hero.sc": () => `<b>Μαζί:</b> ${HERO.found} υποψήφιες για το εργαστήριο (${PAPER_SETS} στο βασικό paper, οι άλλες υπολογισμένες), ${CHK} από 10 γνωστά πειράματα χαλασμένα`,
      "hero.b1": "Η ακτινοβολία <em>σπάει</em> το DNA.", "hero.b2": "Δεν πεθαίνει <em>κάθε</em> κύτταρο με βλάβη.", "hero.n2": "Στο δημοσιευμένο μοντέλο. Εικονογράφηση, όχι ποσοστά.",
      "hero.b3": "Γύρνα τους σωστούς διακόπτες και κάθε κύτταρο <em>πεθαίνει.</em>", "hero.s3": "Ο στόχος: ένας συνδυασμός γονιδίων να σβήσουν, ή να ανάψουν, ώστε να μείνει μόνο ο θάνατος.",
      "hero.n3": "Εδώ δύο γονίδια, ένα παράδειγμα από το μοντέλο. Εικονογράφηση.",
      "hero.bd": "Νέοι κανόνες, <em>άλλοι διακόπτες να γυρίσεις.</em>",
      "hero.sd": () => `Ένας κανόνας είναι μια σύνδεση ανάμεσα σε δύο γονίδια, και τα papers προσθέτουν συνέχεια νέους. Εδώ, ${DR.rules} νέοι κανόνες από ${DR.papers} papers, χωρίς έλεγχο, αντικατέστησαν όλους τους ${DR.published} συνδυασμούς που δούλευαν.`,
      "hero.dl": () => `Έλεγξε κάθε κανόνα πρώτα και μένουν οι ίδιοι ${DR.checked.sets}.`,
      "hero.drn": "συνδυασμοί που δουλεύουν", "hero.drb": (n) => `${n} από ${DR.cases} γνωστά πειράματα χαλασμένα`,
      "hero.dra": (n) => `Χωρίς έλεγχο · ${n} νέοι κανόνες`, "hero.drc": "Κάθε κανόνας ελέγχεται πρώτα", "hero.drp": (n) => `${n} paper${n === 1 ? "" : "s"}`,
      "hero.b4": "Ποιος συνδυασμός; Η αναζήτηση <em>εκρήγνυται.</em>", "hero.n4": "συνδυασμοί, ο καθένας ένα πείραμα στο εργαστήριο", "hero.np": "<b>NP-hard</b> γενικά · Akutsu et al. 2007",
      "hero.stage": (k, t, proj) => `έως ${k} γονίδια μαζί · solver ${proj ? "≈ " : ""}${t}${proj ? " (εκτίμηση)" : ""}`,
      "hero.b5": "Το AI προτείνει. Ο solver <em>αποφασίζει.</em>", "hero.n5": "υποψήφιες έμειναν",
      "unit.s": "δλ", "unit.min": "λ", "unit.h": "ώ",
      "hero.tag": "Εικονογράφηση, όχι υπό κλίμακα. Υποθέσεις για πειράματα, όχι θεραπείες.", "hero.step": (i, n) => `Μέρος ${i} από ${n}`,
      "hero.play": (n, s) => `▶ Παίξε την ιστορία (${s} δλ)`, "hero.try": "Δοκίμασέ το",
      "bench.eyebrow": "Το εργαστήριο δοκιμών", "bench.h2": "Πέντε βήματα. Ένα κύκλωμα. Αποφασίζει ο ελεγκτής.",
      "ctl.damage": "Βλάβη DNA",
      "scale.dish": "Τρυβλίο", "scale.circuit": "Κύτταρο", "irr.go": "Ακτινοβόληση", "irr.again": "Ξανά ακτινοβόληση", "irr.replay": "Επανάληψη",
      "vial.none": "Καμία αλλαγή", "vial.tug1": "Σβήσε το TUG1", "vial.mir": "Άναψε το miR-221", "vial.p53": "Βγάλε το p53", "cmp.paper": "Paper: γνωστό αποτέλεσμα",
      "dish.note": "Εικονογράφηση. Το μοντέλο δίνει πιθανές μοίρες, όχι ποσοστά.", "dish.empty": "δεν έμεινε κανένα κύτταρο",
      "tip.idle": "Ένα υγιές κύτταρο. Ακτινοβόλησε το τρυβλίο και δες το να αποφασίζει.", "tip.cell": "Κάνε κλικ για να δεις μέσα στο κύτταρο.", "tip.osc": "Καμία σταθερή κατάσταση: το κύτταρο αλλάζει συνεχώς μοίρα.",
      "dock.circuit": "Κάνε κλικ σε γονίδιο για να το κόψεις. Ξανά κλικ για να το ανάψεις.", "lg.act": "ανάβει", "lg.inh": "σβήνει", "lg.new": "νέα σύνδεση", "lg.on": "αναμμένο", "lg.off": "σβηστό",
      rail: ["Κύτταρα", "Νέα σύνδεση", "Δοκιμές", "Διόρθωση", "Έλεγχος", "Κυνήγι"],
      "a6.t": "Το κυνήγι", "a6.h": (n) => `Κόψε ή άναψε ένα ή δύο γονίδια ώστε να πεθαίνουν όλα τα κύτταρα. Ο ελεγκτής ξέρει ακριβώς ${n} τρόπους. Πόσους βρίσκεις;`,
      "a6.how": "Στο κύκλωμα, κάνε κλικ σε ένα γονίδιο: μία φορά το κόβεις, δύο φορές το αναγκάζεις να ανάψει, τρεις φορές το καθαρίζεις. Το πολύ δύο γονίδια.",
      "a6.none": "Διάλεξε ένα γονίδιο για να ξεκινήσεις.", "a6.never": "Το κύκλωμα δεν σταθεροποιείται εδώ, οπότε κανένα κύτταρο δεν φτάνει σε μοίρα.", "a6.trivial": "Μόνο θάνατος, αλλά επειδή αναγκάζεις τον ίδιο τον μηχανισμό θανάτου. Δεν μετράει.",
      "a6.odd": "Μόνο θάνατος, αλλά δεν είναι από τις λύσεις του ελεγκτή.", "a6.some": (list) => `Όχι ακόμα. Ακόμα προσιτά: ${list}.`, "a6.again": (name) => `${name}: αυτό το βρήκες ήδη.`,
      "a6.bigger": (name) => `Μόνο θάνατος, αλλά το ${name} μόνο του το κάνει ήδη.`, "a6.smaller": "Μόνο θάνατος, αλλά ένα μικρότερο σύνολο το κάνει ήδη. Δοκίμασε τα γονίδια ένα-ένα.", "a6.new": (name, paper) => `Νέα ανακάλυψη: ${name}${paper ? " · στο αρχικό paper" : ""}`, "a6.hintmsg": (g) => `Βοήθεια: το ${g} είναι μέρος μιας λύσης.`,
      "a6.paper": "στο αρχικό paper", "a6.model": "υπόθεση του μοντέλου", "a6.slot1": "1 γονίδιο", "a6.slot2": "2 γονίδια",
      "a6.hint": "Βοήθεια", "a6.dish": "Δες το στο τρυβλίο", "a6.reset": "Μηδενισμός", "a6.note": "Υποθέσεις για το μοντέλο, για δοκιμή στο εργαστήριο. Όχι θεραπείες.",
      "a6.tease": (n) => `Πρόκληση: μπορείς να κάνεις όλα τα κύτταρα να πεθάνουν; Ο ελεγκτής ξέρει ${n} τρόπους.`, "a6.go": "Ξεκίνα το κυνήγι →",
      "fate.proliferation": "Διαιρείται", "fate.arrest": "Παύση", "fate.senescence": "Γήρανση", "fate.autophagy": "Ανακύκλωση", "fate.apoptosis": "Θάνατος",
      "a1.t": "Ένα τρυβλίο με κύτταρα", "a1.h": "Πάτα Ακτινοβόληση και μετά σβήσε ή άναψε ένα γονίδιο.",
      "cut.none": "Καμία αλλαγή", "cut.tug1": "Σβήσε το TUG1", "cut.mir": "Άναψε το miR-221", "cut.p53": "Βγάλε το p53",
      "a1.next": "Επόμενο: στο μοντέλο λείπει μια σύνδεση →",
      "st.only": (x) => `Μένει μόνο: «${x}».`, "st.many": (n, list) => `Προσιτές μοίρες (${n}): ${list}.`,
      "st.never": "Το κύκλωμα δεν σταθεροποιείται ποτέ: ταλαντώνεται, οπότε καμία λυχνία δεν μένει αναμμένη.", "st.nofate": "Υπάρχει σταθερή κατάσταση, αλλά δεν ταιριάζει σε καμία από τις πέντε μοίρες.",
      "st.unknown": "Αυτός ο συνδυασμός δεν έχει υπολογιστεί από πριν.",
            "a2.t": "Μια σύνδεση που λείπει", "a2.h": (list) => `Στο μοντέλο λείπουν γονίδια: ${list}. Τα papers τα ξέρουν.`,
      "a2.read": (n) => `Άσε το AI να διαβάσει ${n} papers`, "cnt.papers": "papers διαβάστηκαν", "cnt.claims": "ισχυρισμοί", "cnt.quotes": "αποσπάσματα κατά λέξη",
      "a2.found": (q, k) => `Ένας από τους ${q} ισχυρισμούς με απόσπασμα. Συμφωνούν ${k} papers.`, "a2.wire": (a, b) => `Προτεινόμενη σύνδεση: το ${a} σβήνει το ${b}`,
      "a2.more": (n) => `${n} ακόμη αποσπάσματα`, "a2.plug": "Πρόσθεσε τη σύνδεση, χωρίς έλεγχο",
      "a2.plugged": "Προστέθηκε, χωρίς έλεγχο. Είναι ασφαλής; Δοκίμασέ την σε πειράματα με γνωστά αποτελέσματα.", "a2.next": "Επόμενο: δοκίμασέ το σε 10 γνωστά πειράματα →",
      "a3.t": "Οι δοκιμές", "a3.h": "Δέκα πειράματα με γνωστά αποτελέσματα. Ο ελεγκτής ξαναπαίζει το καθένα στο μοντέλο.",
      "a3.run": "Τρέξε τα 10 γνωστά πειράματα", "a3.res": (p, f) => `Περνούν ${p} από 10, αποτυγχάνουν ${f}.`, "a3.click": "Κάνε κλικ σε μια κόκκινη λυχνία για να δεις τι πήγε στραβά.",
      "a3.allpass": "Περνούν και τα 10.", "a3.next": "Στείλε τις αποτυχίες στο AI →",
      dmg: "βλάβη", nodmg: "χωρίς βλάβη", known: "Γνωστό από το paper", says: "Το κύκλωμα λέει", atleast: "τουλάχιστον", match: "ταιριάζει", nomatch: "δεν ταιριάζει",
      notexp: "δεν αναμενόταν", expected: "αναμενόταν",
      "a4.t": "Η διόρθωση", "a4.h": "Το AI παίρνει τις αποτυχημένες δοκιμές και απαντά:", "a4.think": "Το AI σκέφτεται…",
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
      "cap.1": "Η ακτινοβολία κάνει ζημιά στο DNA ενός κυττάρου.", "cap.2": "Μετά κάθε κύτταρο διαλέγει μία μοίρα: κάνει παύση, γερνά, ανακυκλώνεται ή πεθαίνει.",
      "cap.3": "Σβήσε ένα γονίδιο, το TUG1, και πεθαίνουν όλα τα κύτταρα. Στόχος μας είναι να βρίσκουμε τέτοια γονίδια.",
      "cap.d1": "Μέσα στο κύτταρο, τα γονίδια ανάβουν και σβήνουν το ένα το άλλο. Αυτό είναι το μοντέλο μας.",
      "cap.4": "Αλλά στο μοντέλο λείπουν συνδέσεις που τα papers ξέρουν.", "cap.5": (n) => `Ένα AI διαβάζει ${n} papers και τις βρίσκει.`,
      "cap.6": (a, b) => `Μία νέα σύνδεση: το ${a} σβήνει το ${b}.`, "cap.7": "Έχει δίκιο το AI; Ένας ακριβής ελεγκτής, ο solver, ξαναπαίζει 10 πειράματα με γνωστά αποτελέσματα.",
      "cap.8": (f) => `Τα ${f} από τα 10 βγαίνουν πια λάθος: η σύνδεση του AI δεν ήταν ασφαλής.`, "cap.9": "Το AI βλέπει ποια, και ξαναγράφει τη σύνδεση.",
      "cap.10": "Τώρα βγαίνουν σωστά και τα 10. Αποφάσισε ο ελεγκτής, όχι το AI.",
      "cap.11": "Ειλικρινές όριο: σε 10 αποτελέσματα από papers που το AI δεν διάβασε, το μοντέλο δεν είναι καλύτερο από πριν.", "cap.12": "Το AI προτείνει. Ο solver αποφασίζει.",
    },
  };
  let lang = "en";
  try { const s = localStorage.getItem("cellproof-lang"); lang = s === "el" || s === "en" ? s : /^el/i.test(navigator.language || "") ? "el" : "en"; } catch (e) { /* storage may be blocked */ }
  const T = (k, ...a) => { const v = TEXT[lang][k] ?? TEXT.en[k]; return typeof v === "function" ? v(...a) : v ?? k; };
  const fname = (f) => T("fate." + f);
  const num = (n) => Number(n).toLocaleString(lang === "el" ? "el-GR" : "en-US");
  const dur = (s) => (s < 90 ? `${Math.round(s)} ${T("unit.s")}` : s < 3600 ? `${Math.round(s / 60)} ${T("unit.min")}` : `${num(Math.round(s / 360) / 10)} ${T("unit.h")}`);

  /* ---------------------------------------------------------------- state */
  const initial = () => ({ act: 1, reach: 1, ver: "A", scale: "dish", damage: 0, irr: 0, perts: [], fate: null, variant: 0, read: false, reading: false, plugged: false,
    answered: false, thinking: false, fixed: false, run: {}, sel: null, claim: null, status: "", playing: false, verdict: null, lastFind: null });
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
  const net = makePoster(svgEl, $("#bTip"), { node: onNode, fateLabel: fname }, "A");
  let built = "A";
  const pulseG = svg("g", { class: "pulses" }, svgEl);
  const dish = makeDish($("#bDish"), { tip: $("#bTip"), label: cellTip, onCell });

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
  }
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; syncLoops(); }, { threshold: 0.15 }).observe(box);
  document.addEventListener("visibilitychange", syncLoops);
  function cellTip(c) { return c.osc ? esc(T("tip.osc")) : c.act ? `<b>${esc(fname(c.act))}</b> · ${esc(SCI[c.act])}<br>${esc(T("tip.cell"))}` : esc(T("tip.idle")); }
  function onCell(c) { if (st.playing) return; st.fate = c.act || null; st.variant = 0; setScale("circuit"); }
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
    box.dataset.scale = st.scale; box.dataset.layout = layout; box.dataset.damage = String(st.damage);
    if (st.scale === "dish") {
      const fates = FATES.filter((f) => present.has(f)), osc = !!pts && pts.length === 0;
      dish.run({ sig: [key, st.damage, pertKey(st.perts), layout, st.irr].join("|"), layout, damage: !!st.damage, treated: st.perts.length > 0,
        dishes: compare ? [{ fates: c.expected, title: T("cmp.paper"), empty: T("dish.empty") }, { fates, osc, bad, title: T("says"), empty: T("dish.empty") }] : [{ fates, osc, bad, empty: T("dish.empty") }] });
      dish.spot(st.fate && present.has(st.fate) ? st.fate : null);
    }
    renderDock(compare); syncLoops();
  }

  /* ---------------------------------------------------------------- the panel of the current step */
  const PRESETS = [["none", "cut.none", []], ["tug1", "cut.tug1", [["TUG1", 0]]], ["mir", "cut.mir", [["miR221", 1]]], ["p53", "cut.p53", [["p53", 0]]]];
  /* the tool strip under the stage: treatments and the radiation source for the dish, a key to the wires for the cell */
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
    $("#bLegend").hidden = s !== "circuit";
    $("#bDockHint").textContent = s === "circuit" ? T("dock.circuit") : "";
    $("#bNote").hidden = s !== "dish"; $("#bNote").textContent = T("dish.note");
  }
  const btn = (act, label, cls = "", arg = "") => `<button type="button" class="btn ${cls}" data-do="${act}"${arg ? ` data-arg="${esc(arg)}"` : ""}>${label}</button>`;
  const presetRow = () => `<div class="b-row">${PRESETS.map(([id, key, perts]) => `<button type="button" class="tab" data-do="cut" data-arg="${id}" aria-pressed="${st.damage === 1 && pertKey(st.perts) === pertKey(perts)}">${esc(T(key))}</button>`).join("")}</div>`;
  const chips = (list, badSet = []) => list.map((f) => `<span class="chip fate-${f}${badSet.includes(f) ? " badchip" : ""}"><i></i>${esc(fname(f))}</span>`).join(" ");
  const caseLabel = (c) => {
    const p = Object.entries(c.setting).filter(([n]) => n !== "DNA_damage");
    return p.length ? p.map(([n, v]) => `${pretty(n)} ${v ? "ON" : "✕"}`).join(" + ") : c.setting.DNA_damage ? T("dmg") : T("nodmg");
  };
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
    if (st.act === 1) return `<h3>${T("a1.t")}</h3><p class="b-hint">${T("a1.h")}</p>${presetRow()}<p class="b-status">${esc(st.status)}</p><div class="b-actions">${btn("next", T("a1.next"), "primary")}</div>${tease}`;
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
    if (shownScale !== st.scale) { $("#bTip").classList.remove("show"); shownScale = st.scale; }  /* a tooltip from the level just left must not linger */
    $$("#bScale button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scale === st.scale)));
    $("#bDamage").setAttribute("aria-pressed", String(!!st.damage));
    paintStage(); renderRail(); renderPanel(); renderRack(); renderDetail();
  }
  function go(n) {
    clearUi();
    st.act = n; st.reach = Math.max(st.reach, Math.min(n, 5)); st.sel = null; st.claim = null; st.fate = null; st.variant = 0; st.verdict = null;
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
  $("#bIrr").addEventListener("click", irradiate);
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
    /* plain words, one idea at a time: the damage, the four fates, a gene whose loss kills every cell, the model, a missing link, the test, the fix, the limit */
    const fails = failing("B").length, S = [
      [600, () => say("cap.1")], [3500, () => { say("cap.2"); irradiate(); }], [10500, () => { say("cap.3"); setCut("tug1"); }],
      [17000, () => { say("cap.d1"); setScale("circuit"); }],
      [23000, () => { say("cap.4"); go(2); }], [26000, () => { say("cap.5", D.meta.corpus_papers); doRead(); }],
      [31000, () => { say("cap.6", pretty(SRC), pretty(DST)); doPlug(); }],
      [35500, () => { say("cap.7"); go(3); }], [38000, () => doRun("B")], [43500, () => say("cap.8", fails)],
      [47500, () => { say("cap.9"); go(4); }], [51500, () => { say("cap.10"); doFix(); }],
      [55500, () => { say("cap.11"); go(5); }], [PLAY_S * 1000, () => stop()],
    ];
    S.forEach(([ms, fn]) => later(script, fn, ms));
  }
  $("#bStop").addEventListener("click", stop);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && st.playing) stop(); });
  for (const id of ["playTop", "playHero"]) $("#" + id).addEventListener("click", play);

  /* ---------------------------------------------------------------- language */
  let heroApi = null;  /* set by the header at the end of this file */
  function applyStatic() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => (el.textContent = T(el.dataset.i18n, N0, PLAY_S)));
    $$("[data-i18n-html]").forEach((el) => (el.innerHTML = T(el.dataset.i18nHtml, N0, PLAY_S)));
    $("#langTxt").textContent = lang === "en" ? "ΕΛ" : "EN";
    const aria = lang === "en"
      ? ["The gene circuit of a cell. Lamps below show which fates it can reach.", "A culture dish of cells reacting to radiation."]
      : ["Το κύκλωμα γονιδίων ενός κυττάρου. Οι λυχνίες από κάτω δείχνουν ποιες μοίρες μπορεί να φτάσει.", "Ένα τρυβλίο με κύτταρα που αντιδρούν στην ακτινοβολία."];
    ["#bNet", "#bDish"].forEach((id, i) => $(id).setAttribute("aria-label", aria[i]));
    buildVials(); net.relabel(); if (heroApi) heroApi.relabel();
  }
  $("#lang").addEventListener("click", () => {
    lang = lang === "en" ? "el" : "en";
    try { localStorage.setItem("cellproof-lang", lang); } catch (e) { /* ignore */ }
    applyStatic(); refreshCaption(); render();
  });

  /* the header: DNA at the back, a four-beat story in front (radiation, fates, every change to try, the solver's shortlist);
     it moves only while it is on screen, and the little bars under the words jump to any beat */
  (function heroStory() {
    const hero = $("#top"), cvH = $("#heroMol"), cvS = $("#heroStory"); if (!hero || !cvH || !cvS) return;
    const FULL = HERO.total && HERO.found && HERO.sizes.every(Boolean) && DRIFT, lite = innerWidth < 700, BEATS = FULL ? 6 : 3, DUR = [5500, 6500, 8500, 11000, 10000, 11500].slice(0, BEATS), dots = $$("#hDots button");
    let beat = 0, timer = 0, hitT = 0, seen = true, shown = -1, shownStage = 0;
    dots.forEach((d, i) => { d.hidden = i >= BEATS; });
    const paint = (n) => { shown = n; const el = $(`.beat[data-b="${beat + 1}"] [data-count]`, hero); if (el && n >= 0) el.textContent = num(n); };
    const paintHeroStage = (k) => { const el = $("[data-stage-text]", hero); if (el) el.textContent = k >= 2 ? T("hero.stage", k, dur(k === 2 ? HERO.secs : HERO.proj[String(k)] || 0), k > 2) : ""; };
    const stageTo = (k) => { shownStage = k; hero.dataset.stage = String(k); paintHeroStage(k); };
    const chips = PAIR.map(([n, v]) => ({ name: pretty(n), off: v === 0 }));
    /* the fourth beat: a small network (the genes the edits touch, the published links between them) where the papers bring links one after
       another, with the dots of the published list under it; the words come from TEXT */
    const claimOf = (s) => { const e = s.added[0]; return e ? `${pretty(e[0])} ${e[2] === "-" ? "⊣" : "→"} ${pretty(e[1])}` : s.edge; };
    const drift = DRIFT ? {
      published: DR.published, newSets: DR.unchecked.new, broken: [DR.broken, DR.repaired],
      nodes: DR.net.nodes.map((n) => ({ id: n.id, label: pretty(n.id), isNew: n.new })), base: DR.net.base,
      a: DR.runs.unchecked.map((s) => ({ ...s, claim: claimOf(s) })), b: DR.runs.checked,
      labels: () => ({ head: T("hero.drn"), chipA: (n) => T("hero.dra", n), chipB: T("hero.drc"), broken: (n) => T("hero.drb", n), papers: (n) => T("hero.drp", n) }),
    } : null;
    /* the first two rows are warnings (each does part of the job); the first becomes a cross only if the model was mostly wrong */
    const aiRow = $(".b-score li:nth-child(1)", hero);
    if (aiRow && HERO.ai && HERO.ai.distinct && HERO.ai.works / HERO.ai.distinct < 0.5) { aiRow.className = "no"; $("i", aiRow).textContent = "✕"; }
    const helix = makeHelix(cvH, { lite }), story = makeStory(cvS, { lite, total: HERO.total, keep: HERO.keep, sizes: HERO.sizes, marks: HERO.marks, chips, drift, fmt: num, onCount: paint, onStage: stageTo });
    function show(n) {
      beat = n; hero.dataset.beat = String(n + 1); shownStage = 0; hero.dataset.stage = "0"; paintHeroStage(0);
      dots.forEach((d, i) => { d.dataset.state = i < n ? "done" : i === n ? "on" : "todo"; d.setAttribute("aria-current", i === n ? "step" : "false"); d.style.setProperty("--dur", DUR[n] + "ms"); });
      paint(n === 5 ? HERO.total : n === 4 ? 0 : -1);
      story.show(n, reduced);
      clearTimeout(hitT); if (n === 0) hitT = setTimeout(helix.hit, 1000);
      clearTimeout(timer); if (!reduced && seen && !document.hidden) timer = setTimeout(() => show((n + 1) % BEATS), DUR[n]);
    }
    const sync = () => {
      if (seen && !document.hidden) { helix.start(); story.start(); show(beat); } else { helix.stop(); story.stop(); clearTimeout(timer); clearTimeout(hitT); }
    };
    dots.forEach((d, i) => d.addEventListener("click", () => show(i)));
    new IntersectionObserver((es) => { seen = es[0].isIntersecting; sync(); }, { threshold: 0.05 }).observe(hero);
    document.addEventListener("visibilitychange", sync);
    heroApi = { relabel: () => { dots.forEach((d, i) => d.setAttribute("aria-label", T("hero.step", i + 1, BEATS))); paint(shown); paintHeroStage(shownStage); } };
  })();

  applyStatic(); render();
  window.CPBench = { play, stop, go, reset, state: st };
})();
