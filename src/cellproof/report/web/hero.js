/* CellProof report, part 4: the header. A close-up of DNA in the manner of a textured render, and a four-beat story played in front of it:
   radiation breaks DNA; a damaged cell has several fates; which genes would make it die is a search through D.interventions.space.total
   changes, each one a lab experiment; the exact solver tried all of them and kept a shortlist. Everything drawn is illustration (the helix
   is not to scale, cells are not counted, the dots sit at arbitrary places); the numbers on top of it are the solver's. */

/* ---------------------------------------------------------------- the DNA */
function makeHelix(cv, opt = {}) {
  /* Two rough strands of lavender, pink and cream chunks (some of them splinters) with cream rods for the base pairs, lit warm from the
     right and soft at the near and far ends like a macro photograph. Chunks are small shaded sprites, rods are strokes, all drawn far to
     near. hit() sends a ray: the chunks and rods around the landing blow outward in orange and settle back, damage and repair as a picture. */
  const ctx = cv.getContext("2d"), rnd = rng(23), lite = !!opt.lite, F = 1100;
  const R = 92, PITCH = 330, LY = 1800, NS = lite ? 120 : 240, NB = lite ? 44 : 78, ROLL = 0.62, cr = Math.cos(ROLL), sr = Math.sin(ROLL);
  const FOG = [58, 62, 98], LEVELS = [0, 0.14, 0.3, 0.5], WARM = [255, 208, 160], BLUR = [6, 0, 0, 4], WHITE = [255, 255, 255], INK = [24, 16, 52];
  const PAL = { lav: [178, 152, 238], pink: [240, 196, 232], white: [246, 242, 252], plum: [124, 92, 200], navy: [56, 52, 112], teal: [64, 206, 194], hot: [255, 160, 70] };
  const RODS = [[250, 228, 204], [255, 204, 174], [250, 214, 228], [255, 238, 204]];
  const mixc = (a, c, k) => a.map((v, i) => v + (c[i] - v) * k), clamp01 = (x) => Math.max(0, Math.min(1, x));
  const mkSprite = (c, blur) => {
    const o = document.createElement("canvas"); o.width = o.height = 96;
    const g = o.getContext("2d"); if (blur && "filter" in g) g.filter = `blur(${blur}px)`;
    const gr = g.createRadialGradient(58, 36, 2, 48, 48, 32);
    gr.addColorStop(0, rgba(mixc(c, WHITE, 0.65), 1)); gr.addColorStop(0.45, rgba(c, 1)); gr.addColorStop(1, rgba(mixc(c, [10, 8, 40], 0.5), 1));
    g.fillStyle = gr; g.beginPath(); g.arc(48, 48, 32, 0, TAU); g.fill(); return o;
  };
  /* one sprite per colour, depth (fog and focus) and light (cool, neutral, warm) */
  const SPR = Object.fromEntries(Object.entries(PAL).map(([k, c]) => [k, LEVELS.map((lv, i) => [0, 0.5, 1].map((w) => mkSprite(mixc(mixc(c, WARM, 0.32 * w), FOG, lv), BLUR[i])))]));
  const soft = (c) => { const s = 96, o = document.createElement("canvas"); o.width = o.height = s; const g = o.getContext("2d"), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, rgba(c, 0.9)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, s, s); return o; };
  const BOKEH = [soft([190, 170, 245]), soft([255, 226, 196])];

  /* the strands: a rough, thick band of chunks, a fifth of them splinters */
  const chunks = [];
  for (let s = 0; s < 2; s++) for (let i = 0; i < NS; i++) for (let q = 0; q < (lite ? 3 : 4); q++) {
    const u = rnd(), k = u < 0.34 ? "lav" : u < 0.54 ? "pink" : u < 0.7 ? "white" : u < 0.88 ? "plum" : u < 0.95 ? "navy" : "teal", v = rnd(), spl = k !== "teal" && v < 0.16, shard = k !== "teal" && !spl && v < 0.5;
    chunks.push({ s, y: (i / (NS - 1) - 0.5) * LY + (rnd() - 0.5) * (LY / NS) * 1.6, dr: (rnd() - 0.5) * 28, da: (rnd() - 0.5) * 28, r: k === "teal" ? 3 + rnd() * 2 : 4.5 + rnd() * 7, k,
      kind: spl ? 1 : shard ? 3 : 0, pts: shard ? Array.from({ length: 5 }, (_, p) => [(p / 5) * TAU + (rnd() - 0.5) * 0.9, 0.7 + rnd() * 0.6]) : null,
      ang: rnd() * Math.PI, len: 9 + rnd() * 14, ox: rnd() * 2 - 1, oy: rnd() * 2 - 1, oz: rnd() * 2 - 1 });
  }
  /* the base pairs: two rods per rung with a gap between them, now and then a stray third */
  const rungs = Array.from({ length: NB }, (_, j) => ({ y: ((j + 0.5) / NB - 0.5) * LY, k1: RODS[Math.floor(rnd() * 4)], k2: RODS[Math.floor(rnd() * 4)], w1: 5 + rnd() * 3.5, w2: 5 + rnd() * 3.5, t1: rnd() - 0.5, t2: rnd() - 0.5,
    gap: 0.07 + rnd() * 0.1, extra: rnd() < 0.3 ? { at: 0.3 + rnd() * 0.4, dy: (rnd() - 0.5) * 50, l: 0.12 + rnd() * 0.18 } : null, ox: rnd() * 2 - 1, oy: rnd() * 2 - 1, oz: rnd() * 2 - 1 }));
  const dust = Array.from({ length: lite ? 26 : 56 }, () => ({ x: rnd(), y: rnd(), r: 1 + rnd() * 2.4, a: 0.2 + rnd() * 0.4, v: 0.004 + rnd() * 0.016, k: rnd() < 0.6 ? 0 : 1 }));
  const bokeh = Array.from({ length: lite ? 8 : 16 }, () => ({ x: rnd(), y: rnd(), r: 18 + rnd() * 54, a: 0.05 + rnd() * 0.09, v: 0.004 + rnd() * 0.012, k: rnd() < 0.5 ? 0 : 1 }));
  const pool = Array.from({ length: chunks.length + rungs.length * 3 }, () => ({ kind: 0, z: 0, x: 0, y: 0, r: 0, k: "lav", xa: 0, ang: 0, len: 0, pts: null, ax: 0, ay: 0, bx: 0, by: 0, col: null, w: 0, hot: 0 }));
  const poly = (x, y, r, ang, pts, s, ox, oy) => { ctx.beginPath(); pts.forEach(([a, m], i) => { const px = x + ox + Math.cos(ang + a) * r * m * s, py = y + oy + Math.sin(ang + a) * r * m * s; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }); ctx.closePath(); };
  const P = { x: 0, y: 0, z: 0, w: 0, xa: 0 };

  let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, S = 1, ready = false, running = false, last = 0, t = 0, yawU = 0, pitchU = 0, drag = null, shock = null;
  function fit() {
    const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return false;
    dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const wide = W >= 760; cx = wide ? W * 0.63 : W * 0.5; cy = wide ? H * 0.5 : H * 0.7; S = wide ? (H / 720) * 1.25 : Math.min(W / 520, H / 900) * 1.15; ready = true; return true;
  }
  const hit = () => { if (!reduced) shock = { t0: performance.now(), y: (rnd() - 0.5) * 300 }; };

  function draw(T, dt) {
    t += dt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const age = shock ? T - shock.t0 : 1e9, blast = age > 250 && age < 3450 ? Math.pow(Math.sin(Math.PI * ((age - 250) / 3200)), 1.4) : 0;
    yawU *= Math.exp(-dt * 0.5); if (!drag) pitchU *= Math.exp(-dt * 0.7);
    const yaw = yawU + 0.28 * Math.sin(t * 0.22), pitch = pitchU + 0.2 + 0.05 * Math.sin(t * 0.17), cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scr = (x, y, z) => {
      const xa = x * cyw + z * syw, za = -x * syw + z * cyw, yb = y * cp - za * sp, zb = y * sp + za * cp, w = F / (F + zb), px = xa * w, py = yb * w;
      P.x = cx + (px * cr - py * sr) * S; P.y = cy + (px * sr + py * cr) * S; P.z = zb; P.w = w; P.xa = xa; return P;
    };
    const near = (y) => (blast > 0 ? Math.exp(-(((y - shock.y) / 130) ** 2)) * blast : 0);

    for (const b of bokeh) { const y = (((b.y - t * b.v) % 1) + 1) % 1; ctx.globalAlpha = b.a; ctx.drawImage(BOKEH[b.k], b.x * W - b.r, y * H - b.r, b.r * 2, b.r * 2); }
    ctx.globalAlpha = 1;
    let n = 0;
    for (const c of chunks) {
      const ph = (TAU * c.y) / PITCH + t * 0.3 + c.s * Math.PI, o = near(c.y), rr = R + c.dr;
      let x = rr * Math.cos(ph) - c.da * Math.sin(ph), y = c.y, z = rr * Math.sin(ph) + c.da * Math.cos(ph);
      if (o > 0.02) { x += (Math.cos(ph) * 120 + c.ox * 80) * o; z += (Math.sin(ph) * 120 + c.oz * 80) * o; y += c.oy * 100 * o; }
      scr(x, y, z);
      const it = pool[n++]; it.kind = c.kind; it.z = P.z; it.x = P.x; it.y = P.y; it.r = c.r * P.w * S; it.k = o > 0.55 ? "hot" : c.k; it.ang = c.ang; it.len = c.len * P.w * S; it.xa = P.xa; it.pts = c.pts;
    }
    for (const g of rungs) {
      const ph = (TAU * g.y) / PITCH + t * 0.3, c0 = Math.cos(ph), s0 = Math.sin(ph), o = near(g.y);
      const pt = (f, dy) => { let x = R * c0 * f, z = R * s0 * f, y = g.y + dy; if (o > 0.02) { x += g.ox * 110 * o; z += g.oz * 110 * o; y += g.oy * 90 * o; } return scr(x, y, z); };
      const rod = (f0, d0, f1, d1, col, w) => {
        const a = pt(f0, d0), ax = a.x, ay = a.y, az = a.z, aw = a.w, axa = a.xa, b = pt(f1, d1), it = pool[n++];
        it.kind = 2; it.z = (az + b.z) / 2; it.ax = ax; it.ay = ay; it.bx = b.x; it.by = b.y; it.col = col; it.w = w * ((aw + b.w) / 2) * S; it.hot = o; it.xa = (axa + b.xa) / 2;
      };
      rod(0.94, 0, g.gap, g.t1 * 34, g.k1, g.w1); rod(-g.gap, g.t2 * 34, -0.94, 0, g.k2, g.w2);
      if (g.extra) rod(g.extra.at, g.extra.dy, g.extra.at - g.extra.l, g.extra.dy + 24, g.k1, g.w1 * 0.7);
    }
    const items = pool.slice(0, n).sort((a, b) => b.z - a.z);
    ctx.lineCap = "round";
    for (const it of items) {
      const lv = Math.max(0, Math.min(3, Math.floor(((it.z + 340) / 680) * 3.999)));
      if (it.kind === 2) {
        const lit = clamp01((it.xa + R) / (2 * R)), base = mixc(mixc(it.col, WARM, 0.3 * lit), FOG, LEVELS[lv]), c = mixc(base, PAL.hot, clamp01(it.hot * 1.3));
        ctx.lineWidth = it.w; ctx.strokeStyle = rgba(mixc(c, INK, 0.4), 1); ctx.beginPath(); ctx.moveTo(it.ax, it.ay); ctx.lineTo(it.bx, it.by); ctx.stroke();
        ctx.lineWidth = it.w * 0.46; ctx.strokeStyle = rgba(mixc(c, WHITE, 0.5), 1); ctx.stroke();
      } else if (it.kind === 1) {
        const lit = clamp01((it.xa + R) / (2 * R)), c = mixc(mixc(PAL[it.k], WARM, 0.32 * lit), FOG, LEVELS[lv]), dx = Math.cos(it.ang) * it.len, dy = Math.sin(it.ang) * it.len;
        ctx.lineWidth = it.r * 1.5; ctx.strokeStyle = rgba(mixc(c, INK, 0.3), 1); ctx.beginPath(); ctx.moveTo(it.x - dx, it.y - dy); ctx.lineTo(it.x + dx, it.y + dy); ctx.stroke();
        ctx.lineWidth = it.r * 0.6; ctx.strokeStyle = rgba(mixc(c, WHITE, 0.55), 1); ctx.stroke();
      } else if (it.kind === 3) {  /* a flat-faced shard: a dark body and a lighter facet toward the light */
        const lit = clamp01((it.xa + R) / (2 * R)), c = mixc(mixc(PAL[it.k], WARM, 0.32 * lit), FOG, LEVELS[lv]), r = it.r * 1.3;
        ctx.fillStyle = rgba(mixc(c, INK, 0.22), 1); poly(it.x, it.y, r, it.ang, it.pts, 1, 0, 0); ctx.fill();
        ctx.fillStyle = rgba(mixc(c, WHITE, 0.42), 0.92); poly(it.x, it.y, r, it.ang, it.pts, 0.58, r * 0.16, -r * 0.2); ctx.fill();
      } else {
        const wb = it.xa > 0.45 * R ? 2 : it.xa > -0.45 * R ? 1 : 0;
        ctx.drawImage(SPR[it.k][lv][wb], it.x - it.r * 1.5, it.y - it.r * 1.5, it.r * 3, it.r * 3);
      }
    }
    ctx.lineCap = "butt";
    for (const d of dust) { const y = (((d.y - t * d.v) % 1) + 1) % 1; ctx.globalAlpha = d.a; ctx.fillStyle = d.k ? "#ffe6c8" : "#cdbcf6"; ctx.beginPath(); ctx.arc(d.x * W, y * H, d.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;

    /* the ray from the upper left, then an orange glow with a ring where it lands */
    if (shock && age < 3600) {
      const s0 = scr(0, shock.y, 0), lx = s0.x, ly = s0.y, x0 = lx - 720 * S, y0 = ly - 430 * S, k = Math.min(1, age / 380);
      ctx.globalCompositeOperation = "lighter";
      if (age < 480) {
        const tail = Math.max(0, k - 0.2), xa = x0 + (lx - x0) * tail, ya = y0 + (ly - y0) * tail, xb = x0 + (lx - x0) * k, yb = y0 + (ly - y0) * k, lg = ctx.createLinearGradient(xa, ya, xb, yb);
        lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(255,255,255,.95)"); ctx.strokeStyle = lg; ctx.lineWidth = 4 * S + 1; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.lineCap = "butt";
      }
      if (age > 340) {
        const a2 = age - 340, rad = (80 + a2 * 0.14) * S, al = Math.max(0, 1 - a2 / 2600), g = ctx.createRadialGradient(lx, ly, 0, lx, ly, rad);
        g.addColorStop(0, `rgba(255,190,100,${0.75 * al})`); g.addColorStop(1, "rgba(255,120,60,0)"); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, rad, 0, TAU); ctx.fill();
        ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(255,222,176,${0.7 * al})`; ctx.beginPath(); ctx.arc(lx, ly, rad * 1.25, 0, TAU); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }

  const frame = (now) => { if (!running) return; const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; draw(now, dt); requestAnimationFrame(frame); };
  cv.style.touchAction = "pan-y"; cv.style.cursor = "grab";
  cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return;
    yawU = Math.max(-1.4, Math.min(1.4, yawU + (e.clientX - drag.x) * 0.008)); pitchU = Math.max(-0.5, Math.min(0.5, pitchU + (e.clientY - drag.y) * 0.004)); drag.x = e.clientX; drag.y = e.clientY;
    if (!running && ready) draw(performance.now(), 0);
  });
  const release = () => { drag = null; cv.style.cursor = "grab"; };
  cv.addEventListener("pointerup", release); cv.addEventListener("pointercancel", release);
  new ResizeObserver(() => { if (fit() && !running) draw(performance.now(), 0); }).observe(cv);
  fit();
  return {
    start: () => {
      fit(); if (running || !ready) return;
      if (reduced) { shock = { t0: performance.now() - 1700, y: 40 }; draw(performance.now(), 0); return; }  /* one still frame, the DNA just after the ray */
      running = true; last = performance.now(); requestAnimationFrame(frame);
    },
    stop: () => { running = false; },
    draw: () => { if (ready) draw(performance.now(), 0); },
    hit,
  };
}

/* ---------------------------------------------------------------- the story: a dish of cells, the goal, every change the solver tried, the verdict */
function makeStory(cv, opt = {}) {
  /* Beats, counted from 0: 0 is the DNA alone (this canvas stays empty); 1 a dish swept by radiation, each cell taking one of four fates;
     2 the goal: gene switches flip and every cell of a fresh dish dies; 3 a field with one dot per change of one or two genes that the
     solver tried, which then zooms out as the number of genes changed at once grows; 4 back to the field: the AI's guesses, judged,
     and the solver's scan, which dims all but the few that leave only death. The dots are one per set, in a fixed random order, so the
     positions mean nothing; the counts, the guesses' verdicts and which dots stay lit are the solver's. show(n) sets the beat,
     onCount(n) reports the number the caption should read, onStage(k) the largest number of genes changed at once being shown. */
  const ctx = cv.getContext("2d"), lite = !!opt.lite, TOTAL = opt.total || 0, KEEP = opt.keep || [], SIZES = opt.sizes || [], MARKS = opt.marks || [], CHIPS = opt.chips || [];
  const SCAN = lite ? 2100 : 2500, RAY = 380, PLAN = [0.5, 0.8, 0.45, 0.8, 0.45, 0.9], TILE = 16, TS = 12, ORDER = ["arrest", "senescence", "autophagy", "apoptosis"];
  const FATES = { arrest: [92, 158, 255], senescence: [232, 192, 72], autophagy: [58, 214, 168], apoptosis: [255, 110, 186], base: [182, 176, 224] };
  const DOTS = [[178, 152, 238], [240, 196, 232], [250, 228, 204], [246, 242, 252]].map((c) => `rgb(${c[0]},${c[1]},${c[2]})`), PEACH = [255, 170, 92], WHITE = [255, 255, 255], INK = [14, 12, 36];
  const GREEN = [88, 230, 172], RED = [255, 104, 116], BLUE = [132, 176, 255];
  const mixc = (a, c, k) => a.map((v, i) => v + (c[i] - v) * k), clamp01 = (x) => Math.max(0, Math.min(1, x));
  const soft = (c) => { const s = 96, o = document.createElement("canvas"); o.width = o.height = s; const g = o.getContext("2d"), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); gr.addColorStop(0, rgba(c, 0.95)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, s, s); return o; };
  const HALO = soft(PEACH), rb = rng(77), sans = css("--sans") || "sans-serif";
  /* a tile of dots, repeated by a pattern fill, stands for the many more sets of the zoomed-out field */
  const tile = (() => {
    const o = document.createElement("canvas"); o.width = o.height = TILE * TS; const g = o.getContext("2d"), r = rng(13);
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { g.fillStyle = DOTS[Math.floor(r() * 4)]; g.beginPath(); g.arc((x + 0.5 + (r() - 0.5) * 0.3) * TS, (y + 0.5 + (r() - 0.5) * 0.3) * TS, TS * 0.3 * (0.82 + r() * 0.36), 0, TAU); g.fill(); }  /* a little jitter, so that the haze reads as a crowd and not as graph paper */
    return o;
  })();
  const pattern = ctx.createPattern(tile, "repeat");

  let W = 0, H = 0, dpr = 1, area = { cx: 0, cy: 0, w: 0, h: 0 }, dish = { cx: 0, cy: 0, R: 0 }, grid = null;
  let ready = false, running = false, last = 0, beat = -1, prev = -1, dishA = 0, gridA = 0, sweepT = 0, chipT = 0, gridT = 0, zoomT = 0, backT = 0, backFrom = 1, aiT = 0, scanT = 0, count = -2, stage = 0;
  let cells = [], blebs = [], debris = [];

  /* ---- the dish: cells are kept in units of the dish radius, so a resize moves nothing */
  function makeCells(allDie) {
    const r = rng(5), n = lite ? 22 : 34, list = [], fates = Array.from({ length: n }, (_, i) => (allDie ? "apoptosis" : ORDER[i % 4]));
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [fates[i], fates[j]] = [fates[j], fates[i]]; }
    for (let tries = 0; list.length < n && tries < 6000; tries++) {
      const a = r() * TAU, d = Math.sqrt(r()) * 0.84, rad = (lite ? 0.125 : 0.1) * (0.84 + r() * 0.32), x = Math.cos(a) * d, y = Math.sin(a) * d;
      if (d + rad < 0.97 && list.every((c) => Math.hypot(c.x0 - x, c.y0 - y) > (c.r + rad) * 1.12)) list.push({ x0: x, y0: y, r: rad, fate: fates[list.length], ph: r() * TAU });
    }
    cells = list.map((c) => ({ ...c, x: c.x0, y: c.y0, hit: 0, fateAt: 0, act: null, die: 0, bled: false, gone: false, a: 1, s: 1, tint: FATES.base.slice(), spin: c.ph }));
    blebs = []; debris = [];
  }
  const bleb = (c, T) => { for (let i = 0; i < 5; i++) { const a = rb() * TAU; blebs.push({ x: c.x + Math.cos(a) * c.r * 0.8, y: c.y + Math.sin(a) * c.r * 0.8, vx: Math.cos(a) * (0.1 + rb() * 0.18), vy: Math.sin(a) * (0.1 + rb() * 0.18), r: 0.016 + rb() * 0.014, born: T, life: 1800 }); } };
  const crumbs = (c) => { for (let i = 0; i < 2; i++) debris.push({ x: c.x + (rb() - 0.5) * 0.05, y: c.y + (rb() - 0.5) * 0.05, r: 0.011 + rb() * 0.008 }); };
  function updateCells(dt, T) {
    const sw = sweepT && T >= sweepT ? clamp01((T - sweepT) / 1300) : -1, sx = -1.1 + 2.2 * sw;
    for (const c of cells) {
      if (sw >= 0 && !c.hit && c.x0 <= sx) { c.hit = T; c.fateAt = T + 160 + (c.ph / TAU) * 420; }
      if (c.hit && !c.act && T >= c.fateAt) { c.act = c.fate; if (c.fate === "apoptosis") c.die = T; }
      const target = FATES[c.act || "base"], k = 1 - Math.exp(-dt * 6), still = c.act === "arrest" || c.act === "senescence", amp = still ? 0.004 : 0.016;
      c.tint = c.tint.map((v, i) => v + (target[i] - v) * k);
      c.s += ((c.act === "senescence" ? 1.3 : 1) - c.s) * (1 - Math.exp(-dt * 3.5));
      c.x = c.x0 + Math.sin(T / 1700 + c.ph) * amp; c.y = c.y0 + Math.cos(T / 2100 + c.ph * 1.3) * amp; c.spin += dt * (still ? 0.1 : 0.5);
      if (c.die) { const age = T - c.die; if (age > 650 && !c.bled) { bleb(c, T); c.bled = true; } if (age > 1300) c.a = Math.max(0, c.a - dt * 2.2); if (c.a <= 0.02) { c.gone = true; crumbs(c); } }
    }
    cells = cells.filter((c) => !c.gone);
    blebs = blebs.filter((q) => { if (T - q.born > q.life) return false; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.exp(-1.4 * dt); q.vy *= Math.exp(-1.4 * dt); return true; });
  }
  function drawCell(c, T, a) {
    const { cx, cy, R } = dish, x = cx + c.x * R, y = cy + c.y * R, r = c.r * R * c.s, col = c.tint;
    ctx.globalAlpha = a * c.a;
    const g = ctx.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.08, x, y, r);
    g.addColorStop(0, rgba(mixc(col, WHITE, 0.55), 0.96)); g.addColorStop(0.5, rgba(col, 0.88)); g.addColorStop(1, rgba(mixc(col, INK, 0.5), 0.92));
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = Math.max(1.2, r * 0.07); ctx.strokeStyle = rgba(mixc(col, WHITE, 0.35), 0.85); ctx.stroke();
    const nr = r * 0.42, nx = x + Math.cos(c.spin) * r * 0.14, ny = y + Math.sin(c.spin) * r * 0.14;
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, TAU); ctx.fillStyle = rgba(mixc(col, INK, 0.35), 0.7); ctx.fill();
    ctx.beginPath(); ctx.arc(nx + nr * 0.25, ny - nr * 0.22, nr * 0.36, 0, TAU); ctx.fillStyle = rgba(mixc(col, INK, 0.6), 0.8); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.44, r * 0.28, r * 0.14, -0.6, 0, TAU); ctx.fillStyle = "rgba(255,255,255,.34)"; ctx.fill();
    if (c.act === "arrest") { ctx.beginPath(); ctx.arc(x, y, r * 1.26 + Math.sin(T / 380 + c.spin) * 1.6, 0, TAU); ctx.lineWidth = 1.8; ctx.strokeStyle = rgba(col, 0.6); ctx.stroke(); }
    if (c.act === "senescence") for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + Math.cos(i * 1.05 + c.spin * 0.2) * r * 0.68, y + Math.sin(i * 1.05 + c.spin * 0.2) * r * 0.68, Math.max(1.6, r * 0.08), 0, TAU); ctx.fillStyle = rgba(mixc(col, INK, 0.5), 0.85); ctx.fill(); }
    if (c.act === "autophagy") for (let i = 0; i < 3; i++) { const aa = T / 900 + i * 2.1 + c.spin; ctx.beginPath(); ctx.arc(x + Math.cos(aa) * r * 0.58, y + Math.sin(aa) * r * 0.58, Math.max(2, r * 0.13), 0, TAU); ctx.fillStyle = rgba(col, 0.4); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = rgba(mixc(col, WHITE, 0.4), 0.95); ctx.stroke(); }
    if (c.die && T - c.die > 250 && T - c.die < 900) for (let i = 0; i < 6; i++) { const aa = c.ph + i * 1.1; ctx.beginPath(); ctx.arc(x + Math.cos(aa) * r * 0.98, y + Math.sin(aa) * r * 0.98, r * 0.2, 0, TAU); ctx.fillStyle = rgba(col, 0.6); ctx.fill(); }
    const fl = c.hit ? Math.max(0, 1 - (T - c.hit) / 380) : 0;
    if (fl > 0) { ctx.beginPath(); ctx.arc(x, y, r * (1.08 + 0.5 * fl), 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = `rgba(255,255,255,${0.9 * fl})`; ctx.stroke(); }
  }
  /* the two gene switches of the goal beat: they appear grey, then flip (a cross for a gene switched off, ON for one forced on) */
  function drawChips(T, a) {
    if (!CHIPS.length || !chipT) return;
    const { cx, cy, R } = dish, h = Math.max(28, Math.min(46, R * 0.2)), fs = Math.round(h * 0.46), pad = h * 0.5, gap = h * 0.7, y = cy - R - h * 1.05;
    ctx.save(); ctx.font = `600 ${fs}px ${sans}`; ctx.textBaseline = "middle";
    const marks = CHIPS.map((c) => (c.off ? "✕" : "ON")), widths = CHIPS.map((c, i) => ctx.measureText(c.name).width + ctx.measureText(marks[i]).width + pad * 3.2);
    let x = cx - (widths.reduce((s, w) => s + w, 0) + gap * (CHIPS.length - 1)) / 2;
    CHIPS.forEach((c, i) => {
      const w = widths[i], appear = clamp01((T - chipT - i * 160) / 420), flip = clamp01((T - chipT - 1150 - i * 260) / 360), pop = flip > 0 && flip < 1 ? 1 + 0.12 * Math.sin(flip * Math.PI) : 1;
      const col = c.off ? FATES.apoptosis : PEACH, mid = x + w / 2;
      ctx.globalAlpha = a * appear; ctx.save(); ctx.translate(mid, y); ctx.scale(pop, pop); ctx.translate(-mid, -y);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y - h / 2, w, h, h / 2) : ctx.rect(x, y - h / 2, w, h);
      ctx.fillStyle = rgba(mixc([255, 255, 255], col, flip), 0.1 + 0.3 * flip); ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(mixc([255, 255, 255], col, flip), 0.5 + 0.45 * flip); ctx.stroke();
      ctx.fillStyle = rgba(WHITE, 0.95); ctx.textAlign = "left"; ctx.fillText(c.name, x + pad, y + 1);
      ctx.fillStyle = rgba(mixc([200, 196, 230], mixc(col, WHITE, 0.35), flip), 0.55 + 0.45 * flip); ctx.textAlign = "right"; ctx.fillText(marks[i], x + w - pad, y + 1);
      ctx.restore(); x += w + gap;
    });
    ctx.restore();
  }
  function drawDish(T, a) {
    const { cx, cy, R } = dish;
    ctx.save(); ctx.globalAlpha = a;
    let g = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.26); g.addColorStop(0, "rgba(176,160,255,.22)"); g.addColorStop(1, "rgba(176,160,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.26, 0, TAU); ctx.fill();
    g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R); g.addColorStop(0, "rgba(214,206,255,.24)"); g.addColorStop(0.7, "rgba(120,108,196,.15)"); g.addColorStop(1, "rgba(255,255,255,.17)");
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.34)"; ctx.stroke();
    ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.beginPath(); ctx.arc(cx, cy, R + 9, 0, TAU); ctx.stroke();
    ctx.lineCap = "round"; ctx.lineWidth = Math.max(4, R * 0.03); ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.beginPath(); ctx.arc(cx, cy, R - 12, -2.75, -1.95); ctx.stroke();
    ctx.lineWidth = Math.max(3, R * 0.02); ctx.strokeStyle = "rgba(255,230,200,.14)"; ctx.beginPath(); ctx.arc(cx, cy, R - 12, 0.45, 0.85); ctx.stroke(); ctx.lineCap = "butt";
    ctx.fillStyle = rgba(FATES.apoptosis, 0.55); for (const q of debris) { ctx.beginPath(); ctx.arc(cx + q.x * R, cy + q.y * R, Math.max(1.4, q.r * R), 0, TAU); ctx.fill(); }
    for (const c of cells) drawCell(c, T, a);
    ctx.globalAlpha = a;
    for (const q of blebs) { const k = (T - q.born) / q.life; ctx.beginPath(); ctx.arc(cx + q.x * R, cy + q.y * R, Math.max(1, q.r * R * (1 - 0.3 * k)), 0, TAU); ctx.fillStyle = rgba(FATES.apoptosis, 0.7 * (1 - k)); ctx.fill(); }
    if (sweepT && T >= sweepT - RAY && T < sweepT) {  /* the same ray as on the DNA, from the upper left, landing on the edge of the dish */
      const k = (T - (sweepT - RAY)) / RAY, x0 = cx - R * 2.1, y0 = cy - R * 1.5, x1 = cx - R * 1.02, y1 = cy - R * 0.25, tail = Math.max(0, k - 0.22);
      const xa = x0 + (x1 - x0) * tail, ya = y0 + (y1 - y0) * tail, xb = x0 + (x1 - x0) * k, yb = y0 + (y1 - y0) * k, lg = ctx.createLinearGradient(xa, ya, xb, yb);
      lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(1, "rgba(255,255,255,.95)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = lg; ctx.lineWidth = Math.max(3, R * 0.016); ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); ctx.restore();
    }
    if (sweepT && T >= sweepT - 50 && T < sweepT + 1600) {
      const sx = cx + (-1.1 + 2.2 * clamp01((T - sweepT) / 1300)) * R, lg = ctx.createLinearGradient(sx - R * 0.5, 0, sx + 6, 0);
      lg.addColorStop(0, "rgba(255,200,150,0)"); lg.addColorStop(0.8, "rgba(255,200,150,.34)"); lg.addColorStop(1, "rgba(255,255,255,.92)");
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip(); ctx.fillStyle = lg; ctx.fillRect(sx - R * 0.5, cy - R, R * 0.5 + 6, R * 2); ctx.restore();
    }
    ctx.restore();
    drawChips(T, a);
  }

  /* ---- the field: one dot per change the solver tried; the positions are arbitrary, the count and the verdicts are real */
  function buildGrid() {
    if (!TOTAL) { grid = null; return; }
    const A = area, aspect = A.w / A.h, cols = Math.max(10, Math.round(Math.sqrt(TOTAL * aspect))), rows = Math.ceil(TOTAL / cols), step = Math.min(A.w / cols, A.h / rows);
    const gw = cols * step, gh = rows * step, x0 = A.cx - gw / 2, y0 = A.cy - gh / 2, r = rng(91), dots = [];
    for (let i = 0; i < TOTAL; i++) {
      const c = i % cols, rr = Math.floor(i / cols);
      dots.push({ x: x0 + (c + 0.5) * step, y: y0 + (rr + 0.5) * step, fx: (c + 0.5) / cols, ord: Math.hypot((c + 0.5) / cols - 0.5, ((rr + 0.5) / rows - 0.5) * (gh / gw)), k: Math.floor(r() * 4), rv: 0.82 + r() * 0.36, keep: false, ph: r() * TAU });
    }
    const far = Math.max(...dots.map((d) => d.ord)) || 1; for (const d of dots) d.ord /= far;
    /* the i-th set tried sits in slot perm[i]: a fixed shuffle, so that nothing in the layout is a hint */
    const perm = Array.from({ length: TOTAL }, (_, i) => i), q = rng(53);
    for (let i = TOTAL - 1; i > 0; i--) { const j = Math.floor(q() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const keepers = KEEP.filter((i) => i < TOTAL).map((i) => dots[perm[i]]); for (const d of keepers) d.keep = true;
    const marks = MARKS.filter((m) => m.i < TOTAL).map((m, n) => ({ d: dots[perm[m.i]], w: m.w, m: m.m, n }));
    grid = { dots, keepers, marks, step, x0, y0, gw, gh };
  }
  /* how far the field is zoomed out: its count grows through the stages, in logarithmic steps, and its scale falls with the square root */
  function zoomN(T) {
    const n = SIZES.slice(1);
    if (n.length < 4 || !zoomT || T < zoomT) return TOTAL;
    let t = (T - zoomT) / 1000;
    for (let i = 0; i < PLAN.length; i++) {
      if (t < PLAN[i]) return i % 2 === 0 ? n[i / 2] : Math.exp(Math.log(n[(i - 1) / 2]) + (Math.log(n[(i + 1) / 2]) - Math.log(n[(i - 1) / 2])) * smooth(t / PLAN[i]));
      t -= PLAN[i];
    }
    return n[3];
  }
  const scaleAt = (T) => (beat === 3 ? Math.sqrt(TOTAL / zoomN(T)) : beat === 4 && backT ? backFrom + (1 - backFrom) * smooth((T - backT) / 900) : 1);
  function drawHaze(T, a, s) {
    const g = grid, spacing = Math.max(g.step * s, 1.8), k = spacing / TS, heat = SIZES.length > 4 ? clamp01(Math.log(zoomN(T) / TOTAL) / Math.log(SIZES[4] / TOTAL)) : 0;
    ctx.save(); ctx.beginPath(); ctx.rect(g.x0, g.y0, g.gw, g.gh); ctx.clip();
    if (heat > 0) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = rgba(PEACH, 0.2 * heat * a); ctx.fillRect(g.x0, g.y0, g.gw, g.gh); ctx.globalCompositeOperation = "source-over"; }
    ctx.translate(area.cx, area.cy); ctx.scale(k, k); ctx.globalAlpha = a * smooth((1 - s) / 0.2) * 0.9; ctx.fillStyle = pattern; ctx.fillRect(-g.gw / 2 / k, -g.gh / 2 / k, g.gw / k, g.gh / k);
    ctx.restore();
  }
  function drawGrid(T, a) {
    const g = grid; if (!g) return;
    const s = scaleAt(T), p = scanT ? (T - scanT) / SCAN : -1, rad = g.step * 0.3, aiP = beat === 4 && aiT ? T - aiT : -1;
    let appeared = 0, left = 0;
    if (s < 0.999) drawHaze(T, a, s);
    ctx.save(); ctx.translate(area.cx, area.cy); ctx.scale(s, s); ctx.translate(-area.cx, -area.cy);
    for (const d of g.dots) {
      const ap = clamp01((T - gridT - 250 - d.ord * 1050) / 280);
      if (ap <= 0) continue;
      appeared++;
      const rejected = !d.keep && p >= 0 && d.fx <= p, q = p >= 0 ? clamp01(((p - d.fx) * SCAN) / 420) : 0;  /* p runs past 1 so that the last column finishes dimming too */
      if (!rejected) left++;
      if (d.keep) continue;  /* the few that stay are drawn after the rest, on top */
      const e = smooth(q);
      ctx.globalAlpha = a * ap * (1 - 0.9 * e) * 0.86; ctx.fillStyle = DOTS[d.k]; ctx.beginPath(); ctx.arc(d.x, d.y, rad * d.rv * (0.5 + 0.5 * ap) * (1 - 0.5 * e), 0, TAU); ctx.fill();
    }
    for (const d of g.keepers) {
      const ap = clamp01((T - gridT - 250 - d.ord * 1050) / 280); if (ap <= 0) continue;
      const q = p >= 0 ? clamp01(((p - d.fx) * SCAN) / 420) : 0, e = smooth(q), pulse = e * (0.5 + 0.5 * Math.sin(T / 320 + d.ph));
      if (e > 0) {
        const hs = g.step * (2.4 + 2.2 * e + 0.5 * pulse);
        ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * e * (0.7 + 0.3 * pulse); ctx.drawImage(HALO, d.x - hs, d.y - hs, hs * 2, hs * 2); ctx.globalCompositeOperation = "source-over";
      }
      ctx.globalAlpha = a * ap; ctx.fillStyle = e > 0.02 ? rgba(mixc(PEACH, WHITE, 0.55 * e), 1) : DOTS[d.k]; ctx.beginPath(); ctx.arc(d.x, d.y, rad * d.rv * (1 + 1.4 * e), 0, TAU); ctx.fill();
      if (e > 0) { ctx.globalAlpha = a * e * 0.7; ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(mixc(PEACH, WHITE, 0.4), 1); ctx.beginPath(); ctx.arc(d.x, d.y, g.step * (1.5 + 0.4 * pulse), 0, TAU); ctx.stroke(); }
    }
    /* the AI's guesses, one after another: a blue ring, then the solver's verdict (green ring if it leaves only death, a red cross if not); the scan wipes the wrong ones */
    const gap = Math.min(lite ? 70 : 55, 1800 / Math.max(1, g.marks.length));
    for (const m of g.marks) {
      const t0 = aiP - m.n * gap; if (t0 < 0) continue;
      const verdict = smooth((t0 - 380) / 260), dim = m.d.keep || p < 0 ? 1 : 1 - clamp01(((p - m.d.fx) * SCAN) / 420), x = m.d.x, y = m.d.y, r0 = g.step * (1.15 + 0.5 * (1 - smooth(t0 / 260)));
      ctx.globalAlpha = a * dim * clamp01(t0 / 120); ctx.lineWidth = Math.max(1.4, g.step * 0.16);
      ctx.strokeStyle = rgba(mixc(BLUE, m.w ? GREEN : RED, verdict), 1); ctx.beginPath(); ctx.arc(x, y, r0, 0, TAU); ctx.stroke();
      if (verdict > 0 && !m.w) { const c = r0 * 0.42; ctx.globalAlpha *= verdict; ctx.beginPath(); ctx.moveTo(x - c, y - c); ctx.lineTo(x + c, y + c); ctx.moveTo(x + c, y - c); ctx.lineTo(x - c, y + c); ctx.stroke(); }
    }
    ctx.restore();
    if (s < 0.999) {  /* the field we started with, shrinking into a speck: the 1,058 are only this much of what grows */
      const w = g.gw * s, h = g.gh * s, e = clamp01((1 - s) / 0.15);
      ctx.save(); ctx.globalAlpha = a * e; ctx.fillStyle = rgba(mixc(PEACH, WHITE, 0.6), 0.35); ctx.fillRect(area.cx - w / 2, area.cy - h / 2, w, h); ctx.lineWidth = 1.6; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.strokeRect(area.cx - w / 2, area.cy - h / 2, w, h);
      if (s < 0.5 && opt.fmt) { ctx.font = `600 ${lite ? 12 : 14}px ${sans}`; ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.fillText(opt.fmt(TOTAL), area.cx, area.cy + h / 2 + (lite ? 16 : 20)); }
      ctx.restore();
    }
    if (p > -0.02 && p < 1.12) {
      const sx = g.x0 + clamp01(p) * g.gw, fade = clamp01(Math.min((p + 0.02) * 12, (1.12 - p) * 8)), lg = ctx.createLinearGradient(sx - g.gw * 0.14, 0, sx + 3, 0);
      lg.addColorStop(0, "rgba(120,220,255,0)"); lg.addColorStop(0.85, "rgba(120,220,255,.2)"); lg.addColorStop(1, "rgba(220,250,255,.95)");
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a * fade; ctx.fillStyle = lg; ctx.fillRect(sx - g.gw * 0.14, g.y0 - g.step, g.gw * 0.14 + 3, g.gh + g.step * 2); ctx.restore();
    }
    const n = zoomN(T), c = beat === 3 ? (zoomT && T >= zoomT ? Math.round(n) : appeared) : beat === 4 ? left : -1;
    if (c !== count) { count = c; if (opt.onCount) opt.onCount(c); }
    if (beat === 3) { const k = n >= SIZES[4] * 0.9999 ? 5 : n >= SIZES[3] * 0.9999 ? 4 : n >= SIZES[2] * 0.9999 ? 3 : 2; if (k !== stage) { stage = k; if (opt.onStage) opt.onStage(k); } }
  }

  function fit() {
    const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return false;
    dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const wide = W >= 760, h = wide ? Math.min(H * 0.72, 600) : H * 0.66;
    area = wide ? { cx: W * 0.69, cy: H * 0.52, w: Math.min(W * 0.46, h * 1.25), h } : { cx: W * 0.5, cy: H * 0.59, w: W * 0.92, h };
    const R = (Math.min(area.w, area.h) / 2) * 0.9; dish = { cx: area.cx, cy: area.cy + R * 0.12, R }; buildGrid(); ready = true; return true;
  }
  function draw(T, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const k = 1 - Math.exp(-dt * 5); dishA += (((beat === 1 || beat === 2) ? 1 : 0) - dishA) * k; gridA += ((beat >= 3 ? 1 : 0) - gridA) * k;
    if (dishA > 0.01) { updateCells(dt, T); drawDish(T, dishA); }
    if (gridA > 0.01) drawGrid(T, gridA);
  }
  /* the beat's own start: a new dish (and its sweep), the switches, the dots appearing, the zoom, the guesses, the scan. `instant` shows the end of the beat at once. */
  function show(n, instant) {
    const T = performance.now(); prev = beat; beat = n; count = -2; stage = 0;
    if (n === 1 || n === 2) {
      makeCells(n === 2); sweepT = instant ? 0 : T + (n === 2 ? 2300 : 700); chipT = n === 2 ? (instant ? T - 5000 : T + 250) : 0;
      if (instant) { for (const c of cells) { c.hit = 1; c.act = c.fate; c.s = c.fate === "senescence" ? 1.3 : 1; c.tint = FATES[c.fate].slice(); if (c.fate === "apoptosis") { c.gone = true; crumbs(c); } } cells = cells.filter((c) => !c.gone); }
    } else { sweepT = 0; chipT = 0; }
    if (n >= 3) {
      if (n === 3 || prev < 3) gridT = instant || n === 4 ? T - 6000 : T;
      zoomT = n === 3 ? (instant ? T - 20000 : T + 1700) : 0;
      backFrom = n === 4 && prev === 3 ? Math.sqrt(TOTAL / (SIZES[4] || TOTAL)) : 1; backT = n === 4 && !instant && prev === 3 ? T : 0;
      aiT = n === 4 ? (instant ? T - 20000 : T + 1100) : 0; scanT = n === 4 ? (instant ? T - 1e5 : T + 3500) : 0;
    } else { gridT = 0; zoomT = 0; backT = 0; aiT = 0; scanT = 0; }
    if (instant) { dishA = n === 1 || n === 2 ? 1 : 0; gridA = n >= 3 ? 1 : 0; if (ready) draw(T, 0); }
  }
  const frame = (now) => { if (!running) return; const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now; draw(now, dt); requestAnimationFrame(frame); };
  new ResizeObserver(() => { if (fit() && !running) draw(performance.now(), 0); }).observe(cv);
  fit(); makeCells(false);
  return {
    show,
    start: () => { fit(); if (running || !ready) return; if (reduced) { draw(performance.now(), 0); return; } running = true; last = performance.now(); requestAnimationFrame(frame); },
    stop: () => { running = false; },
  };
}
