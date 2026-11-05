// Worlds tab — planet generator & rival Houses (The Great Game), sietches & desert hazards (Sand and Dust).
(function () {
  const G = window.GM, X = window.DUNE_X, D = window.DUNE;
  const { esc, pick, shuffle, uid } = G;
  const d20 = () => Dice.d20();
  G.ensure("worlds", { planet: null, rival: null, rivalType: "major", sietch: null, hazard: null, saved: [] });
  const W = () => G.S.worlds;

  // ---------- generators ----------
  function genPlanet() {
    const P = X.PLANET;
    const name = pick(P.syl1) + pick(P.syl2);
    return { name, designation: `${pick(P.prefix)} ${pick(P.star)} ${pick(["I", "II", "III", "IV", "V", "VI", "VII"])}`, type: pick(P.type), politics: pick(P.politics), military: pick(P.military), population: pick(P.population), feature: pick(P.feature) };
  }
  const RIVAL_REASONS = ["an ancient feud no one can explain", "a broken betrothal", "a stolen CHOAM contract", "a duel that ended in death", "a border dispute between fiefs", "an insult at the Imperial court", "a spice debt never repaid", "competition for the same markets", "envy of the players' rising star", "an assassination never proven"];
  function genRival(type) {
    const t = X.HOUSE_TYPES[type];
    const vals = shuffle(t.npcSkills);
    const skills = {}; D.SKILLS.forEach((s, i) => (skills[s] = vals[i]));
    const lv = X.STATUS_LEVELS.slice(1, 4)[Math.floor(Math.random() * 3)]; // Weak, Respected or Strong
    const prevMax = X.STATUS_LEVELS[X.STATUS_LEVELS.indexOf(lv) - 1].max[t.col];
    const status = prevMax + 1 + Math.floor(Math.random() * (lv.max[t.col] - prevMax));
    const hi = Math.floor(Math.random() * X.HATRED.length);
    const milMax = { nascent: 1, minor: 2, major: 4, great: 5 }[type];
    return {
      name: `House ${pick(D.NAMES.imperial.family)}`, type, skills, status, level: lv.name,
      hatred: X.HATRED[hi].name, drive: X.HATRED[hi].drive, reason: pick(RIVAL_REASONS),
      traits: shuffle(X.HOUSE_TRAITS).slice(0, 2),
      domain: `${pick(X.DOMAIN_CATEGORIES)} ${pick(X.DOMAIN_KINDS)}`,
      military: X.MILITARY[Math.floor(Math.random() * (milMax + 1))].name,
    };
  }
  function genSietch() {
    const sr = d20(); const size = X.SIETCH_SIZE.find((x) => sr <= x.max);
    const ir = Math.max(1, d20() + size.mod); const inf = X.SIETCH_INFLUENCE.find((x) => ir <= x.max);
    const enemies = Array.from({ length: inf.enemies }, () => ({ name: `Sietch ${pick(X.SIETCH_NAMES)}`, why: pick(X.SIETCH_GRUDGE) }));
    return { name: `Sietch ${pick(X.SIETCH_NAMES)}`, sizeRoll: sr, size, infRoll: ir, inf, rep: pick(X.SIETCH_REP), enemies };
  }
  function genHazard() { return { terrain: pick(X.DESERT_TERRAIN), hazard: pick(X.DESERT_HAZARDS) }; }

  const planetText = (p) => `${p.name} (${p.designation}) — ${p.type}. ${p.politics}. Military: ${p.military}. ${p.population}. Notable for ${p.feature}.`;
  const rivalText = (r) => `${r.name} (${X.HOUSE_TYPES[r.type].name}, status ${r.status} ${r.level}) — ${r.traits.join(", ")}; primary domain ${r.domain}; military ${r.military}. Hatred: ${r.hatred} (drive ${r.drive}) over ${r.reason}. Skills ${D.SKILLS.map((s) => `${s} ${r.skills[s]}`).join(", ")}.`;
  const sietchText = (s) => `${s.name} — ${s.size.name} (${s.size.text}) Influence: ${s.inf.name} (${s.inf.diff} Difficulty to sway other tribes). Known as: ${s.rep}. Enemies: ${s.enemies.map((e) => `${e.name} over ${e.why}`).join("; ") || "none to speak of"}.`;

  // ---------- render ----------
  G.views.worlds = () => {
    const w = W(); const p = w.planet, r = w.rival, s = w.sietch, hz = w.hazard;
    return `<div class="grid-2">
      <section>
        <div class="card">
          <div class="card-head"><h2>Planet</h2><button class="btn primary" data-act="wPlanet">Generate</button></div>
          <p class="hint">Type, allegiance, military and population, after the world-building steps in The Great Game (p.80).</p>
          ${p ? `<h3>${esc(p.name)} <span class="pg">${esc(p.designation)}</span></h3>
            <dl class="kv"><dt>World</dt><dd>${esc(p.type)}</dd><dt>Allegiance</dt><dd>${esc(p.politics)}</dd><dt>Military</dt><dd>${esc(p.military)}</dd><dt>Population</dt><dd>${esc(p.population)}</dd><dt>Notable for</dt><dd>${esc(p.feature)}</dd></dl>
            <div class="c-actions"><button class="btn" data-act="wSave" data-k="planet">Save</button></div>` : `<div class="empty">Roll up a world for the PCs to visit, conquer, or flee.</div>`}
        </div>
        <div class="card">
          <div class="card-head"><h2>Rival House</h2><div class="mini">${G.select("worlds.rivalType", Object.keys(X.HOUSE_TYPES).map((k) => ({ v: k, l: X.HOUSE_TYPES[k].name })))}<button class="btn primary" data-act="wRival">Generate</button></div></div>
          <p class="hint">House skills by type and a Hatred drive for House actions taken without a named NPC (GG p.88–89).</p>
          ${r ? `<h3>${esc(r.name)} <span class="pg">${esc(X.HOUSE_TYPES[r.type].name)}</span></h3>
            <div class="chips">${r.traits.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}<span class="chip">Status ${r.status} · ${esc(r.level)}</span></div>
            <div class="statgrid">${D.SKILLS.map((sk) => `<div class="s" data-act="wRivalRoll" data-s="${sk}" title="Roll a House action with ${sk}"><div class="k">${sk}</div><div class="v">${r.skills[sk]}</div></div>`).join("")}</div>
            <dl class="kv"><dt>Hatred</dt><dd><b>${esc(r.hatred)}</b> — drive ${r.drive}, over ${esc(r.reason)}</dd><dt>Domain</dt><dd>${esc(r.domain)} (primary)</dd><dt>Military</dt><dd>${esc(r.military)}</dd></dl>
            <p class="hint">Click a skill to roll a House action (skill + Hatred drive) on the Dice tab.</p>
            <div class="c-actions"><button class="btn" data-act="wSave" data-k="rival">Save</button></div>` : `<div class="empty">Every House has enemies. Generate one.</div>`}
        </div>
      </section>
      <section>
        <div class="card">
          <div class="card-head"><h2>Fremen sietch</h2><button class="btn primary" data-act="wSietch">Generate</button></div>
          <p class="hint">Size, influence among the tribes, reputation and enemies (Sand and Dust p.60–61).</p>
          ${s ? `<h3>${esc(s.name)}</h3>
            <dl class="kv"><dt>Size</dt><dd><b>${esc(s.size.name)}</b> (d20 ${s.sizeRoll}) — ${esc(s.size.text)}</dd>
            <dt>Influence</dt><dd><b>${esc(s.inf.name)}</b> (${s.infRoll} incl. ${s.size.mod >= 0 ? "+" : ""}${s.size.mod}) — ${esc(s.inf.text)} <b>${esc(s.inf.diff)}</b> Difficulty to sway other tribes.</dd>
            <dt>Known as</dt><dd><span class="chip">${esc(s.rep)}</span> usable like a House trait</dd>
            <dt>Enemies</dt><dd>${s.enemies.map((e) => `${esc(e.name)}, over ${esc(e.why)}`).join("<br/>") || "None to speak of"}</dd></dl>
            <div class="c-actions"><button class="btn" data-act="wSave" data-k="sietch">Save</button></div>` : `<div class="empty">Where do your Fremen come from?</div>`}
        </div>
        <div class="card">
          <div class="card-head"><h2>Into the desert</h2><button class="btn primary" data-act="wHazard">Roll hazard</button></div>
          ${hz ? `<div class="callout"><b>${esc(hz.terrain.name)}:</b> ${esc(hz.terrain.text)}</div>
            <div class="callout threat"><b>${esc(hz.hazard.name)}:</b> ${esc(hz.hazard.text)}<br/><span class="small"><b>GM:</b> ${esc(hz.hazard.gm)}</span></div>
            <div class="c-actions"><button class="btn" data-act="wHazardTrait">Add “${esc(hz.hazard.name)}” to scene</button></div>` : ""}
          <div class="c-actions" style="margin-top:0.5rem">
            <button class="btn threat" data-act="wWormClock">Start a worm clock</button>
            <span class="hint">Adds a 6-box peril clock to the Scene tab. Tick it for rhythmic movement, thumpers, harvesting, drum sand and failed Move tests.</span>
          </div>
          <details style="margin-top:0.6rem"><summary class="small">Terrain of Arrakis</summary>
            ${X.DESERT_TERRAIN.map((t) => `<p class="small"><b>${esc(t.name)}:</b> ${esc(t.text)}</p>`).join("")}</details>
          <details><summary class="small">Running sandworms <span class="pg">SD p.75–76</span></summary>
            <p class="small">A sandworm is a force of nature, like a hurricane: nothing short of atomics stops one. Don't run it as a conflict. The only question is <b>how</b> the characters flee — what they jettison, who they leave behind, whether the carryall arrives in time. Being caught means death; injuries come from crashes and sand avalanches, not the worm. Walking without rhythm and sticking to rock keep travellers safe; Fremen with the right talents spot wormsign more easily.</p></details>
        </div>
        <div class="card">
          <h2>Saved</h2>
          ${w.saved.length ? w.saved.map((x, i) => `<div class="log-item"><span class="badge">${esc(x.kind)}</span> ${esc(x.text)} <button class="btn small ghost danger" data-act="wRm" data-i="${i}">×</button></div>`).join("") : `<div class="empty">Saved planets, Houses and sietches appear here.</div>`}
        </div>
      </section>
    </div>`;
  };

  // ---------- actions ----------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  A.wPlanet = () => { W().planet = genPlanet(); R(); };
  A.wRival = () => { W().rival = genRival(W().rivalType); R(); };
  A.wSietch = () => { W().sietch = genSietch(); R(); };
  A.wHazard = () => { W().hazard = genHazard(); R(); };
  A.wHazardTrait = () => { const hz = W().hazard; G.addSceneTrait(hz.hazard.name, "comp"); G.toast(`Added “${hz.hazard.name}” to the scene`); };
  A.wWormClock = () => { G.addSceneTask("Wormsign", 6, true); G.toast("Worm clock added to the Scene tab"); };
  A.wSave = (el) => {
    const w = W(); const k = el.dataset.k;
    const text = k === "planet" ? planetText(w.planet) : k === "rival" ? rivalText(w.rival) : sietchText(w.sietch);
    w.saved.unshift({ id: uid(), kind: { planet: "Planet", rival: "House", sietch: "Sietch" }[k], text });
    G.toast("Saved"); R();
  };
  A.wRm = (el) => { W().saved.splice(+el.dataset.i, 1); R(); };
  A.wRivalRoll = (el) => {
    const r = W().rival; const sk = el.dataset.s;
    G.prefillRoll({ side: "npc", skillName: sk, skill: r.skills[sk], driveName: "Drive", drive: r.drive, label: `${r.name} House action (${sk})` });
  };
})();
