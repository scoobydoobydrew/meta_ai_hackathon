/* CellProof report: utilities, theme, the animated header, the network drawing, and the interactive cell.
   D (the data) is defined before this file by the builder. Nothing here invents a number. */
const NS = "http://www.w3.org/2000/svg";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => Number(n).toLocaleString("en-US");
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const svg = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const L = D.layout;
const NET = (k) => D.networks[k] || (D.story && D.story.versions[k]); /* one of the three lab networks, or a version A, B, C of the bench story */
const ORDER = L.order;
const POW2 = ORDER.map((_, i) => 2 ** i);
const FATES = ["proliferation", "arrest", "senescence", "autophagy", "apoptosis"];
const FATE_LABEL = { proliferation: "Proliferation", arrest: "Arrest", senescence: "Senescence", autophagy: "Autophagy", apoptosis: "Apoptosis" };
const FATE_NOTE = { proliferation: "no damage, the cell divides", arrest: "a temporary pause", senescence: "a permanent stop", autophagy: "self-recycling", apoptosis: "programmed death" };
const PRETTY = { ATM_pH2AX: "ATM/γH2AX", AMPK_MAPK: "AMPK/MAPK", p53_A: "p53-A", p53_K: "p53-K", p53_INP1: "p53INP1", Cdc2_CycB: "CDK1/CycB", miR221: "miR-221", ULK1_Beclin1: "ULK1/Beclin1", DNA_damage: "DNA damage", DNA_PK: "DNA-PK", Wee1: "WEE1", Cdc25: "CDC25C", hTERT: "TERT", Sirt1: "SIRT1", Mdm2: "MDM2", Wip1: "WIP1", E2F1: "E2F1", Myc: "MYC", RB: "RB", PTEN: "PTEN", AKT: "AKT", WWP1: "WWP1", TUG1: "TUG1", BCL2: "BCL2", PUMA: "PUMA", BAX: "BAX", Caspase: "Caspase", mTORC1: "mTORC1", mTORC2: "mTORC2", CHK1: "CHK1", CHK2: "CHK2", ATR: "ATR", p21: "p21", p53: "p53" };
const pretty = (n) => PRETTY[n] || n;
const fateOfCode = (code) => (code >> 1 === 5 ? null : FATES[code >> 1]);
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const bit = (state, i) => Math.floor(state / POW2[i]) % 2;
const edgeWord = { activates: "activates", inhibits: "inhibits", requires: "needs" };
const edgeSign = { activates: "→", inhibits: "⊣", requires: "⇢" };
const ruleOf = (net, node) => D.networks[net].rules[node];
const newEdgeRecords = (node) => ((D.docket.repaired_min2 || []).filter((r) => r.node === node && r.status === "accepted"));

/* ---------------------------------------------------------------- theme */
(function theme() {
  const root = document.documentElement;
  try { const saved = localStorage.getItem("cellproof-theme"); if (saved) root.dataset.theme = saved; } catch (e) { /* storage may be blocked */ }
  $("#theme").addEventListener("click", () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("cellproof-theme", root.dataset.theme); } catch (e) { /* ignore */ }
    window.dispatchEvent(new Event("themechange"));
  });
  const links = $$("nav a"), sections = $$("main section").filter((s) => s.id !== "top");
  let ticking = false;
  const spy = () => { ticking = false; let cur = ""; for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.35) cur = s.id; links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + cur)); };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true }); spy();
})();

