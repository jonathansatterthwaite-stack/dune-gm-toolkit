// Galaxy map — a full-screen three.js map of the Known Universe with in-map panels.
// Units are light-years. The galactic core is at the origin; Sol sits in an outer spur.
(function () {
  const G = window.GM, P = window.Planets, GD = window.DUNE_GALAXY;
  const { esc, uid, clamp } = G;
  const HAS_THREE = typeof window.THREE !== "undefined";
  // on the player display (js/cast.js) the map has no controls: it follows what the GM picks in Lore
  const CAST = G.tool === "display";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const rnd = () => Math.floor(Math.random() * 1e9);
  const SOL = [-26000, 18, 0];
  const GAL_R = 50000;
  const BUBBLE_VIEW = 950;
  const GALAXY_LIMIT = 22000;
  const LABEL_LIMIT = 2200; // closer than this, individual system names appear // camera distance beyond which individual systems give way to the galaxy view
  const fmt = (n) => (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1));

  // ---------- state ----------
  function seedGalaxy() {
    const systems = [], planets = [];
    GD.SYSTEMS.forEach((s) => {
      const real = s.dist !== undefined;
      const sys = { id: uid(), name: s.star, spec: s.spec, real, ra: s.ra, dec: s.dec, dist: s.dist, pos: real ? GD.fromRaDec(s.ra, s.dec, s.dist) : s.pos.slice(), lore: s.lore, notes: "" };
      systems.push(sys);
      s.planets.forEach(([name, orbit, type, allegiance, notes, tweak]) => {
        planets.push({ id: uid(), systemId: sys.id, name, orbit, allegiance, notes, seed: rnd(), type, look: Object.assign(clone(P.TYPES[type].look), tweak || {}) });
      });
    });
    return { systems, planets };
  }
  const seeded = seedGalaxy();
  G.ensure("galaxy", { systems: seeded.systems, planets: seeded.planets, selSystem: "", selPlanet: "", customTypes: [], labels: true, grid: true, newTypeName: "", migrated: false });
  const GX = () => G.S.galaxy;
  const sysById = (id) => GX().systems.find((s) => s.id === id);
  const planetById = (id) => GX().planets.find((p) => p.id === id);
  const planetsOf = (sid) => GX().planets.filter((p) => p.systemId === sid);
  const worldPos = (s) => [SOL[0] + s.pos[0], SOL[1] + s.pos[1], SOL[2] + s.pos[2]];
  const distSol = (s) => Math.hypot(s.pos[0], s.pos[1], s.pos[2]);
  const distBetween = (a, b) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]);
  const planetLabel = (p) => `${p.name}${p.orbit && !p.name.endsWith(" " + p.orbit) ? ` (${p.orbit})` : ""}`;

  // ---------- solar-system layout ----------
  // Orbit numerals from lore (Arrakis III, Wallach IX) set each world's slot; slot → distance follows the
  // Titius–Bode pattern (III ≈ 1 AU). Empty slots are filled with deterministic "uncharted" worlds.
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const romanN = (o) => { const i = ROMAN.indexOf(String(o || "").trim().toUpperCase()); return i >= 0 ? i + 1 : 0; };
  function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const bodeAU = (n) => (n <= 1 ? 0.4 : 0.4 + 0.3 * Math.pow(2, n - 2));
  const STAR_MASS = { O: 20, B: 6, A: 2, F: 1.3, G: 1, K: 0.75, M: 0.4 };
  const STAR_RAD = { O: 7, B: 5.5, A: 4.6, F: 4, G: 3.4, K: 2.8, M: 2.2 };
  const starCls = (s) => String(s.spec || "G").charAt(0).toUpperCase();
  const orbitR = (au) => 12 + 26 * Math.sqrt(au); // compressed for display
  // Luminosity class (V dwarf … I supergiant) scales mass and drawn size: Canopus (F0 II) is a heavy, bright giant.
  const lumClass = (s) => { const m = String(s.spec || "").match(/(Ia|Ib|I|II|III|IV|V)/); return m ? m[1] : "V"; };
  const LUM_MASS = { Ia: 12, Ib: 9, I: 9, II: 5, III: 2.5, IV: 1.3, V: 1 };
  const starMass = (s) => (STAR_MASS[starCls(s)] || 1) * (LUM_MASS[lumClass(s)] || 1);
  const starRadius = (s) => (STAR_RAD[starCls(s)] || 3.4) * Math.min(1.7, Math.sqrt(LUM_MASS[lumClass(s)] || 1));
  const yearOf = (au, s) => Math.sqrt((au * au * au) / starMass(s));
  const yearText = (y) => (y < 1 ? `${Math.round(y * 365)} days` : `${y.toFixed(y < 10 ? 2 : 1)} years`);
  const HABITABLE = ["garden", "ocean", "forest", "jungle", "savanna", "desert", "storm", "toxic", "industrial", "ice"];
  function fillerType(au, r) {
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    if (au < 0.5) return pick(["volcanic", "barren", "barren"]);
    if (au < 1.4) return pick(["barren", "toxic", "desert", "storm", "savanna"]);
    if (au < 3.2) return pick(["barren", "desert", "ice", "toxic"]);
    if (au < 14) return pick(["gas", "gas", "icegiant"]);
    return pick(["icegiant", "ice", "barren"]);
  }
  function systemLayout(sys) {
    const r = rng(hashStr(sys.id));
    // fixed draws first, so adding or charting worlds never reshuffles the rest of the system
    let count = 3 + Math.floor(r() * 5);
    const slotRand = Array.from({ length: 12 }, () => [r(), r(), r(), r()]);
    const beltRoll = r();
    const slots = new Map();
    const free = (k) => k >= 1 && k <= 12 && !slots.has(k);
    const place = (pl, want) => {
      let n = want;
      if (!free(n)) for (let d = 1; d < 12; d++) { if (free(want + d)) { n = want + d; break; } if (free(want - d)) { n = want - d; break; } }
      if (free(n)) slots.set(n, pl);
    };
    const real = planetsOf(sys.id);
    real.filter((pl) => romanN(pl.orbit)).forEach((pl) => place(pl, romanN(pl.orbit)));
    real.filter((pl) => !romanN(pl.orbit)).forEach((pl) => place(pl, pl.type === "gas" || pl.type === "icegiant" ? 5 : HABITABLE.includes(pl.type) ? 3 : 2));
    count = Math.max(count, 1, ...slots.keys());
    const bodies = [];
    for (let n = 1; n <= count; n++) {
      const sr = slotRand[n - 1];
      let planet = slots.get(n), virtual = false;
      if (!planet) {
        const rr = rng(Math.floor(sr[0] * 4294967295));
        const type = fillerType(bodeAU(n), rr), look = clone(P.TYPES[type].look);
        if (type === "gas" || type === "icegiant") { look.moons = Math.floor(rr() * 4); look.rings = look.rings || rr() < 0.3; }
        planet = { id: `virt:${sys.id}:${n}`, systemId: sys.id, name: `${sys.name} ${ROMAN[n - 1]}`, orbit: ROMAN[n - 1], allegiance: "", notes: "", seed: Math.floor(sr[1] * 1e9), type, look, virtual: true };
        virtual = true;
      }
      const au = planet.au > 0 ? planet.au : bodeAU(n);
      bodies.push({ id: planet.id, planet, n, au, R: orbitR(au), virtual, incl: (sr[2] - 0.5) * 0.08, node: sr[0] * Math.PI * 2, phase: sr[3] * Math.PI * 2 });
    }
    const belt = count >= 5 && beltRoll < 0.6 ? orbitR((bodeAU(4) + bodeAU(5)) / 2) : 0;
    return { bodies, belt, count };
  }
  const layoutKey = (s) => JSON.stringify([s.name, s.spec, planetsOf(s.id).map((pl) => [pl.id, pl.name, pl.orbit, pl.au, pl.type])]);
  function anyPlanet(id) {
    if (!id) return null;
    if (!id.startsWith("virt:")) return planetById(id);
    if (E.sys) { const b = E.sys.bodies.find((x) => x.id === id); if (b) return b.planet; }
    const s = sysById(id.split(":")[1]);
    const b = s && systemLayout(s).bodies.find((x) => x.id === id);
    return b ? b.planet : null;
  }

  // One-time migration from the earlier Starmap tab.
  (function migrate() {
    const gx = GX(), old = G.S.starmap;
    if (gx.migrated || !old) { gx.migrated = true; return; }
    (old.customTypes || []).forEach((t) => gx.customTypes.push(t));
    (old.planets || []).forEach((op) => {
      const match = gx.planets.find((p) => p.name.toLowerCase() === (op.name || "").toLowerCase());
      if (match) Object.assign(match, { look: op.look, seed: op.seed, type: op.type, notes: op.notes || match.notes, allegiance: op.allegiance || match.allegiance });
      else {
        const a = Math.random() * Math.PI * 2, r = 150 + Math.random() * 450;
        const sys = { id: uid(), name: op.designation ? op.designation.replace(/\s+[IVX]+$/, "") : op.name, spec: "G5 V", real: false, pos: [Math.round(Math.cos(a) * r), Math.round((Math.random() - 0.5) * 120), Math.round(Math.sin(a) * r)], lore: "Charted on the old starmap.", notes: "" };
        gx.systems.push(sys);
        gx.planets.push({ id: uid(), systemId: sys.id, name: op.name, orbit: "", allegiance: op.allegiance || "", notes: op.notes || "", seed: op.seed || rnd(), type: op.type || "garden", look: op.look });
      }
    });
    delete G.S.starmap;
    gx.migrated = true;
    G.save();
  })();

  // One-time patch: Arrakis has two moons in the novels.
  (function patchMoons() {
    const gx = GX(); if (gx.moonPatch) return;
    const a = gx.planets.find((pl) => pl.name === "Arrakis");
    if (a && !a.look.moons) a.look.moons = 2;
    gx.moonPatch = true;
  })();

  function typeList() {
    return Object.keys(P.TYPES).map((k) => ({ key: k, name: P.TYPES[k].name, desc: P.TYPES[k].desc, look: P.TYPES[k].look, custom: false }))
      .concat(GX().customTypes.map((c) => ({ key: "custom:" + c.id, name: c.name, desc: "Your type", look: c.look, custom: true, id: c.id })));
  }
  function typeLook(key) {
    if (key && key.startsWith("custom:")) { const c = GX().customTypes.find((x) => "custom:" + x.id === key); if (c) return c.look; }
    return (P.TYPES[key] || P.TYPES.garden).look;
  }
  const typeName = (key) => (typeList().find((t) => t.key === key) || { name: "Custom" }).name;

  // ---------- DOM shell (lives outside #main so app re-renders don't touch the canvas) ----------
  const root = document.createElement("div");
  root.id = "galaxy"; root.className = "gx"; root.hidden = true;
  root.innerHTML = `
    <div class="gx-canvas" id="gxCanvas"></div>
    <div class="gx-labels" id="gxLabels"></div>
    <div class="gx-labels" id="gxSysLabels" hidden></div>
    <div class="gx-top">
      <div class="gx-brand"><span class="gx-mark">◈</span><div><b>Known Universe</b><small id="gxCrumb">Imperial survey of charted worlds</small></div></div>
      <div class="gx-search"><input id="gxSearch" type="search" placeholder="Search systems and worlds…" autocomplete="off"/><div class="gx-results" id="gxResults"></div></div>
      <div class="gx-tools">
        <button class="gx-btn" data-act="gxView" data-v="galaxy" title="Whole galaxy">Galaxy</button>
        <button class="gx-btn" data-act="gxView" data-v="imperium" title="The Imperium around Sol">Imperium</button>
        <span class="gx-toggles" id="gxToggles"></span>
        <button class="gx-btn" data-act="gxAddSystem">+ System</button>
        <button class="gx-btn" data-act="gxCast" id="gxCastBtn" title="Put the galaxy map on the player display; it follows what you pick here">Show to players</button>
        <button class="gx-btn" data-act="gxFull" title="Toggle browser full screen">⛶</button>
        <button class="gx-btn gx-exit" data-act="gxExit">Exit map ✕</button>
      </div>
    </div>
    <aside class="gx-panel gx-left" id="gxLeft" hidden>
      <div class="gx-viewer" id="gxViewer"><div class="gx-busy" id="gxBusy">Charting surface…</div></div>
      <div class="gx-caption" id="gxCaption"></div>
    </aside>
    <aside class="gx-panel gx-right" id="gxRight" hidden></aside>
    <div class="gx-bottom"><span id="gxScale"></span><span class="gx-time" id="gxTime" hidden></span><span class="gx-hint" id="gxHint">Drag to orbit · right-drag to pan · scroll to zoom · click a star · double-click to open its system</span></div>
    <div class="gx-tip" id="gxTip" hidden></div>
    <div class="gx-castcap" id="gxCastCap"></div>`;
  document.body.appendChild(root);
  const $ = (id) => document.getElementById(id);

  // ---------- main scene ----------
  const E = { ready: false, failed: null, active: false, raf: 0, view: { theta: 1.9, phi: 0.9, r: 78000 }, goal: null, idle: 0, sprites: new Map(), hover: "", mouse: null, introDone: false };

  const STAR_VS = `attribute float size; attribute vec3 color; uniform float scale; uniform float maxPx; uniform float fadePx;
    varying vec3 vC; varying float vA;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = max(-mv.z, 0.0001); float px = size * scale / d;
      vA = clamp(px * 2.2, 0.0, 1.0) * (1.0 - smoothstep(fadePx, fadePx * 3.0, px)); gl_PointSize = clamp(px, 1.0, maxPx); vC = color; gl_Position = projectionMatrix * mv; }`;
  const STAR_FS = `uniform float bright; varying vec3 vC; varying float vA;
    void main(){ vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c, c) * 14.0); gl_FragColor = vec4(vC * a * vA * bright, 1.0); }`;

  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function starPoints(n, gen, uniforms) {
    const T = THREE, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
    for (let i = 0; i < n; i++) { const s = gen(i); pos.set(s.p, i * 3); col.set(s.c, i * 3); size[i] = s.s; }
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.BufferAttribute(pos, 3));
    g.setAttribute("color", new T.BufferAttribute(col, 3));
    g.setAttribute("size", new T.BufferAttribute(size, 1));
    const m = new T.ShaderMaterial({ uniforms: Object.assign({ scale: { value: 800 }, maxPx: { value: 14 }, fadePx: { value: 7 }, bright: { value: 1 } }, uniforms), vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthTest: false, depthWrite: false, blending: T.AdditiveBlending });
    const pts = new T.Points(g, m);
    pts.frustumCulled = false;
    E.scene.add(pts);
    return pts;
  }

  function buildGalaxy() {
    const ARMS = 4, b = 1 / Math.tan(12.5 * Math.PI / 180), r0 = 3000;
    const solAng = Math.atan2(SOL[2], SOL[0]);
    const theta0 = solAng - b * Math.log(26000 / r0) + 0.42; // main arms run either side of Sol
    const warm = [1.0, 0.8, 0.55], cool = [0.62, 0.74, 1.0], pink = [1.0, 0.45, 0.65];
    const mixc = (a, c, t) => [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t, a[2] + (c[2] - a[2]) * t];
    const armPoint = (th0, rMin, rMax, spread) => {
      let r; do { r = rMin - Math.log(1 - Math.random() * 0.999) * 11000; } while (r > rMax);
      const th = th0 + b * Math.log(r / r0) + gauss() * spread;
      const off = gauss() * (700 + r * 0.035);
      const x = Math.cos(th) * (r + off), z = Math.sin(th) * (r + off);
      const y = gauss() * (160 + 900 * Math.exp(-r / 5000));
      const hii = Math.random() < 0.035;
      const t = clamp((r - 4000) / 14000, 0, 1);
      const c = hii ? pink : mixc(warm, cool, t);
      const k = (hii ? 0.5 : 0.17) * (0.6 + Math.random() * 0.6);
      return { p: [x, y, z], c: [c[0] * k, c[1] * k, c[2] * k], s: hii ? 190 : 85 + Math.random() * 50 };
    };
    // arms
    starPoints(150000, (i) => armPoint(theta0 + (i % ARMS) * (Math.PI / 2), r0, GAL_R, 0.13), { bright: { value: 1.35 } });
    // the local spur through Sol (thinner, shorter)
    starPoints(18000, () => armPoint(solAng - b * Math.log(26000 / r0), 19000, 34000, 0.06), { bright: { value: 0.9 } });
    // diffuse disc
    starPoints(40000, () => {
      const r = -Math.log(1 - Math.random() * 0.995) * 9000, th = Math.random() * Math.PI * 2;
      const t = clamp(r / 16000, 0, 1), c = mixc(warm, [0.8, 0.82, 0.9], t), k = 0.09;
      return { p: [Math.cos(th) * r, gauss() * (220 + 700 * Math.exp(-r / 6000)), Math.sin(th) * r], c: [c[0] * k, c[1] * k, c[2] * k], s: 110 };
    }, { bright: { value: 1 } });
    // bulge + bar
    const barAng = 0.45;
    starPoints(36000, () => {
      let x = gauss() * 3800 * 1.7, z = gauss() * 3800 * 0.75, y = gauss() * 1400;
      const ca = Math.cos(barAng), sa = Math.sin(barAng);
      const k = 0.16 * (0.6 + Math.random() * 0.5);
      return { p: [x * ca - z * sa, y, x * sa + z * ca], c: [warm[0] * k, warm[1] * k * 0.95, warm[2] * k * 0.8], s: 130 };
    }, { bright: { value: 1 } });
    // core glow
    const T = THREE, cg = document.createElement("canvas"); cg.width = cg.height = 256;
    const ctx = cg.getContext("2d"), grd = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,226,170,1)"); grd.addColorStop(0.25, "rgba(255,190,120,0.45)"); grd.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 256, 256);
    const core = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cg), blending: T.AdditiveBlending, depthTest: false, depthWrite: false, opacity: 0.55 }));
    core.scale.set(26000, 26000, 1);
    E.scene.add(core);
    // local neighbourhood stars around Sol (so the Imperium isn't empty up close)
    const tints = [[1, 1, 1], [0.78, 0.86, 1], [1, 0.9, 0.72], [1, 0.76, 0.55], [1, 0.62, 0.45]];
    E.local = starPoints(14000, () => {
      const t = tints[Math.floor(Math.random() * tints.length)], k = 0.5 + Math.random() * 0.5;
      return { p: [SOL[0] + gauss() * 1100, SOL[1] + gauss() * 280, SOL[2] + gauss() * 1100], c: [t[0] * k, t[1] * k, t[2] * k], s: 2.2 + Math.random() * 2 };
    }, { maxPx: { value: 3 }, fadePx: { value: 1000 }, bright: { value: 1 } });
    // distant sky
    const sky = new T.BufferGeometry(), sp = new Float32Array(4000 * 3);
    for (let i = 0; i < 4000; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); sp.set([s * Math.cos(th) * 900000, u * 900000, s * Math.sin(th) * 900000], i * 3); }
    sky.setAttribute("position", new T.BufferAttribute(sp, 3));
    const skyPts = new T.Points(sky, new T.PointsMaterial({ size: 1, sizeAttenuation: false, color: 0x8890a8, depthTest: false, depthWrite: false, transparent: true, opacity: 0.6 }));
    E.skyGeo = sky; E.skyMat = skyPts.material;
    skyPts.frustumCulled = false;
    E.scene.add(skyPts);
  }

  function glowTexture(ring) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const ctx = c.getContext("2d");
    if (ring) {
      ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2; [0, 1, 2, 3].forEach((q) => { const a = q * Math.PI / 2; ctx.beginPath(); ctx.moveTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58); ctx.lineTo(64 + Math.cos(a) * 66, 64 + Math.sin(a) * 66); ctx.stroke(); });
    } else {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, "rgba(255,255,255,0.9)"); g.addColorStop(0.4, "rgba(255,255,255,0.25)"); g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  function init() {
    if (E.ready || E.failed) return E.ready;
    if (!HAS_THREE) { E.failed = "three.js didn't load (js/vendor/three.min.js)."; return false; }
    const T = THREE;
    try { E.renderer = new T.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true }); }
    catch (e) { E.failed = "WebGL isn't available in this browser."; return false; }
    E.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    E.scene = new T.Scene();
    E.scene.background = new T.Color(0x020308);
    E.camera = new T.PerspectiveCamera(55, 1, 0.05, 3000000);
    E.target = new T.Vector3(0, 0, 0);
    buildGalaxy();
    E.glow = glowTexture(false);
    E.sel = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(true), color: 0xf0a050, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true }));
    E.sel.scale.set(0.05, 0.05, 1); E.sel.renderOrder = 10; E.sel.visible = false; E.scene.add(E.sel);
    E.imperium = new T.Sprite(new T.SpriteMaterial({ map: E.glow, color: 0xffb060, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, blending: T.AdditiveBlending }));
    E.imperium.position.set(...SOL); E.imperium.scale.set(0.045, 0.045, 1); E.scene.add(E.imperium);
    E.grid = new T.GridHelper(1, 20, 0x8a6a3a, 0x4a3a24);
    E.grid.material.transparent = true; E.grid.material.depthWrite = false; E.grid.material.opacity = 0.35;
    E.scene.add(E.grid);
    E.drops = new T.LineSegments(new T.BufferGeometry(), new T.LineBasicMaterial({ color: 0x9a7848, transparent: true, opacity: 0.45, depthWrite: false }));
    E.drops.frustumCulled = false; E.scene.add(E.drops);
    E.route = new T.Line(new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(new Float32Array(6), 3)), new T.LineDashedMaterial({ color: 0xf0a050, dashSize: 4, gapSize: 3, depthTest: false, transparent: true }));
    E.route.frustumCulled = false; E.route.visible = false; E.scene.add(E.route);
    $("gxCanvas").appendChild(E.renderer.domElement);
    bindPointer(E.renderer.domElement);
    new ResizeObserver(resize).observe($("gxCanvas"));
    resize();
    E.ready = true;
    return true;
  }

  function resize() {
    if (!E.renderer) return;
    const box = $("gxCanvas"), w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    E.renderer.setSize(w, h);
    E.camera.aspect = w / h; E.camera.updateProjectionMatrix();
    E.scale = h / (2 * Math.tan((E.camera.fov * Math.PI) / 360));
  }

  // Systems as sprites + HTML labels.
  function syncSystems() {
    if (!E.ready) return;
    const gx = GX(), T = THREE, ids = new Set(gx.systems.map((s) => s.id));
    for (const [id, rec] of E.sprites) if (!ids.has(id)) { E.scene.remove(rec.sprite); rec.sprite.material.dispose(); rec.label.remove(); E.sprites.delete(id); }
    gx.systems.forEach((s) => {
      let rec = E.sprites.get(s.id);
      if (!rec) {
        const sprite = new T.Sprite(new T.SpriteMaterial({ map: E.glow, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, blending: T.AdditiveBlending }));
        sprite.renderOrder = 5; E.scene.add(sprite);
        const label = document.createElement("button"); label.className = "gx-label"; label.dataset.act = "gxSelect"; label.dataset.id = s.id;
        $("gxLabels").appendChild(label);
        rec = { sprite, label }; E.sprites.set(s.id, rec);
      }
      rec.sprite.position.set(...worldPos(s));
      rec.sprite.material.color.set(GD.specColor(s.spec));
      const pl = planetsOf(s.id);
      rec.wch = undefined;
      rec.label.innerHTML = `<b>${esc(s.name)}</b>${pl.length ? `<span>${pl.map((p) => esc(p.name)).join(" · ")}</span>` : ""}`;
      rec.label.classList.toggle("on", s.id === gx.selSystem);
    });
    const n = gx.systems.length;
    E.drops.geometry.setAttribute("position", new T.BufferAttribute(new Float32Array(n * 6), 3));
    if (!E.galLabels) {
      E.galLabels = [["Galactic Core", [0, 0, 0], ""], ["The Imperium", SOL, "gxView"]].map(([text, p, act]) => {
        const el = document.createElement("button"); el.className = "gx-label gx-label-big"; el.innerHTML = `<b>${text}</b>`;
        if (act) { el.dataset.act = act; el.dataset.v = "imperium"; } else el.disabled = true;
        $("gxLabels").appendChild(el); return { el, p };
      });
    }
  }

  // ---------- camera ----------
  const solV = () => new THREE.Vector3(...SOL);
  // Timed, eased flight; the view radius never drops below the remaining distance, so the destination stays in frame.
  function flyTo(target, r) {
    const dist = E.target.distanceTo(target);
    const dur = clamp(0.9 + Math.log10(1 + dist + Math.abs(Math.log(r / E.view.r)) * 50) * 0.35, 0.9, 2.6);
    E.goal = { from: E.target.clone(), target: target.clone(), fromR: E.view.r, r, t: 0, dur };
  }
  function focusSystem(s) { flyTo(new THREE.Vector3(...worldPos(s)), 28); }
  function viewGalaxy() { flyTo(new THREE.Vector3(0, 0, 0), 78000); }
  function viewImperium() { flyTo(solV(), BUBBLE_VIEW); }

  function bindPointer(el) {
    const pts = new Map();
    let moved = 0, pinch = 0;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); moved = 0; E.idle = 0; hideResults(); });
    el.addEventListener("pointermove", (e) => {
      E.mouse = { x: e.clientX, y: e.clientY };
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy); E.idle = 0;
      if (pts.size === 2) {
        const [a, c] = [...pts.values()], d = Math.hypot(a.x - c.x, a.y - c.y);
        if (pinch) { E.view.r = clamp(E.view.r * (pinch / d), 1.5, 250000); E.goal = null; }
        pinch = d; return;
      }
      if (moved < 3) return;
      if (E.goal) E.goal = null;
      if (p.b === 2 || p.shift) {
        E.follow = null;
        const right = new THREE.Vector3().setFromMatrixColumn(E.camera.matrix, 0), up = new THREE.Vector3().setFromMatrixColumn(E.camera.matrix, 1);
        const k = E.view.r * 0.0013;
        E.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      } else {
        E.view.theta -= dx * 0.005;
        E.view.phi = clamp(E.view.phi - dy * 0.005, 0.05, Math.PI - 0.05);
      }
    });
    const up = (e) => {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      if (p && moved < 6 && !pts.size && e.type === "pointerup") click(e);
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", () => { E.mouse = null; });
    el.addEventListener("dblclick", (e) => {
      if (E.mode === "system") { if (!nearestBody(e.clientX, e.clientY, 22)) { E.follow = null; flyTo(new THREE.Vector3(), E.sys.overR); } return; }
      const s = nearestSystem(e.clientX, e.clientY, 18);
      if (s) { GX().selSystem = s.id; GX().selPlanet = (planetsOf(s.id)[0] || {}).id || ""; enterSystem(s.id); R(); }
    });
    el.addEventListener("wheel", (e) => {
      e.preventDefault(); E.idle = 0;
      const f = Math.exp(e.deltaY * 0.0012);
      if (E.goal) { E.goal.r = clamp(E.goal.r * f, 1.5, 250000); } else E.view.r = clamp(E.view.r * f, 1.5, 250000);
    }, { passive: false });
  }

  // Nearest system to a screen point (within px), using projected positions.
  function nearestSystem(cx, cy, px) {
    if (E.view.r > GALAXY_LIMIT) return null;
    const rect = E.renderer.domElement.getBoundingClientRect(), v = new THREE.Vector3();
    let best = null, bd = px;
    GX().systems.forEach((s) => {
      v.set(...worldPos(s)).project(E.camera);
      if (v.z > 1) return;
      const x = rect.left + ((v.x + 1) / 2) * rect.width, y = rect.top + ((1 - v.y) / 2) * rect.height;
      const d = Math.hypot(x - cx, y - cy);
      if (d < bd) { bd = d; best = s; }
    });
    return best;
  }
  function click(e) {
    if (E.mode === "system") { clickSystem(e); return; }
    const s = nearestSystem(e.clientX, e.clientY, 18);
    if (s) { select(s.id); return; }
    if (E.view.r > GALAXY_LIMIT) {
      const v = solV().project(E.camera), rect = E.renderer.domElement.getBoundingClientRect();
      if (Math.hypot(rect.left + ((v.x + 1) / 2) * rect.width - e.clientX, rect.top + ((1 - v.y) / 2) * rect.height - e.clientY) < 30) viewImperium();
    }
  }

  function select(sysId, planetId) {
    const gx = GX();
    gx.selSystem = sysId || "";
    const pl = sysId ? planetsOf(sysId) : [];
    gx.selPlanet = planetId || (pl[0] ? pl[0].id : "");
    if (sysId) focusSystem(sysById(sysId));
    G.save(); G.render();
  }

  // ---------- frame loop ----------
  const tmp = { v: null };
  function frame() {
    if (!E.active) { E.raf = 0; return; }
    E.raf = requestAnimationFrame(frame);
    const now = performance.now(), raw = (now - (E.last || now)) / 1000, dt = Math.min(0.05, raw); E.last = now;
    E.idle += dt;
    const gx = GX(), V = E.view;
    if (E.mode === "system") sysUpdate(raw);
    if (E.goal) {
      const g = E.goal;
      g.t = Math.min(1, g.t + Math.min(0.25, raw) / g.dur);
      const e = g.t < 0.5 ? 4 * g.t * g.t * g.t : 1 - Math.pow(-2 * g.t + 2, 3) / 2;
      E.target.lerpVectors(g.from, g.target, e);
      const logR = Math.log(g.fromR) + (Math.log(g.r) - Math.log(g.fromR)) * e;
      V.r = Math.max(Math.exp(logR), E.target.distanceTo(g.target) * 1.15);
      if (g.t >= 1) { V.r = g.r; E.goal = null; }
    }
    if (CAST) V.theta += dt * (E.mode === "system" ? 0.025 : V.r > GALAXY_LIMIT ? 0.012 : gx.selSystem ? 0.04 : 0.02);  // a slow orbit, always
    else if (E.idle > 6 && !gx.selSystem) V.theta += dt * (V.r > GALAXY_LIMIT ? 0.012 : 0.02);
    const t = E.target;
    E.camera.position.set(t.x + V.r * Math.sin(V.phi) * Math.sin(V.theta), t.y + V.r * Math.cos(V.phi), t.z + V.r * Math.sin(V.phi) * Math.cos(V.theta));
    E.camera.lookAt(t);
    E.camera.updateMatrixWorld();
    if (E.mode === "system") { systemFrame(dt); if (Viewer.active) Viewer.frame(dt); return; }
    // star shaders need the pixel scale
    E.scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.scale) o.material.uniforms.scale.value = E.scale; });

    const galaxyScale = V.r > GALAXY_LIMIT;
    const fadeSys = clamp(1 - (V.r - GALAXY_LIMIT * 0.5) / (GALAXY_LIMIT * 0.5), 0, 1);
    for (const [id, rec] of E.sprites) {
      const sel = id === gx.selSystem, hov = id === E.hover;
      rec.sprite.visible = fadeSys > 0.01;
      rec.sprite.material.opacity = fadeSys;
      const base = sel ? 0.034 : hov ? 0.03 : 0.022;
      rec.sprite.scale.set(base, base, 1);
    }
    E.imperium.visible = !fadeSys || V.r > GALAXY_LIMIT * 0.6;
    E.imperium.material.opacity = clamp((V.r - GALAXY_LIMIT * 0.6) / (GALAXY_LIMIT * 0.4), 0, 1) * (0.7 + 0.3 * Math.sin(now / 400));
    const ss = gx.selSystem && sysById(gx.selSystem);
    E.sel.visible = !!ss && !galaxyScale;
    if (ss) { E.sel.position.set(...worldPos(ss)); E.sel.material.rotation += dt * 0.6; }

    // grid + drop lines around the focus point
    const showGrid = gx.grid && V.r < 6000;
    E.grid.visible = showGrid; E.drops.visible = showGrid;
    if (showGrid) {
      const spacing = Math.pow(10, Math.round(Math.log10(Math.max(1, V.r / 6))));
      const planeY = t.y;
      E.grid.scale.setScalar(spacing * 20);
      E.grid.position.set(Math.round(t.x / spacing) * spacing, planeY, Math.round(t.z / spacing) * spacing);
      E.grid.material.opacity = 0.35 * clamp(1 - V.r / 6000, 0, 1);
      const a = E.drops.geometry.attributes.position;
      gx.systems.forEach((s, i) => { const w = worldPos(s); a.setXYZ(i * 2, w[0], w[1], w[2]); a.setXYZ(i * 2 + 1, w[0], planeY, w[2]); });
      a.needsUpdate = true;
      E.drops.material.opacity = 0.45 * clamp(1 - V.r / 6000, 0, 1);
    }

    // hover + route
    let hs = null;
    if (E.mouse && !E.goal) hs = nearestSystem(E.mouse.x, E.mouse.y, 16);
    E.hover = hs ? hs.id : "";
    const tip = $("gxTip");
    if (hs) {
      const ds = distSol(hs), sel = ss && ss.id !== hs.id ? ss : null;
      tip.innerHTML = `<b>${esc(hs.name)}</b><span>${planetsOf(hs.id).map((p) => esc(p.name)).join(" · ") || "No charted worlds"}</span><span>${fmt(ds)} ly from Sol${sel ? ` · ${fmt(distBetween(hs, sel))} ly from ${esc(sel.name)}` : ""}</span><span class="gx-tip-hint">Double-click to open the system</span>`;
      tip.style.transform = `translate(${E.mouse.x + 14}px, ${E.mouse.y + 14}px)`;
      tip.hidden = false;
      E.renderer.domElement.style.cursor = "pointer";
      if (sel) {
        const a = E.route.geometry.attributes.position, w1 = worldPos(sel), w2 = worldPos(hs);
        a.setXYZ(0, ...w1); a.setXYZ(1, ...w2); a.needsUpdate = true;
        E.route.computeLineDistances(); E.route.material.dashSize = V.r * 0.012; E.route.material.gapSize = V.r * 0.008; E.route.visible = true;
      } else E.route.visible = false;
    } else { tip.hidden = true; E.route.visible = false; E.renderer.domElement.style.cursor = ""; }

    E.renderer.render(E.scene, E.camera);

    // labels
    const box = E.renderer.domElement, W = box.clientWidth, H = box.clientHeight, v = tmp.v || (tmp.v = new THREE.Vector3());
    const place = (el, p, dy) => {
      v.set(p[0], p[1], p[2]).project(E.camera);
      const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      el.style.display = vis ? "" : "none";
      if (vis) el.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H + dy}px) translate(-50%, 0)`;
    };
    // Decluttered system labels: selected and hovered first, then nearer systems; overlapping labels are skipped.
    const showSysLabels = gx.labels && V.r < LABEL_LIMIT;
    const cands = [];
    for (const [id, rec] of E.sprites) {
      const s = sysById(id);
      if (!s || !gx.labels || (!showSysLabels && id !== gx.selSystem)) { rec.label.style.display = "none"; continue; }
      const w = worldPos(s);
      v.set(w[0], w[1], w[2]).project(E.camera);
      if (v.z >= 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { rec.label.style.display = "none"; continue; }
      if (rec.wch === undefined) { const pl = planetsOf(id); rec.wch = Math.max(s.name.length * 8.2, pl.map((p) => p.name).join(" · ").length * 6) + 10; }
      const pri = id === gx.selSystem ? 3 : id === E.hover ? 2 : 0;
      cands.push({ rec, id, x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H + 10, pri, d: Math.hypot(E.camera.position.x - w[0], E.camera.position.y - w[1], E.camera.position.z - w[2]) });
    }
    cands.sort((a, b) => b.pri - a.pri || a.d - b.d);
    const placed = [];
    cands.forEach((c) => {
      const r = { l: c.x - c.rec.wch / 2, r: c.x + c.rec.wch / 2, t: c.y, b: c.y + 28 };
      const clash = placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t);
      if (clash && c.pri === 0) { c.rec.label.style.display = "none"; return; }
      placed.push(r);
      c.rec.label.style.display = "";
      c.rec.label.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, 0)`;
      c.rec.label.style.opacity = c.pri ? 1 : clamp(1.6 - V.r / LABEL_LIMIT, 0.55, 1);
    });
    if (E.galLabels) E.galLabels.forEach((g, i) => { const on = gx.labels && (i === 0 ? V.r > GALAXY_LIMIT : V.r >= LABEL_LIMIT); if (on) place(g.el, g.p, 14); else g.el.style.display = "none"; });

    // scale readout
    const fromSol = t.distanceTo(solV());
    $("gxScale").textContent = galaxyScale ? `Galaxy view · ${fmt(V.r)} ly out · Sol is ${fmt(Math.hypot(...SOL))} ly from the core` : `View radius ${fmt(V.r)} ly · focus ${fmt(fromSol)} ly from Sol`;

    if (Viewer.active) Viewer.frame(dt);
  }

  // ---------- system view ----------
  function enterSystem(sysId, focusId) {
    const s = sysById(sysId);
    if (!s || !E.ready) return;
    if (E.mode !== "system") E.galCam = { view: Object.assign({}, E.view), target: E.target.clone() };
    else disposeSystem();
    buildSystem(s);
    E.mode = "system";
    if (!CAST) GX().inSystem = s.id;  // the player display follows into the system
    E.follow = null;
    E.target.set(0, 0, 0); E.view.phi = 1.12; E.view.r = E.sys.overR * 4; E.goal = null;
    if (focusId && E.sys.bodies.some((b) => b.id === focusId)) followBody(focusId);
    else flyTo(new THREE.Vector3(), E.sys.overR);
    updateChrome();
  }
  function leaveSystem() {
    if (E.mode !== "system") return;
    disposeSystem();
    E.mode = "galaxy"; E.follow = null; E.goal = null;
    if (!CAST) GX().inSystem = "";
    if (E.galCam) { Object.assign(E.view, E.galCam.view); E.target.copy(E.galCam.target); }
    const gx = GX();
    if (gx.selPlanet && gx.selPlanet.startsWith("virt:")) gx.selPlanet = (planetsOf(gx.selSystem)[0] || {}).id || "";
    updateChrome();
  }
  function rebuildSystem() {
    const s = E.sys && sysById(E.sys.id);
    if (!s) { leaveSystem(); return; }
    const keep = { view: Object.assign({}, E.view), target: E.target.clone(), follow: E.follow, t: E.sys.t };
    disposeSystem(); buildSystem(s);
    Object.assign(E.view, keep.view); E.target.copy(keep.target); E.sys.t = keep.t;
    E.follow = keep.follow && E.sys.bodies.some((b) => b.id === keep.follow) ? keep.follow : null;
  }
  function buildSystem(s) {
    const T = THREE, L = systemLayout(s), col = new T.Color(GD.specColor(s.spec)), rad = starRadius(s);
    const scene = new T.Scene();
    scene.background = new T.Color(0x020308);
    scene.add(new T.AmbientLight(0xffffff, 0.07));
    scene.add(new T.PointLight(col.clone().lerp(new T.Color(1, 1, 1), 0.5), 2.8, 0, 0));
    const star = new T.Mesh(new T.SphereGeometry(rad, 48, 24), new T.MeshBasicMaterial({ color: col.clone().lerp(new T.Color(1, 1, 1), 0.35) }));
    scene.add(star);
    [[7, 0.9], [20, 0.22]].forEach(([k, o]) => { const g = new T.Sprite(new T.SpriteMaterial({ map: E.glow, color: col, blending: T.AdditiveBlending, depthWrite: false, transparent: true, opacity: o })); g.scale.set(rad * k, rad * k, 1); scene.add(g); });
    const sky = new T.Points(E.skyGeo, E.skyMat); sky.frustumCulled = false; scene.add(sky);
    const labels = $("gxSysLabels"); labels.innerHTML = "";
    const starLabel = document.createElement("button");
    starLabel.className = "gx-label gx-label-star"; starLabel.dataset.act = "gxStar"; starLabel.innerHTML = `<b>${esc(s.name)}</b><span>${esc(s.spec || "")}</span>`;
    labels.appendChild(starLabel);
    const bodies = L.bodies.map((b) => {
      const pivot = new T.Group(); pivot.rotation.set(b.incl, b.node, 0);
      const pts = []; for (let i = 0; i < 160; i++) { const a = (i / 160) * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * b.R, 0, Math.sin(a) * b.R)); }
      const line = new T.LineLoop(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xc89a5a, transparent: true, opacity: b.virtual ? 0.16 : 0.4, depthWrite: false }));
      pivot.add(line);
      const holder = new T.Group(); pivot.add(holder);
      const model = P.model(b.planet.look, b.planet.seed);
      const sc = 0.95 * Math.pow(Math.max(0.3, b.planet.look.size || 1), 0.8);
      model.group.scale.setScalar(sc);
      holder.add(model.group);
      scene.add(pivot);
      const label = document.createElement("button");
      label.className = "gx-label" + (b.virtual ? " gx-label-virt" : ""); label.dataset.act = "gxBody"; label.dataset.id = b.id;
      label.innerHTML = `<b>${esc(b.planet.name)}</b><span>${b.virtual ? "Uncharted" : esc(typeName(b.planet.type))}</span>`;
      labels.appendChild(label);
      return Object.assign({}, b, { pivot, line, holder, model, sc, label, key: JSON.stringify(b.planet.look) + b.planet.seed, omega: (2 * Math.PI) / (yearOf(b.au, s) * 40) });
    });
    let belt = null;
    if (L.belt) {
      const n = 2600, g = new T.BufferGeometry(), a = new Float32Array(n * 3), rr = rng(hashStr(s.id) + 5);
      for (let i = 0; i < n; i++) { const th = rr() * Math.PI * 2, rad2 = L.belt + (rr() - 0.5) * 7; a.set([Math.cos(th) * rad2, (rr() - 0.5) * 1.2, Math.sin(th) * rad2], i * 3); }
      g.setAttribute("position", new T.BufferAttribute(a, 3));
      belt = new T.Points(g, new T.PointsMaterial({ size: 0.35, color: 0x8a7c68, transparent: true, opacity: 0.8, depthWrite: false }));
      scene.add(belt);
    }
    const S = { id: s.id, scene, star, starLabel, rad, bodies, belt, count: L.count, overR: (bodies.length ? bodies[bodies.length - 1].R : 30) * 1.75 + 14, layoutKey: layoutKey(s), t: 0, speed: E.sysSpeed || 1, paused: !!E.sysPaused };
    E.sys = S;
    const queue = bodies.slice();
    const paintNext = () => { if (E.sys !== S || !queue.length) return; queue.shift().model.paint(384, 192); setTimeout(paintNext, 0); };
    setTimeout(paintNext, 0);
  }
  function disposeSystem() {
    const S = E.sys; if (!S) return;
    S.bodies.forEach((b) => { b.model.dispose(); b.line.geometry.dispose(); b.line.material.dispose(); });
    S.star.geometry.dispose(); S.star.material.dispose();
    if (S.belt) { S.belt.geometry.dispose(); S.belt.material.dispose(); }
    S.scene.traverse((o) => { if (o.isSprite) o.material.dispose(); });
    $("gxSysLabels").innerHTML = "";
    E.sys = null;
  }
  const bodyPos = (b) => { b.holder.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(b.holder.matrixWorld); };
  const sysBody = (id) => E.sys && E.sys.bodies.find((b) => b.id === id);
  function followBody(id) {
    const b = sysBody(id); if (!b) return;
    E.follow = id;
    flyTo(bodyPos(b), b.sc * b.model.extent() * 3.4 + 3);
  }
  function sysUpdate(raw) {
    const S = E.sys; if (!S) return;
    if (!S.paused) S.t += Math.min(0.25, raw) * S.speed;
    S.bodies.forEach((b) => { const a = b.phase + S.t * b.omega; b.holder.position.set(Math.cos(a) * b.R, 0, Math.sin(a) * b.R); });
    const fb = E.follow && sysBody(E.follow);
    if (fb) { const w = bodyPos(fb); if (E.goal) E.goal.target.copy(w); else E.target.copy(w); }
  }
  function screenOf(w, rect) { const v = w.clone().project(E.camera); return v.z < 1 ? { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height } : null; }
  function nearestBody(cx, cy, px) {
    if (!E.sys) return null;
    const rect = E.renderer.domElement.getBoundingClientRect();
    let best = null, bd = px;
    E.sys.bodies.forEach((b) => {
      const w = bodyPos(b), sp = screenOf(w, rect); if (!sp) return;
      const rpx = (b.sc * E.scale) / Math.max(0.01, E.camera.position.distanceTo(w));
      const d = Math.hypot(sp.x - cx, sp.y - cy) - rpx;
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  }
  function clickSystem(e) {
    const b = nearestBody(e.clientX, e.clientY, 22);
    if (b) { selectBody(b.id); return; }
    const rect = E.renderer.domElement.getBoundingClientRect(), sp = screenOf(new THREE.Vector3(), rect);
    if (sp && Math.hypot(sp.x - e.clientX, sp.y - e.clientY) < Math.max(24, (E.sys.rad * E.scale) / E.view.r)) { E.follow = null; flyTo(new THREE.Vector3(), E.sys.overR); }
  }
  function selectBody(id) { GX().selPlanet = id; followBody(id); G.save(); G.render(); }

  function systemFrame(dt) {
    const S = E.sys, gx = GX();
    S.bodies.forEach((b) => b.model.tick(dt));
    // hover
    const hb = E.mouse && !E.goal ? nearestBody(E.mouse.x, E.mouse.y, 18) : null;
    S.bodies.forEach((b) => { b.line.material.opacity = b.id === gx.selPlanet || (hb && b.id === hb.id) ? 0.85 : b.virtual ? 0.16 : 0.4; });
    const tip = $("gxTip");
    if (hb) {
      tip.innerHTML = `<b>${esc(hb.planet.name)}</b><span>${hb.virtual ? "Uncharted · " : ""}${esc(typeName(hb.planet.type))}</span><span>${hb.au.toFixed(2)} AU · year ${yearText(yearOf(hb.au, sysById(S.id)))}</span>`;
      tip.style.transform = `translate(${E.mouse.x + 14}px, ${E.mouse.y + 14}px)`; tip.hidden = false;
      E.renderer.domElement.style.cursor = "pointer";
    } else { tip.hidden = true; E.renderer.domElement.style.cursor = ""; }
    E.renderer.render(S.scene, E.camera);
    // labels under each body, decluttered
    const box = E.renderer.domElement, W = box.clientWidth, H = box.clientHeight, v = new THREE.Vector3();
    const cands = [];
    const add = (el, w, rWorld, pri) => {
      v.copy(w).project(E.camera);
      if (!gx.labels || v.z >= 1 || Math.abs(v.x) > 1.1 || Math.abs(v.y) > 1.1) { el.style.display = "none"; return; }
      const rpx = (rWorld * E.scale) / Math.max(0.01, E.camera.position.distanceTo(w));
      cands.push({ el, x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H + Math.min(rpx, H * 0.4) + 6, pri, w: Math.max(el.textContent.length * 6.5, 60) });
    };
    add(S.starLabel, new THREE.Vector3(), S.rad, 1);
    S.bodies.forEach((b) => add(b.label, bodyPos(b), b.sc, b.id === gx.selPlanet ? 3 : hb && b.id === hb.id ? 2 : b.virtual ? 0 : 1));
    cands.sort((a, b) => b.pri - a.pri);
    const placed = [];
    cands.forEach((c) => {
      const r = { l: c.x - c.w / 2, r: c.x + c.w / 2, t: c.y, b: c.y + 26 };
      if (c.pri < 2 && placed.some((q) => r.l < q.r && r.r > q.l && r.t < q.b && r.b > q.t)) { c.el.style.display = "none"; return; }
      placed.push(r); c.el.style.display = ""; c.el.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, 0)`;
      c.el.classList.toggle("on", c.pri === 3);
    });
    const s = sysById(S.id);
    $("gxScale").textContent = `${s ? s.name : ""} system · ${S.bodies.length} orbits · spacing compressed for display${S.paused ? " · paused" : ""}`;
  }

  function updateChrome() {
    const sysMode = E.mode === "system" && E.sys;
    const s = sysMode && sysById(E.sys.id);
    $("gxCrumb").textContent = s ? `Galaxy › ${s.name} system` : "Imperial survey of charted worlds";
    $("gxLabels").hidden = !!sysMode;
    $("gxSysLabels").hidden = !sysMode;
    $("gxHint").textContent = sysMode ? "Click a world to follow it · double-click space for the whole system · Esc returns to the galaxy" : "Drag to orbit · right-drag to pan · scroll to zoom · click a star · double-click to open its system";
    const t = $("gxTime");
    t.hidden = !sysMode;
    if (sysMode) {
      const sp = E.sys.speed, pz = E.sys.paused;
      t.innerHTML = `<button class="gx-btn" data-act="gxTime" data-v="pause" title="${pz ? "Resume" : "Pause"} orbits">${pz ? "▶" : "❚❚"}</button>${[0.25, 1, 4, 16].map((x) => `<button class="gx-btn ${sp === x && !pz ? "on" : ""}" data-act="gxTime" data-v="${x}">×${x === 0.25 ? "¼" : x}</button>`).join("")}`;
    }
  }

  // Debug/testing hook: advance the animation by hand (background tabs pause requestAnimationFrame).
  window.__gxDebug = { E, step(n, dt) { for (let i = 0; i < n; i++) { if (E.raf) cancelAnimationFrame(E.raf); E.raf = 0; E.last = performance.now() - dt * 1000; frame(); } } };

  // ---------- planet viewer (left panel) ----------
  const Viewer = {
    active: false, model: null, key: "", id: "",
    init() {
      if (this.renderer || !HAS_THREE) return !!this.renderer;
      const T = THREE;
      try { this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return false; }
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
      this.camera.position.set(0, 0.35, 6);
      this.camera.lookAt(0, 0, 0);
      const key = new T.DirectionalLight(0xfff1df, 3); key.position.set(-4, 2, 3); this.scene.add(key);
      this.scene.add(new T.AmbientLight(0xffffff, 0.1));
      this.pivot = new T.Group(); this.scene.add(this.pivot);
      $("gxViewer").appendChild(this.renderer.domElement);
      new ResizeObserver(() => this.resize()).observe($("gxViewer"));
      // drag to turn the planet
      const el = this.renderer.domElement; let last = null;
      el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY }; });
      el.addEventListener("pointermove", (e) => { if (!last) return; this.pivot.rotation.y += (e.clientX - last.x) * 0.01; this.pivot.rotation.x = clamp(this.pivot.rotation.x + (e.clientY - last.y) * 0.01, -1.2, 1.2); last = { x: e.clientX, y: e.clientY }; });
      el.addEventListener("pointerup", () => (last = null));
      el.addEventListener("wheel", (e) => { e.preventDefault(); this.zoom = clamp((this.zoom || 1) * Math.exp(e.deltaY * 0.001), 0.6, 2.5); this.fit(); }, { passive: false });
      this.resize();
      return true;
    },
    resize() { const box = $("gxViewer"), w = box.clientWidth, h = box.clientHeight; if (!w || !h || !this.renderer) return; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.fit(); },
    fit() { if (!this.model) return; const ext = this.model.extent(), fov = (this.camera.fov * Math.PI) / 360; const fit = Math.max(ext / Math.tan(fov), ext / (Math.tan(fov) * this.camera.aspect)); this.camera.position.set(0, ext * 0.12, fit * 1.15 * (this.zoom || 1)); this.camera.lookAt(0, 0, 0); },
    show(p) {
      if (!this.init()) return;
      const key = JSON.stringify(p.look) + p.seed;
      if (this.id !== p.id) {
        if (this.model) { this.pivot.remove(this.model.group); this.model.dispose(); }
        this.model = P.model(p.look, p.seed); this.pivot.add(this.model.group); this.pivot.rotation.set(0.15, 0, 0);
        this.id = p.id; this.key = ""; this.zoom = 1;
      }
      if (key !== this.key) { this.model.set(p.look, p.seed); this.fit(); this.repaint(); this.key = key; }
    },
    repaint() {
      clearTimeout(this.t);
      $("gxBusy").hidden = false;
      this.t = setTimeout(() => { if (this.model) this.model.paint(1024, 512); $("gxBusy").hidden = true; }, 30);
    },
    live(p) { if (!this.model || this.id !== p.id) return; this.model.set(p.look, p.seed); this.fit(); clearTimeout(this.lt); this.lt = setTimeout(() => { this.key = JSON.stringify(p.look) + p.seed; this.repaint(); }, 160); },
    frame(dt) { if (!this.model) return; this.model.tick(dt); this.renderer.render(this.scene, this.camera); },
  };

  // ---------- panels ----------
  const range = (path, min, max, step, label, type) => {
    const v = G.getPath(path);
    return `<label class="sm-ctl"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-bind="${path}" data-type="${type || "float"}"/><span class="hint" data-val="${path}">${v}</span></label>`;
  };
  const color = (path, label) => `<label class="sm-color"><input type="color" value="${esc(G.getPath(path))}" data-bind="${path}"/><span>${label}</span></label>`;
  const check = (path, label) => `<label class="check small" style="margin:0"><input type="checkbox" data-bind="${path}" data-type="bool" ${G.getPath(path) ? "checked" : ""}/> ${label}</label>`;

  function planetSection(p) {
    const base = `galaxy.planets.#${p.id}`, L = `${base}.look`, types = typeList(), gx = GX();
    return `
      <section class="gx-sec">
        <div class="gx-row-world"><label>World<input type="text" data-bind="${base}.name" value="${esc(p.name)}"/></label><label class="gx-narrow">Orbit<input type="text" data-bind="${base}.orbit" value="${esc(p.orbit)}" placeholder="III"/></label><label class="gx-narrow">AU<input type="number" step="0.01" min="0" data-bind="${base}.au" data-type="float" value="${p.au > 0 ? p.au : ""}" placeholder="auto"/></label></div>
        <label>Allegiance<input type="text" data-bind="${base}.allegiance" value="${esc(p.allegiance)}"/></label>
        <label>Notes<textarea data-bind="${base}.notes" rows="3">${esc(p.notes)}</textarea></label>
      </section>
      <details class="gx-sec" open><summary>Appearance</summary>
        <label>Planet type<select data-bind="${base}.type">
          <optgroup label="Types">${types.filter((t) => !t.custom).map((t) => `<option value="${t.key}" ${p.type === t.key ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</optgroup>
          ${gx.customTypes.length ? `<optgroup label="Your types">${types.filter((t) => t.custom).map((t) => `<option value="${t.key}" ${p.type === t.key ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</optgroup>` : ""}
          ${types.some((t) => t.key === p.type) ? "" : `<option value="${esc(p.type)}" selected>Custom</option>`}
        </select></label>
        <p class="gx-note">Choosing a type resets the look; then tweak anything below.</p>
        <div class="sm-colors">${color(`${L}.low`, "Lowlands")}${color(`${L}.mid`, "Midlands")}${color(`${L}.high`, "Highlands")}${color(`${L}.waterColor`, "Water")}${color(`${L}.cloudColor`, "Clouds")}${color(`${L}.atmo`, "Atmosphere")}</div>
        ${range(`${L}.water`, 0, 0.95, 0.01, "Sea level")}${range(`${L}.ice`, 0, 0.6, 0.01, "Ice caps")}${range(`${L}.clouds`, 0, 1, 0.01, "Cloud cover")}${range(`${L}.atmoStrength`, 0, 2, 0.05, "Atmosphere")}
        ${range(`${L}.detail`, 0.3, 4, 0.05, "Terrain scale")}${range(`${L}.tilt`, 0, 90, 1, "Axial tilt")}${range(`${L}.spin`, 0, 1.5, 0.01, "Spin")}${range(`${L}.moons`, 0, 6, 1, "Moons", "num")}
        <div class="gx-checks">${check(`${L}.dunes`, "Dunes")}${check(`${L}.craters`, "Craters")}${check(`${L}.bands`, "Gas bands")}${check(`${L}.spot`, "Great storm")}${check(`${L}.lights`, "City lights")}${check(`${L}.lava`, "Lava")}${check(`${L}.rings`, "Rings")}</div>
        <div class="sm-colors">${p.look.lava ? color(`${L}.lavaColor`, "Lava") : ""}${p.look.rings ? color(`${L}.ringColor`, "Rings") : ""}</div>
        <div class="gx-actions"><button class="gx-btn" data-act="gxSeed">New terrain</button><button class="gx-btn" data-act="gxResetLook">Reset to type</button></div>
        <div class="gx-row2" style="margin-top:0.5rem"><input type="text" placeholder="Name this look…" data-bind="galaxy.newTypeName" value="${esc(gx.newTypeName)}"/><button class="gx-btn" data-act="gxSaveType">Save as type</button></div>
      </details>
      <details class="gx-sec"><summary>Planet types <span class="gx-count">${types.length}</span></summary>
        ${types.map((t) => `<div class="sm-type"><img src="${P.thumb(t.look, 7)}" alt="" width="72" height="36"/><div style="flex:1;min-width:0"><b>${esc(t.name)}</b><div class="gx-note">${esc(t.desc)}</div></div><button class="gx-btn" data-act="gxApplyType" data-k="${esc(t.key)}">Apply</button>${t.custom ? `<button class="gx-btn" data-act="gxRmType" data-id="${t.id}" title="Delete type">×</button>` : ""}</div>`).join("")}
      </details>`;
  }

  function renderPanels() {
    if (CAST) return;
    const gx = GX();
    const s = gx.selSystem && sysById(gx.selSystem);
    if (gx.selSystem && !s) { gx.selSystem = ""; gx.selPlanet = ""; }
    let p = gx.selPlanet && anyPlanet(gx.selPlanet);
    if (s && (!p || p.systemId !== s.id)) { p = planetsOf(s.id)[0] || null; gx.selPlanet = p ? p.id : ""; }
    updateChrome();
    $("gxToggles").innerHTML = `${check("galaxy.labels", "Labels")}${check("galaxy.grid", "Grid")}`;
    const right = $("gxRight"), left = $("gxLeft");
    right.hidden = !s; left.hidden = !p;
    if (!s) { Viewer.active = false; return; }
    const body = right.querySelector(".gx-body"), keep = body ? body.scrollTop : 0;
    const pl = planetsOf(s.id), base = `galaxy.systems.#${s.id}`;
    const inSys = E.mode === "system" && E.sys && E.sys.id === s.id;
    const lay = inSys ? E.sys : systemLayout(s);
    const bodyRec = p && lay.bodies.find((b) => b.id === p.id);
    const cycle = inSys ? lay.bodies.map((b) => b.planet) : pl;
    const orbitInfo = bodyRec ? `<div class="gx-stats gx-orbit"><div><span>Orbit</span><b>${ROMAN[bodyRec.n - 1]}</b></div><div><span>Distance</span><b>${bodyRec.au.toFixed(2)} AU</b></div><div><span>Year</span><b>${yearText(yearOf(bodyRec.au, s))}</b></div></div>` : "";
    right.innerHTML = `
      <div class="gx-head">
        <div class="gx-kicker">Star system <span class="gx-badge ${s.real ? "real" : "est"}">${s.real ? "Real star" : "Estimated position"}</span></div>
        <input class="gx-title" data-bind="${base}.name" value="${esc(s.name)}" aria-label="System name"/>
        <button class="gx-close" data-act="gxClose" title="Close (Esc)">✕</button>
        <div class="gx-stats"><div><span>From Sol</span><b>${fmt(distSol(s))} ly</b></div><div><span>Star</span><b>${esc(s.spec || "—")}</b></div><div><span>Worlds</span><b>${pl.length}${inSys ? ` / ${lay.bodies.length}` : ""}</b></div></div>
        <div class="gx-actions">${inSys ? `<button class="gx-btn gx-enter" data-act="gxLeave">‹ Back to galaxy</button>` : `<button class="gx-btn gx-enter" data-act="gxEnter">View solar system ›</button>`}</div>
      </div>
      <div class="gx-body">
        ${s.lore ? `<p class="gx-lore">${esc(s.lore)}</p>` : ""}
        <div class="gx-tabs">${cycle.map((x) => `<button class="gx-tab ${p && x.id === p.id ? "on" : ""} ${x.virtual ? "virt" : ""}" data-act="gxPlanet" data-id="${x.id}" title="${x.virtual ? "Uncharted world" : ""}">${esc(planetLabel(x))}</button>`).join("")}<button class="gx-tab add" data-act="gxAddPlanet">+ World</button></div>
        ${orbitInfo}
        ${!p ? `<p class="gx-note">No charted worlds. Add one above, or open the solar system to explore its uncharted orbits.</p>`
          : p.virtual ? `<section class="gx-sec"><p class="gx-note">An uncharted world, generated to fill an empty orbit so the system feels complete. Chart it to name it, edit its look and keep it on the map.</p><button class="gx-btn" data-act="gxChart">Chart this world</button></section>`
          : planetSection(p) + `<div class="gx-actions"><button class="gx-btn danger" data-act="gxRmPlanet">Remove ${esc(p.name)}</button></div>`}
        <details class="gx-sec"><summary>System & position</summary>
          <div class="gx-row2"><label>Star class<input type="text" data-bind="${base}.spec" value="${esc(s.spec || "")}" placeholder="G2 V"/></label></div>
          ${s.real ? `<p class="gx-note">Real star: RA ${s.ra.toFixed(3)} h, Dec ${s.dec.toFixed(2)}°, ${s.dist} ly. Edit below to override.</p>` : ""}
          <p class="gx-note">Light-years from Sol: X toward the galactic core, Y galactic north, Z spinward.</p>
          <div class="gx-row3"><label>X<input type="number" step="1" data-bind="${base}.pos.0" data-type="float" value="${s.pos[0]}"/></label><label>Y<input type="number" step="1" data-bind="${base}.pos.1" data-type="float" value="${s.pos[1]}"/></label><label>Z<input type="number" step="1" data-bind="${base}.pos.2" data-type="float" value="${s.pos[2]}"/></label></div>
          <label>System notes<textarea data-bind="${base}.notes" rows="2">${esc(s.notes || "")}</textarea></label>
          <div class="gx-actions"><button class="gx-btn danger" data-act="gxRmSystem">Delete system</button></div>
        </details>
      </div>`;
    right.querySelector(".gx-body").scrollTop = keep;
    if (p) {
      const ci = cycle.findIndex((x) => x.id === p.id);
      $("gxCaption").innerHTML = `<div class="gx-kicker">${esc(s.name)}${p.orbit ? ` ${esc(p.orbit)}` : ""}${p.virtual ? ` <span class="gx-badge est">Uncharted</span>` : ""}</div><h2>${esc(p.name)}</h2><div class="gx-sub">${esc(typeName(p.type))}${p.allegiance ? ` · ${esc(p.allegiance)}` : ""}${bodyRec ? ` · ${bodyRec.au.toFixed(2)} AU` : ""}</div>
        ${cycle.length > 1 ? `<div class="gx-cycle"><button class="gx-btn" data-act="gxCycle" data-d="-1">‹</button><span>${ci + 1} / ${cycle.length}</span><button class="gx-btn" data-act="gxCycle" data-d="1">›</button></div>` : ""}`;
      Viewer.active = true;
      Viewer.show(p);
    } else Viewer.active = false;
  }

  // ---------- search ----------
  function hideResults() { $("gxResults").innerHTML = ""; }
  $("gxSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { hideResults(); return; }
    const gx = GX(), hits = [];
    gx.planets.forEach((p) => { if (p.name.toLowerCase().includes(q)) hits.push({ sys: p.systemId, planet: p.id, label: p.name, sub: (sysById(p.systemId) || {}).name || "" }); });
    gx.systems.forEach((s) => { if (s.name.toLowerCase().includes(q)) hits.push({ sys: s.id, planet: "", label: s.name, sub: `${planetsOf(s.id).length} world(s)` }); });
    $("gxResults").innerHTML = hits.slice(0, 8).map((h) => `<button data-act="gxGo" data-sys="${h.sys}" data-planet="${h.planet}"><b>${esc(h.label)}</b><span>${esc(h.sub)}</span></button>`).join("") || `<div class="gx-none">No matches</div>`;
  });
  $("gxSearch").addEventListener("keydown", (e) => { if (e.key === "Enter") { const b = $("gxResults").querySelector("button"); if (b) b.click(); } });

  // ---------- show / hide with the tab ----------
  let lastTab = "worlds";
  function show() {
    root.hidden = false;
    document.body.classList.add("gx-open");
    if (!init()) { $("gxCanvas").innerHTML = `<div class="gx-fail">${esc(E.failed)}</div>`; return; }
    resize();
    syncSystems();
    syncSystemScene();
    renderPanels();
    E.active = true;
    if (!E.raf) { E.last = performance.now(); frame(); }
    if (!E.introDone) {
      E.introDone = true;
      const gx = GX();
      if (gx.selSystem && sysById(gx.selSystem)) { E.view.r = 140; E.target.set(...worldPos(sysById(gx.selSystem))); focusSystem(sysById(gx.selSystem)); }
      else setTimeout(viewImperium, 700); // sweep in from the whole galaxy to the Imperium
    }
  }
  function syncSystemScene() {
    if (E.mode !== "system" || !E.sys) return;
    const s = sysById(E.sys.id);
    if (!s) { leaveSystem(); return; }
    if (layoutKey(s) !== E.sys.layoutKey) { rebuildSystem(); return; }
    E.sys.bodies.forEach((b) => {
      if (b.virtual) return;
      const pl = planetById(b.id); if (!pl) return;
      const k = JSON.stringify(pl.look) + pl.seed;
      if (k !== b.key) { b.key = k; b.model.set(pl.look, pl.seed); b.sc = 0.95 * Math.pow(Math.max(0.3, pl.look.size || 1), 0.8); b.model.group.scale.setScalar(b.sc); setTimeout(() => b.model.paint(384, 192), 0); }
    });
  }
  function hide() { root.hidden = true; document.body.classList.remove("gx-open"); E.active = false; Viewer.active = false; }
  G.afterRender.push((tab) => {
    if (CAST) return;  // the display shows and hides the map itself
    if (tab === "starmap") show(); else { lastTab = tab; if (!root.hidden) hide(); }
    const cb = $("gxCastBtn"); if (cb) { const on = !!(G.cast && G.cast.state().open && G.cast.state().bg === "starmap"); cb.classList.toggle("on", on); cb.textContent = on ? "On the player display" : "Show to players"; }
  });
  G.views.starmap = () => `<div class="card"><h2>Known Universe</h2><p>The galaxy map opens full screen.</p><button class="btn primary" data-act="gxOpen">Open the map</button></div>`;

  document.addEventListener("keydown", (e) => {
    if (root.hidden || e.key !== "Escape") return;
    if (document.activeElement && document.activeElement.id === "gxSearch" && $("gxResults").innerHTML) { hideResults(); return; }
    if (E.mode === "system") A.gxLeave(); else if (GX().selSystem) A.gxClose(); else A.gxExit();
  });

  // Live edits (sliders, colours, text) without re-rendering panels.
  G.onInput.push((bind, el) => {
    if (!bind.startsWith("galaxy.")) return;
    const out = root.querySelector(`[data-val="${bind}"]`);
    if (out) out.textContent = el.value;
    if (bind.startsWith("galaxy.planets.#")) {
      const p = planetById(bind.split(".")[2].slice(1));
      if (p && bind.includes(".look.")) {
        Viewer.live(p);
        const b = sysBody(p.id);
        if (b) { b.model.set(p.look, p.seed); b.sc = 0.95 * Math.pow(Math.max(0.3, p.look.size || 1), 0.8); b.model.group.scale.setScalar(b.sc); clearTimeout(b.pt); b.pt = setTimeout(() => { b.key = JSON.stringify(p.look) + p.seed; b.model.paint(384, 192); }, 220); }
      }
      if (p && /\.(name|orbit|allegiance)$/.test(bind)) syncSystems();
    }
    if (bind.startsWith("galaxy.systems.#")) syncSystems();
  });
  G.onChange.push((bind) => {
    if (!bind.startsWith("galaxy.planets.#")) return;
    const p = planetById(bind.split(".")[2].slice(1));
    if (p && bind.endsWith(".type")) p.look = clone(typeLook(p.type));
  });

  // ---------- actions ----------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  A.gxOpen = () => { G.S.tab = "starmap"; R(); };
  A.gxExit = () => { leaveSystem(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); G.S.tab = lastTab === "starmap" ? "worlds" : lastTab; R(); };
  A.gxFull = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => G.toast("Full screen isn't available here")); };
  A.gxView = (el) => { leaveSystem(); const gx = GX(); gx.selSystem = ""; gx.selPlanet = ""; gx.camView = { v: el.dataset.v, n: ((gx.camView && gx.camView.n) || 0) + 1 }; if (el.dataset.v === "galaxy") viewGalaxy(); else viewImperium(); R(); };
  A.gxCast = () => { if (!G.cast) return; const st = G.cast.state(); G.cast.bg(st.open && st.bg === "starmap" ? "none" : "starmap"); };
  A.gxEnter = () => { const gx = GX(); if (!gx.selSystem) return; enterSystem(gx.selSystem); R(); };
  A.gxLeave = () => { const gx = GX(); leaveSystem(); const s = sysById(gx.selSystem); if (s) focusSystem(s); R(); };
  A.gxBody = (el) => selectBody(el.dataset.id);
  A.gxStar = () => { if (E.sys) { E.follow = null; flyTo(new THREE.Vector3(), E.sys.overR); } };
  A.gxTime = (el) => {
    if (!E.sys) return;
    if (el.dataset.v === "pause") E.sys.paused = !E.sys.paused; else { E.sys.speed = +el.dataset.v; E.sys.paused = false; }
    E.sysSpeed = E.sys.speed; E.sysPaused = E.sys.paused; updateChrome();
  };
  A.gxChart = () => {
    const gx = GX(), v = anyPlanet(gx.selPlanet);
    if (!v || !v.virtual) return;
    const pl = { id: uid(), systemId: v.systemId, name: v.name, orbit: v.orbit, allegiance: "", notes: "", seed: v.seed, type: v.type, look: clone(v.look) };
    gx.planets.push(pl); gx.selPlanet = pl.id;
    if (E.follow === v.id) E.follow = pl.id;
    syncSystems(); G.toast(`${pl.name} charted`); R();
  };
  A.gxSelect = (el) => select(el.dataset.id);
  A.gxGo = (el) => {
    hideResults(); $("gxSearch").value = "";
    const sid = el.dataset.sys, pid = el.dataset.planet || "";
    if (E.mode === "system" && (!E.sys || E.sys.id !== sid || !pid)) leaveSystem();
    if (pid) { GX().selSystem = sid; GX().selPlanet = pid; if (E.mode === "system") selectBody(pid); else { enterSystem(sid, pid); R(); } }
    else select(sid);
  };
  A.gxClose = () => { leaveSystem(); GX().selSystem = ""; GX().selPlanet = ""; flyTo(E.target, Math.max(E.view.r, 260)); R(); };
  A.gxPlanet = (el) => { GX().selPlanet = el.dataset.id; if (E.mode === "system") followBody(el.dataset.id); R(); };
  A.gxCycle = (el) => {
    const gx = GX(), list = E.mode === "system" && E.sys ? E.sys.bodies.map((b) => b.planet) : planetsOf(gx.selSystem);
    const i = list.findIndex((p) => p.id === gx.selPlanet), next = list[(i + +el.dataset.d + list.length) % list.length];
    gx.selPlanet = next.id; if (E.mode === "system") followBody(next.id); R();
  };
  A.gxAddPlanet = () => {
    const gx = GX(), s = sysById(gx.selSystem), n = E.mode === "system" && E.sys ? E.sys.count : planetsOf(s.id).length;
    const keys = Object.keys(P.TYPES), type = keys[Math.floor(Math.random() * keys.length)];
    const p = { id: uid(), systemId: s.id, name: `${s.name} ${ROMAN[n] || n + 1}`, orbit: ROMAN[n] || "", allegiance: "", notes: "", seed: rnd(), type, look: clone(P.TYPES[type].look) };
    gx.planets.push(p); gx.selPlanet = p.id; if (E.mode === "system") E.follow = p.id; R();
  };
  A.gxRmPlanet = () => { const gx = GX(), p = planetById(gx.selPlanet); if (!p || !confirm(`Remove ${p.name} from the map?`)) return; gx.planets = gx.planets.filter((x) => x !== p); gx.selPlanet = ""; syncSystems(); R(); };
  A.gxRmSystem = () => {
    const gx = GX(), s = sysById(gx.selSystem); if (!s || !confirm(`Delete the ${s.name} system and its ${planetsOf(s.id).length} world(s)?`)) return;
    gx.planets = gx.planets.filter((p) => p.systemId !== s.id); gx.systems = gx.systems.filter((x) => x !== s); gx.selSystem = ""; gx.selPlanet = ""; syncSystems(); R();
  };
  function newSystem(name, pos, spec) {
    const s = { id: uid(), name, spec: spec || "G5 V", real: false, pos, lore: "", notes: "" };
    GX().systems.push(s); return s;
  }
  function randomBubblePos() { const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 520; return [Math.round(Math.cos(a) * r), Math.round((Math.random() - 0.5) * 160), Math.round(Math.sin(a) * r)]; }
  A.gxAddSystem = () => {
    const near = E.ready && E.view.r < 3000 ? [E.target.x - SOL[0], E.target.y - SOL[1], E.target.z - SOL[2]].map((v) => Math.round(v + (Math.random() - 0.5) * Math.max(20, E.view.r * 0.4))) : randomBubblePos();
    const s = newSystem("New System", near, ["F5 V", "G2 V", "K1 V", "M2 V"][Math.floor(Math.random() * 4)]);
    GX().planets.push({ id: uid(), systemId: s.id, name: "New World", orbit: "I", allegiance: "", notes: "", seed: rnd(), type: "garden", look: clone(P.TYPES.garden.look) });
    syncSystems(); select(s.id);
  };
  A.gxSeed = () => { const p = planetById(GX().selPlanet); if (!p) return; p.seed = rnd(); R(); };
  A.gxResetLook = () => { const p = planetById(GX().selPlanet); if (!p) return; p.look = clone(typeLook(p.type)); R(); };
  A.gxApplyType = (el) => { const p = planetById(GX().selPlanet); if (!p) return; p.type = el.dataset.k; p.look = clone(typeLook(p.type)); R(); };
  A.gxSaveType = () => {
    const gx = GX(), p = planetById(gx.selPlanet), name = (gx.newTypeName || "").trim();
    if (!p) return; if (!name) { G.toast("Name the look first"); return; }
    const t = { id: uid(), name, look: clone(p.look) }; gx.customTypes.push(t); p.type = "custom:" + t.id; gx.newTypeName = "";
    G.toast(`Saved planet type “${name}”`); R();
  };
  A.gxRmType = (el) => {
    const gx = GX(), t = gx.customTypes.find((x) => x.id === el.dataset.id);
    if (!t || !confirm(`Delete the planet type “${t.name}”? Worlds using it keep their look.`)) return;
    gx.customTypes = gx.customTypes.filter((x) => x !== t); R();
  };

  // The Worlds tab's planet generator drops worlds onto the map.
  G.addToStarmap = (gp) => {
    const gx = GX(), m = (gp.designation || "").match(/^(.*?)\s+([IVX]+)$/);
    const starName = m ? m[1] : gp.designation || gp.name, orbit = m ? m[2] : "";
    const s = gx.systems.find((x) => x.name.toLowerCase() === starName.toLowerCase()) || newSystem(starName, randomBubblePos());
    const type = P.typeFromText(gp.type);
    const p = { id: uid(), systemId: s.id, name: gp.name, orbit, allegiance: gp.politics, notes: `${gp.type}. ${gp.population}. Military: ${gp.military}. Notable for ${gp.feature}.`, seed: rnd(), type, look: clone(P.TYPES[type].look) };
    gx.planets.push(p);
    gx.selSystem = s.id; gx.selPlanet = p.id;
    G.S.tab = "starmap"; syncSystems(); R();
    if (E.ready) focusSystem(s);
    return p;
  };

  // The Compendium links planets to the map by name.
  const planetByName = (name) => GX().planets.find((x) => x.name.toLowerCase() === String(name).toLowerCase());
  G.hasStarmapPlanet = (name) => !!planetByName(name);

  // ---------- the player display: follow the GM's picks in Lore (selection, system view, Galaxy/Imperium buttons) ----------
  const seen = { sys: null, planet: null, inSys: null, cam: null };
  function castFollow() {
    if (!E.ready) return;
    const gx = GX();
    syncSystems(); syncSystemScene();
    const inSys = gx.inSystem && sysById(gx.inSystem) ? gx.inSystem : "";
    const cam = gx.camView ? gx.camView.n : 0;
    if (inSys !== seen.inSys) {
      if (inSys) enterSystem(inSys, gx.selPlanet);
      else if (seen.inSys !== null) { leaveSystem(); const s = sysById(gx.selSystem); if (s) focusSystem(s); else viewImperium(); }
    } else if (inSys) {
      if (gx.selPlanet !== seen.planet) { if (sysBody(gx.selPlanet)) followBody(gx.selPlanet); else { E.follow = null; flyTo(new THREE.Vector3(), E.sys.overR); } }
    } else if (seen.cam !== null && cam !== seen.cam) { if (gx.camView.v === "galaxy") viewGalaxy(); else viewImperium(); }
    else if (seen.sys !== null && gx.selSystem !== seen.sys) { const s = sysById(gx.selSystem); if (s) focusSystem(s); else flyTo(E.target, Math.max(E.view.r, 260)); }
    Object.assign(seen, { sys: gx.selSystem, planet: gx.selPlanet, inSys, cam });
    // the name of what the players are looking at
    const s = sysById(gx.selSystem), p = gx.selPlanet && anyPlanet(gx.selPlanet);
    const cap = $("gxCastCap");
    if (!s) { cap.innerHTML = ""; return; }
    const pl = p && (inSys || (!String(p.id).startsWith("virt:") && p.systemId === s.id)) ? p : null;
    cap.innerHTML = pl ? `<small>${esc(s.name)} system</small><b>${esc(pl.name)}</b>${pl.allegiance ? `<span>${esc(pl.allegiance)}</span>` : ""}`
      : `<small>Star system</small><b>${esc(s.name)}</b>${planetsOf(s.id).length ? `<span>${planetsOf(s.id).map((x) => esc(x.name)).join(" · ")}</span>` : ""}`;
  }
  if (CAST) G.galaxyCast = {
    show() { root.classList.add("gx-cast"); if (root.hidden) { E.introDone = seen.inSys !== null; show(); } castFollow(); },
    hide() { if (!root.hidden) hide(); },
    follow: castFollow,
  };
  G.showOnStarmap = (name) => {
    const p = planetByName(name); if (!p) return false;
    const gx = GX(), s = sysById(p.systemId);
    gx.selSystem = p.systemId; gx.selPlanet = p.id;
    G.S.tab = "starmap"; R();
    if (E.ready && s) focusSystem(s);
    return true;
  };
})();
