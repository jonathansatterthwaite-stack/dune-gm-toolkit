// Starmap tab — a three.js map of the campaign's worlds, with per-planet appearance editing.
(function () {
  const G = window.GM, P = window.Planets;
  const { esc, uid, clamp } = G;
  const HAS_THREE = typeof window.THREE !== "undefined";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const rnd = () => Math.floor(Math.random() * 1e9);
  const LO_RES = [256, 128], HI_RES = [768, 384];

  // ---------- state ----------
  function newPlanet(o) {
    const type = (o && o.type) || "garden";
    return Object.assign({ id: uid(), name: "New world", designation: "", allegiance: "", notes: "", x: 0, y: 0, z: 0, seed: rnd(), type, look: clone(P.TYPES[type].look) }, o, { look: Object.assign(clone(P.TYPES[type].look), (o && o.look) || {}) });
  }
  G.ensure("starmap", {
    planets: [
      newPlanet({ name: "Arrakis", designation: "Canopus III", allegiance: "Imperial fief — spice", type: "desert", x: 35, y: 6, z: -12, notes: "Dune. Source of the spice melange." }),
      newPlanet({ name: "Caladan", designation: "Delta Pavonis III", allegiance: "House Atreides", type: "ocean", x: -55, y: -8, z: 30, notes: "Ocean world of fishermen and pundi rice." }),
      newPlanet({ name: "Giedi Prime", designation: "36 Ophiuchi B", allegiance: "House Harkonnen", type: "industrial", x: 70, y: 12, z: 55, notes: "Industrial homeworld of House Harkonnen." }),
      newPlanet({ name: "Kaitain", designation: "Alpha Piscium", allegiance: "House Corrino — Imperial capital", type: "garden", x: -12, y: 3, z: -72, notes: "Seat of the Golden Lion Throne." }),
      newPlanet({ name: "Salusa Secundus", designation: "Gamma Waiping III", allegiance: "House Corrino — prison planet", type: "barren", x: -82, y: -10, z: -40, notes: "Blasted prison world; training ground of elite troops." }),
      newPlanet({ name: "Ix", designation: "Alkalurops IX", allegiance: "House Vernius", type: "ice", x: 22, y: -14, z: 82, notes: "Machine world; its cities lie underground." }),
      newPlanet({ name: "Tiamat Deep", designation: "Sigma Draconis VI", allegiance: "Unclaimed", type: "gas", x: 95, y: -4, z: -60, notes: "A gas giant whose moons are mined by whoever dares." }),
    ],
    selected: "", customTypes: [], labels: true, grid: true, newTypeName: "",
  });
  const SM = () => G.S.starmap;
  const findP = (id) => SM().planets.find((p) => p.id === id);

  function typeList() {
    return Object.keys(P.TYPES).map((k) => ({ key: k, name: P.TYPES[k].name, desc: P.TYPES[k].desc, look: P.TYPES[k].look, custom: false }))
      .concat(SM().customTypes.map((c) => ({ key: "custom:" + c.id, name: c.name, desc: "Custom type", look: c.look, custom: true, id: c.id })));
  }
  function typeLook(key) {
    if (key && key.startsWith("custom:")) { const c = SM().customTypes.find((x) => "custom:" + x.id === key); if (c) return c.look; }
    return (P.TYPES[key] || P.TYPES.garden).look;
  }
  const typeName = (key) => (typeList().find((t) => t.key === key) || { name: "Custom (deleted)" }).name;

  // ---------- three.js engine ----------
  const E = { ready: false, failed: null, groups: new Map(), active: false, raf: 0, sph: { theta: 0.7, phi: 1.0, r: 240 }, goal: null, idle: 0, queue: [], qTimer: 0 };

  const ATMO_VS = "varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }";
  const ATMO_FS = "uniform vec3 color; uniform float strength; uniform float mode; varying vec3 vN; varying vec3 vV; void main(){ float d = abs(dot(normalize(vN), normalize(vV))); float f = mode < 0.5 ? pow(1.0 - d, 3.0) : pow(clamp(d / 0.6, 0.0, 1.0), 2.0) * (1.0 - smoothstep(0.6, 1.0, d)); gl_FragColor = vec4(color * f * strength, 1.0); }";

  function init() {
    if (E.ready || E.failed) return E.ready;
    if (!HAS_THREE) { E.failed = "three.js didn't load (js/vendor/three.min.js)."; return false; }
    const T = THREE;
    try { E.renderer = new T.WebGLRenderer({ antialias: true }); }
    catch (e) { E.failed = "WebGL isn't available in this browser."; return false; }
    E.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    E.scene = new T.Scene();
    E.scene.background = new T.Color(0x04050a);
    E.camera = new T.PerspectiveCamera(50, 1, 0.1, 8000);
    E.scene.add(E.camera);
    // "headlight": a key light that follows the camera so every world shows a lit face and a terminator
    const key = new T.DirectionalLight(0xfff1df, 2.8); key.position.set(-2.2, 1.4, 1);
    const tgt = new T.Object3D(); tgt.position.set(0, 0, -1);
    E.camera.add(key); E.camera.add(tgt); key.target = tgt;
    E.scene.add(new T.AmbientLight(0xffffff, 0.14));
    E.target = new T.Vector3();
    E.sphere = new T.SphereGeometry(1, 96, 48);
    E.moonGeo = new T.SphereGeometry(1, 24, 12);
    const rg = new T.RingGeometry(1.35, 2.35, 160, 1);
    const pos = rg.attributes.position, uv = rg.attributes.uv, v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); uv.setXY(i, (v.length() - 1.35) / 1.0, 0.5); }
    E.ringGeo = rg;
    buildStars();
    E.grid = new T.PolarGridHelper(140, 12, 7, 96, 0x5a4a30, 0x2f2a22);
    E.grid.material.transparent = true; E.grid.material.opacity = 0.45;
    E.scene.add(E.grid);
    E.dropMat = new T.LineBasicMaterial({ color: 0x8a7350, transparent: true, opacity: 0.45 });
    E.ray = new T.Raycaster();
    E.labels = document.createElement("div"); E.labels.className = "sm-labels";
    E.last = performance.now();
    bindPointer(E.renderer.domElement);
    E.ready = true;
    return true;
  }

  function buildStars() {
    const T = THREE;
    const layer = (n, size, bright) => {
      const g = new T.BufferGeometry(), p = new Float32Array(n * 3), c = new Float32Array(n * 3);
      const tints = [[1, 1, 1], [0.75, 0.85, 1], [1, 0.9, 0.7], [1, 0.75, 0.6]];
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), r = 2600 + Math.random() * 800;
        p.set([r * s * Math.cos(th), r * u * 0.85, r * s * Math.sin(th)], i * 3);
        const t = tints[Math.floor(Math.random() * tints.length)], k = bright * (0.4 + Math.random() * 0.6);
        c.set([t[0] * k, t[1] * k, t[2] * k], i * 3);
      }
      g.setAttribute("position", new T.BufferAttribute(p, 3));
      g.setAttribute("color", new T.BufferAttribute(c, 3));
      E.scene.add(new T.Points(g, new T.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true })));
    };
    layer(5000, 1.4, 0.9);
    layer(500, 2.6, 1);
  }

  const radius = (p) => 2.5 * Math.max(0.2, p.look.size);

  function buildGroup(p) {
    const T = THREE;
    const g = new T.Group();
    const tilt = new T.Group();
    const body = new T.Mesh(E.sphere, new T.MeshStandardMaterial({ roughness: 0.92, metalness: 0, color: 0x777777 }));
    body.userData.id = p.id;
    const clouds = new T.Mesh(E.sphere, new T.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 1 }));
    const ring = new T.Mesh(E.ringGeo, new T.MeshStandardMaterial({ transparent: true, side: T.DoubleSide, depthWrite: false, roughness: 1 }));
    ring.rotation.x = -Math.PI / 2;
    tilt.add(body, clouds, ring);
    const mkAtmo = (mode, side) => new T.Mesh(E.sphere, new T.ShaderMaterial({ uniforms: { color: { value: new T.Color() }, strength: { value: 1 }, mode: { value: mode } }, vertexShader: ATMO_VS, fragmentShader: ATMO_FS, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side }));
    const rim = mkAtmo(0, T.FrontSide), halo = mkAtmo(1, T.BackSide);
    const moons = new T.Group();
    const dropGeo = new T.BufferGeometry().setAttribute("position", new T.BufferAttribute(new Float32Array(6), 3));
    const drop = new T.Line(dropGeo, E.dropMat);
    g.add(tilt, rim, halo, moons, drop);
    E.scene.add(g);
    const label = document.createElement("button");
    label.className = "sm-label"; label.dataset.act = "smSelect"; label.dataset.id = p.id;
    E.labels.appendChild(label);
    const rec = { g, tilt, body, clouds, ring, rim, halo, moons, drop, label, res: null };
    E.groups.set(p.id, rec);
    return rec;
  }

  // Cheap updates: position, size, tilt, toggles, colours. Textures are repainted separately.
  function applyShape(p, rec) {
    const T = THREE, L = p.look, r = radius(p);
    rec.g.position.set(p.x, p.y, p.z);
    rec.tilt.rotation.z = (L.tilt * Math.PI) / 180;
    rec.body.scale.setScalar(r);
    rec.clouds.scale.setScalar(r * 1.012);
    rec.ring.scale.setScalar(r);
    rec.ring.visible = !!L.rings;
    rec.rim.scale.setScalar(r * 1.02);
    rec.halo.scale.setScalar(r * 1.22);
    [rec.rim, rec.halo].forEach((m) => { m.material.uniforms.color.value.set(L.atmo); m.material.uniforms.strength.value = L.atmoStrength * (m === rec.rim ? 1.1 : 0.9); m.visible = L.atmoStrength > 0.01; });
    rec.body.material.roughness = L.water > 0.3 ? 0.72 : 0.92;
    const n = Math.round(L.moons || 0);
    if (rec.moons.children.length !== n) {
      rec.moons.children.slice().forEach((m) => { rec.moons.remove(m); m.children.forEach((c) => c.material.dispose()); });
      for (let i = 0; i < n; i++) {
        const pivot = new T.Group(); pivot.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, 0);
        const m = new T.Mesh(E.moonGeo, new T.MeshStandardMaterial({ color: new T.Color().setHSL(0.08, 0.08, 0.35 + Math.random() * 0.3), roughness: 1 }));
        m.userData.dist = 2.9 + i * 0.85; m.userData.size = 0.12 + Math.random() * 0.12;
        pivot.userData.speed = 0.25 / (1 + i * 0.6);
        pivot.add(m); rec.moons.add(pivot);
      }
    }
    rec.moons.children.forEach((pv) => { const m = pv.children[0]; m.position.set(r * m.userData.dist, 0, 0); m.scale.setScalar(r * m.userData.size); });
    const a = rec.drop.geometry.attributes.position; a.setXYZ(1, 0, -p.y, 0); a.needsUpdate = true;
    rec.drop.visible = SM().grid && Math.abs(p.y) > 0.5;
    rec.label.textContent = p.name || "Unnamed";
  }

  function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function repaint(p, rec, res) {
    const [w, h] = res;
    const out = P.paint(p.look, p.seed, w, h);
    const bm = rec.body.material;
    [bm.map, bm.emissiveMap, rec.clouds.material.map, rec.ring.material.map].forEach((t) => t && t.dispose());
    bm.map = canvasTex(out.map); bm.color.set(0xffffff);
    if (out.emissive) { bm.emissiveMap = canvasTex(out.emissive); bm.emissive.set(0xffffff); bm.emissiveIntensity = 1.3; }
    else { bm.emissiveMap = null; bm.emissive.set(0x000000); }
    bm.needsUpdate = true;
    if (out.clouds) { rec.clouds.material.map = canvasTex(out.clouds); rec.clouds.material.needsUpdate = true; rec.clouds.visible = true; }
    else { rec.clouds.material.map = null; rec.clouds.visible = false; }
    const rt = canvasTex(P.paintRing(p.look, p.seed));
    rec.ring.material.map = rt; rec.ring.material.emissiveMap = rt; rec.ring.material.emissive.set(0x555555); rec.ring.material.needsUpdate = true;
    rec.res = res;
  }

  // Paint one planet per tick so the page stays responsive.
  function queuePaint(id, hi) {
    E.queue = E.queue.filter((q) => q.id !== id);
    E.queue.push({ id, hi });
    if (!E.qTimer) E.qTimer = setTimeout(drainQueue, 0);
  }
  function drainQueue() {
    E.qTimer = 0;
    const q = E.queue.shift();
    if (!q) return;
    const p = findP(q.id), rec = E.groups.get(q.id);
    if (p && rec) repaint(p, rec, q.hi ? HI_RES : LO_RES);
    if (E.queue.length) E.qTimer = setTimeout(drainQueue, 0);
  }

  function disposeGroup(id) {
    const rec = E.groups.get(id); if (!rec) return;
    E.scene.remove(rec.g);
    rec.g.traverse((o) => { if (o.material) { ["map", "emissiveMap"].forEach((k) => o.material[k] && o.material[k].dispose()); if (o.material !== E.dropMat) o.material.dispose(); } });
    rec.drop.geometry.dispose();
    rec.label.remove();
    E.groups.delete(id);
  }

  function sync() {
    if (!E.ready) return;
    const sm = SM();
    const ids = new Set(sm.planets.map((p) => p.id));
    [...E.groups.keys()].forEach((id) => { if (!ids.has(id)) disposeGroup(id); });
    sm.planets.forEach((p) => {
      let rec = E.groups.get(p.id);
      const fresh = !rec;
      if (fresh) rec = buildGroup(p);
      applyShape(p, rec);
      const wantHi = p.id === sm.selected;
      if (fresh || (wantHi && rec.res !== HI_RES)) queuePaint(p.id, wantHi);
      rec.label.classList.toggle("on", p.id === sm.selected);
    });
    E.grid.visible = sm.grid;
    E.labels.style.display = sm.labels ? "" : "none";
  }

  // ---------- camera & interaction ----------
  function focus(id) {
    const p = findP(id); if (!p) return;
    E.goal = { target: new THREE.Vector3(p.x, p.y, p.z), r: radius(p) * (p.look.rings ? 7.5 : 6) + 6 };
  }
  function overview() { E.goal = { target: new THREE.Vector3(0, 0, 0), r: 240 }; }

  function bindPointer(el) {
    const pts = new Map();
    let moved = 0, pinch = 0;
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => { el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, shift: e.shiftKey }); moved = 0; E.idle = 0; });
    el.addEventListener("pointermove", (e) => {
      const p = pts.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy); E.idle = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) { E.sph.r = clamp(E.sph.r * (pinch / d), 3, 1200); E.goal = null; }
        pinch = d; return;
      }
      if (moved < 3) return;
      E.goal = E.goal && !E.goal.keepTarget ? null : E.goal;
      if (p.b === 2 || p.shift) {
        const right = new THREE.Vector3().setFromMatrixColumn(E.camera.matrix, 0);
        const up = new THREE.Vector3().setFromMatrixColumn(E.camera.matrix, 1);
        const k = E.sph.r * 0.0016;
        E.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      } else {
        E.sph.theta -= dx * 0.006;
        E.sph.phi = clamp(E.sph.phi - dy * 0.006, 0.08, Math.PI - 0.08);
      }
    });
    const up = (e) => {
      const p = pts.get(e.pointerId);
      pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      if (p && moved < 6 && pts.size === 0 && e.type === "pointerup") pick(e);
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("wheel", (e) => { e.preventDefault(); E.sph.r = clamp(E.sph.r * Math.exp(e.deltaY * 0.0012), 3, 1200); if (E.goal) E.goal.r = E.sph.r; E.idle = 0; }, { passive: false });
    el.addEventListener("dblclick", () => { if (!SM().selected) overview(); });
  }

  function pick(e) {
    const rect = E.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    E.ray.setFromCamera(ndc, E.camera);
    const hits = E.ray.intersectObjects([...E.groups.values()].map((r) => r.body), false);
    if (hits.length) select(hits[0].object.userData.id);
  }

  function select(id) {
    SM().selected = id;
    if (id) focus(id); else overview();
    G.save(); G.render();
  }

  function frame() {
    if (!E.active) { E.raf = 0; return; }
    E.raf = requestAnimationFrame(frame);
    const now = performance.now(), dt = Math.min(0.05, (now - E.last) / 1000); E.last = now;
    E.idle += dt;
    if (E.goal) {
      const k = 1 - Math.pow(0.002, dt);
      E.target.lerp(E.goal.target, k);
      E.sph.r += (E.goal.r - E.sph.r) * k;
      if (E.target.distanceTo(E.goal.target) < 0.02 && Math.abs(E.goal.r - E.sph.r) < 0.02) E.goal = null;
    }
    if (E.idle > 4 && !SM().selected) E.sph.theta += dt * 0.025; // gentle drift on the overview
    const s = E.sph, t = E.target;
    E.camera.position.set(t.x + s.r * Math.sin(s.phi) * Math.sin(s.theta), t.y + s.r * Math.cos(s.phi), t.z + s.r * Math.sin(s.phi) * Math.cos(s.theta));
    E.camera.lookAt(t);
    const sm = SM();
    sm.planets.forEach((p) => {
      const rec = E.groups.get(p.id); if (!rec) return;
      const spin = p.look.spin || 0;
      rec.body.rotation.y += spin * dt;
      rec.clouds.rotation.y += spin * 1.3 * dt;
      rec.moons.children.forEach((pv) => (pv.rotation.y += pv.userData.speed * dt));
    });
    E.renderer.render(E.scene, E.camera);
    // HTML labels
    if (sm.labels) {
      const W = E.renderer.domElement.clientWidth, H = E.renderer.domElement.clientHeight, v = new THREE.Vector3();
      sm.planets.forEach((p) => {
        const rec = E.groups.get(p.id); if (!rec) return;
        v.set(p.x, p.y + radius(p) * 1.35, p.z).project(E.camera);
        const vis = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
        rec.label.style.display = vis ? "" : "none";
        if (vis) rec.label.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px) translate(-50%, -100%)`;
      });
    }
  }

  function mount(tab) {
    if (tab !== "starmap") { E.active = false; return; }
    const box = document.getElementById("smCanvas");
    if (!box) return;
    if (!init()) { box.innerHTML = `<div class="empty" style="padding:2rem;color:#ccc">${esc(E.failed)}</div>`; return; }
    if (box !== E.box) {
      if (E.ro) E.ro.disconnect();
      box.appendChild(E.renderer.domElement);
      box.appendChild(E.labels);
      E.ro = new ResizeObserver(() => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; E.renderer.setSize(w, h); E.camera.aspect = w / h; E.camera.updateProjectionMatrix(); });
      E.ro.observe(box);
      E.box = box;
    }
    sync();
    if (!E.started) { E.started = true; if (SM().selected) focus(SM().selected); }
    E.active = true;
    if (!E.raf) { E.last = performance.now(); frame(); }
  }
  G.afterRender.push(mount);

  // Live edits from colour pickers, sliders and text fields (no full re-render).
  let pending = {};
  G.onInput.push((bind, el) => {
    if (!bind.startsWith("starmap.planets.#")) return;
    const id = bind.split(".")[2].slice(1);
    const p = findP(id), rec = E.groups.get(id);
    const out = document.querySelector(`[data-val="${bind}"]`);
    if (out) out.textContent = el.value;
    if (!p || !rec) return;
    applyShape(p, rec);
    if (bind.includes(".look.") && !/\.look\.(size|tilt|spin|moons|atmoStrength|atmo|rings)$/.test(bind)) {
      clearTimeout(pending[id]);
      pending[id] = setTimeout(() => queuePaint(id, id === SM().selected), 140);
    }
  });
  // Selects and checkboxes (app re-renders afterwards, and mount() syncs).
  G.onChange.push((bind) => {
    if (!bind.startsWith("starmap.planets.#")) return;
    const id = bind.split(".")[2].slice(1);
    const p = findP(id); if (!p) return;
    if (bind.endsWith(".type")) p.look = clone(typeLook(p.type));
    if (bind.endsWith(".type") || bind.includes(".look.")) queuePaint(id, id === SM().selected);
  });

  // ---------- UI ----------
  const range = (path, min, max, step, label) => {
    const v = G.getPath(path);
    return `<label class="sm-ctl"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-bind="${path}" data-type="float"/><span class="hint" data-val="${path}">${v}</span></label>`;
  };
  const color = (path, label) => `<label class="sm-color"><input type="color" value="${esc(G.getPath(path))}" data-bind="${path}"/><span>${label}</span></label>`;
  const check = (path, label) => `<label class="check small" style="margin:0"><input type="checkbox" data-bind="${path}" data-type="bool" ${G.getPath(path) ? "checked" : ""}/> ${label}</label>`;

  function typeRows(sel) {
    return typeList().map((t) => `<div class="sm-type">
        <img src="${P.thumb(t.look, 7)}" alt="" width="72" height="36"/>
        <div style="flex:1;min-width:0"><b>${esc(t.name)}</b><div class="hint">${esc(t.desc)}</div></div>
        ${sel ? `<button class="btn small" data-act="smApplyType" data-k="${esc(t.key)}">Apply</button>` : ""}
        ${t.custom ? `<button class="btn small ghost danger" data-act="smRmType" data-id="${t.id}" title="Delete type">×</button>` : ""}
      </div>`).join("");
  }

  function editor(p) {
    const base = `starmap.planets.#${p.id}`, L = `${base}.look`;
    const types = typeList();
    return `<div class="card">
        <div class="card-head"><input class="c-name" style="font-size:1.2rem" data-bind="${base}.name" value="${esc(p.name)}" aria-label="Planet name"/>
          <button class="btn small ghost" data-act="smSelect" data-id="">Close</button></div>
        <div class="mini"><input type="text" placeholder="Designation" data-bind="${base}.designation" value="${esc(p.designation)}"/><input type="text" placeholder="Allegiance" data-bind="${base}.allegiance" value="${esc(p.allegiance)}" style="flex:1"/></div>
        <textarea data-bind="${base}.notes" placeholder="Notes" style="margin-top:0.4rem;min-height:3rem">${esc(p.notes)}</textarea>
      </div>
      <div class="card">
        <h3>Appearance</h3>
        <label class="field">Planet type
          <select data-bind="${base}.type">
            <optgroup label="Types">${types.filter((t) => !t.custom).map((t) => `<option value="${t.key}" ${p.type === t.key ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</optgroup>
            ${SM().customTypes.length ? `<optgroup label="Your types">${types.filter((t) => t.custom).map((t) => `<option value="${t.key}" ${p.type === t.key ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</optgroup>` : ""}
            ${types.some((t) => t.key === p.type) ? "" : `<option value="${esc(p.type)}" selected>Custom (deleted)</option>`}
          </select></label>
        <p class="hint" style="margin-top:-0.3rem">Choosing a type resets the look to that type. Then tweak anything below.</p>
        <div class="sm-colors">${color(`${L}.low`, "Lowlands")}${color(`${L}.mid`, "Midlands")}${color(`${L}.high`, "Highlands")}${color(`${L}.waterColor`, "Water")}${color(`${L}.cloudColor`, "Clouds")}${color(`${L}.atmo`, "Atmosphere")}</div>
        ${range(`${L}.water`, 0, 0.95, 0.01, "Sea level")}
        ${range(`${L}.ice`, 0, 0.6, 0.01, "Ice caps")}
        ${range(`${L}.clouds`, 0, 1, 0.01, "Cloud cover")}
        ${range(`${L}.atmoStrength`, 0, 2, 0.05, "Atmosphere glow")}
        ${range(`${L}.detail`, 0.3, 4, 0.05, "Terrain scale")}
        ${range(`${L}.size`, 0.3, 3.5, 0.05, "Size")}
        ${range(`${L}.tilt`, 0, 90, 1, "Axial tilt")}
        ${range(`${L}.spin`, 0, 1.5, 0.01, "Spin")}
        <label class="sm-ctl"><span>Moons</span><input type="range" min="0" max="6" step="1" value="${p.look.moons}" data-bind="${L}.moons" data-type="num"/><span class="hint" data-val="${L}.moons">${p.look.moons}</span></label>
        <div class="mini" style="margin:0.5rem 0">${check(`${L}.dunes`, "Dunes")}${check(`${L}.craters`, "Craters")}${check(`${L}.bands`, "Gas bands")}${check(`${L}.spot`, "Great storm")}${check(`${L}.lights`, "City lights")}${check(`${L}.lava`, "Lava")}${check(`${L}.rings`, "Rings")}</div>
        <div class="sm-colors">${p.look.lava ? color(`${L}.lavaColor`, "Lava") : ""}${p.look.rings ? color(`${L}.ringColor`, "Rings") : ""}</div>
        <div class="c-actions"><button class="btn small" data-act="smSeed">New terrain</button><button class="btn small ghost" data-act="smResetLook">Reset to type</button></div>
        <hr class="divider"/>
        <div class="mini"><input type="text" placeholder="Name this look, e.g. Rust world" data-bind="starmap.newTypeName" value="${esc(SM().newTypeName)}" style="flex:1"/><button class="btn" data-act="smSaveType">Save as type</button></div>
      </div>
      <div class="card">
        <h3>Position</h3>
        <div class="mini small">X <input type="number" step="1" data-bind="${base}.x" data-type="float" value="${p.x}" style="width:70px"/> Y <input type="number" step="1" data-bind="${base}.y" data-type="float" value="${p.y}" style="width:70px"/> Z <input type="number" step="1" data-bind="${base}.z" data-type="float" value="${p.z}" style="width:70px"/></div>
        <p class="hint">The map is about 280 units across; Y lifts a world above or below the plane.</p>
        <button class="btn small ghost danger" data-act="smDelete">Delete planet</button>
      </div>`;
  }

  G.views.starmap = () => {
    const sm = SM();
    const sel = sm.selected ? findP(sm.selected) : null;
    if (sm.selected && !sel) sm.selected = "";
    return `<div class="sm-layout">
      <section>
        <div class="card" style="padding:0.6rem">
          <div class="mini" style="margin-bottom:0.5rem">
            <button class="btn" data-act="smOverview">Overview</button>
            <button class="btn" data-act="smAdd">+ Planet</button>
            <button class="btn" data-act="smAddGen" title="Roll a world with the Worlds generator and place it">+ Generated world</button>
            <select data-act-select="1" id="smJump" aria-label="Jump to planet"><option value="">Jump to…</option>${sm.planets.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select>
            <span style="flex:1"></span>
            ${check("starmap.labels", "Labels")}${check("starmap.grid", "Grid")}
          </div>
          <div class="sm-canvas" id="smCanvas"></div>
          <p class="hint" style="margin:0.4rem 0 0">Drag to orbit · right-drag or Shift-drag to pan · scroll or pinch to zoom · click a world to select it.</p>
        </div>
      </section>
      <section>
        ${sel ? editor(sel) : `<div class="card">
          <h2>Starmap</h2>
          <p class="small">${sm.planets.length} worlds charted. Select one to edit its details and appearance.</p>
          ${sm.planets.map((p) => `<div class="npc-list-item"><span class="name" data-act="smSelect" data-id="${p.id}">${esc(p.name)}</span><span class="small muted">${esc(typeName(p.type))}</span></div>`).join("")}
        </div>`}
        <div class="card">
          <details ${sel ? "" : "open"}><summary><b>Planet types</b> <span class="hint">${typeList().length}</span></summary>
            <p class="hint">Presets plus any looks you've saved. ${sel ? `Apply one to ${esc(sel.name)}.` : "Select a world to apply one."}</p>
            ${typeRows(!!sel)}
          </details>
        </div>
      </section>
    </div>`;
  };

  // ---------- actions ----------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  A.smSelect = (el) => select(el.dataset.id || "");
  A.smOverview = () => select("");
  function randomPos() { const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 90; return { x: Math.round(Math.cos(a) * r), y: Math.round((Math.random() - 0.5) * 30), z: Math.round(Math.sin(a) * r) }; }
  function addPlanet(o) { const p = newPlanet(Object.assign(randomPos(), o)); SM().planets.push(p); select(p.id); return p; }
  A.smAdd = () => { const keys = Object.keys(P.TYPES); addPlanet({ type: keys[Math.floor(Math.random() * keys.length)] }); };
  // Used by the Worlds tab's "Add to starmap" button too.
  G.addToStarmap = (gp) => {
    const p = addPlanet({ name: gp.name, designation: gp.designation, allegiance: gp.politics, type: P.typeFromText(gp.type), notes: `${gp.type}. ${gp.population}. Military: ${gp.military}. Notable for ${gp.feature}.` });
    G.S.tab = "starmap"; R(); return p;
  };
  A.smAddGen = () => { if (G.genPlanet) G.addToStarmap(G.genPlanet()); else A.smAdd(); };
  A.smSeed = () => { const p = findP(SM().selected); p.seed = rnd(); queuePaint(p.id, true); G.save(); };
  A.smResetLook = () => { const p = findP(SM().selected); p.look = clone(typeLook(p.type)); queuePaint(p.id, true); R(); };
  A.smApplyType = (el) => { const p = findP(SM().selected); if (!p) return; p.type = el.dataset.k; p.look = clone(typeLook(p.type)); queuePaint(p.id, true); R(); };
  A.smSaveType = () => {
    const sm = SM(), p = findP(sm.selected); const name = sm.newTypeName.trim();
    if (!name) { G.toast("Give the type a name first"); return; }
    const t = { id: uid(), name, look: clone(p.look) };
    sm.customTypes.push(t); p.type = "custom:" + t.id; sm.newTypeName = "";
    G.toast(`Saved planet type “${name}”`); R();
  };
  A.smRmType = (el) => {
    const sm = SM(); const t = sm.customTypes.find((x) => x.id === el.dataset.id);
    if (!t || !confirm(`Delete the planet type “${t.name}”? Worlds using it keep their current look.`)) return;
    sm.customTypes = sm.customTypes.filter((x) => x !== t); R();
  };
  A.smDelete = () => {
    const sm = SM(), p = findP(sm.selected);
    if (!p || !confirm(`Remove ${p.name} from the starmap?`)) return;
    sm.planets = sm.planets.filter((x) => x !== p); sm.selected = ""; overview(); R();
  };
  document.addEventListener("change", (e) => { if (e.target.id === "smJump" && e.target.value) select(e.target.value); });
})();