/* ---------------------------------------------------------------- header animation: a damage signal travelling the real network */
(function hero() {
  const cv = $("#heroCanvas"), ctx = cv.getContext("2d");
  const net = D.networks.augmented || D.networks.published;
  const pos = Object.fromEntries(Object.entries(L.nodes).map(([k, v]) => [k, [v.x, v.y]]));
  const fates = Object.entries(L.fates).map(([k, f]) => [k, [f.label, f.x, f.y, f.defined_by]]);
  const edges = net.edges.filter((e) => pos[e[0]] && pos[e[1]] && e[0] !== e[1]);
  const out = {};
  edges.forEach((e, i) => (out[e[0]] ||= []).push(i));
  const glow = {}, fateGlow = {};
  let pulses = [], W = 0, H = 0, dpr = 1, last = 0, nextWave = 0, colors = {};
  const readColors = () => { colors = { fg: css("--fg"), faint: css("--fg-3"), line: css("--line"), arrest: css("--f-arrest"), senescence: css("--f-senescence"), autophagy: css("--f-autophagy"), apoptosis: css("--f-apoptosis"), neu: css("--new") }; };
  const size = () => { const r = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  const sx = (x) => (x / L.width) * W, sy = (y) => (y / L.height) * H;
  const wave = (t) => { if (pulses.length < 90) (out.DNA_damage || []).forEach((i) => pulses.push({ e: i, t0: t, d: 700, depth: 0 })); };
  /* each edge is a quadratic curve, as in the interactive map; control points are fixed so pulses ride the same line */
  const ctrl = edges.map((e) => { const a = pos[e[0]], b = pos[e[1]], dx = b[0] - a[0], dy = b[1] - a[1]; return [(a[0] + b[0]) / 2 - dy * 0.1, (a[1] + b[1]) / 2 + dx * 0.1]; });
  const bez = (i, k) => { const e = edges[i], a = pos[e[0]], b = pos[e[1]], c = ctrl[i], u = 1 - k; return [sx(u * u * a[0] + 2 * u * k * c[0] + k * k * b[0]), sy(u * u * a[1] + 2 * u * k * c[1] + k * k * b[1])]; };
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1; ctx.strokeStyle = colors.line; ctx.globalAlpha = 0.55;
    ctx.beginPath(); edges.forEach((e, i) => { ctx.moveTo(sx(pos[e[0]][0]), sy(pos[e[0]][1])); ctx.quadraticCurveTo(sx(ctrl[i][0]), sy(ctrl[i][1]), sx(pos[e[1]][0]), sy(pos[e[1]][1])); }); ctx.stroke(); ctx.globalAlpha = 1;
    for (const [k, f] of fates) {
      const g = Math.min(1, fateGlow[k] || 0), x = sx(f[1]), y = sy(f[2]);
      ctx.beginPath(); ctx.arc(x, y - 22, 5 + g * 9, 0, 7); ctx.fillStyle = colors[k]; ctx.globalAlpha = 0.16 + 0.5 * g; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y - 22, 4 + g * 2, 0, 7); ctx.globalAlpha = 0.5 + 0.5 * g; ctx.fill(); ctx.globalAlpha = 1;
      ctx.font = `500 ${Math.max(12, W / 40)}px ${css("--sans")}`; ctx.textAlign = "center"; ctx.fillStyle = colors[k]; ctx.globalAlpha = 0.55 + 0.45 * g;
      ctx.fillText(f[0], x, y + 2); ctx.globalAlpha = 1;
    }
    for (const [n, p] of Object.entries(pos)) {
      const g = Math.min(1, glow[n] || 0), isNew = L.new_nodes.includes(n), x = sx(p[0]), y = sy(p[1]), r = (isNew ? 5 : n === "DNA_damage" ? 7 : 3.6) + g * 3.5;
      if (g > 0.05) { ctx.beginPath(); ctx.arc(x, y, r + 8, 0, 7); ctx.fillStyle = colors.fg; ctx.globalAlpha = 0.14 * g; ctx.fill(); }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g > 0.05 || n === "DNA_damage" ? colors.fg : colors.faint; ctx.globalAlpha = 0.55 + 0.45 * g; ctx.fill(); ctx.globalAlpha = 1;
      if (isNew) { ctx.beginPath(); ctx.arc(x, y, r + 4.5, 0, 7); ctx.strokeStyle = colors.neu; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    for (const p of pulses) {
      const k = Math.min(1, (t - p.t0) / p.d);
      for (let j = 6; j >= 0; j--) { const [x, y] = bez(p.e, Math.max(0, k - j * 0.045)); ctx.beginPath(); ctx.arc(x, y, 3.4 - j * 0.38, 0, 7); ctx.fillStyle = colors.fg; ctx.globalAlpha = (1 - j / 7) * 0.9; ctx.shadowColor = colors.fg; ctx.shadowBlur = j === 0 ? 12 : 0; ctx.fill(); }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
  }
  function step(t) {
    const dt = Math.min(64, t - last) / 1000; last = t;
    if (t > nextWave) { wave(t); nextWave = t + 3600; }
    const arrived = [];
    pulses = pulses.filter((p) => { if (t - p.t0 >= p.d) { arrived.push(p); return false; } return true; });
    for (const p of arrived) {
      const e = edges[p.e]; glow[e[1]] = 1;
      for (const [k, f] of fates) if (f[3].includes(e[1])) fateGlow[k] = Math.min(1.2, (fateGlow[k] || 0) + 0.35);
      if (p.depth < 7) for (const i of out[e[1]] || []) if (pulses.length < 110 && Math.random() < 0.8) pulses.push({ e: i, t0: t, d: 520 + Math.random() * 260, depth: p.depth + 1 });
    }
    for (const k in glow) glow[k] = Math.max(0, glow[k] - dt * 0.55);
    for (const k in fateGlow) fateGlow[k] = Math.max(0, fateGlow[k] - dt * 0.22);
    draw(t); requestAnimationFrame(step);
  }
  addEventListener("herowave", () => { nextWave = 0; });  /* the header's trailer asks for a signal when it reaches the circuit */
  const init = () => { readColors(); size(); };
  init(); addEventListener("resize", init); addEventListener("themechange", () => setTimeout(readColors, 30));
  $("#heroTag").textContent = `${net.nodes.length} genes · ${net.edges.length} regulatory links · signal drawn from the model's own rules`;
  if (reduced) { for (const n of ["DNA_damage", "ATM_pH2AX", "p53", "p53_K", "BAX", "Caspase"]) glow[n] = 1; fateGlow.apoptosis = 1; draw(0); }
  else requestAnimationFrame(step);
})();

/* ---------------------------------------------------------------- the network drawing */
function makeNet(svgEl, tip, handlers = {}, initial = "augmented") {
  const stage = svgEl.parentElement;
  let netKey = initial, edgeEls = [], nodeEls = {}, fateEls = {};
  const root = svg("g", {}, svgEl);
  const halos = svg("g", {}, root), links = svg("g", {}, root), edgesG = svg("g", {}, root), nodesG = svg("g", {}, root), fatesG = svg("g", {}, root);
  for (const [g, x, y, w, h] of L.halos) {
    svg("rect", { class: "halo", x, y, width: w, height: h, rx: 22 }, halos);
    const t = svg("text", { class: "halo-label", x: x + 16, y: y + 20 }, halos); t.textContent = L.groups[g];
  }
  for (const [k, f] of Object.entries(L.fates)) {
    for (const n of f.defined_by) { const p = L.nodes[n]; svg("path", { class: `fatelink fate-${k}`, d: `M${p.x},${p.y + 12} Q${(p.x + f.x) / 2},${(p.y + f.y) / 2 + 40} ${f.x},${f.y - 22}` }, links); }
    const g = svg("g", { class: `fatenode fate-${k}`, transform: `translate(${f.x},${f.y})`, tabindex: 0, role: "button", "aria-label": FATE_LABEL[k] }, fatesG);
    svg("rect", { x: -78, y: -22, width: 156, height: 44, rx: 14 }, g); svg("text", { y: 5 }, g).textContent = FATE_LABEL[k];
    g.addEventListener("click", () => handlers.fate && handlers.fate(k)); fateEls[k] = g;
  }
  const radius = (n) => (L.new_nodes.includes(n) ? 13 : n === "DNA_damage" ? 15 : 11);
  function curve(a, b, k) {
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const c = { x: (a.x + b.x) / 2 + nx * len * k, y: (a.y + b.y) / 2 + ny * len * k };
    const s0 = Math.hypot(c.x - a.x, c.y - a.y) || 1, s1 = Math.hypot(b.x - c.x, b.y - c.y) || 1;
    return { s: { x: a.x + ((c.x - a.x) / s0) * 13, y: a.y + ((c.y - a.y) / s0) * 13 }, e: { x: b.x - ((b.x - c.x) / s1) * 14, y: b.y - ((b.y - c.y) / s1) * 14 }, c, dir: { x: (b.x - c.x) / s1, y: (b.y - c.y) / s1 } };
  }
  function build(key) {
    netKey = key; edgesG.replaceChildren(); nodesG.replaceChildren(); edgeEls = []; nodeEls = {};
    const net = NET(key), have = new Set(net.nodes), seen = new Set();
    for (const [s, t, sign, isNew] of net.edges) {
      const a = L.nodes[s], b = L.nodes[t]; if (!a || !b) continue;
      const rev = seen.has(t + ">" + s); seen.add(s + ">" + t);
      const g = curve(a, b, rev ? -0.16 : 0.1);
      const path = svg("path", { class: "edge" + (isNew ? " new" : ""), d: `M${g.s.x},${g.s.y} Q${g.c.x},${g.c.y} ${g.e.x},${g.e.y}` }, edgesG);
      let head;
      if (sign > 0) head = svg("polygon", { class: "head" + (isNew ? " new" : ""), points: `${g.e.x},${g.e.y} ${g.e.x - g.dir.x * 9 - g.dir.y * 4.2},${g.e.y - g.dir.y * 9 + g.dir.x * 4.2} ${g.e.x - g.dir.x * 9 + g.dir.y * 4.2},${g.e.y - g.dir.y * 9 - g.dir.x * 4.2}` }, edgesG);
      else head = svg("line", { class: "head" + (isNew ? " new" : ""), x1: g.e.x - g.dir.y * 6.5, y1: g.e.y + g.dir.x * 6.5, x2: g.e.x + g.dir.y * 6.5, y2: g.e.y - g.dir.x * 6.5 }, edgesG);
      const hit = svg("path", { d: path.getAttribute("d"), fill: "none", stroke: "transparent", "stroke-width": 12, style: "cursor:help" }, edgesG);
      const rec = { s, t, sign, isNew, path, head, hit };
      edgeEls.push(rec);
      hit.addEventListener("mouseenter", (ev) => { path.classList.add("hot"); showEdge(rec, ev); });
      hit.addEventListener("mousemove", move); hit.addEventListener("mouseleave", () => { path.classList.remove("hot"); hide(); });
    }
    for (const n of L.order) {
      if (!have.has(n)) continue;
      const p = L.nodes[n], isNew = L.new_nodes.includes(n), r = radius(n);
      const g = svg("g", { class: "node" + (isNew ? " new" : ""), transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "aria-label": pretty(n) }, nodesG);
      if (isNew) svg("circle", { class: "ring", r: r + 5 }, g);
      svg("circle", { class: "body", r }, g);
      svg("text", { class: "mark", "text-anchor": "middle", y: 4.5 }, g);
      const t = svg("text", { "text-anchor": "middle", y: r + (isNew ? 22 : 17) }, g); t.textContent = pretty(n);
      if (isNew) { const nt = svg("text", { class: "newtag", "text-anchor": "middle", y: -r - 9 }, g); nt.textContent = "NEW"; }
      g.addEventListener("click", () => handlers.node && handlers.node(n));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlers.node && handlers.node(n); } });
      g.addEventListener("mouseenter", (ev) => { showNode(n, ev); highlight(n, true); });
      g.addEventListener("mousemove", move); g.addEventListener("mouseleave", () => { hide(); highlight(n, false); });
      nodeEls[n] = g;
    }
  }
  function highlight(n, on) { for (const e of edgeEls) if (e.s === n || e.t === n) e.path.classList.toggle("hot", on); }
  function place(ev) { const r = stage.getBoundingClientRect(); tip.style.left = Math.min(r.width - 350, Math.max(8, ev.clientX - r.left + 14)) + "px"; tip.style.top = Math.max(8, ev.clientY - r.top + 16) + "px"; }
  function move(ev) { place(ev); }
  function hide() { tip.classList.remove("show"); }
  function showNode(n, ev) {
    const info = L.nodes[n], isNew = L.new_nodes.includes(n), rule = NET(netKey).rules[n];
    let extra = "";
    if (isNew) { const recs = newEdgeRecords(n); extra = recs.length ? `<br>Added by the agent from: ${recs.map((r) => esc(r.id.replaceAll("|", " ")) + ` (${r.papers} papers)`).join("; ")}` : "<br>Added by the agent."; }
    tip.innerHTML = `<b>${esc(pretty(n))}</b>${info.name ? " · " + esc(info.name) : isNew ? " · not in the published model" : ""}<span class="mono">${esc(n)} = ${esc(rule)}</span>${extra}`;
    tip.classList.add("show"); place(ev);
  }
  function showEdge(e, ev) {
    const why = D.justifications[`${e.s}|${e.t}`]; let body;
    if (e.isNew) { const recs = newEdgeRecords(e.t); body = `<b>Added by the agent</b><br>${recs.length ? recs.map((r) => esc(r.id.replaceAll("|", " ")) + ` (${r.papers} papers)`).join("; ") : "an accepted edit"}`; }
    else body = why ? `<b>${esc(pretty(e.s))} ${e.sign > 0 ? "→" : "⊣"} ${esc(pretty(e.t))}</b><br>${esc(why)}<span class="mono">Table S2, Gupta et al. 2023</span>` : `<b>${esc(pretty(e.s))} ${e.sign > 0 ? "→" : "⊣"} ${esc(pretty(e.t))}</b>`;
    tip.innerHTML = body; tip.classList.add("show"); place(ev);
  }
  /* state: {values: Map node -> 0/1 | null, lit: css colour, clamped: {node: 0|1}, fatesPresent: Set, fatesSel: name|null, flash: node|null} */
  function paint(state) {
    const on = (n) => state.values && state.values[n] === 1;
    for (const [n, g] of Object.entries(nodeEls)) {
      g.classList.toggle("on", on(n)); g.style.setProperty("--lit", state.lit || "var(--fg)");
      const c = state.clamped && Object.prototype.hasOwnProperty.call(state.clamped, n);
      g.classList.toggle("clamp", !!c);
      g.querySelector(".mark").textContent = c ? (state.clamped[n] === 0 ? "✕" : "1") : "";
      g.querySelector(".mark").style.fill = on(n) ? "var(--bg)" : "var(--bad)";
    }
    for (const e of edgeEls) { const act = on(e.s); e.path.classList.toggle("on", act); e.head.classList.toggle("on", act); }
    for (const [k, g] of Object.entries(fateEls)) { g.classList.toggle("present", state.fatesPresent.has(k)); g.classList.toggle("sel", state.fatesSel === k); }
  }
  function flash(n) { const g = nodeEls[n]; if (!g) return; g.classList.remove("flash"); void g.getBoundingClientRect(); g.classList.add("flash"); }
  /* spotlight: nodes in `set` stay bright, the rest and every wire not between two of them recede; null clears it */
  function focus(set) {
    for (const [n, g] of Object.entries(nodeEls)) { g.classList.toggle("fdim", !!set && !set.has(n)); g.classList.toggle("spot", !!set && set.has(n)); }
    for (const e of edgeEls) { const dim = !!set && !(set.has(e.s) && set.has(e.t)); e.path.classList.toggle("fdim", dim); e.head.classList.toggle("fdim", dim); }
    svgEl.classList.toggle("focusing", !!set);
  }
  function wireFlash(s, t) {
    const e = edgeEls.find((x) => x.s === s && x.t === t); if (!e) return;
    for (const el of [e.path, e.head]) { el.classList.remove("wireflash"); void el.getBoundingClientRect(); el.classList.add("wireflash"); }
  }
  build(netKey);
  return { build, paint, flash, focus, wireFlash, edges: () => edgeEls, has: (n) => !!nodeEls[n] };
}

