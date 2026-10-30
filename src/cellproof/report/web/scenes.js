/* CellProof report, part 3: the drawn scene of the bench, a culture dish, on canvas.
   It is an illustration: cells are not counted. What it shows is decided by the solver's tables, through the arguments of run():
   which fates the circuit allows, whether it settles at all, which fate the paper does not expect. */
const SW = 1000, SH = 692, TAU = Math.PI * 2;
const SCENE_TOKENS = ["fg", "fg-2", "fg-3", "line", "surface", "raised", "bg", "accent", "bad", "new", "f-arrest", "f-senescence", "f-autophagy", "f-apoptosis", "f-proliferation"];
const toRgb = (s) => {
  s = (s || "").trim();
  if (s[0] === "#") { if (s.length === 4) s = "#" + [...s.slice(1)].map((c) => c + c).join(""); return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); }
  return (s.match(/[\d.]+/g) || [128, 128, 128]).slice(0, 3).map(Number);
};
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/* a canvas drawn in a 1000 x 692 coordinate system whatever its size; colours are read from the page's tokens, so both themes work */
function sceneBase(cv) {
  const b = { ctx: cv.getContext("2d"), k: 1, dpr: 1, oy: 0, c: {}, running: false, last: 0, ready: false, tick: () => {} };
  b.read = () => { for (const n of SCENE_TOKENS) b.c[n] = toRgb(css("--" + n)); b.sans = css("--sans"); b.light = b.c.bg.reduce((a, v) => a + v, 0) / 3 > 140; if (b.ready && !b.running) b.tick(0, performance.now()); };
  b.fit = () => {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    b.dpr = Math.min(2, devicePixelRatio || 1); b.k = r.width / SW; b.oy = Math.max(0, (r.height / b.k - SH) / 2);
    const w = Math.round(r.width * b.dpr), h = Math.round(r.height * b.dpr);
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
    b.ready = true;
  };
  b.begin = () => { const c = b.ctx; c.setTransform(b.dpr * b.k, 0, 0, b.dpr * b.k, 0, 0); c.clearRect(0, 0, SW, SH * 1.3); c.translate(0, b.oy); };
  const frame = (now) => { if (!b.running) return; const dt = Math.max(0, Math.min(0.05, (now - b.last) / 1000)); b.last = now; b.tick(dt, now); requestAnimationFrame(frame); };  /* the first frame can be stamped slightly before start() ran */
  b.start = () => { b.fit(); if (b.running || !b.ready) return; b.running = true; b.last = performance.now(); requestAnimationFrame(frame); };
  b.stop = () => { b.running = false; };
  b.read(); b.fit();
  addEventListener("themechange", () => setTimeout(b.read, 30));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(b.read, 30));
  new ResizeObserver(() => { b.fit(); if (b.ready && !b.running) b.tick(0, performance.now()); }).observe(cv);
  return b;
}

