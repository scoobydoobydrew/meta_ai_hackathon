/* CellProof report, part 2b: the cell as a pathway poster. It draws the network of makeNet in the manner of such posters: a purple cell whose
   membrane takes the radiation, gene pills with their names inside, golden arrows that switch on and teal bars that switch off. The
   layout is the notebook's, squeezed to leave room for the membrane above and the fates below; the cell and its membrane are decoration.
   Same interface as makeNet (build, paint, flash, focus, wireFlash, edges, has), plus relabel() for the language of the fate pills. */
function makePoster(svgEl, tip, handlers = {}, initial = "A") {
  const stage = svgEl.parentElement, YO = 106, YK = 0.835, FY = 656, half = {};
  let netKey = initial, edgeEls = [], nodeEls = {}, fateEls = {};
  const pos = (n) => ({ x: L.nodes[n].x, y: YO + (L.nodes[n].y - 46) * YK });
  const labelOf = (n) => (n === "DNA_damage" ? "DNA damage" : pretty(n));
  const mctx = document.createElement("canvas").getContext("2d");
  const fateName = (k) => (handlers.fateLabel ? handlers.fateLabel(k) : FATE_LABEL[k]);

  /* ---- the picture behind the genes */
  const defs = svg("defs", {}, svgEl);
  const lin = (id, a, b) => { const g = svg("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs); svg("stop", { offset: 0, style: `stop-color:${a}` }, g); svg("stop", { offset: 1, style: `stop-color:${b}` }, g); };
  const rad = (id, a, b, attrs, oa = 1, ob = 1) => { const g = svg("radialGradient", { id, ...attrs }, defs); svg("stop", { offset: 0, style: `stop-color:${a};stop-opacity:${oa}` }, g); svg("stop", { offset: 1, style: `stop-color:${b};stop-opacity:${ob}` }, g); };
  const MOD = { input: ["#fff0a8", "#ee9f1e"], sensing: ["#ffc774", "#cf6f12"], p53: ["#f78fe4", "#a02d98"], cycle: ["#8ae890", "#2c9650"], survival: ["#86b8ff", "#2c5fc8"], death: ["#ff8da0", "#b51c4c"] };
  for (const [g, [a, b]] of Object.entries(MOD)) { lin("pzg-" + g, a, b); lin("pzo-" + g, `color-mix(in srgb, ${a} 34%, var(--pz-off-1))`, `color-mix(in srgb, ${b} 34%, var(--pz-off-2))`); }
  lin("pzoff", "var(--pz-off-1)", "var(--pz-off-2)"); lin("pzgloss", "rgba(255,255,255,.7)", "rgba(255,255,255,0)");
  rad("pzcell", "var(--pz-cell-1)", "var(--pz-cell-2)", { cx: 0.5, cy: 0.4, r: 0.78 }); rad("pznuc", "var(--pz-nuc)", "var(--pz-nuc)", { cx: 0.5, cy: 0.5, r: 0.5 }, 0.34, 0);
  rad("pzmem", "var(--pz-mem-1)", "var(--pz-mem-2)", { cx: 0.35, cy: 0.3, r: 0.8 });
  const bg = svg("g", {}, svgEl);
  svg("rect", { class: "pz-cell", x: 6, y: 12, width: 988, height: 684, rx: 52, fill: "url(#pzcell)" }, bg);
  svg("ellipse", { cx: 500, cy: 380, rx: 456, ry: 256, fill: "url(#pznuc)" }, bg);
  const regions = svg("g", {}, svgEl);
  for (const [g, x, y, w, hh] of L.halos) svg("rect", { class: `pz-region g-${g}`, x, y: YO + (y - 46) * YK, width: w, height: hh * YK, rx: 26 }, regions);
  const mem = svg("g", { class: "pz-mem" }, svgEl);
  let tails = "";
  for (let i = 0; i < 66; i++) { const x = 14 + i * 14.9; svg("circle", { cx: x, cy: 25, r: 6.4 }, mem); svg("circle", { cx: x, cy: 49, r: 6.4 }, mem); tails += `M${x - 2.2},31 L${x - 2.2},43 M${x + 2.2},31 L${x + 2.2},43 `; }
  svg("path", { d: tails }, mem);
  const bolts = svg("g", { class: "pz-bolts" }, svgEl);
  for (const x0 of [380, 500, 620]) {
    const dx = (500 - x0) / 5; let pts = `${x0},12`;
    for (let i = 1; i <= 5; i++) pts += ` ${x0 + dx * i + (i % 2 ? -11 : 9) * (i < 5)},${12 + i * 15.6}`;
    svg("polyline", { points: pts }, bolts);
  }
  const linksG = svg("g", {}, svgEl), edgesG = svg("g", {}, svgEl), nodesG = svg("g", {}, svgEl), fatesG = svg("g", {}, svgEl);
  for (const [k, f] of Object.entries(L.fates)) {
    const g = svg("g", { class: `pz-fate fate-${k}`, transform: `translate(${f.x},${FY})` }, fatesG);
    svg("rect", { x: -66, y: -17, width: 132, height: 34, rx: 17 }, g); svg("text", { y: 5 }, g).textContent = fateName(k);
    g.addEventListener("click", () => handlers.fate && handlers.fate(k)); fateEls[k] = g;
  }

  /* ---- wires: curves that leave and enter a pill at its edge */
  const bound = (n, ux, uy) => { const [hw, hh] = half[n], tx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : 1e9, ty = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : 1e9; return Math.min(tx, ty); };
  function curve(s, t, k) {
    const a = pos(s), b = pos(t), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const c = { x: (a.x + b.x) / 2 + nx * len * k, y: (a.y + b.y) / 2 + ny * len * k };
    const x0 = c.x - a.x, y0 = c.y - a.y, l0 = Math.hypot(x0, y0) || 1, x1 = b.x - c.x, y1 = b.y - c.y, l1 = Math.hypot(x1, y1) || 1;
    const o0 = bound(s, x0 / l0, y0 / l0) + 4, o1 = bound(t, x1 / l1, y1 / l1) + 5;
    return { s: { x: a.x + (x0 / l0) * o0, y: a.y + (y0 / l0) * o0 }, e: { x: b.x - (x1 / l1) * o1, y: b.y - (y1 / l1) * o1 }, c, dir: { x: x1 / l1, y: y1 / l1 } };
  }
  function build(key) {
    netKey = key; edgesG.replaceChildren(); nodesG.replaceChildren(); linksG.replaceChildren(); edgeEls = []; nodeEls = {};
    const net = NET(key), have = new Set(net.nodes), seen = new Set();
    mctx.font = `600 13.5px ${css("--sans")}`;
    for (const n of net.nodes) if (L.nodes[n] && !half[n]) half[n] = [Math.max(24, mctx.measureText(labelOf(n)).width / 2 + 12 + (n === "DNA_damage" ? 14 : 0)), 14];
    for (const [s, t, sign, isNew] of net.edges) {
      if (!L.nodes[s] || !L.nodes[t]) continue;
      const rev = seen.has(t + ">" + s); seen.add(s + ">" + t);
      const g = curve(s, t, rev ? -0.16 : 0.1), tone = sign > 0 ? "sa" : "si";
      const path = svg("path", { class: `pz-edge ${tone}${isNew ? " new" : ""}`, d: `M${g.s.x},${g.s.y} Q${g.c.x},${g.c.y} ${g.e.x},${g.e.y}` }, edgesG);
      const head = sign > 0
        ? svg("polygon", { class: `pz-head ${tone}${isNew ? " new" : ""}`, points: `${g.e.x},${g.e.y} ${g.e.x - g.dir.x * 11 - g.dir.y * 5},${g.e.y - g.dir.y * 11 + g.dir.x * 5} ${g.e.x - g.dir.x * 11 + g.dir.y * 5},${g.e.y - g.dir.y * 11 - g.dir.x * 5}` }, edgesG)
        : svg("line", { class: `pz-head ${tone}${isNew ? " new" : ""}`, x1: g.e.x - g.dir.y * 7.5, y1: g.e.y + g.dir.x * 7.5, x2: g.e.x + g.dir.y * 7.5, y2: g.e.y - g.dir.x * 7.5 }, edgesG);
      const hit = svg("path", { d: path.getAttribute("d"), fill: "none", stroke: "transparent", "stroke-width": 12, style: "cursor:help" }, edgesG);
      const rec = { s, t, sign, isNew, path, head, hit };
      edgeEls.push(rec);
      hit.addEventListener("mouseenter", (ev) => { path.classList.add("hot"); showEdge(rec, ev); });
      hit.addEventListener("mousemove", place); hit.addEventListener("mouseleave", () => { path.classList.remove("hot"); hide(); });
    }
    for (const [k, f] of Object.entries(L.fates)) for (const n of f.defined_by) if (have.has(n)) { const p = pos(n); svg("path", { class: `pz-flink fate-${k}`, d: `M${p.x},${p.y + 14} Q${(p.x + f.x) / 2},${(p.y + FY) / 2 + 26} ${f.x},${FY - 18}` }, linksG); }
    for (const n of L.order) {
      if (!have.has(n)) continue;
      const p = pos(n), isNew = L.new_nodes.includes(n), [hw, hh] = half[n];
      const g = svg("g", { class: `pz-node g-${L.nodes[n].group}${isNew ? " new" : ""}${n === "DNA_damage" ? " input" : ""}`, transform: `translate(${p.x},${p.y})`, tabindex: 0, role: "button", "aria-label": labelOf(n) }, nodesG);
      svg("rect", { class: "pz-body", x: -hw, y: -hh, width: hw * 2, height: hh * 2, rx: hh }, g);
      svg("rect", { class: "pz-gloss", x: -hw + 3, y: -hh + 2, width: hw * 2 - 6, height: hh - 1, rx: hh / 2 }, g);
      if (n === "DNA_damage") { const x0 = -hw + 14; svg("path", { class: "pz-helix", d: `M${x0 - 5},-8 C${x0 + 8},-3 ${x0 - 8},3 ${x0 + 5},8 M${x0 + 5},-8 C${x0 - 8},-3 ${x0 + 8},3 ${x0 - 5},8` }, g); }
      svg("text", { class: "pz-label", "text-anchor": "middle", x: n === "DNA_damage" ? 9 : 0, y: 4.6 }, g).textContent = labelOf(n);
      svg("circle", { class: "pz-badge", cx: hw - 2, cy: -hh + 1, r: 8 }, g); svg("text", { class: "pz-mark", "text-anchor": "middle", x: hw - 2, y: -hh + 4.6 }, g);
      if (isNew) svg("text", { class: "pz-newtag", "text-anchor": "middle", y: -hh - 5 }, g).textContent = "NEW";
      g.addEventListener("click", () => handlers.node && handlers.node(n));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlers.node && handlers.node(n); } });
      g.addEventListener("mouseenter", (ev) => { showNode(n, ev); highlight(n, true); });
      g.addEventListener("mousemove", place); g.addEventListener("mouseleave", () => { hide(); highlight(n, false); });
      nodeEls[n] = g;
    }
  }
  const highlight = (n, on) => { for (const e of edgeEls) if (e.s === n || e.t === n) e.path.classList.toggle("hot", on); };
  function place(ev) { const r = stage.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(r.width - 350, ev.clientX - r.left + 14)) + "px"; tip.style.top = Math.max(8, ev.clientY - r.top + 16) + "px"; }
  const hide = () => tip.classList.remove("show");
  function showNode(n, ev) {
    const isNew = L.new_nodes.includes(n), recs = isNew ? newEdgeRecords(n) : [];
    tip.innerHTML = `<b>${esc(labelOf(n))}</b>${L.nodes[n].name ? " · " + esc(L.nodes[n].name) : isNew ? " · not in the published model" : ""}<span class="mono">${esc(n)} = ${esc(NET(netKey).rules[n])}</span>${isNew ? `<br>Added by the agent${recs.length ? " from: " + recs.map((r) => esc(r.id.replaceAll("|", " ")) + ` (${r.papers} papers)`).join("; ") : "."}` : ""}`;
    tip.classList.add("show"); place(ev);
  }
  function showEdge(e, ev) {
    const why = D.justifications[`${e.s}|${e.t}`], name = `${esc(pretty(e.s))} ${e.sign > 0 ? "→" : "⊣"} ${esc(pretty(e.t))}`;
    if (e.isNew) { const recs = newEdgeRecords(e.t); tip.innerHTML = `<b>Added by the agent</b><br>${recs.length ? recs.map((r) => esc(r.id.replaceAll("|", " ")) + ` (${r.papers} papers)`).join("; ") : "an accepted edit"}`; }
    else tip.innerHTML = why ? `<b>${name}</b><br>${esc(why)}<span class="mono">Table S2, Gupta et al. 2023</span>` : `<b>${name}</b>`;
    tip.classList.add("show"); place(ev);
  }

  /* state: {values: node -> 0/1 | null, lit: css colour, clamped: {node: 0|1}, fatesPresent: Set, fatesSel: name|null} */
  function paint(state) {
    const on = (n) => state.values && state.values[n] === 1;
    for (const [n, g] of Object.entries(nodeEls)) {
      g.classList.toggle("on", on(n)); g.style.setProperty("--lit", state.lit || "var(--fg)");
      const c = state.clamped && Object.prototype.hasOwnProperty.call(state.clamped, n);
      g.classList.toggle("clamp", !!c); g.querySelector(".pz-mark").textContent = c ? (state.clamped[n] === 0 ? "✕" : "1") : "";
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
  const relabel = () => { for (const [k, g] of Object.entries(fateEls)) g.querySelector("text").textContent = fateName(k); };
  build(netKey);
  return { build, paint, flash, focus, wireFlash, relabel, edges: () => edgeEls, has: (n) => !!nodeEls[n] };
}