/* ---------------------------------------------------------------- how a rule changed: the new rule with its additions and deletions marked */
const toks = (s) => (s || "").match(/[A-Za-z_][A-Za-z0-9_]*|[()!&|01]/g) || [];
function ruleHTML(oldRule, newRule) {
  const A = toks(oldRule), B = toks(newRule), n = A.length, m = B.length, dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n || j < m) { if (i < n && j < m && A[i] === B[j]) { out.push([B[j], ""]); i++; j++; } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) { out.push([B[j], "add"]); j++; } else { out.push([A[i], "del"]); i++; } }
  let s = "", prev = "", run = "", runKind = null;
  const flush = () => { if (run) s += runKind ? `<span class="${runKind}">${run}</span>` : run; run = ""; };
  for (const [t, k] of out) {
    const sp = !s && !run || prev === "(" || prev === "!" || t === ")" ? "" : " ";
    if (k !== runKind) { flush(); s += sp; runKind = k; run = esc(t); } else run += sp + esc(t);
    prev = t;
  }
  flush();
  return s;
}

/* ---------------------------------------------------------------- rules in the browser: evaluation and forced consequences */
const compiled = {};
/* A small recursive-descent reader for bnet rules (! & | and parentheses): no eval, so it also runs under a strict CSP. */
function parseRule(expr) {
  const tokens = expr.match(/[A-Za-z_][A-Za-z0-9_]*|[()!&|01]/g) || []; let i = 0;
  const or = () => { let f = and(); while (tokens[i] === "|") { i++; const a = f, b = and(); f = (v) => (a(v) || b(v) ? 1 : 0); } return f; };
  const and = () => { let f = not(); while (tokens[i] === "&") { i++; const a = f, b = not(); f = (v) => (a(v) && b(v) ? 1 : 0); } return f; };
  const not = () => { if (tokens[i] === "!") { i++; const a = not(); return (v) => (a(v) ? 0 : 1); } return atom(); };
  const atom = () => {
    const t = tokens[i++];
    if (t === "(") { const f = or(); i++; return f; }
    if (t === "0" || t === "1") { const c = +t; return () => c; }
    return (v) => v[t];
  };
  return or();
}
function compile(net) {
  if (compiled[net]) return compiled[net];
  const out = {};
  for (const [n, expr] of Object.entries(NET(net).rules)) out[n] = { names: Array.from(new Set(expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])), fn: parseRule(expr) };
  return (compiled[net] = out);
}
function forcedSteps(net, setting) {
  const rules = compile(net), forced = { ...setting }, steps = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of L.order) {
      if (!rules[n] || n in forced) continue;
      const free = rules[n].names.filter((r) => !(r in forced) && r !== n);
      if (rules[n].names.includes(n)) continue;
      let seen = null, ok = true;
      for (let m = 0; m < 2 ** free.length && ok; m++) {
        const v = { ...forced }; free.forEach((f, i) => (v[f] = (m >> i) & 1));
        const r = rules[n].fn(v); if (seen === null) seen = r; else if (seen !== r) ok = false;
      }
      if (ok && seen !== null) { forced[n] = seen; steps.push({ node: n, value: seen, rule: NET(net).rules[n], reads: rules[n].names.filter((r) => r in forced && r !== n).map((r) => [r, forced[r]]) }); changed = true; }
    }
  }
  return steps;
}