/* ---------------------------------------------------------------- the culture dish */
function makeDish(cv, opt = {}) {
  const b = sceneBase(cv), ctx = b.ctx;
  const CYCLE = ["arrest", "senescence", "autophagy", "apoptosis"], GROW = { senescence: 1.32, apoptosis: 0.6 }, FREEZE = { arrest: 1, senescence: 1, apoptosis: 1 };
  const LAYOUTS = {
    single: [{ cx: 500, cy: 330, R: 232, n: 38, rc: 20, max: 56 }],
    compare: [{ cx: 262, cy: 366, R: 188, n: 24, rc: 15.5, max: 34 }, { cx: 738, cy: 366, R: 188, n: 24, rc: 15.5, max: 34 }],
  };
  let dishes = [], sig = "", plan = null, spot = null, hover = null, layout = "single";
  const color = (f) => b.c["f-" + f] || b.c["f-proliferation"];

  const cell = (d, x, y, r, born) => ({
    x, y, vx: 0, vy: 0, r, s: 1, sT: 1, a: 0, aT: 1, tint: color("proliferation").slice(), tintT: color("proliferation"), fate: null, act: null, hit: 0, rip: 0, fatedAt: 0,
    applied: false, osc: false, frozen: false, slow: false, die: 0, bled: false, gone: false, bad: false, spin: d.rnd() * TAU,
    dots: [0, 1, 2, 3].map(() => [d.rnd() * TAU, 0.42 + d.rnd() * 0.34, (d.rnd() - 0.5) * 0.7]), nextDiv: born + 2500 + d.rnd() * 9000,
  });
  const assign = (fates, n, rnd) => {
    if (!fates.length) return Array(n).fill(null);
    const out = Array.from({ length: n }, (_, i) => fates[i % fates.length]);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  function make(spec, seed, T) {
    const rnd = rng(seed), d = { ...spec, rnd, cells: [], blebs: [], debris: [], fates: spec.fates || [], osc: !!spec.osc, bad: spec.bad || [] };
    d.neutral = !d.osc && d.fates.every((f) => f === "proliferation");
    for (let i = 0, tries = 0; i < spec.n && tries < 6000; tries++) {
      const a = rnd() * TAU, dist = Math.sqrt(rnd()) * (spec.R - spec.rc * 1.6), x = spec.cx + Math.cos(a) * dist, y = spec.cy + Math.sin(a) * dist, r = spec.rc * (0.82 + rnd() * 0.36);
      if (d.cells.every((c) => Math.hypot(c.x - x, c.y - y) > (c.r + r) * 1.05)) { d.cells.push(cell(d, x, y, r, T)); i++; }
    }
    const chosen = assign(d.fates.filter((f) => f !== "proliferation"), d.cells.length, rnd);
    d.cells.forEach((c, i) => (c.fate = chosen[i]));
    return d;
  }

  /* a new dish for every experiment; the protocol is: treat (a drop and its ripple), then irradiate (a sweep) */
  function run(a) {
    if (a.sig === sig) return;
    sig = a.sig; layout = a.layout;
    const T = performance.now();
    dishes = LAYOUTS[layout].map((spec, i) => make({ ...spec, ...a.dishes[i] }, 11 + i * 29, T));
    const treated = !!a.treated && layout === "single", dmg = !!a.damage, tDrop = T + 220, tRip = tDrop + 420;
    plan = { trigger: dmg ? "sweep" : treated ? "ripple" : null, drop: treated ? { t0: tDrop, dur: 420 } : null, ripple: treated ? { t0: tRip, dur: 760 } : null, sweep: dmg ? { t0: treated ? tRip + 480 : T + 380, dur: 1150 } : null };
    if (reduced) settle();
    if (!b.running) b.tick(0, T + 1);
  }
  /* irradiate the dish that is already there: the cells stay where they are and each takes the fate it is given */
  function fire(a) {
    const T = performance.now();
    for (const d of dishes) {
      d.fates = a.fates; d.osc = !!a.osc; d.bad = a.bad || []; d.neutral = false;
      const chosen = assign(d.fates.filter((f) => f !== "proliferation"), d.cells.length, d.rnd);
      d.cells.forEach((c, i) => Object.assign(c, { fate: chosen[i], hit: 0, rip: 0, applied: false, act: null, frozen: false, slow: false, osc: false, die: 0, bled: false, bad: false }));
    }
    sig = a.sig; plan = { trigger: "sweep", drop: null, ripple: null, sweep: { t0: T + 250, dur: 1150 } };
    if (reduced) settle();
  }
  function settle() {
    const T = performance.now();
    for (const d of dishes) if (plan.trigger) {
      for (const c of d.cells) { c.hit = 1; applyFate(c, d, T); c.s = c.sT; c.tint = c.tintT.slice(); }
      d.cells = d.cells.filter((c) => !c.die);
    }
  }
  function applyFate(c, d, T) {
    c.applied = true;
    if (d.osc) { c.osc = true; return; }
    if (!c.fate) return;
    c.act = c.fate; c.tintT = color(c.fate); c.sT = GROW[c.fate] || 1; c.bad = d.bad.includes(c.fate);
    if (FREEZE[c.fate]) c.frozen = true; else c.slow = true;
    if (c.fate === "apoptosis") c.die = T;
  }
  const sweepX = (d, sw, T) => d.cx - d.R - 30 + Math.min(1, (T - sw.t0) / sw.dur) * (2 * d.R + 60);

  function update(dt, T) {
    const p = plan; if (!p) return;
    for (const d of dishes) {
      let cells = d.cells;
      if (p.ripple && T >= p.ripple.t0) {
        const rad = Math.min(1.2, (T - p.ripple.t0) / p.ripple.dur) * d.R * 1.15;
        for (const c of cells) if (!c.rip && Math.hypot(c.x - d.cx, c.y - d.cy) <= rad) { c.rip = T; if (p.trigger === "ripple" && !c.hit) { c.hit = T; c.fatedAt = T + 200 + d.rnd() * 400; } }
      }
      if (p.sweep && T >= p.sweep.t0) {
        const sx = sweepX(d, p.sweep, T);
        for (const c of cells) if (!c.hit && c.x <= sx) { c.hit = T; c.fatedAt = T + 220 + d.rnd() * 420; }
      }
      for (const c of cells) {
        if (c.hit && !c.applied && T >= c.fatedAt) applyFate(c, d, T);
        c.s += (c.sT - c.s) * (1 - Math.exp(-dt * 3.5)); c.a += (c.aT - c.a) * (1 - Math.exp(-dt * 3));
        if (c.osc) c.tintT = color(CYCLE[Math.floor(T / 620 + c.spin * 1.3) % 4]);
        const kt = 1 - Math.exp(-dt * 6); c.tint = c.tint.map((v, i) => v + (c.tintT[i] - v) * kt);
        if (c.die) {
          const age = T - c.die;
          if (age > 600 && !c.bled) { bleb(d, c, T); c.bled = true; }
          if (age > 1300) c.aT = 0;
          if (age > 1300 && c.a < 0.04) c.gone = true;
        }
        if (!c.frozen) {
          const jit = c.osc ? 3.4 : c.slow ? 0.3 : 1;
          c.vx += (d.rnd() - 0.5) * 100 * jit * Math.sqrt(dt); c.vy += (d.rnd() - 0.5) * 100 * jit * Math.sqrt(dt);
          c.vx *= Math.exp(-2.2 * dt); c.vy *= Math.exp(-2.2 * dt);
          c.x += c.vx * dt; c.y += c.vy * dt;
        }
        c.spin += dt * (c.frozen ? 0.08 : 0.5);
        const dx = c.x - d.cx, dy = c.y - d.cy, dist = Math.hypot(dx, dy), lim = d.R - c.r * c.s - 7;
        if (dist > lim) { const nx = dx / dist, ny = dy / dist, vn = c.vx * nx + c.vy * ny; c.x = d.cx + nx * lim; c.y = d.cy + ny * lim; if (vn > 0) { c.vx -= 1.8 * vn * nx; c.vy -= 1.8 * vn * ny; } }
      }
      for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], c = cells[j], dx = c.x - a.x, dy = c.y - a.y, dd = Math.hypot(dx, dy) || 0.01, min = (a.r * a.s + c.r * c.s) * 0.95;
        if (dd < min) { const nx = dx / dd, ny = dy / dd, wa = a.frozen ? 0 : c.frozen ? 1 : 0.5, wb = c.frozen ? 0 : a.frozen ? 1 : 0.5; a.x -= nx * (min - dd) * wa; a.y -= ny * (min - dd) * wa; c.x += nx * (min - dd) * wb; c.y += ny * (min - dd) * wb; }
      }
      if (d.neutral) for (const c of cells.slice()) if (T > c.nextDiv && d.cells.length < d.max && c.a > 0.9) divide(d, c, T);
      d.blebs = d.blebs.filter((q) => { if (T - q.born > q.life) return false; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.exp(-1.4 * dt); q.vy *= Math.exp(-1.4 * dt); return true; });
      if (cells.some((c) => c.gone)) {
        for (const c of cells) if (c.gone) for (let i = 0; i < 2; i++) d.debris.push({ x: c.x + (d.rnd() - 0.5) * 14, y: c.y + (d.rnd() - 0.5) * 14, r: 1.8 + d.rnd() * 1.4 });
        d.cells = cells = cells.filter((c) => !c.gone);
      }
    }
  }
  function divide(d, c, T) {
    const a = d.rnd() * TAU, n = cell(d, c.x + Math.cos(a) * c.r * 0.9, c.y + Math.sin(a) * c.r * 0.9, c.r * (0.9 + d.rnd() * 0.2), T);
    n.s = 0.5; n.a = c.a; n.nextDiv = T + 7000 + d.rnd() * 9000; c.s = 0.78; c.nextDiv = T + 7000 + d.rnd() * 9000; d.cells.push(n);
  }
  function bleb(d, c, T) {
    for (let i = 0; i < 5; i++) { const a = d.rnd() * TAU; d.blebs.push({ x: c.x + Math.cos(a) * c.r * c.s * 0.8, y: c.y + Math.sin(a) * c.r * c.s * 0.8, vx: Math.cos(a) * (14 + d.rnd() * 22), vy: Math.sin(a) * (14 + d.rnd() * 22), r: 2.4 + d.rnd() * 2.6, born: T, life: 1900 }); }
  }

  /* ---- drawing */
  function drawCell(d, c, T) {
    const C = b.c, col = c.tint, r = c.r * c.s, lt = b.light;
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, c.a));
    const g = ctx.createRadialGradient(c.x - r * 0.3, c.y - r * 0.3, r * 0.1, c.x, c.y, r);
    g.addColorStop(0, rgba(col.map((v) => v + (255 - v) * 0.3), lt ? 0.7 : 0.5)); g.addColorStop(1, rgba(col, lt ? 0.3 : 0.16));
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = (c.act === "senescence" ? 3 : 2) + (lt ? 0.5 : 0); ctx.strokeStyle = rgba(col, 0.95); ctx.stroke();
    const nr = r * 0.42, nx = c.x + Math.cos(c.spin) * r * 0.14, ny = c.y + Math.sin(c.spin) * r * 0.14;
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TAU); ctx.fillStyle = rgba(col, lt ? 0.78 : 0.6); ctx.fill();
    ctx.beginPath(); ctx.arc(nx + nr * 0.25, ny - nr * 0.2, nr * 0.34, 0, TAU); ctx.fillStyle = rgba(col.map((v) => v * 0.55), 0.75); ctx.fill();
    for (const [ang, rad, w] of c.dots) { const aa = ang + T / 4000 * w; ctx.beginPath(); ctx.arc(c.x + Math.cos(aa) * r * rad * 1.05, c.y + Math.sin(aa) * r * rad * 1.05, 1.7, 0, TAU); ctx.fillStyle = rgba(col, 0.75); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(c.x - r * 0.38, c.y - r * 0.42, r * 0.26, r * 0.14, -0.6, 0, TAU); ctx.fillStyle = "rgba(255,255,255,.22)"; ctx.fill();
    if (c.act === "arrest") { ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.26 + Math.sin(T / 380 + c.spin) * 1.6, 0, TAU); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(col, 0.5); ctx.stroke(); }
    if (c.act === "senescence") for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(c.x + Math.cos(i * 1.05 + c.spin * 0.2) * r * 0.68, c.y + Math.sin(i * 1.05 + c.spin * 0.2) * r * 0.68, 2.3, 0, TAU); ctx.fillStyle = rgba(col.map((v) => v * 0.5), 0.8); ctx.fill(); }
    if (c.act === "autophagy") for (let i = 0; i < 3; i++) { const aa = T / 900 + i * 2.1 + c.spin; ctx.beginPath(); ctx.arc(c.x + Math.cos(aa) * r * 0.58, c.y + Math.sin(aa) * r * 0.58, 3.4, 0, TAU); ctx.fillStyle = rgba(col, 0.35); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(col, 0.95); ctx.stroke(); }
    if (c.die && T - c.die > 250 && T - c.die < 900) for (let i = 0; i < 6; i++) { const aa = c.dots[i % 4][0] + i * 1.1; ctx.beginPath(); ctx.arc(c.x + Math.cos(aa) * r * 0.98, c.y + Math.sin(aa) * r * 0.98, r * 0.2, 0, TAU); ctx.fillStyle = rgba(col, 0.55); ctx.fill(); }
    const fl = c.hit || c.rip ? Math.max(0, 1 - (T - Math.max(c.hit, c.rip)) / 380) : 0;
    if (fl > 0) { ctx.beginPath(); ctx.arc(c.x, c.y, r * (1.08 + 0.5 * fl), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,255,255,${0.9 * fl})`; ctx.stroke(); }
    if (c.bad && c.applied) { ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.42, 0, TAU); ctx.setLineDash([5, 4]); ctx.lineWidth = 2.4; ctx.strokeStyle = rgba(C.bad, 0.95); ctx.stroke(); ctx.setLineDash([]); }
    if (spot && c.act === spot) { ctx.beginPath(); ctx.arc(c.x, c.y, r * (1.35 + 0.08 * Math.sin(T / 260)), 0, TAU); ctx.lineWidth = 2.6; ctx.strokeStyle = rgba(col, 0.85); ctx.stroke(); }
    if (hover === c) { ctx.beginPath(); ctx.arc(c.x, c.y, r * 1.22, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = rgba(C.fg, 0.8); ctx.stroke(); }
    ctx.restore();
  }
  function drawDish(d, T) {
    const C = b.c;
    ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R + 12, 0, TAU); ctx.fillStyle = rgba(C.fg, 0.035); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = rgba(C.fg, 0.2); ctx.stroke();
    const g = ctx.createRadialGradient(d.cx - d.R * 0.25, d.cy - d.R * 0.3, d.R * 0.1, d.cx, d.cy, d.R);
    g.addColorStop(0, rgba(C.accent, b.light ? 0.24 : 0.14)); g.addColorStop(0.65, rgba(C.accent, b.light ? 0.09 : 0.05)); g.addColorStop(1, rgba(C.fg, 0.05));
    ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(C.fg, 0.28); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = rgba(C["fg-3"], 0.5);
    for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU, l = i % 6 === 0 ? 9 : 4, r0 = d.R + 18; ctx.beginPath(); ctx.moveTo(d.cx + Math.cos(a) * r0, d.cy + Math.sin(a) * r0); ctx.lineTo(d.cx + Math.cos(a) * (r0 + l), d.cy + Math.sin(a) * (r0 + l)); ctx.stroke(); }
    ctx.lineCap = "round"; ctx.lineWidth = 6; ctx.strokeStyle = "rgba(255,255,255,.13)"; ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R - 10, -2.7, -1.95); ctx.stroke();
    ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,.07)"; ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R - 10, 0.5, 0.8); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = rgba(color("apoptosis"), b.light ? 0.8 : 0.55); for (const q of d.debris) { ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
    if (d.empty && !d.cells.length && d.debris.length) { ctx.font = `500 21px ${b.sans}`; ctx.textAlign = "center"; ctx.fillStyle = rgba(C["fg-3"], 1); ctx.fillText(d.empty, d.cx, d.cy + 7); }
    for (const c of d.cells) drawCell(d, c, T);
    for (const q of d.blebs) { const k = (T - q.born) / q.life; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 - 0.3 * k), 0, TAU); ctx.fillStyle = rgba(color("apoptosis"), 0.7 * (1 - k)); ctx.fill(); }
    if (plan && plan.sweep && T >= plan.sweep.t0 - 50 && T < plan.sweep.t0 + plan.sweep.dur + 300) {
      const sx = sweepX(d, plan.sweep, T);
      ctx.save(); ctx.beginPath(); ctx.arc(d.cx, d.cy, d.R, 0, TAU); ctx.clip();
      const lg = ctx.createLinearGradient(sx - 110, 0, sx + 6, 0); lg.addColorStop(0, rgba(C.accent, 0)); lg.addColorStop(0.8, rgba(C.accent, 0.34)); lg.addColorStop(1, "rgba(255,255,255,.9)");
      ctx.fillStyle = lg; ctx.fillRect(sx - 110, d.cy - d.R, 116, d.R * 2); ctx.restore();
    }
    if (plan && plan.ripple && T >= plan.ripple.t0 && T < plan.ripple.t0 + plan.ripple.dur + 100 && layout === "single") {
      const k = (T - plan.ripple.t0) / plan.ripple.dur; ctx.beginPath(); ctx.arc(d.cx, d.cy, k * d.R * 1.15, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = rgba(C.accent, 0.6 * (1 - k)); ctx.stroke();
    }
    if (d.title) { ctx.font = `600 22px ${b.sans}`; ctx.textAlign = "center"; ctx.fillStyle = rgba(C["fg-2"], 1); ctx.fillText(d.title, d.cx, d.cy - d.R - 30); }
  }
  /* the radiation source on the left: it fires beams across the dish while the sweep runs */
  function drawSource(d, T) {
    const C = b.c, x = d.cx - d.R - 96, hh = 74, sw = plan && plan.sweep;
    const on = sw ? Math.max(0, Math.min(1, (T - sw.t0 + 200) / 200, (sw.t0 + sw.dur + 350 - T) / 300)) : 0;
    ctx.save();
    if (on > 0) {
      ctx.lineWidth = 2.2; ctx.setLineDash([12, 9]); ctx.lineDashOffset = -T / 18; ctx.strokeStyle = rgba(C.accent, 0.7 * on);
      for (const dy of [-96, -48, 0, 48, 96]) { ctx.beginPath(); ctx.moveTo(x + 20, d.cy + dy * 0.45); ctx.lineTo(d.cx - d.R - 8, d.cy + dy); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 2; ctx.strokeStyle = rgba(C["fg-3"], 0.7); ctx.fillStyle = rgba(C.raised, 0.95);
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 20, d.cy - hh, 40, hh * 2, 12) : ctx.rect(x - 20, d.cy - hh, 40, hh * 2); ctx.fill(); ctx.stroke();
    const lens = ctx.createRadialGradient(x + 6, d.cy, 0, x + 6, d.cy, 26 + 14 * on);
    lens.addColorStop(0, `rgba(255,255,255,${0.35 + 0.65 * on})`); lens.addColorStop(0.5, rgba(C.accent, 0.35 + 0.5 * on)); lens.addColorStop(1, rgba(C.accent, 0));
    ctx.fillStyle = lens; ctx.beginPath(); ctx.arc(x + 6, d.cy, 26 + 14 * on, 0, TAU); ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(C["fg-3"], 0.6); for (const dy of [-44, 44]) { ctx.beginPath(); ctx.moveTo(x - 10, d.cy + dy); ctx.lineTo(x + 6, d.cy + dy); ctx.stroke(); }
    ctx.restore();
  }
  function drawDrop(d, T) {
    const C = b.c, dr = plan.drop; if (!dr || T < dr.t0 || T > dr.t0 + dr.dur) return;
    const k = (T - dr.t0) / dr.dur, y = d.cy - d.R - 60 + (d.R + 60) * k * k;
    ctx.save(); ctx.fillStyle = rgba(C.accent, 0.95); ctx.beginPath(); ctx.arc(d.cx, y, 8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(d.cx - 7, y - 3); ctx.lineTo(d.cx, y - 26); ctx.lineTo(d.cx + 7, y - 3); ctx.fill(); ctx.restore();
  }
  b.tick = (dt, T) => {
    update(dt, T); b.begin();
    for (const d of dishes) drawDish(d, T);
    if (layout === "single" && dishes[0]) { drawSource(dishes[0], T); if (plan) drawDrop(dishes[0], T); }
  };

  /* ---- pointer: hover names the fate of the cell, a click looks inside it */
  const pick = (ev) => {
    const r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) / b.k, y = (ev.clientY - r.top) / b.k - b.oy; let best = null;
    for (const d of dishes) for (const c of d.cells) { const dd = Math.hypot(c.x - x, c.y - y); if (dd < c.r * c.s + 6 && c.a > 0.3 && (!best || dd < best.dd)) best = { c, dd }; }
    return best && best.c;
  };
  cv.addEventListener("pointermove", (ev) => {
    const c = pick(ev); hover = c; cv.style.cursor = c ? "pointer" : "default";
    const tip = opt.tip;
    if (tip) {
      if (c) { const box = tip.parentElement.getBoundingClientRect(); tip.innerHTML = opt.label(c); tip.style.left = Math.max(8, Math.min(box.width - 270, ev.clientX - box.left + 14)) + "px"; tip.style.top = Math.max(8, ev.clientY - box.top + 16) + "px"; tip.classList.add("show"); } else tip.classList.remove("show");
    }
    if (!b.running) b.tick(0, performance.now());
  });
  cv.addEventListener("pointerleave", () => { hover = null; if (opt.tip) opt.tip.classList.remove("show"); if (!b.running) b.tick(0, performance.now()); });
  cv.addEventListener("click", (ev) => { const c = pick(ev); if (c && opt.onCell) opt.onCell(c); });

  return { run, fire, start: b.start, stop: b.stop, draw: () => b.tick(0, performance.now()), spot: (f) => { spot = f; if (!b.running) b.tick(0, performance.now()); }, cells: () => dishes.map((d) => d.cells.length) };
}
