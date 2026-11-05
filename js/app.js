// Dune GM Toolkit — UI and state.
(function () {
  const D = window.DUNE;
  const X = window.DUNE_X;
  D.ROLES = D.ROLES.concat(X.EXTRA_ROLES);
  const ALL_DRIVES = D.DRIVES.concat(Object.keys(X.COURT_DRIVES));
  const npcDrives = (n) => n.driveNames || D.DRIVES;
  const STORE_KEY = "duneGM.v1";

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const pct = (p) => (p >= 0.995 && p < 1 ? ">99" : p > 0 && p < 0.005 ? "<1" : Math.round(p * 100)) + "%";
  const focusSkill = (f) => D.SKILLS.find((s) => D.FOCUSES[s].includes(f)) || null;

  // ---------- state ----------
  function defaults() {
    return {
      tab: "roller",
      threat: 0,
      momentum: 0,
      players: 4,
      house: "minor",
      history: [],
      roller: { side: "pc", skillName: "Battle", skill: 6, driveName: "Duty", drive: 6, focus: false, difficulty: 1, comp: 1, bonus: 0, fromMomentum: 0, autoOne: false, assistants: [], npcId: "", label: "", contest: false },
      last: null,
      log: [],
      conflict: { type: "skirmish", round: 1, combatants: [] },
      npcs: [],
      scene: { name: "", traits: [], tasks: [], notes: "" },
      hook: null,
      savedHooks: [],
      ui: {
        addC: { name: "", side: "opponents", tier: "minor", req: 6 },
        npcGen: { tier: "notable", role: "", names: "auto", court: false },
        preview: null,
        openNpc: "",
        refQuery: "",
        newTrait: "",
        newTask: { name: "", req: 6, peril: false },
      },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return defaults();
      const saved = JSON.parse(raw);
      const base = defaults();
      // keep module-owned keys (house, worlds, …) that defaults() doesn't know about
      for (const k of Object.keys(saved)) if (!(k in base)) base[k] = saved[k];
      // shallow-merge each top-level object so new fields get defaults
      for (const k of Object.keys(base)) {
        if (!(k in saved)) continue;
        if (saved[k] === undefined) continue;
        if (base[k] && typeof base[k] === "object" && !Array.isArray(base[k]) && saved[k] && typeof saved[k] === "object" && !Array.isArray(saved[k])) {
          base[k] = Object.assign(base[k], saved[k]);
        } else base[k] = saved[k];
      }
      base.ui = Object.assign(defaults().ui, saved.ui || {});
      return base;
    } catch (e) {
      return defaults();
    }
  }
  let S = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable: keep working in memory */ }
  }

  // ---------- toasts ----------
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    $("#toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  // ---------- pools ----------
  // Returns false if the change was refused (not enough to spend).
  function adjust(dThreat, dMomentum, label, opts) {
    opts = opts || {};
    if (!opts.force) {
      if (dMomentum < 0 && S.momentum + dMomentum < 0) { toast(`Not enough Momentum (need ${-dMomentum}, pool has ${S.momentum})`); return false; }
      if (dThreat < 0 && S.threat + dThreat < 0) { toast(`Not enough Threat (need ${-dThreat}, pool has ${S.threat})`); return false; }
    }
    const before = { threat: S.threat, momentum: S.momentum, label: label || "" };
    S.threat = Math.max(0, S.threat + dThreat);
    let m = S.momentum + dMomentum;
    let lost = 0;
    if (m > 6) { lost = m - 6; m = 6; }
    S.momentum = Math.max(0, m);
    if (before.threat !== S.threat || before.momentum !== S.momentum) {
      S.history.push(before);
      if (S.history.length > 60) S.history.shift();
    }
    if (lost) toast(`${lost} Momentum lost — the group pool holds at most 6`);
    save();
    renderPools(dThreat !== 0, dMomentum !== 0);
    return true;
  }

  function renderPools(bumpT, bumpM) {
    const tv = $("#threatValue"), mv = $("#momentumValue");
    tv.textContent = S.threat;
    mv.textContent = S.momentum;
    if (bumpT) { tv.classList.remove("bump"); void tv.offsetWidth; tv.classList.add("bump"); }
    if (bumpM) { mv.classList.remove("bump"); void mv.offsetWidth; mv.classList.add("bump"); }
    $("#momentumPips").innerHTML = Array.from({ length: 6 }, (_, i) => `<span class="pip ${i < S.momentum ? "on" : ""}"></span>`).join("");
    const last = S.history[S.history.length - 1];
    $("#undoBtn").disabled = !last;
    $("#undoBtn").title = last ? `Undo: ${last.label || "pool change"}` : "Nothing to undo";
    const house = D.HOUSE_THREAT.find((h) => h.id === S.house);
    $("#sessionInfo").textContent = `${S.players} players · ${house ? house.name : ""}`;
  }

  function log(text, side) {
    S.log.unshift({ t: now(), text, side: side || "" });
    if (S.log.length > 150) S.log.length = 150;
  }

  // ---------- binding ----------
  function resolve(path) {
    const parts = path.split(".");
    let obj;
    const head = parts[0];
    if (head === "cmb") { obj = S.conflict.combatants.find((c) => c.id === parts[1]); parts.splice(0, 2); }
    else if (head === "npc") { obj = findNpc(parts[1]); parts.splice(0, 2); }
    else if (head === "trait") { obj = S.scene.traits.find((t) => t.id === parts[1]); parts.splice(0, 2); }
    else if (head === "task") { obj = S.scene.tasks.find((t) => t.id === parts[1]); parts.splice(0, 2); }
    else if (head === "asst") { obj = S.roller.assistants[+parts[1]]; parts.splice(0, 2); }
    else obj = S;
    if (!obj) return null;
    // "#id" segments look up an array item by its id: e.g. house.domains.#ab12.name
    const step = (o, p) => (p[0] === "#" && Array.isArray(o) ? o.find((x) => x.id === p.slice(1)) : o[p]);
    while (parts.length > 1) { obj = step(obj, parts.shift()); if (!obj) return null; }
    return [obj, parts[0]];
  }
  function getPath(path) { const r = resolve(path); return r ? r[0][r[1]] : undefined; }
  function setPath(path, v) { const r = resolve(path); if (r) r[0][r[1]] = v; }
  function coerce(el, raw) {
    const t = el.dataset.type;
    if (t === "num") { const n = parseInt(raw, 10); return isNaN(n) ? 0 : n; }
    if (t === "float") { const n = parseFloat(raw); return isNaN(n) ? 0 : n; }
    if (t === "bool") return raw === true || raw === "true";
    return raw;
  }

  // ---------- small render helpers ----------
  const stepper = (path, min, max) => {
    const v = getPath(path);
    return `<span class="stepper"><button data-act="step" data-path="${path}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="decrease">−</button><span class="v">${esc(v)}</span><button data-act="step" data-path="${path}" data-d="1" data-min="${min}" data-max="${max}" aria-label="increase">+</button></span>`;
  };
  const seg = (path, options, type) => {
    const cur = getPath(path);
    return `<span class="seg">${options.map((o) => {
      const val = typeof o === "object" ? o.v : o;
      const label = typeof o === "object" ? o.l : o;
      return `<button data-act="set" data-path="${path}" data-v="${esc(val)}" data-type="${type || ""}" class="${String(cur) === String(val) ? "on" : ""}" ${typeof o === "object" && o.title ? `title="${esc(o.title)}"` : ""}>${esc(label)}</button>`;
    }).join("")}</span>`;
  };
  const select = (path, options, type) => {
    const cur = getPath(path);
    return `<select data-bind="${path}" data-type="${type || ""}">${options.map((o) => {
      const val = typeof o === "object" ? o.v : o;
      const label = typeof o === "object" ? o.l : o;
      return `<option value="${esc(val)}" ${String(cur) === String(val) ? "selected" : ""}>${esc(label)}</option>`;
    }).join("")}</select>`;
  };
  const sideBadge = (side) => (side === "pc" ? `<span class="badge pc">Player</span>` : `<span class="badge npc">NPC</span>`);

  // =====================================================================
  // DICE ROLLER
  // =====================================================================
  function rollerOpts() {
    const r = S.roller;
    return {
      skill: r.skill, drive: r.drive, focus: r.focus, difficulty: r.difficulty,
      bonusDice: r.bonus, autoOnes: r.autoOne ? 1 : 0, compRange: r.comp,
      assistants: r.assistants.map((a) => ({ skill: a.skill, drive: a.drive, focus: a.focus })),
    };
  }

  function renderRoller() {
    const r = S.roller;
    const cost = Dice.buyCost(r.bonus);
    r.fromMomentum = clamp(r.fromMomentum, 0, cost);
    const o = Dice.odds(rollerOpts());
    const diff = D.DIFFICULTY[clamp(r.difficulty, 0, 5)];
    const npc = r.npcId ? findNpc(r.npcId) : null;

    const payLine = r.side === "pc"
      ? (cost ? `<div class="row"><span class="lbl">Pay with</span>${stepper("roller.fromMomentum", 0, cost)}<span class="small">Momentum, <b>${cost - r.fromMomentum}</b> generated as Threat</span></div>` : "")
      : (cost || r.autoOne ? `<div class="hint">GM pays <b>${cost + (r.autoOne ? 3 : 0)}</b> Threat for this test.</div>` : "");

    const npcChips = npc ? `
      <div class="callout"><b>${esc(npc.name)}</b> <span class="muted">(${esc(tierName(npc.tier))} · ${esc(npc.role)})</span>
        <div class="statgrid">${D.SKILLS.map((s) => `<div class="s ${r.skillName === s ? "on" : ""}" data-act="npcSkill" data-s="${s}"><div class="k">${s}</div><div class="v">${npc.skills[s]}</div></div>`).join("")}</div>
        ${npc.tier === "minor" ? `<div class="small">Single Drive rating: <b>${npc.drives.Duty}</b></div>` :
        `<div class="statgrid">${npcDrives(npc).map((d) => `<div class="s ${r.driveName === d ? "on" : ""}" data-act="npcDrive" data-d="${d}"><div class="k">${d}</div><div class="v">${npc.drives[d]}</div></div>`).join("")}</div>`}
        <div class="small">Focuses: ${npc.focuses.map((f) => esc(f)).join(", ") || "—"}</div>
      </div>` : "";

    const assists = r.assistants.map((a, i) => `
      <div class="assist-row">
        <span class="small"><b>Assist ${i + 1}</b></span>
        Skill ${stepper(`asst.${i}.skill`, 1, 12)} Drive ${stepper(`asst.${i}.drive`, 1, 12)}
        <label class="check small"><input type="checkbox" data-bind="asst.${i}.focus" data-type="bool" ${a.focus ? "checked" : ""}/> Focus</label>
        <button class="btn small ghost danger" data-act="rmAssist" data-i="${i}">Remove</button>
      </div>`).join("");

    return `
    <div class="grid-roller">
      <section>
        <div class="card">
          <div class="card-head"><h2>Skill test</h2>${seg("roller.side", [{ v: "pc", l: "Player" }, { v: "npc", l: "NPC / GM" }])}</div>
          <div class="row"><span class="lbl">NPC</span>
            <select data-bind="roller.npcId"><option value="">— none —</option>${S.npcs.map((n) => `<option value="${n.id}" ${r.npcId === n.id ? "selected" : ""}>${esc(n.name)} (${esc(tierName(n.tier))})</option>`).join("")}</select>
            ${S.npcs.length ? "" : `<span class="hint">Save NPCs on the NPCs tab to load them here.</span>`}
          </div>
          ${npcChips}
          <div class="row"><span class="lbl">Skill</span>${select("roller.skillName", D.SKILLS)}${stepper("roller.skill", 1, 12)}</div>
          <div class="row"><span class="lbl">Drive</span>${select("roller.driveName", ALL_DRIVES.concat(["Drive"]))}${stepper("roller.drive", 1, 12)}</div>
          <div class="row"><span class="lbl">Focus</span><label class="check"><input type="checkbox" data-bind="roller.focus" data-type="bool" ${r.focus ? "checked" : ""}/> A focus applies — crit on ≤ ${r.skill}</label></div>
          <div class="target-line">Target <b>${r.skill + r.drive}</b> · each die ≤ ${r.skill + r.drive} = 1 success · ≤ ${r.focus ? r.skill : 1} = 2 successes</div>
          <hr class="divider"/>
          <div class="row"><span class="lbl">Difficulty</span>${seg("roller.difficulty", [0, 1, 2, 3, 4, 5].map((n) => ({ v: n, l: n, title: D.DIFFICULTY[n].name })), "num")}${stepper("roller.difficulty", 0, 12)}</div>
          <div class="hint" style="margin:-0.4rem 0 0.6rem">${r.difficulty > 5 ? "Beyond Epic" : `<b>${diff.name}</b> — ${esc(diff.eg)}`}${r.contest ? ` · <span class="badge npc">Contest</span>` : ""}</div>
          <div class="row"><span class="lbl">Comp. range</span>${seg("roller.comp", D.COMP_RANGE.map((c) => ({ v: c.r, l: c.r, title: `${c.name}: complications on ${c.on}` })), "num")}<span class="hint">${D.COMP_RANGE[r.comp - 1].name} (${D.COMP_RANGE[r.comp - 1].on})</span></div>
          <hr class="divider"/>
          <div class="row"><span class="lbl">Bonus d20</span>${seg("roller.bonus", [0, 1, 2, 3].map((n) => ({ v: n, l: `+${n}` })), "num")}<span class="hint">cost ${cost} (1 / 2 / 3 per die)</span></div>
          ${payLine}
          <div class="row"><span class="lbl">Determination</span><label class="check"><input type="checkbox" data-bind="roller.autoOne" data-type="bool" ${r.autoOne ? "checked" : ""}/> Set one die to an automatic 1 ${r.side === "npc" ? "(NPC: 3 Threat)" : ""}</label></div>
          <div class="row"><span class="lbl">Assistance</span><button class="btn small" data-act="addAssist">+ Add assistant (1d20)</button></div>
          ${assists}
          <div class="row"><span class="lbl">Label</span><input type="text" placeholder="e.g. Kara negotiates with the merchant" data-bind="roller.label" value="${esc(r.label)}" style="flex:1"/></div>
          <div class="odds">
            <div class="stat"><div class="k">Pass chance</div><div class="v">${pct(o.pass)}</div></div>
            <div class="stat"><div class="k">Avg successes</div><div class="v">${o.expected.toFixed(1)}</div></div>
            <div class="stat"><div class="k">Complication</div><div class="v">${pct(o.comp)}</div></div>
          </div>
          <button class="btn primary big" data-act="roll">Roll ${2 + r.bonus}d20${r.assistants.length ? ` + ${r.assistants.length} assist` : ""} <span class="small" style="opacity:.75">(R)</span></button>
        </div>
      </section>
      <section>
        ${renderResult()}
        <div class="card">
          <div class="card-head"><h3>Log</h3><button class="btn small ghost" data-act="clearLog">Clear</button></div>
          <div class="log">${S.log.length ? S.log.map((l) => `<div class="log-item"><span class="t">${esc(l.t)}</span>${l.side ? sideBadge(l.side) + " " : ""}${esc(l.text)}</div>`).join("") : `<div class="empty">No rolls yet.</div>`}</div>
        </div>
      </section>
    </div>`;
  }

  function renderResult() {
    const L = S.last;
    if (!L) return `<div class="card"><h2>Result</h2><div class="empty">Set up the test and roll. Click dice afterward to select them for a Determination re-roll.</div></div>`;
    const res = L.result;
    const isPC = L.side === "pc";
    const dieHtml = (d, i, assist) => {
      const cls = ["die", d.successes === 2 ? "s2" : d.successes === 1 ? "s1" : "", d.complication ? "comp" : "", assist ? "assist" : "", L.sel && L.sel.includes((assist ? "a" : "m") + i) ? "sel" : ""].join(" ");
      const lab = d.auto ? "auto" : d.successes === 2 ? "crit" : d.successes === 1 ? "hit" : "miss";
      return `<div class="${cls}" data-act="selDie" data-k="${assist ? "a" : "m"}${i}" title="${assist ? "Assistant die" : "Click to select for re-roll"}">${d.value}<small>${assist ? "asst" : lab}</small>${d.complication ? `<span class="tag">COMP</span>` : ""}</div>`;
    };
    const remaining = Math.max(0, res.momentum - L.spent);
    const compsLeft = res.complications - L.compsBought;
    const skillForComps = L.skillName && D.COMPLICATIONS[L.skillName] ? L.skillName : "Battle";
    const selCount = (L.sel || []).length;

    let resolution = "";
    if (res.passed && res.momentum > 0 && !L.banked) {
      resolution = `<div class="callout momentum">
        <b>${res.momentum}</b> Momentum generated. Spend it now on this test (Obtain Information 1/question, Create Trait 2, Create Asset 2, …), then ${isPC ? "save the rest to the group pool" : "the NPC adds the rest to Threat"}.
        <div class="row" style="margin:0.4rem 0 0"><span class="small">Spent on this test</span>${stepper("last.spent", 0, res.momentum)}
        <button class="btn ${isPC ? "momentum" : "threat"}" data-act="bank">${isPC ? `Save ${remaining} to pool` : `Add ${remaining} to Threat`}</button></div></div>`;
    } else if (L.banked) {
      resolution = `<div class="callout">Momentum resolved.</div>`;
    }
    if (L.contest && !res.passed && !L.contestPaid) {
      const n = res.shortfall;
      resolution += `<div class="callout ${isPC ? "threat" : "momentum"}">Contest lost: the opposing side gains <b>${n}</b> Momentum to spend immediately.
        <div class="row" style="margin:0.4rem 0 0"><button class="btn ${isPC ? "threat" : "momentum"}" data-act="contestPay">${isPC ? `NPC adds ${n} to Threat` : `Save ${n} to Momentum pool`}</button><span class="hint">(or spend it first, then skip this)</span></div></div>`;
    }
    if (!res.passed) {
      resolution += `<div class="hint">Failed — the GM may allow <b>success at a cost</b>: the goal is reached, but with one or more extra complications and no Momentum.</div>`;
    }

    const comps = res.complications ? `<div class="callout threat">
        <b>${res.complications}</b> complication${res.complications > 1 ? "s" : ""}${L.compsBought ? ` (${L.compsBought} bought off)` : ""}.
        ${compsLeft > 0 ? `<button class="btn small threat" data-act="buyComp">${isPC ? "Buy one off (+2 Threat)" : "Buy one off (−2 Threat)"}</button>` : ""}
        <div class="chips" style="margin-top:0.4rem">${D.COMPLICATIONS[skillForComps].map((c) => `<span class="chip chip-add" data-act="addSceneComp" data-name="${esc(c)}" title="Add to scene traits">+ ${esc(c)}</span>`).join("")}</div>
      </div>` : "";

    return `<div class="card">
      <div class="card-head"><h2>Result</h2><div>${sideBadge(L.side)} <span class="muted small">${esc(L.title)}</span></div></div>
      <div class="dice">${res.dice.map((d, i) => dieHtml(d, i, false)).join("")}${res.assists.map((d, i) => dieHtml(d, i, true)).join("")}</div>
      <div class="verdict ${res.passed ? "pass" : "fail"}">${res.successes} success${res.successes === 1 ? "" : "es"} vs ${L.difficulty} — ${res.passed ? "Passed" : `Failed by ${res.shortfall}`}</div>
      <div class="small muted">Target ${res.target}${L.focus ? `, focus crit ≤ ${res.critMax}` : ""}${res.assists.length ? ` · assist adds ${res.assistSuccesses}${res.mainSuccesses ? "" : " (ignored: no success of your own)"}` : ""}</div>
      ${comps}
      ${resolution}
      <div class="row" style="margin-top:0.6rem">
        <button class="btn" data-act="reroll" ${selCount ? "" : "disabled"}>Re-roll ${selCount || ""} selected ${isPC ? "(Determination)" : "(−3 Threat)"}</button>
        <button class="btn" data-act="toContest" title="Opponent rolled first: their successes become the Difficulty for the other side">Use ${res.successes} as contest Difficulty →</button>
      </div>
    </div>`;
  }

  function doRoll() {
    const r = S.roller;
    const cost = Dice.buyCost(r.bonus);
    if (r.side === "pc") {
      const m = clamp(r.fromMomentum, 0, cost);
      if (m > S.momentum) { toast(`Not enough Momentum: pool has ${S.momentum}, you chose to pay ${m}`); return; }
      if (cost) adjust(cost - m, -m, `Bought ${r.bonus} bonus d20`);
    } else {
      const t = cost + (r.autoOne ? 3 : 0);
      if (t > S.threat) { toast(`Not enough Threat: need ${t}, pool has ${S.threat}`); return; }
      if (t) adjust(-t, 0, `NPC bought dice / Determination`);
    }
    const result = Dice.rollTest(rollerOpts());
    const npc = r.npcId ? findNpc(r.npcId) : null;
    const title = r.label || `${npc ? npc.name + ": " : ""}${r.skillName} + ${r.driveName}`;
    S.last = { side: r.side, result, difficulty: r.difficulty, comp: r.comp, focus: r.focus, skillName: r.skillName, title, spent: 0, banked: false, compsBought: 0, contest: r.contest, contestPaid: false, sel: [] };
    r.contest = false;
    const vals = result.dice.map((d) => d.value).concat(result.assists.map((d) => `a${d.value}`)).join(", ");
    log(`${title} — [${vals}] → ${result.successes} vs D${S.last.difficulty}: ${result.passed ? `PASS${result.momentum ? ` (+${result.momentum} Momentum)` : ""}` : `FAIL by ${result.shortfall}`}${result.complications ? `, ${result.complications} complication(s)` : ""}`, r.side);
    save();
    render();
  }

  function doReroll() {
    const L = S.last;
    if (!L || !L.sel.length) return;
    if (L.side === "npc") { if (!adjust(-3, 0, "NPC Determination re-roll")) return; }
    const res = L.result;
    L.sel.forEach((k) => {
      const i = +k.slice(1);
      if (k[0] === "m") res.dice[i] = Dice.rerollDie(res.dice[i], res.target, res.critMax, L.comp);
    });
    Object.assign(res, Dice.evaluate({ dice: res.dice, assists: res.assists, difficulty: L.difficulty }));
    L.sel = [];
    L.spent = 0;
    log(`${L.title} — re-rolled → ${res.successes} vs D${L.difficulty}: ${res.passed ? "PASS" : "FAIL"}`, L.side);
    save();
    render();
  }

  // =====================================================================
  // CONFLICT
  // =====================================================================
  const CONFLICT_TYPES = {
    duel: { name: "Duel", skill: "Battle", pg: "p.171", tip: "One-on-one, close-quarters. Shields make ranged weapons nearly useless. Usually one or two zones; weapons, armor and shields are the key assets." },
    skirmish: { name: "Skirmish", skill: "Battle", pg: "p.174", tip: "A handful per side. Zones matter: cover, high ground, doorways. Ranged weapons work best on the unshielded or in ambush." },
    warfare: { name: "Warfare", skill: "Battle", pg: "p.180", tip: "Assets are units: infantry, ornithopters, artillery. Military assets are defeated as an extended task. Zones are objectives and terrain." },
    espionage: { name: "Espionage", skill: "Discipline", pg: "p.177", tip: "Infiltration and counter-intelligence. Assets are agents, access, security systems. Failure can escalate into a skirmish." },
    intrigue: { name: "Intrigue", skill: "Communicate", pg: "p.184", tip: "Social conflict of secrets and agendas. Zones are free-floating (people, factions, rumors). Assets are leverage, favors, information." },
  };
  const TIERS = [
    { v: "pc", l: "Player character" },
    { v: "major", l: "Major NPC" },
    { v: "notable", l: "Notable NPC / supporting" },
    { v: "minor", l: "Minor NPC / supporting" },
  ];
  const tierName = (t) => ({ pc: "PC", major: "Major", notable: "Notable", minor: "Minor" }[t] || t);
  const canResist = (c) => c.tier !== "minor";
  const effReq = (c) => c.req + c.assets.filter((a) => a.def).reduce((s, a) => s + a.q, 0);

  function newCombatant(o) {
    return Object.assign({ id: uid(), name: "Unnamed", side: "opponents", tier: "minor", req: 6, progress: 0, assets: [], comps: [], acted: false, defeated: false, resisted: false, atRisk: false, lastQ: 0, zone: "", npcId: "", hitOpen: false, hitQ: 0, hitBoost: 0, newAsset: "", newAssetQ: 0, newAssetDef: false, newComp: "" }, o);
  }

  function renderCombatant(c) {
    const req = effReq(c);
    const minor = c.tier === "minor";
    const defs = c.assets.filter((a) => a.def).length;
    const boxes = minor ? `<div class="small muted">Minor: defeated by any successful attack.</div>` :
      `<div class="track" title="Defeat track: requirement ${req}">${Array.from({ length: req }, (_, i) => `<span class="box ${i < c.progress ? "on" : ""}" data-act="trackSet" data-id="${c.id}" data-i="${i + 1}"></span>`).join("")}<span class="small muted" style="margin-left:4px">${c.progress}/${req}</span></div>`;
    const attackerIsPlayers = c.side === "opponents";
    const hit = c.hitOpen ? `<div class="hitbox">
        <div class="mini">Asset Quality ${stepper(`cmb.${c.id}.hitQ`, 0, 4)}
        Boost ${stepper(`cmb.${c.id}.hitBoost`, 0, 5)} <span class="hint">(+1 each for 2 ${attackerIsPlayers ? "Momentum" : "Threat"})</span></div>
        <div class="mini" style="margin-top:0.4rem">
          <button class="btn small primary" data-act="applyHit" data-id="${c.id}">${minor ? "Defeat" : `Apply ${2 + c.hitQ + c.hitBoost}`}</button>
          <button class="btn small ghost" data-act="toggleHit" data-id="${c.id}">Cancel</button>
          <span class="hint">Attacker's Difficulty +${defs} from defensive assets</span>
        </div></div>` : "";
    const resistCost = 1 + c.lastQ;
    const risk = c.atRisk ? `<div class="callout threat"><b>Would be defeated.</b> ${c.resisted ? "Already resisted this scene." : `Resist Defeat costs ${resistCost} and a complication.`}
        <div class="mini" style="margin-top:0.35rem">
          ${!c.resisted ? (c.side === "players"
            ? `<button class="btn small momentum" data-act="resist" data-id="${c.id}" data-pay="m">Resist (−${resistCost} Momentum)</button><button class="btn small threat" data-act="resist" data-id="${c.id}" data-pay="t">Resist (+${resistCost} Threat)</button>`
            : `<button class="btn small threat" data-act="resist" data-id="${c.id}" data-pay="t">Resist (−${resistCost} Threat)</button>`) : ""}
          <button class="btn small" data-act="acceptDefeat" data-id="${c.id}">Accept defeat</button>
        </div></div>` : "";
    return `<div class="combatant ${c.acted ? "acted" : ""} ${c.defeated ? "defeated" : ""} ${c.atRisk ? "at-risk" : ""}">
      <div class="c-head">
        <input class="c-name" data-bind="cmb.${c.id}.name" value="${esc(c.name)}" aria-label="Name"/>
        <span class="badge">${tierName(c.tier)}</span>
        ${c.defeated ? `<span class="badge npc">Defeated</span>` : ""}
        ${c.resisted ? `<span class="badge" title="Resist Defeat used this scene">Resisted</span>` : ""}
      </div>
      <div class="mini small" style="margin-top:0.3rem">
        ${minor ? "" : `Defeat req. ${stepper(`cmb.${c.id}.req`, 1, 16)}`}
        Zone <input type="text" data-bind="cmb.${c.id}.zone" value="${esc(c.zone)}" placeholder="—" style="width:110px"/>
      </div>
      ${boxes}
      <div class="chips">
        ${c.assets.map((a) => `<span class="chip ${a.def ? "def" : ""}" title="${a.def ? "Defensive asset" : "Asset"}">${a.def ? "🛡 " : ""}${esc(a.name)} Q${a.q}<button data-act="rmAsset" data-id="${c.id}" data-a="${a.id}" aria-label="remove">×</button></span>`).join("")}
        ${c.comps.map((t, i) => `<span class="chip comp">${esc(t)}<button data-act="rmComp" data-id="${c.id}" data-i="${i}" aria-label="remove">×</button></span>`).join("")}
      </div>
      ${c.addOpen ? `<div class="mini small hitbox">
        <input type="text" placeholder="Asset" data-bind="cmb.${c.id}.newAsset" value="${esc(c.newAsset)}"/>
        Q ${stepper(`cmb.${c.id}.newAssetQ`, 0, 4)}
        <label class="check small" style="margin:0"><input type="checkbox" data-bind="cmb.${c.id}.newAssetDef" data-type="bool" ${c.newAssetDef ? "checked" : ""}/>Defensive</label>
        <button class="btn small" data-act="addAsset" data-id="${c.id}">Add</button>
        <input type="text" placeholder="Complication / trait" data-bind="cmb.${c.id}.newComp" value="${esc(c.newComp)}"/>
        <button class="btn small" data-act="addComp" data-id="${c.id}">Add</button>
      </div>` : ""}
      ${hit}${risk}
      <div class="c-actions">
        <button class="btn small ${c.acted ? "primary" : ""}" data-act="toggleActed" data-id="${c.id}">${c.acted ? "✓ Acted" : "Mark acted"}</button>
        ${c.defeated ? "" : `<button class="btn small" data-act="toggleHit" data-id="${c.id}">Hit…</button>`}
        <button class="btn small ${c.addOpen ? "primary" : ""}" data-act="toggleAdd" data-id="${c.id}">+ Asset / trait</button>
        ${c.npcId ? `<button class="btn small" data-act="rollNpc" data-npc="${c.npcId}">Roll</button>` : ""}
        <button class="btn small ghost" data-act="toggleDefeated" data-id="${c.id}">${c.defeated ? "Revive" : "Defeated"}</button>
        <button class="btn small ghost danger" data-act="rmCombatant" data-id="${c.id}">Remove</button>
      </div>
    </div>`;
  }

  function renderConflict() {
    const C = S.conflict;
    const t = CONFLICT_TYPES[C.type];
    const side = (s) => C.combatants.filter((c) => c.side === s);
    const toAct = (s) => side(s).filter((c) => !c.acted && !c.defeated).length;
    const a = S.ui.addC;
    return `
    <div class="card">
      <div class="card-head">
        <h2>Conflict — Round ${C.round}</h2>
        <div class="mini">${select("conflict.type", Object.keys(CONFLICT_TYPES).map((k) => ({ v: k, l: CONFLICT_TYPES[k].name })))}
          <button class="btn" data-act="nextRound">Next round</button>
          <button class="btn ghost danger" data-act="endConflict">End conflict</button></div>
      </div>
      <p class="small"><b>${t.name}</b> <span class="pg">(Core ${t.pg})</span> — ${esc(t.tip)}</p>
      <div class="row small" style="margin-bottom:0.3rem">
        <span class="lbl">Initiative</span>
        <button class="btn small momentum" data-act="keepInit" data-pay="m">Players keep (−2 Momentum)</button>
        <button class="btn small threat" data-act="keepInit" data-pay="pt">Players keep (+2 Threat)</button>
        <button class="btn small threat" data-act="keepInit" data-pay="t">Opponents keep / go first (−2 Threat)</button>
      </div>
      <div class="hint">To act this round — Players: <b>${toAct("players")}</b> · Opponents: <b>${toAct("opponents")}</b>. After a turn, pass to the other side or Keep the Initiative (extra action at +1 Difficulty, or hand to an ally). A side can't keep it twice in a row.</div>
    </div>
    <div class="grid-2">
      ${["players", "opponents"].map((s) => `<section class="side-${s}">
        <div class="side-head"><h3>${s === "players" ? "Players" : "Opponents"}</h3></div>
        ${side(s).map(renderCombatant).join("") || `<div class="empty">No one here yet.</div>`}
      </section>`).join("")}
    </div>
    <div class="card">
      <h3>Add to conflict</h3>
      <div class="mini">
        <input type="text" placeholder="Name" data-bind="ui.addC.name" value="${esc(a.name)}"/>
        ${select("ui.addC.side", [{ v: "players", l: "Players' side" }, { v: "opponents", l: "Opponents" }])}
        ${select("ui.addC.tier", TIERS)}
        ${a.tier === "minor" ? "" : `Defeat req. (${t.skill}) ${stepper("ui.addC.req", 1, 16)}`}
        <button class="btn primary" data-act="addCombatant">Add</button>
        <button class="btn" data-act="addMinorSquad" title="Add 3 minor NPCs">+3 minor mooks</button>
      </div>
      ${S.npcs.length ? `<div class="mini" style="margin-top:0.6rem"><span class="small muted">From roster:</span>${S.npcs.map((n) => `<button class="btn small" data-act="npcToConflict" data-npc="${n.id}">${esc(n.name)}</button>`).join("")}</div>` : ""}
      <p class="hint" style="margin-top:0.6rem">Defeat track = the most appropriate skill (+ Quality of defensive assets). Each successful attack scores 2 + asset Quality. PCs, notable and major characters may Resist Defeat once per scene for 1 + attacking asset Quality (Core p.167).</p>
    </div>`;
  }

  // =====================================================================
  // NPC GENERATOR
  // =====================================================================
  function findNpc(id) {
    if (S.ui.preview && S.ui.preview.id === id) return S.ui.preview;
    return S.npcs.find((n) => n.id === id);
  }

  function genName(style, role) {
    if (style === "auto") {
      if (["Fremen Warrior", "Desert Guide"].includes(role.role)) style = "fremen";
      else if (["Servant", "Street Tough", "Thief", "Spice Harvester Crew", "Water Seller", "Smuggler", "House Trooper", "House Guard"].includes(role.role)) style = "commoner";
      else style = "imperial";
    }
    const N = D.NAMES[style];
    if (style === "fremen") return `${pick(N.given)} ${pick(N.epithet)}`;
    return `${pick(N.given)} ${pick(N.family)}`;
  }

  function generateNpc(tier, roleName, nameStyle, court) {
    const role = roleName ? D.ROLES.find((r) => r.role === roleName) : pick(D.ROLES);
    const others = shuffle(D.SKILLS.filter((s) => s !== role.primary && s !== role.secondary));
    const skills = {};
    D.SKILLS.forEach((s) => (skills[s] = 4));
    const drives = {};
    const statements = {};
    let traits = [role.trait];
    let abilities = [];
    let focusCount;

    if (tier === "minor") {
      skills[role.primary] = 6; skills[role.secondary] = 5; skills[others[0]] = 5;
      const dv = pick([5, 6, 6, 7]);
      D.DRIVES.forEach((d) => (drives[d] = dv));
      focusCount = 1;
    } else if (tier === "notable") {
      skills[role.primary] = 7; skills[role.secondary] = 6; skills[others[0]] = 5; skills[others[1]] = 5;
      D.DRIVES.forEach((d) => (drives[d] = 5));
      const second = pick(D.DRIVES.filter((d) => d !== role.drive));
      drives[role.drive] = 7; drives[second] = 6;
      statements[role.drive] = pick(D.STATEMENTS[role.drive]);
      if (Math.random() < 0.5) statements[second] = pick(D.STATEMENTS[second]);
      if (Math.random() < 0.6) traits.push(pick(D.REPUTATION));
      focusCount = 3;
      abilities = pickAbilities(Math.random() < 0.3 ? 2 : 1, [role.primary, role.secondary]);
    } else {
      skills[role.primary] = 8; skills[role.secondary] = 7;
      let pts = 4;
      while (pts > 0) { const s = pick(others); if (skills[s] < 7) { skills[s]++; pts--; } }
      const vals = shuffle([6, 5, 4]);
      const rest = shuffle(D.DRIVES.filter((d) => d !== role.drive));
      drives[role.drive] = pick([8, 8, 7]);
      const high = drives[role.drive] === 8 ? 7 : 8;
      drives[rest[0]] = high; drives[rest[1]] = vals[0]; drives[rest[2]] = vals[1]; drives[rest[3]] = vals[2];
      D.DRIVES.forEach((d) => { if (drives[d] >= 6) statements[d] = pick(D.STATEMENTS[d]); });
      traits.push(pick(D.REPUTATION));
      if (Math.random() < 0.6) traits.push(pick(D.FACTIONS));
      focusCount = 3 + Math.floor(Math.random() * 3);
      abilities = pickAbilities(2 + Math.floor(Math.random() * 3), [role.primary, role.secondary]);
    }

    // Focuses: role suggestions first, then the primary/secondary skill lists.
    const pool = shuffle(role.focus).concat(shuffle(D.FOCUSES[role.primary]), shuffle(D.FOCUSES[role.secondary]));
    const focuses = [];
    for (const f of pool) { if (focuses.length >= focusCount) break; if (!focuses.includes(f)) focuses.push(f); }

    // Power and Pawns (p.81): swap one non-signature drive for a new court drive, keeping its rating.
    let driveNames = D.DRIVES.slice();
    if (court && tier !== "minor") {
      const out = pick(D.DRIVES.filter((d) => d !== role.drive));
      const inn = pick(Object.keys(X.COURT_DRIVES));
      driveNames = driveNames.map((d) => (d === out ? inn : d));
      drives[inn] = drives[out]; delete drives[out];
      if (statements[out] || drives[inn] >= 6) { delete statements[out]; statements[inn] = pick(X.COURT_DRIVES[inn].statements); }
    }

    return { id: uid(), name: genName(nameStyle, role), tier, role: role.role, traits, skills, drives, driveNames, statements, focuses, abilities, notes: "" };
  }

  function pickAbilities(n, skills) {
    const out = [];
    const opts = shuffle(D.SPECIAL_ABILITIES);
    for (let i = 0; i < n && i < opts.length; i++) {
      const sk = i === 0 ? skills[0] : pick(skills.concat(D.SKILLS));
      out.push({ name: opts[i].name, text: opts[i].text.replace("{skill}", sk) });
    }
    return out;
  }

  function renderNpcCard(n, isPreview) {
    const conflictSkill = CONFLICT_TYPES[S.conflict.type].skill;
    const drives = n.tier === "minor"
      ? `<div class="small">Drive: <b>${n.drives.Duty}</b> <span class="muted">(single rating for every test, no statements)</span></div>`
      : `<div class="statgrid">${npcDrives(n).map((d) => `<div class="s" title="${esc(n.statements[d] || "No statement")}"><div class="k">${d}</div><div class="v">${n.drives[d]}</div></div>`).join("")}</div>`;
    const statements = Object.keys(n.statements).length ? `<dl class="kv">${npcDrives(n).filter((d) => n.statements[d]).map((d) => `<dt>${d}</dt><dd>“${esc(n.statements[d])}”</dd>`).join("")}</dl>` : "";
    return `<div class="npc-card">
      <div class="card-head" style="margin-bottom:0.2rem">
        <div><h3>${isPreview ? esc(n.name) : `<input class="c-name" data-bind="npc.${n.id}.name" value="${esc(n.name)}"/>`}</h3>
        <div class="npc-sub">${esc(tierName(n.tier))} NPC · ${esc(n.role)}</div></div>
        <span class="badge npc">${esc(tierName(n.tier))}</span>
      </div>
      <div class="chips">${n.traits.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <div class="statgrid">${D.SKILLS.map((s) => `<div class="s" data-act="rollNpc" data-npc="${n.id}" data-s="${s}" title="Roll ${s}"><div class="k">${s}</div><div class="v">${n.skills[s]}</div></div>`).join("")}</div>
      ${drives}
      ${statements}
      <dl class="kv">
        <dt>Focuses</dt><dd>${n.focuses.map(esc).join(", ") || "—"}</dd>
        ${n.abilities.length ? `<dt>Abilities</dt><dd>${n.abilities.map((a) => `<b>${esc(a.name)}:</b> ${esc(a.text)}`).join("<br/>")}</dd>` : ""}
        <dt>Defeat</dt><dd>${n.tier === "minor" ? "Any successful attack" : `Track ${n.skills[conflictSkill]} (${conflictSkill}, for a ${CONFLICT_TYPES[S.conflict.type].name.toLowerCase()})`}${n.tier !== "minor" ? " · may Resist Defeat" : ""}</dd>
        <dt>Threat</dt><dd class="small">Spends Threat instead of Momentum; 3 Threat = 1 Determination. Unspent Momentum → Threat.</dd>
      </dl>
      ${isPreview ? "" : `<textarea placeholder="Notes: motives, secrets, quirks…" data-bind="npc.${n.id}.notes">${esc(n.notes)}</textarea>`}
      <div class="c-actions">
        ${isPreview ? `<button class="btn primary" data-act="savePreview">Save to roster</button><button class="btn" data-act="genNpc">Re-roll</button>` : ""}
        <button class="btn" data-act="npcToConflict" data-npc="${n.id}">Add to conflict</button>
        <button class="btn" data-act="rollNpc" data-npc="${n.id}">Roll</button>
        <button class="btn" data-act="chFromNpc" data-npc="${n.id}" title="Edit this NPC in the character creator">Open in creator</button>
        ${isPreview ? "" : `<button class="btn ghost danger" data-act="rmNpc" data-npc="${n.id}">Delete</button>`}
      </div>
    </div>`;
  }

  function renderNpcs() {
    const g = S.ui.npcGen;
    const open = S.npcs.find((n) => n.id === S.ui.openNpc);
    return `<div class="grid-2">
      <section>
        <div class="card">
          <h2>NPC generator</h2>
          <p class="small muted">Built on the NPC creation rules (Core p.137 & p.240). Click a skill to roll it.</p>
          <div class="row"><span class="lbl">Tier</span>${seg("ui.npcGen.tier", [{ v: "minor", l: "Minor" }, { v: "notable", l: "Notable" }, { v: "major", l: "Major" }])}</div>
          <div class="row"><span class="lbl">Role</span>${select("ui.npcGen.role", [{ v: "", l: "Random" }].concat(D.ROLES.map((r) => ({ v: r.role, l: `${r.role} (${r.primary})` }))))}</div>
          <div class="row"><span class="lbl">Names</span>${seg("ui.npcGen.names", [{ v: "auto", l: "Auto" }, { v: "imperial", l: "Imperial" }, { v: "fremen", l: "Fremen" }, { v: "commoner", l: "Commoner" }])}</div>
          <div class="row"><span class="lbl">Drives</span><label class="check"><input type="checkbox" data-bind="ui.npcGen.court" data-type="bool" ${g.court ? "checked" : ""}/> Swap in a Power and Pawns drive (Challenge, Glory, Hate, Honor, Indulgence, Love)</label></div>
          <button class="btn primary big" data-act="genNpc">Generate</button>
        </div>
        ${S.ui.preview ? renderNpcCard(S.ui.preview, true) : ""}
      </section>
      <section>
        <div class="card">
          <div class="card-head"><h2>Roster</h2><span class="muted small">${S.npcs.length} saved</span></div>
          ${S.npcs.length ? S.npcs.map((n) => `<div class="npc-list-item"><span class="name" data-act="openNpc" data-npc="${n.id}">${esc(n.name)}</span><span class="small muted">${esc(n.role)}</span><span class="badge">${esc(tierName(n.tier))}</span></div>`).join("") : `<div class="empty">Generated NPCs you save appear here.</div>`}
        </div>
        ${open ? renderNpcCard(open, false) : ""}
      </section>
    </div>`;
  }

  function loadNpcIntoRoller(npc, skillName) {
    const r = S.roller;
    r.side = "npc";
    r.npcId = npc.id;
    r.skillName = skillName || D.SKILLS.reduce((a, b) => (npc.skills[b] > npc.skills[a] ? b : a));
    r.skill = npc.skills[r.skillName];
    if (npc.tier === "minor") { r.driveName = "Drive"; r.drive = npc.drives.Duty; }
    else { r.driveName = npcDrives(npc).reduce((a, b) => (npc.drives[b] > npc.drives[a] ? b : a)); r.drive = npc.drives[r.driveName]; }
    r.focus = false;
    r.label = "";
    S.tab = "roller";
  }

  function npcToConflict(npc) {
    const sk = CONFLICT_TYPES[S.conflict.type].skill;
    S.conflict.combatants.push(newCombatant({ name: npc.name, side: "opponents", tier: npc.tier, req: npc.skills[sk], npcId: npc.id }));
    toast(`${npc.name} joins the conflict`);
  }

  // =====================================================================
  // SCENE
  // =====================================================================
  function renderScene() {
    const sc = S.scene;
    const nt = S.ui.newTask;
    return `<div class="grid-2">
      <section>
        <div class="card">
          <h2>Scene</h2>
          <label class="field">Scene name<input type="text" data-bind="scene.name" value="${esc(sc.name)}" placeholder="e.g. The Governor's soirée"/></label>
          <h3>Traits & complications</h3>
          <div class="chips">${sc.traits.map((t) => `<span class="chip ${t.kind === "comp" ? "comp" : ""}">${esc(t.name)}${t.rank > 1 ? ` ${t.rank}` : ""}
              <button data-act="traitRank" data-id="${t.id}" data-d="1" title="Increase rank">+</button><button data-act="traitRank" data-id="${t.id}" data-d="-1" title="Decrease rank">−</button><button data-act="rmTrait" data-id="${t.id}" title="Remove">×</button></span>`).join("") || `<span class="empty">No traits yet.</span>`}</div>
          <div class="mini" style="margin-top:0.5rem">
            <input type="text" placeholder="New trait, e.g. Thick Smoke" data-bind="ui.newTrait" value="${esc(S.ui.newTrait)}" style="flex:1"/>
            <button class="btn" data-act="addTrait">Add trait</button>
            <button class="btn small" data-act="threatTrait" title="GM spends 2 Threat to create/change/remove a trait">Add for 2 Threat</button>
          </div>
          <p class="hint" style="margin-top:0.5rem">“Because of [trait], this is easier / harder / possible / impossible.” Each relevant trait shifts Difficulty by 1 (Core p.143).</p>
          <details><summary class="small">Example complications by skill</summary>
            ${D.SKILLS.map((s) => `<div class="small" style="margin-top:0.3rem"><b>${s}:</b> <span class="chips" style="display:inline-flex">${D.COMPLICATIONS[s].map((c) => `<span class="chip chip-add" data-act="addSceneComp" data-name="${esc(c)}">+ ${esc(c)}</span>`).join("")}</span></div>`).join("")}
          </details>
        </div>
        <div class="card">
          <h3>Notes</h3>
          <textarea data-bind="scene.notes" placeholder="What's at stake, who's here, what the NPCs want…" style="min-height:8rem">${esc(sc.notes)}</textarea>
          <button class="btn" data-act="endScene" style="margin-top:0.5rem">End scene (−1 Momentum)</button>
        </div>
      </section>
      <section>
        <div class="card">
          <h2>Extended tasks & clocks</h2>
          <p class="small muted">Each passed test usually scores 2 (+ asset Quality); complications reduce it, Momentum increases it. Peril clocks fill on failures and complications (Core p.159).</p>
          ${sc.tasks.map((t) => `<div class="task ${t.peril ? "peril" : ""}">
            <div class="c-head"><input class="c-name" data-bind="task.${t.id}.name" value="${esc(t.name)}"/>${t.peril ? `<span class="badge npc">Peril</span>` : `<span class="badge pass">Goal</span>`}
              ${t.progress >= t.req ? `<span class="badge ${t.peril ? "npc" : "pass"}">${t.peril ? "Triggered!" : "Complete"}</span>` : ""}</div>
            <div class="track">${Array.from({ length: t.req }, (_, i) => `<span class="box ${i < t.progress ? "on" : ""}" data-act="taskSet" data-id="${t.id}" data-i="${i + 1}"></span>`).join("")}<span class="small muted" style="margin-left:4px">${t.progress}/${t.req}</span></div>
            <div class="mini small">
              <button class="btn small" data-act="taskAdd" data-id="${t.id}" data-d="1">+1</button>
              <button class="btn small" data-act="taskAdd" data-id="${t.id}" data-d="2">+2</button>
              <button class="btn small" data-act="taskAdd" data-id="${t.id}" data-d="3">+3</button>
              <button class="btn small ghost" data-act="taskAdd" data-id="${t.id}" data-d="-1">−1</button>
              Requirement ${stepper(`task.${t.id}.req`, 1, 20)}
              <button class="btn small ghost danger" data-act="rmTask" data-id="${t.id}">Remove</button>
            </div></div>`).join("") || `<div class="empty">No tasks running.</div>`}
          <hr class="divider"/>
          <div class="mini">
            <input type="text" placeholder="e.g. Repair the reputation" data-bind="ui.newTask.name" value="${esc(nt.name)}" style="flex:1"/>
            Req ${stepper("ui.newTask.req", 1, 20)}
            <label class="check small" style="margin:0"><input type="checkbox" data-bind="ui.newTask.peril" data-type="bool" ${nt.peril ? "checked" : ""}/>Peril clock</label>
            <button class="btn primary" data-act="addTask">Add</button>
          </div>
        </div>
      </section>
    </div>`;
  }

  // =====================================================================
  // HOOKS
  // =====================================================================
  const HOOK_PARTS = ["plot", "target", "location", "opposition", "twist", "complication"];
  function newHook() { const h = {}; HOOK_PARTS.forEach((k) => (h[k] = pick(D.HOOKS[k]))); return h; }
  function hookText(h) {
    return `${h.plot.replace("the…", "the")} ${h.target}, at ${h.location}. Standing in the way: ${h.opposition}. Twist: ${h.twist}. Complication: ${h.complication}.`;
  }
  function renderHooks() {
    const h = S.hook;
    const part = (k, text) => `<span class="part" data-act="rerollHook" data-k="${k}" title="Click to re-roll">${esc(text)}</span>`;
    return `<div class="grid-2">
      <section><div class="card">
        <div class="card-head"><h2>Story hook</h2><button class="btn primary" data-act="newHook">Generate</button></div>
        ${h ? `<div class="hook">
            ${part("plot", h.plot.replace("the…", "the"))} ${part("target", h.target)}, at ${part("location", h.location)}.<br/>
            Standing in the way: ${part("opposition", h.opposition)}.<br/>
            <b>Twist:</b> ${part("twist", h.twist)}.<br/>
            <b>Complication:</b> ${part("complication", h.complication)}.
          </div>
          <p class="hint" style="margin-top:0.6rem">Click any underlined part to re-roll just that piece.</p>
          <div class="c-actions"><button class="btn" data-act="saveHook">Save</button><button class="btn ghost" data-act="copyHook">Copy text</button></div>`
        : `<div class="empty">Generate a hook to seed your next adventure. The Core Rules also has a d20 plot generator on p.222.</div>`}
      </div></section>
      <section><div class="card">
        <h2>Saved hooks</h2>
        ${S.savedHooks.length ? S.savedHooks.map((s, i) => `<div class="log-item">${esc(s)} <button class="btn small ghost danger" data-act="rmHook" data-i="${i}">×</button></div>`).join("") : `<div class="empty">Nothing saved yet.</div>`}
      </div></section>
    </div>`;
  }

  // =====================================================================
  // REFERENCE
  // =====================================================================
  const REF = [
    { t: "Skill test", pg: "p.145–148", h: `<ul><li>Target = <b>Skill + Drive</b>. Roll 2d20 (+ up to 3 bought).</li><li>Each die ≤ target: <b>1 success</b>. A 1 is a <b>critical</b> (2 successes).</li><li>With a focus, each die ≤ <b>skill</b> is a critical.</li><li>Each 20 (or more with a complication range) is a <b>complication</b>.</li><li>Successes ≥ Difficulty = pass; each extra success = 1 Momentum.</li></ul>` },
    { t: "Difficulty", pg: "p.146", h: `<table>${D.DIFFICULTY.map((d) => `<tr><td><b>${d.n}</b></td><td><b>${d.name}</b> — ${esc(d.eg)}</td></tr>`).join("")}</table><p class="small">GM may raise Difficulty by 1 per 2 Threat, before dice are bought.</p>` },
    { t: "Buying dice", pg: "p.149", h: `<ul><li>Up to 3 bonus d20 per test, bought after Difficulty is set.</li><li>Costs 1, then 2, then 3 (total 1 / 3 / 6).</li><li>Players pay Momentum and/or generate Threat; NPCs spend Threat.</li></ul>` },
    { t: "Momentum spends", pg: "p.151–152", h: `<ul><li><b>Obtain Information</b> — 1 per question (refunded if “you can't tell”).</li><li><b>Create / change / remove a Trait</b> — 2.</li><li><b>Create an Asset</b> (Quality 0, lasts the scene) — 2; +2 more to keep it.</li><li><b>Keep the Initiative</b> — 2 (conflict).</li><li><b>Move an extra zone / second asset</b> — 2.</li><li><b>+1 attack Quality</b> — 2. <b>Lasting defeat</b> — 2.</li></ul><p class="small">Group pool max 6. Lose 1 at the end of each scene. Bonus Momentum can't be saved.</p>` },
    { t: "Adding to Threat", pg: "p.155", h: `<ul><li>Players buy dice with Threat (1 / 2 / 3).</li><li>Ignore a complication — +2 each.</li><li>Escalation — +1.</li><li>Threatening circumstances at scene start — +1 or +2.</li><li>NPC leftover Momentum — +1 each.</li><li>Starting Threat per player: Nascent 0 · Minor 1 · Major 2 · Great 3.</li></ul>` },
    { t: "Spending Threat", pg: "p.156", h: `<ul><li>NPC bonus dice — 1 / 2 / 3.</li><li>Increase Difficulty — 2 per +1.</li><li>Create / change / remove a trait — 2.</li><li>Buy off an NPC complication — 2.</li><li>Rival House Action (bring in a known enemy) — 1.</li><li>NPC Determination — 3. NPC Keep Initiative — 2. GM takes first turn — 2.</li><li>Environmental effects and narrative changes — varies.</li></ul>` },
    { t: "Determination", pg: "p.157", h: `<ul><li>Start each adventure with 1; maximum 3.</li><li>Spend only when the drive's statement supports the action.</li><li><b>Automatic 1</b> (before rolling), <b>Re-roll</b> any dice, <b>Declaration</b> (create/change a trait about yourself), <b>Extra Action</b> in a conflict.</li><li>If the statement conflicts, GM may offer 1 Determination: <b>comply</b> (take a complication) or <b>challenge</b> (cross out the statement).</li></ul>` },
    { t: "Complications", pg: "p.153–154", h: `<table>${D.COMP_RANGE.map((c) => `<tr><td><b>${c.r}</b></td><td>${c.name}</td><td>${c.on}</td></tr>`).join("")}</table><p class="small">A complication works like a negative trait: +1 Difficulty, prevents an action, or takes 50% longer. Buy off for +2 Threat (NPC: −2 Threat). <b>Success at a cost</b>: a failed test still succeeds with extra complications and no Momentum.</p>` },
    { t: "Contests & assistance", pg: "p.149, 158", h: `<ul><li>The defender rolls first; their successes become the Difficulty.</li><li>If the active character fails, the opponent gains 1 Momentum per success short.</li><li>Traits hindering the defender reduce the Difficulty they set by 1 each.</li><li>Assistants roll 1d20 with their own skill + drive; their successes count only if the main roller scores at least 1. Complications apply to everyone.</li></ul>` },
    { t: "Conflict: turns", pg: "p.165", h: `<ul><li>GM picks who goes first (normally a PC; NPC first costs 2 Threat).</li><li>After a turn, pass to an opposing side, or <b>Keep the Initiative</b> (2 Momentum / +2 Threat; NPC 2 Threat): act again at +1 Difficulty or hand to an ally. Not twice in a row.</li><li>Round ends when everyone has acted; whoever acted last nominates who starts next round (or pays 2 to keep it).</li></ul>` },
    { t: "Conflict: actions", pg: "p.166", h: `<ul><li><b>Move</b> an asset one zone — subtle or bold, Difficulty 2. Subtle success: Keep the Initiative for free. Bold success: move one enemy asset. Failure: an enemy moves an asset and you can't keep the initiative.</li><li><b>Use an asset</b> — attack, target an asset (Difficulty 2, contest if wielded), create a trait/asset (Difficulty 2), overcome an obstacle (usually 1), gain information, aid an ally.</li></ul>` },
    { t: "Attacks & defeat", pg: "p.167–168", h: `<ul><li>Attack = contest. +1 Difficulty per defensive asset in the target's zone.</li><li>Minor characters: defeated by one successful attack.</li><li>Notable / major / PCs: extended task, requirement = relevant skill (+ defensive asset Quality). Each hit scores <b>2 + asset Quality</b> (+1 per 2 Momentum).</li><li><b>Resist Defeat</b> once per scene: 1 Momentum (or +1 Threat; NPC −1 Threat) + asset Quality, and take a complication.</li><li>2 Momentum after a defeat makes it lasting.</li></ul>` },
    { t: "NPC creation", pg: "p.137, 240", h: `<table><tr><th>Tier</th><th>Skills</th><th>Drives</th><th>Extras</th></tr><tr><td><b>Minor</b></td><td>6, 5, 5, 4, 4</td><td>One rating 4–8, no statements</td><td>1 trait, 1 focus</td></tr><tr><td><b>Notable</b></td><td>7, 6, 5, 5, 4</td><td>7, 6, rest 5; 1–2 statements</td><td>1–2 traits, 3 focuses, 1 talent</td></tr><tr><td><b>Major</b></td><td>All 4 + 11 points (max 8)</td><td>8, 7, 6, 5, 4; statements on 6+</td><td>2–3 traits, 3–5 focuses, 2–4 talents</td></tr></table><p class="small">NPCs spend Threat instead of Momentum, gain 3 Threat instead of 1 Determination, and pay 3 Threat to use Determination.</p>` },
    { t: "Drives without statements", pg: "p.147", h: `<ul><li><b>Duty</b> — responsibilities and obligations, often to your House.</li><li><b>Faith</b> — trusting others, an organization, or a higher power.</li><li><b>Justice</b> — morality, right and wrong, the law (and, ironically, deceit).</li><li><b>Power</b> — authority, status, ambition; often conflict.</li><li><b>Truth</b> — uncovering secrets or convincing others.</li></ul>` },
    { t: "Advancement", pg: "p.139", h: `<ul><li>Gain points from <b>Pain</b> (defeated in conflict), <b>Failure</b> (fail a Difficulty 3+ test), <b>Peril</b> (GM spends 4+ Threat at once), ambition progress (1–3), impressing the group (1/session).</li><li>Costs: Skill 10 + 1 per advance · Focus = number of focuses · Talent = talents × 3.</li></ul>` },
    { t: "House management year", book: "Great Game", pg: "p.87–115", h: `<ol style="margin:0.2rem 0 0.4rem;padding-left:1.2rem"><li><b>News</b> — GM news; each player may add a rumor.</li><li><b>Income</b> — Wealth and Resources from domains, Treasurers (+10 W), Marshals (+1 R), mines (+2 R).</li><li><b>Event</b> — d20 by status level: opportunity or crisis.</li><li><b>Upkeep</b> — military, loyalty, lifestyle, skills, extra roles.</li><li><b>Ventures</b> — 2 per year (+1 per 10 W; forced labor +1 for −1 loyalty, max 2). Test: House skill + leader's drive; extra d20 cost 5/10/15 W. Partial success: next year half cost, one fewer success.</li><li><b>End of year</b> — unused venture +3 W; keep 10 Resources (+10 per storage facility).</li></ol>` },
    { t: "House status", book: "Great Game", pg: "p.90–91", h: `<table><tr><th>Level</th><th>Minor</th><th>Major</th><th>Great</th></tr>${X.STATUS_LEVELS.map((l, i) => { const prev = X.STATUS_LEVELS[i - 1]; const r = (c) => (l.id === "dangerous" ? `${prev.max[c] + 1}+` : `${prev ? prev.max[c] + 1 : 0}–${l.max[c]}`); return `<tr><td><b>${l.name}</b></td><td>${r("minor")}</td><td>${r("major")}</td><td>${r("great")}</td></tr>`; }).join("")}</table><p class="small">Start: Nascent 15, Minor 25, Major 45, Great 65. Boon ventures: +1 status on success, −1 on failure. New secondary domain +5, primary +10. Problematic/Dangerous Houses give the GM 1/2 Threat per venture.</p>` },
    { t: "Rival Houses", book: "Great Game", pg: "p.88–89", h: `<ul><li>House skills — Great 9,8,7,6,5 · Major 8,7,6,5,4 · Minor 7,6,6,5,4 · Nascent 6,5,5,4,4.</li><li>With no named NPC acting, a House uses its Hatred as a single drive: Ambivalent 4, Dislike 5, Loathing 6, Rival 7, Kanly 8.</li><li>Rival House Action (Core): 1 Threat to bring a known enemy House into a scene (3 if the players hold Balk Enemy).</li></ul>` },
    { t: "Court drives", book: "Power and Pawns", pg: "p.81–83", h: `<p class="small">Any of these may replace a standard drive at character creation (one or two at most), or replace a challenged drive in play.</p><ul>${Object.keys(X.COURT_DRIVES).map((k) => `<li><b>${k}</b> — ${X.COURT_DRIVES[k].use}</li>`).join("")}</ul>` },
    { t: "Reputation & fame", book: "Power and Pawns", pg: "p.79–80", h: `<ul><li>Reputation is traits. <b>Collated reputation</b>: several related traits can all apply when reputation is in play; contrary traits cancel.</li><li><b>Power differential</b>: one action spent reminding someone who holds the social high ground grants the trait ‘Power Differential’, no test needed.</li><li><b>Fake traits</b>: build a reputation you don't deserve with the Gain Reputation personal venture (Discipline, Difficulty 3) — one witnessed contrary act undoes it.</li><li><b>Making an entrance</b>: Communicate test, harder at grander gatherings; Momentum carries into the social scene.</li></ul>` },
    { t: "Sandworms & the desert", book: "Sand and Dust", pg: "p.24–26, 75–76", h: `<ul><li>A worm is <b>force majeure</b>: flee, never fight. The question is how, and what is sacrificed.</li><li>Rock outcrops, sinks and salt pans are safe from worms; open bled and spice fields are not.</li><li>Drum sand booms and summons worms. Tidal dust basins swallow the careless. Spice blows give minutes of warning (a smell of cinnamon).</li><li>Coriolis storms reach 700 km/h — treat as a deadline, not a test.</li></ul>` },
  ];
  function renderReference() {
    const q = (S.ui.refQuery || "").toLowerCase();
    const items = REF.filter((r) => !q || (r.t + " " + r.h.replace(/<[^>]+>/g, " ")).toLowerCase().includes(q));
    return `<input class="ref-search" type="search" placeholder="Filter the reference… (e.g. initiative, complication, NPC)" data-bind="ui.refQuery" data-live="1" value="${esc(S.ui.refQuery)}"/>
      <div class="ref">${items.map((r) => `<div class="card"><h3>${esc(r.t)} <span class="pg">${r.book || "Core"} ${r.pg}</span></h3>${r.h}</div>`).join("") || `<div class="empty">No matches.</div>`}</div>`;
  }

  // =====================================================================
  // RENDER
  // =====================================================================
  function render() {
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === S.tab));
    const views = Object.assign({ roller: renderRoller, conflict: renderConflict, npcs: renderNpcs, scene: renderScene, hooks: renderHooks, reference: renderReference }, GM.views);
    $("#main").innerHTML = (views[S.tab] || renderRoller)();
    renderPools();
    GM.afterRender.forEach((f) => f(S.tab));
  }

  // =====================================================================
  // EVENTS
  // =====================================================================
  function endScene() {
    adjust(0, -1, "End of scene", { force: true });
    S.conflict.combatants.forEach((c) => { c.resisted = false; });
    log(`Scene ended${S.scene.name ? `: ${S.scene.name}` : ""} — group Momentum −1, Resist Defeat refreshed`);
    toast("Scene ended: −1 Momentum, Resist Defeat refreshed");
    save(); render();
  }

  const actions = {
    pool: (el) => adjust(el.dataset.k === "threat" ? +el.dataset.d : 0, el.dataset.k === "momentum" ? +el.dataset.d : 0, `Manual ${el.dataset.k} ${el.dataset.d > 0 ? "+" : ""}${el.dataset.d}`, { force: true }),
    undo: () => {
      const h = S.history.pop();
      if (!h) return;
      S.threat = h.threat; S.momentum = h.momentum;
      toast(`Undid: ${h.label || "pool change"}`);
      save(); renderPools(true, true);
    },
    endScene,
    openSession: () => openSessionDialog(),
    step: (el) => {
      const cur = +getPath(el.dataset.path) || 0;
      setPath(el.dataset.path, clamp(cur + +el.dataset.d, +el.dataset.min, +el.dataset.max));
      render();
    },
    set: (el) => {
      const v = el.dataset.type === "num" ? +el.dataset.v : el.dataset.v;
      setPath(el.dataset.path, v);
      if (el.dataset.path === "roller.side" && v === "pc") S.roller.npcId = "";
      render();
    },
    // dice
    roll: doRoll,
    reroll: doReroll,
    selDie: (el) => {
      const L = S.last; if (!L) return;
      const k = el.dataset.k;
      if (k[0] === "a") { toast("Assistant dice can't be re-rolled with Determination"); return; }
      L.sel = L.sel.includes(k) ? L.sel.filter((x) => x !== k) : L.sel.concat(k);
      render();
    },
    bank: () => {
      const L = S.last; const n = Math.max(0, L.result.momentum - L.spent);
      if (L.side === "pc") adjust(0, n, `Saved ${n} Momentum`); else adjust(n, 0, `NPC Momentum → ${n} Threat`);
      L.banked = true;
      log(`${L.title} — ${L.spent} Momentum spent, ${n} ${L.side === "pc" ? "saved to pool" : "added to Threat"}`, L.side);
      save(); render();
    },
    contestPay: () => {
      const L = S.last; const n = L.result.shortfall;
      if (L.side === "pc") adjust(n, 0, `Contest: opponent Momentum → ${n} Threat`); else adjust(0, n, `Contest: ${n} Momentum to players`);
      L.contestPaid = true; save(); render();
    },
    buyComp: () => {
      const L = S.last;
      if (L.side === "pc") adjust(2, 0, "Complication bought off (+2 Threat)");
      else if (!adjust(-2, 0, "NPC complication bought off")) return;
      L.compsBought++; save(); render();
    },
    toContest: () => {
      const L = S.last;
      S.roller.difficulty = L.result.successes;
      S.roller.side = L.side === "pc" ? "npc" : "pc";
      if (S.roller.side === "pc") S.roller.npcId = "";
      S.roller.contest = true;
      S.roller.bonus = 0; S.roller.autoOne = false;
      toast(`Contest: Difficulty ${L.result.successes} for the ${S.roller.side === "pc" ? "player" : "NPC"}`);
      save(); render();
    },
    addAssist: () => { S.roller.assistants.push({ skill: 5, drive: 6, focus: false }); render(); },
    rmAssist: (el) => { S.roller.assistants.splice(+el.dataset.i, 1); render(); },
    clearLog: () => { S.log = []; render(); },
    npcSkill: (el) => { const n = findNpc(S.roller.npcId); S.roller.skillName = el.dataset.s; S.roller.skill = n.skills[el.dataset.s]; render(); },
    npcDrive: (el) => { const n = findNpc(S.roller.npcId); S.roller.driveName = el.dataset.d; S.roller.drive = n.drives[el.dataset.d]; render(); },
    addSceneComp: (el) => { S.scene.traits.push({ id: uid(), name: el.dataset.name, rank: 1, kind: "comp" }); toast(`Added “${el.dataset.name}” to the scene`); save(); },
    // conflict
    nextRound: () => { S.conflict.round++; S.conflict.combatants.forEach((c) => (c.acted = false)); render(); },
    endConflict: () => {
      if (!confirm("End the conflict? Opponents are removed; player characters stay with their tracks reset.")) return;
      S.conflict.combatants = S.conflict.combatants.filter((c) => c.side === "players").map((c) => Object.assign(c, { progress: 0, acted: false, atRisk: false, defeated: false }));
      S.conflict.round = 1; render();
    },
    keepInit: (el) => {
      const p = el.dataset.pay;
      if (p === "m") adjust(0, -2, "Players keep the initiative");
      else if (p === "pt") adjust(2, 0, "Players keep the initiative (Threat)");
      else adjust(-2, 0, "Opponents keep/seize the initiative");
    },
    addCombatant: () => {
      const a = S.ui.addC;
      const n = a.name.trim() || (a.side === "players" ? "Player character" : `${tierName(a.tier)} opponent`);
      S.conflict.combatants.push(newCombatant({ name: n, side: a.side, tier: a.tier, req: a.req }));
      a.name = ""; render();
    },
    addMinorSquad: () => {
      for (let i = 1; i <= 3; i++) S.conflict.combatants.push(newCombatant({ name: `Mook ${S.conflict.combatants.length + 1}`, side: "opponents", tier: "minor" }));
      render();
    },
    rmCombatant: (el) => { S.conflict.combatants = S.conflict.combatants.filter((c) => c.id !== el.dataset.id); render(); },
    toggleActed: (el) => { const c = cmb(el); c.acted = !c.acted; render(); },
    toggleDefeated: (el) => { const c = cmb(el); c.defeated = !c.defeated; c.atRisk = false; if (!c.defeated && c.progress >= effReq(c)) c.progress = effReq(c) - 1; render(); },
    toggleAdd: (el) => { const c = cmb(el); c.addOpen = !c.addOpen; render(); },
    toggleHit: (el) => { const c = cmb(el); c.hitOpen = !c.hitOpen; c.hitBoost = 0; render(); },
    applyHit: (el) => {
      const c = cmb(el);
      if (c.hitBoost) {
        const cost = c.hitBoost * 2;
        const ok = c.side === "opponents" ? adjust(0, -cost, `Boosted attack on ${c.name}`) : adjust(-cost, 0, `Boosted NPC attack on ${c.name}`);
        if (!ok) return;
      }
      c.hitOpen = false;
      c.lastQ = c.hitQ;
      if (c.tier === "minor") { c.defeated = true; toast(`${c.name} is defeated`); }
      else {
        c.progress = Math.min(effReq(c), c.progress + 2 + c.hitQ + c.hitBoost);
        if (c.progress >= effReq(c)) {
          if (canResist(c) && !c.resisted) c.atRisk = true;
          else { c.defeated = true; toast(`${c.name} is defeated`); }
        }
      }
      c.hitBoost = 0;
      save(); render();
    },
    resist: (el) => {
      const c = cmb(el); const cost = 1 + c.lastQ;
      let ok;
      if (c.side === "players") ok = el.dataset.pay === "m" ? adjust(0, -cost, `${c.name} resists defeat`) : adjust(cost, 0, `${c.name} resists defeat`);
      else ok = adjust(-cost, 0, `${c.name} resists defeat`);
      if (!ok) return;
      c.resisted = true; c.atRisk = false;
      c.comps.push("Resisted defeat — complication");
      toast(`${c.name} resists defeat — give them a complication`);
      save(); render();
    },
    acceptDefeat: (el) => { const c = cmb(el); c.defeated = true; c.atRisk = false; render(); },
    trackSet: (el) => { const c = cmb(el); const i = +el.dataset.i; c.progress = c.progress === i ? i - 1 : i; c.atRisk = false; render(); },
    addAsset: (el) => { const c = cmb(el); if (!c.newAsset.trim()) return; c.assets.push({ id: uid(), name: c.newAsset.trim(), q: c.newAssetQ, def: c.newAssetDef }); c.newAsset = ""; c.newAssetQ = 0; c.newAssetDef = false; render(); },
    rmAsset: (el) => { const c = cmb(el); c.assets = c.assets.filter((a) => a.id !== el.dataset.a); render(); },
    addComp: (el) => { const c = cmb(el); if (!c.newComp.trim()) return; c.comps.push(c.newComp.trim()); c.newComp = ""; render(); },
    rmComp: (el) => { const c = cmb(el); c.comps.splice(+el.dataset.i, 1); render(); },
    // npcs
    genNpc: () => { const g = S.ui.npcGen; S.ui.preview = generateNpc(g.tier, g.role, g.names, g.court); render(); },
    savePreview: () => { const p = S.ui.preview; S.npcs.unshift(p); S.ui.openNpc = p.id; S.ui.preview = null; toast(`${p.name} saved to roster`); render(); },
    openNpc: (el) => { S.ui.openNpc = S.ui.openNpc === el.dataset.npc ? "" : el.dataset.npc; render(); },
    rmNpc: (el) => {
      const n = findNpc(el.dataset.npc);
      if (!confirm(`Delete ${n.name} from the roster?`)) return;
      S.npcs = S.npcs.filter((x) => x.id !== el.dataset.npc);
      if (S.roller.npcId === el.dataset.npc) S.roller.npcId = "";
      render();
    },
    rollNpc: (el) => {
      const n = findNpc(el.dataset.npc);
      if (!n) { toast("That NPC is no longer in the roster"); return; }
      if (S.ui.preview && S.ui.preview.id === n.id) { S.npcs.unshift(n); S.ui.preview = null; S.ui.openNpc = n.id; toast(`${n.name} saved to roster`); }
      loadNpcIntoRoller(n, el.dataset.s); render();
    },
    npcToConflict: (el) => {
      const n = findNpc(el.dataset.npc);
      if (S.ui.preview && S.ui.preview.id === n.id) { S.npcs.unshift(n); S.ui.preview = null; S.ui.openNpc = n.id; }
      npcToConflict(n); render();
    },
    // scene
    addTrait: () => { const t = S.ui.newTrait.trim(); if (!t) return; S.scene.traits.push({ id: uid(), name: t, rank: 1, kind: "trait" }); S.ui.newTrait = ""; render(); },
    threatTrait: () => {
      const t = S.ui.newTrait.trim(); if (!t) { toast("Type the trait first"); return; }
      if (!adjust(-2, 0, `GM trait: ${t}`)) return;
      S.scene.traits.push({ id: uid(), name: t, rank: 1, kind: "trait" }); S.ui.newTrait = ""; render();
    },
    traitRank: (el) => { const t = S.scene.traits.find((x) => x.id === el.dataset.id); t.rank = clamp(t.rank + +el.dataset.d, 1, 5); render(); },
    rmTrait: (el) => { S.scene.traits = S.scene.traits.filter((x) => x.id !== el.dataset.id); render(); },
    addTask: () => { const n = S.ui.newTask; S.scene.tasks.push({ id: uid(), name: n.name.trim() || (n.peril ? "Peril" : "Extended task"), req: n.req, progress: 0, peril: n.peril }); n.name = ""; render(); },
    taskAdd: (el) => { const t = S.scene.tasks.find((x) => x.id === el.dataset.id); t.progress = clamp(t.progress + +el.dataset.d, 0, t.req); if (t.progress >= t.req) toast(t.peril ? `${t.name}: the danger strikes!` : `${t.name}: complete!`); render(); },
    taskSet: (el) => { const t = S.scene.tasks.find((x) => x.id === el.dataset.id); const i = +el.dataset.i; t.progress = t.progress === i ? i - 1 : i; render(); },
    rmTask: (el) => { S.scene.tasks = S.scene.tasks.filter((x) => x.id !== el.dataset.id); render(); },
    // hooks
    newHook: () => { S.hook = newHook(); render(); },
    rerollHook: (el) => { S.hook[el.dataset.k] = pick(D.HOOKS[el.dataset.k]); render(); },
    saveHook: () => { S.savedHooks.unshift(hookText(S.hook)); toast("Hook saved"); render(); },
    copyHook: () => { const t = hookText(S.hook); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Copied"), () => toast("Copy failed — select the text manually")); },
    rmHook: (el) => { S.savedHooks.splice(+el.dataset.i, 1); render(); },
  };
  const cmb = (el) => S.conflict.combatants.find((c) => c.id === el.dataset.id);

  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) { S.tab = tab.dataset.tab; save(); render(); window.scrollTo(0, 0); return; }
    const el = e.target.closest("[data-act]");
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act] || GM.actions[el.dataset.act];
    if (fn) { fn(el); save(); }
  });

  // Text inputs update state live without re-render (keeps focus); selects/checkboxes re-render.
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    if (el.type === "checkbox" || el.tagName === "SELECT") return;
    setPath(el.dataset.bind, coerce(el, el.value));
    GM.onInput.forEach((f) => f(el.dataset.bind, el));
    save();
    if (el.dataset.live) {
      const pos = el.selectionStart;
      render();
      const again = document.querySelector(`[data-bind="${el.dataset.bind}"]`);
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.bind) return;
    if (el.type === "checkbox") setPath(el.dataset.bind, el.checked);
    else if (el.tagName === "SELECT") setPath(el.dataset.bind, coerce(el, el.value));
    else return;
    const b = el.dataset.bind;
    const npc = S.roller.npcId ? findNpc(S.roller.npcId) : null;
    if (b === "roller.npcId") { if (npc) loadNpcIntoRoller(npc); }
    if (b === "roller.skillName" && npc) S.roller.skill = npc.skills[S.roller.skillName];
    if (b === "roller.driveName" && npc && npc.drives[S.roller.driveName] != null) S.roller.drive = npc.drives[S.roller.driveName];
    GM.onChange.forEach((f) => f(b, el));
    if (b === "ui.addC.side") S.ui.addC.tier = S.ui.addC.side === "players" ? "pc" : S.ui.addC.tier === "pc" ? "minor" : S.ui.addC.tier;
    save();
    render();
  });
  document.addEventListener("keydown", (e) => {
    if ((e.target.closest && e.target.closest("input, textarea, select")) || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === "r" || e.key === "R") && S.tab === "roller") { e.preventDefault(); doRoll(); }
  });

  // ---------- session dialog ----------
  function openSessionDialog() {
    const dlg = $("#sessionDialog");
    $("#sessHouse").innerHTML = D.HOUSE_THREAT.map((h) => `<option value="${h.id}" ${S.house === h.id ? "selected" : ""}>${h.name} (${h.perPlayer}/player)</option>`).join("");
    $("#sessPlayers").value = S.players;
    $("#sessClearMomentum").checked = false;
    $("#sessClearLog").checked = false;
    const preview = () => {
      const h = D.HOUSE_THREAT.find((x) => x.id === $("#sessHouse").value);
      const p = clamp(+$("#sessPlayers").value || 1, 1, 10);
      $("#sessPreview").textContent = `Starting Threat: ${h.perPlayer * p}`;
    };
    $("#sessHouse").onchange = preview;
    $("#sessPlayers").oninput = preview;
    preview();
    dlg.onclose = () => {
      if (dlg.returnValue !== "ok") return;
      const h = D.HOUSE_THREAT.find((x) => x.id === $("#sessHouse").value);
      S.players = clamp(+$("#sessPlayers").value || 1, 1, 10);
      S.house = h.id;
      const target = h.perPlayer * S.players;
      adjust(target - S.threat, $("#sessClearMomentum").checked ? -S.momentum : 0, "New session", { force: true });
      if ($("#sessClearLog").checked) S.log = [];
      log(`New session — ${S.players} players, ${h.name}: Threat set to ${target}`);
      toast(`Threat set to ${target}`);
      save(); render();
    };
    dlg.returnValue = "";
    dlg.showModal();
  }

  // ---------- module API (house.js, worlds.js plug in here) ----------
  window.GM = {
    get S() { return S; },
    D, save, render, toast, adjust, log, esc, uid, pick, shuffle, clamp, pct, stepper, seg, select, sideBadge, getPath, setPath,
    views: {}, actions: {}, onChange: [], onInput: [], afterRender: [],
    // give a module its own top-level state key, filling in any missing fields
    ensure(key, def) { S[key] = Object.assign(def, S[key] || {}); return S[key]; },
    // jump to the Dice tab with a pre-filled test
    prefillRoll(o) { Object.assign(S.roller, { side: "pc", npcId: "", focus: false, bonus: 0, autoOne: false, contest: false }, o); S.tab = "roller"; save(); render(); window.scrollTo(0, 0); },
    addSceneTrait(name, kind) { S.scene.traits.push({ id: uid(), name, rank: 1, kind: kind || "trait" }); save(); },
    addSceneTask(name, req, peril) { S.scene.tasks.push({ id: uid(), name, req, progress: 0, peril: !!peril }); save(); },
    // conflict helpers for other modules
    addCombatant(o) { S.conflict.combatants.push(newCombatant(o)); save(); },
    conflictSkill: () => CONFLICT_TYPES[S.conflict.type].skill,
    focusSkill, findNpc: (id) => findNpc(id),
    start: () => render(),
  };
})();