/* ---------------------------------------------------------------- the interactive cell */
(function lab() {
  const tip = $("#tip");
  const st = { net: D.networks.augmented ? "augmented" : "published", damage: 1, perts: [], fate: null, variant: 0, timer: null };
  const net = makeNet($("#net"), tip, { node: clickNode, fate: (k) => { st.fate = k; st.variant = 0; render(); } });
  const netNames = { published: "Published model", unchecked: "Edits applied unchecked", augmented: "Verified and repaired" };
  const netNote = (k) => { const n = D.networks[k]; const added = n.nodes.length - D.networks.published.nodes.length; const fresh = n.edges.filter((e) => e[3]).length;
    return k === "published" ? `${n.nodes.length} genes, as Gupta et al. print them` : k === "unchecked" ? `${n.nodes.length} genes · every edit from ≥2 papers applied, none checked` : `${n.nodes.length} genes (+${added}) · ${fresh} new links the solver accepted`; };
  $("#netPick").replaceChildren(...Object.keys(D.networks).map((k) => {
    const b = document.createElement("button"); b.type = "button"; b.dataset.k = k; b.innerHTML = `<b>${esc(netNames[k])}</b><small>${esc(netNote(k))}</small>`;
    b.addEventListener("click", () => { st.net = k; st.perts = st.perts.filter(([n]) => D.networks[k].nodes.includes(n)); st.fate = null; net.build(k); render(); }); return b; }));
  const PRESETS = [["TUG1 knocked out", [["TUG1", 0]]], ["miR-221 forced on", [["miR221", 1]]], ["p53 knocked out", [["p53", 0]]], ["WEE1 inhibited", [["Wee1", 0]]], ["ATM inhibited", [["ATM_pH2AX", 0]]], ["Myc deleted", [["Myc", 0]]], ["ATR inhibited", [["ATR", 0]]], ["CHK1 inhibited", [["CHK1", 0]]]];
  $("#presets").replaceChildren(...PRESETS.map(([label, set]) => { const b = document.createElement("button"); b.type = "button"; b.className = "tab"; b.textContent = label; b.dataset.set = JSON.stringify(set);
    b.addEventListener("click", () => { if (!set.every(([n]) => D.networks[st.net].nodes.includes(n))) return; st.perts = set.map((x) => [...x]); st.fate = null; st.damage = 1; render(); }); return b; }));
  $("#damage").addEventListener("click", () => { st.damage = st.damage ? 0 : 1; if (!st.damage && st.perts.length > 1) st.perts = st.perts.slice(0, 1); st.fate = null; render(); });
  $("#play").addEventListener("click", play);
  window.CPLab = { apply(netKey, perts) { st.net = netKey; net.build(netKey); st.perts = perts; st.damage = 1; st.fate = null; render(); $("#model").scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); } };

  function clickNode(n) {
    if (n === "DNA_damage") { $("#damage").click(); return; }
    const i = st.perts.findIndex(([m]) => m === n);
    if (i >= 0) { if (st.perts[i][1] === 0) st.perts[i][1] = 1; else st.perts.splice(i, 1); }
    else if (st.perts.length < (st.damage ? 2 : 1)) st.perts.push([n, 0]);
    else { $("#whyNote").textContent = st.damage ? "Two genes at most: clear one first." : "Without damage only one gene can be perturbed."; return; }
    st.fate = null; render();
  }
  const key = () => st.perts.map(([n, v]) => `${n}=${v}`).sort().join(",");
  function lookup() {
    const flat = (D.lab[st.net][st.damage ? "d1" : "d0"] || {})[key()];
    if (!flat) return null;
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push({ state: flat[i], fate: fateOfCode(flat[i + 1]), g2: flat[i + 1] & 1 });
    return pts;
  }
  function render() {
    clearTimeout(st.timer);
    $$("#netPick button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === st.net)));
    $("#damage").setAttribute("aria-pressed", String(!!st.damage));
    $("#damageNote").textContent = st.damage ? "The cell has been irradiated" : "No damage: the cell just divides";
    $$("#presets .tab").forEach((b) => { const set = JSON.parse(b.dataset.set); b.style.opacity = set.every(([n]) => D.networks[st.net].nodes.includes(n)) ? 1 : 0.35; });
    $("#perts").replaceChildren(...(st.perts.length ? st.perts.map(([n, v], i) => { const s = document.createElement("span"); s.className = "pert"; s.innerHTML = `${esc(pretty(n))} ${v === 0 ? "knocked out" : "forced on"}<button type="button" aria-label="Remove ${esc(n)}">×</button>`; s.querySelector("button").addEventListener("click", () => { st.perts.splice(i, 1); st.fate = null; render(); }); return s; }) : [Object.assign(document.createElement("span"), { className: "hint", textContent: "Click a gene on the map. A second click forces it on, a third clears it." })]));
    const pts = lookup();
    const present = new Set(pts ? pts.map((p) => p.fate).filter(Boolean) : []);
    if (!st.fate || !present.has(st.fate)) st.fate = FATES.find((f) => present.has(f)) || null;
    const cards = (st.damage ? FATES.slice(1) : FATES.slice(0, 1)).map((f) => { const b = document.createElement("button"); b.type = "button"; b.className = `fate fate-${f}` + (present.has(f) ? "" : " absent"); b.setAttribute("aria-pressed", String(st.fate === f));
      const count = pts ? pts.filter((p) => p.fate === f).length : 0; b.innerHTML = `<b>${FATE_LABEL[f]}</b><small>${present.has(f) ? `${count} stable state${count > 1 ? "s" : ""}` : "not reachable"}</small>`;
      if (present.has(f)) b.addEventListener("click", () => { if (st.fate === f) st.variant = (st.variant + 1) % count; else { st.fate = f; st.variant = 0; } render(); }); return b; });
    $("#fateCards").replaceChildren(...cards);
    if (!pts || !pts.length) {
      $("#fateLine").textContent = pts ? "The solver found no stable state: with this change the network never settles." : "This combination was not precomputed. Switch DNA damage on or remove a gene.";
      net.paint({ values: null, fatesPresent: new Set(), fatesSel: null, clamped: Object.fromEntries(st.perts) });
      $("#steps").replaceChildren(); $("#whyNote").textContent = ""; return;
    }
    const total = pts.length, none = pts.filter((p) => !p.fate).length, g2 = pts.some((p) => p.g2);
    $("#fateLine").innerHTML = `The solver found <b>${total}</b> stable state${total === 1 ? "" : "s"}${none ? `, ${none} of them matching no fate` : ""}. ${st.damage ? (g2 ? "G2 arrest (CDC2/CycB off) is present." : "G2 arrest is absent.") : ""}${present.size === 1 && st.damage ? ` <b>${FATE_LABEL[[...present][0]]} is the only fate.</b>` : ""}`;
    const shown = pts.filter((p) => p.fate === st.fate)[st.variant] || pts[0];
    const values = {}; ORDER.forEach((n, i) => (values[n] = bit(shown.state, i)));
    net.paint({ values, lit: st.fate ? `var(--f-${st.fate})` : "var(--fg)", clamped: Object.fromEntries(st.perts), fatesPresent: present, fatesSel: st.fate });
    const setting = { DNA_damage: st.damage, ...Object.fromEntries(st.perts) };
    const steps = forcedSteps(st.net, setting);
    st.steps = steps;
    $("#steps").replaceChildren(...(steps.length ? steps.map((s, i) => { const d = document.createElement("div"); d.className = "step"; d.dataset.i = i; d.innerHTML = `<em>${i + 1}</em><span><b>${esc(pretty(s.node))}</b> = ${s.value} <em>because ${esc(s.node)} = ${esc(s.rule)} with ${s.reads.length ? s.reads.map(([r, v]) => esc(pretty(r)) + "=" + v).join(", ") : "nothing else"}</em></span>`; return d; }) : [Object.assign(document.createElement("div"), { className: "hint", textContent: "Nothing is forced by the input alone. The feedback loops decide." })]));
    $("#whyNote").textContent = steps.length ? `${steps.length} genes forced; the solver settles the other ${D.networks[st.net].nodes.length - steps.length - st.perts.length - 1}.` : "";
  }
  function play() {
    const rows = $$("#steps .step"); if (!rows.length) return;
    rows.forEach((r) => r.classList.remove("lit")); let i = 0;
    const next = () => { if (i > 0) rows[i - 1].classList.remove("lit"); if (i >= rows.length) return; rows[i].classList.add("lit"); rows[i].scrollIntoView({ block: "nearest" }); net.flash(st.steps[i].node); i++; st.timer = setTimeout(next, reduced ? 120 : 520); };
    next();
  }
  render();
  /* Re-check, in the browser, that every state in the solver's table is a fixed point of the rules. */
  (function selfcheck() {
    const jobs = []; for (const nk of Object.keys(D.lab)) for (const dk of ["d1", "d0"]) jobs.push([nk, dk]);
    let ok = 0, total = 0, bad = 0, j = 0;
    const next = () => {
      if (j >= jobs.length) { $("#selfcheck").textContent = `Re-checked in your browser: ${fmt(ok)} of ${fmt(total)} stable states are fixed points of the rules${bad ? ` (${bad} are not)` : ""}.`; return; }
      const [nk, dk] = jobs[j++], rules = compile(nk), table = D.lab[nk][dk];
      for (const [k, flat] of Object.entries(table)) {
        const clamp = {}; if (k) k.split(",").forEach((p) => { const [n, v] = p.split("="); clamp[n] = +v; }); clamp.DNA_damage = dk === "d1" ? 1 : 0;
        for (let i = 0; i < flat.length; i += 2) {
          const v = {}; ORDER.forEach((n, b) => (v[n] = bit(flat[i], b))); total++;
          const good = Object.entries(rules).every(([n, r]) => (n in clamp ? v[n] === clamp[n] : r.fn(v) === v[n]));
          if (good) ok++; else bad++;
        }
      }
      setTimeout(next, 0);
    };
    setTimeout(next, 400);
  })();
})();
