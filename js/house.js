// House tab — The Great Game House management (GG ch.4, p.85-117).
(function () {
  const G = window.GM, X = window.DUNE_X, D = window.DUNE;
  const { esc, uid, clamp, stepper, seg } = G;
  const d20 = () => Dice.d20();
  const BONUS_COST = [0, 5, 15, 30]; // extra d20 for ventures cost 5, 10, 15 Wealth (GG p.104)

  function newSession() {
    return { collected: false, theftDone: false, event: null, upkeepPaid: false, skip: {}, used: 0, extra: 0, forced: 0, sel: "facility", vskill: "Discipline", drive: 6, bonus: 0, adj: 0, units: 1, tradeDir: "w2r", tradeAmt: 3, last: null, otherW: 0, otherR: 0, news: "" };
  }
  G.ensure("house", {
    name: "Our House", type: "minor", status: 25, wealth: 0, resources: 0, year: 1,
    skills: { Battle: 7, Communicate: 6, Discipline: 6, Move: 5, Understand: 4 },
    domains: [], roles: [{ id: uid(), role: "Ruler", flag: "", who: "" }, { id: uid(), role: "Heir", flag: "", who: "" }],
    military: 0, loyalty: 2, lifestyle: 2, storage: 0, pleasure: 0, spaceport: false, mines: [],
    spaces: 35, spacesUsed: 0, traits: [], boons: [], ongoing: [], forcedLast: 0, log: [],
    sess: newSession(),
    newDomain: { tier: "primary", category: "Artistic", kind: "Produce", name: "" },
    newRole: { role: "Advisor", flag: "", who: "" }, newTrait: "", newBoon: "",
  });
  const H = () => G.S.house;
  const col = (h) => X.HOUSE_TYPES[h.type].col;
  const statusLevel = (h) => X.STATUS_LEVELS.find((l) => h.status <= l.max[col(h)]);
  function hlog(text) { const h = H(); h.log.unshift({ y: h.year, text }); if (h.log.length > 200) h.log.length = 200; }

  // ---------- calculations ----------
  function domainIncome(d) {
    let [r, w] = X.DOMAIN_INCOME[d.tier][d.kind];
    const p = d.tier === "primary";
    if (X.WEALTHY_CATS.includes(d.category)) { r -= p ? 3 : 1; w += p ? 8 : 4; }
    if (X.RESOURCE_CATS.includes(d.category)) { r += p ? 3 : 1; w -= p ? 6 : 4; }
    return [Math.max(2, r), Math.max(10, w)];
  }
  function income(h) {
    const lines = h.domains.map((d) => { const [r, w] = domainIncome(d); return { label: `${d.tier === "primary" ? "Primary" : "Secondary"}: ${d.category} ${d.kind}${d.name ? ` (${d.name})` : ""}`, r, w }; });
    const treas = Math.min(5, h.roles.filter((x) => x.role === "Treasurer").length);
    if (treas) lines.push({ label: `Treasurer ×${treas}`, r: 0, w: 10 * treas });
    const marsh = h.roles.filter((x) => x.role === "Marshal").length;
    if (marsh) lines.push({ label: `Marshal ×${marsh}`, r: marsh, w: 0 });
    if (h.mines.length) lines.push({ label: `Mines ×${h.mines.length}`, r: 2 * h.mines.length, w: 0 });
    const s = h.sess;
    if (s.otherW || s.otherR) lines.push({ label: "Other (boons, events, GM)", r: s.otherR, w: s.otherW });
    return { lines, r: lines.reduce((a, l) => a + l.r, 0), w: lines.reduce((a, l) => a + l.w, 0) };
  }
  function extraRoles(h) {
    const staff = h.roles.filter((x) => x.role !== "Ruler" && x.role !== "Heir");
    const quota = X.HOUSE_TYPES[h.type].roles;
    let treasBefore = staff.slice(0, quota).filter((x) => x.role === "Treasurer").length;
    return { quota, count: staff.length, extra: staff.slice(quota).map((x) => { const c = X.roleUpkeep(x.role, x.flag, x.role === "Treasurer" ? treasBefore++ : 0); return { role: x, cost: c }; }) };
  }
  function upkeep(h) {
    const lines = [];
    const mil = X.MILITARY[h.military], loy = X.LOYALTY[h.loyalty], life = X.LIFESTYLE[h.lifestyle];
    lines.push({ key: "mil", label: `Military: ${mil.name}`, w: mil.cost });
    const loyCost = Math.max(0, loy.cost - h.pleasure) + h.forcedLast;
    lines.push({ key: "loy", label: `Population Loyalty: ${loy.name}${h.pleasure ? ` (−${h.pleasure} pleasure districts)` : ""}${h.forcedLast ? ` (+${h.forcedLast} after forced labor)` : ""}`, w: loyCost });
    lines.push({ key: "life", label: `Lifestyle: ${life.name}`, w: life.cost });
    D.SKILLS.forEach((sk) => { const c = X.SKILL_UPKEEP(h.skills[sk]); if (c) lines.push({ key: "skill:" + sk, label: `${sk} ${h.skills[sk]}`, w: c, skippable: true }); });
    extraRoles(h).extra.forEach((e) => lines.push({ key: "role:" + e.role.id, label: `Extra role: ${e.role.role}${e.role.flag ? ` (${flagName(e.role.flag)})` : ""}`, w: e.cost }));
    const total = lines.reduce((a, l) => a + (h.sess.skip[l.key] ? 0 : l.w), 0);
    return { lines, total };
  }
  const flagName = (f) => ({ suk: "Suk", ginaz: "Ginaz", bg: "Bene Gesserit", mentat: "Mentat" }[f] || "");
  const venturesAvail = (h) => 2 + h.sess.extra + h.sess.forced;

  function resolveVenture(h) {
    const s = h.sess;
    if (s.sel.startsWith("ongoing:")) {
      const o = h.ongoing.find((x) => x.id === s.sel.slice(8));
      if (!o) return null;
      return Object.assign({}, X.VENTURES.find((v) => v.id === o.def), { name: o.name + " (continued)", res: o.costType === "res" ? o.cost : 0, wealth: o.costType === "wealth" ? o.cost : 0, skill: o.skill, succ: o.succ, ongoing: o, base: o.base });
    }
    const v = Object.assign({}, X.VENTURES.find((x) => x.id === s.sel));
    if (v.skill === "?") v.skill = s.vskill;
    if (v.effect === "improve") {
      const cur = h.skills[v.skill];
      const t = X.IMPROVE_SKILL[cur];
      if (!t) { v.blocked = cur >= 10 ? "That skill is already at the maximum of 10." : "Improve Skills starts from a skill of 4."; v.wealth = 0; v.succ = 0; }
      else { v.wealth = t[0]; v.succ = t[1]; v.name = `Improve ${v.skill} (${cur} → ${cur + 1})`; }
    }
    if (v.effect === "invasion") { v.wealth = 10 * s.units; v.name = `Mount Invasion (${s.units} units)`; }
    v.base = { succ: v.succ, cost: v.res || v.wealth || 0, costType: v.res ? "res" : "wealth" };
    return v;
  }

  // ---------- render ----------
  function renderSheet(h) {
    const lvl = statusLevel(h);
    const ht = X.HOUSE_TYPES[h.type];
    const er = extraRoles(h);
    const nd = h.newDomain, nr = h.newRole;
    const life = X.LIFESTYLE[h.lifestyle];
    const autoTraits = [life.trait, lvl.id !== "respected" ? lvl.name : ""].filter(Boolean);
    return `
    <div class="card">
      <div class="card-head"><input class="c-name" style="font-size:1.25rem" data-bind="house.name" value="${esc(h.name)}" aria-label="House name"/>
        ${G.select("house.type", Object.keys(X.HOUSE_TYPES).map((k) => ({ v: k, l: X.HOUSE_TYPES[k].name })))}</div>
      <div class="odds">
        <div class="stat"><div class="k">Wealth</div><div class="v"><input type="number" data-bind="house.wealth" data-type="num" value="${h.wealth}" style="width:5.5ch;font:inherit;border:0;background:transparent"/></div></div>
        <div class="stat"><div class="k">Resources</div><div class="v"><input type="number" data-bind="house.resources" data-type="num" value="${h.resources}" style="width:5.5ch;font:inherit;border:0;background:transparent"/></div></div>
        <div class="stat"><div class="k">Status</div><div class="v">${h.status} <span class="badge ${lvl.id === "dangerous" || lvl.id === "feeble" ? "npc" : lvl.id === "respected" ? "pass" : ""}">${lvl.name}</span></div></div>
      </div>
      <div class="row"><span class="lbl">Status</span>
        <button class="btn small" data-act="hStatus" data-d="-5">−5</button>${stepper("house.status", 0, 120)}<button class="btn small" data-act="hStatus" data-d="5">+5</button>
        <button class="btn small ghost" data-act="hStart" title="Starting status ${ht.status}, ${ht.spaces} spaces">Use ${ht.name} defaults</button></div>
      <p class="hint" style="margin-top:-0.3rem">${esc(lvl.effect)} <span class="pg">GG p.90</span></p>
      <h3>House skills <span class="pg">upkeep in brackets</span></h3>
      ${D.SKILLS.map((sk) => `<div class="row" style="margin-bottom:0.3rem"><span class="lbl">${sk}</span>${stepper(`house.skills.${sk}`, 1, 10)}<span class="hint">(${X.SKILL_UPKEEP(h.skills[sk])} W)</span></div>`).join("")}
      <p class="hint">Rival Houses of this type use ${ht.npcSkills.join(", ")}.</p>
    </div>

    <div class="card">
      <h3>Domains <span class="pg">GG p.92–97</span></h3>
      ${h.domains.map((d) => { const [r, w] = domainIncome(d); return `<div class="npc-list-item"><span class="badge ${d.tier === "primary" ? "pass" : ""}">${d.tier === "primary" ? "Primary" : "Secondary"}</span><span class="name" style="cursor:default">${esc(d.category)} ${esc(d.kind)}${d.name ? ` — ${esc(d.name)}` : ""}</span><span class="small muted">+${r} R · +${w} W</span><button class="btn small ghost danger" data-act="hRmDomain" data-id="${d.id}">×</button></div>`; }).join("") || `<div class="empty">No domains yet — every House has at least a primary domain.</div>`}
      <div class="mini" style="margin-top:0.5rem">
        ${G.select("house.newDomain.tier", [{ v: "primary", l: "Primary" }, { v: "secondary", l: "Secondary" }])}
        ${G.select("house.newDomain.category", X.DOMAIN_CATEGORIES)}
        ${G.select("house.newDomain.kind", X.DOMAIN_KINDS)}
        <input type="text" placeholder="e.g. Poetry" data-bind="house.newDomain.name" value="${esc(nd.name)}"/>
        <button class="btn" data-act="hAddDomain">Add</button>
      </div>
      <div class="row small" style="margin-top:0.6rem"><span class="lbl">Spaces</span>
        used <input type="number" data-bind="house.spacesUsed" data-type="num" value="${h.spacesUsed}" style="width:60px"/> of <input type="number" data-bind="house.spaces" data-type="num" value="${h.spaces}" style="width:60px"/>
        <span class="hint">Primary domain 25, secondary 10. Planet 80 (+20 reclaimable), moon 30 (+10).</span></div>
    </div>

    <div class="card">
      <h3>Roles <span class="pg">${er.count}/${er.quota} staff included · GG p.95</span></h3>
      ${h.roles.map((r) => `<div class="npc-list-item">
          <span class="badge">${esc(r.role)}</span>
          <input type="text" placeholder="Who" data-bind="house.roles.#${r.id}.who" value="${esc(r.who)}" style="flex:1;min-width:80px"/>
          <select data-bind="house.roles.#${r.id}.flag"><option value="">—</option>${["suk", "ginaz", "bg", "mentat"].map((f) => `<option value="${f}" ${r.flag === f ? "selected" : ""}>${flagName(f)}</option>`).join("")}</select>
          <span class="hint" title="${esc(X.ROLE_BENEFIT[r.role] || "")}">ⓘ</span>
          <button class="btn small ghost danger" data-act="hRmRole" data-id="${r.id}">×</button></div>`).join("")}
      <div class="mini" style="margin-top:0.5rem">${G.select("house.newRole.role", X.ROLES)}<input type="text" placeholder="Who" data-bind="house.newRole.who" value="${esc(nr.who)}"/><button class="btn" data-act="hAddRole">Add role</button></div>
      <p class="hint" style="margin-top:0.4rem"><b>${esc(nr.role)}:</b> ${esc(X.ROLE_BENEFIT[nr.role] || "")}</p>
    </div>

    <div class="card">
      <h3>Upkeep levels <span class="pg">GG p.101–103</span></h3>
      <label class="field">Military power ${G.select("house.military", X.MILITARY.map((m, i) => ({ v: i, l: `${m.name} — Difficulty ${m.diff}, ${m.cost} W` })), "num")}<span class="hint">${esc(X.MILITARY[h.military].text)}</span></label>
      <label class="field">Population loyalty ${G.select("house.loyalty", X.LOYALTY.map((m, i) => ({ v: i, l: `${m.name} (${m.mod}) — ${m.cost} W` })), "num")}<span class="hint">${esc(X.LOYALTY[h.loyalty].text)}</span></label>
      <label class="field">Lifestyle ${G.select("house.lifestyle", X.LIFESTYLE.map((m, i) => ({ v: i, l: `${m.name} — ${m.cost} W${m.trait ? ` (${m.trait})` : ""}` })), "num")}<span class="hint">${esc(life.text)}</span></label>
      <div class="row small"><span class="lbl">Holdings</span>
        Storage ${stepper("house.storage", 0, 20)} Pleasure districts ${stepper("house.pleasure", 0, 20)}
        <label class="check small" style="margin:0"><input type="checkbox" data-bind="house.spaceport" data-type="bool" ${h.spaceport ? "checked" : ""}/> Spaceport</label>
        <span>Mines: ${h.mines.length ? h.mines.map((m) => `${m.years}y`).join(", ") : "none"}</span>
        ${h.mines.length ? `<button class="btn small ghost" data-act="hRmMine">−1 mine</button>` : ""}<button class="btn small ghost" data-act="hAddMine">+1 mine</button>
      </div>
    </div>

    <div class="card">
      <h3>Traits & boons</h3>
      <div class="chips">${autoTraits.map((t) => `<span class="chip" title="From lifestyle/status">${esc(t)}</span>`).join("")}${h.traits.map((t, i) => `<span class="chip">${esc(t)}<button data-act="hRmTrait" data-i="${i}">×</button></span>`).join("")}</div>
      <div class="mini"><input type="text" placeholder="House trait" data-bind="house.newTrait" value="${esc(h.newTrait)}"/><button class="btn small" data-act="hAddTrait">Add</button></div>
      <div class="chips" style="margin-top:0.5rem">${h.boons.map((b, i) => `<span class="chip def" title="${esc(b.note || "")}">${esc(b.name)}<button data-act="hRmBoon" data-i="${i}">×</button></span>`).join("") || `<span class="empty small">No boons held.</span>`}</div>
      <div class="mini"><input type="text" placeholder="Boon / favor" data-bind="house.newBoon" value="${esc(h.newBoon)}"/><button class="btn small" data-act="hAddBoon">Add</button></div>
    </div>`;
  }

  function stepHead(n, title, done) {
    return `<div class="card-head"><h3>${n}. ${title}</h3>${done ? `<span class="badge pass">Done</span>` : ""}</div>`;
  }

  function renderSession(h) {
    const s = h.sess;
    const inc = income(h);
    const up = upkeep(h);
    const lvl = statusLevel(h);
    const avail = venturesAvail(h);
    const v = resolveVenture(h);
    const groups = ["Construction", "Boon", "Trade"];
    const ventureSelect = `<select data-bind="house.sess.sel" style="max-width:100%">
      ${h.ongoing.length ? `<optgroup label="Unfinished (half cost, one fewer success)">${h.ongoing.map((o) => `<option value="ongoing:${o.id}" ${s.sel === "ongoing:" + o.id ? "selected" : ""}>${esc(o.name)} — ${o.cost} ${o.costType === "res" ? "R" : "W"}, ${o.succ} succ.</option>`).join("")}</optgroup>` : ""}
      ${groups.map((g) => `<optgroup label="${g === "Construction" ? "Construction (Resources)" : g === "Boon" ? "Boons (Wealth)" : "Trade"}">${X.VENTURES.filter((x) => x.group === g).map((x) => `<option value="${x.id}" ${s.sel === x.id ? "selected" : ""}>${esc(x.name)}${x.res ? ` — ${x.res} R` : x.wealth ? ` — ${x.wealth} W` : ""}</option>`).join("")}</optgroup>`).join("")}
    </select>`;

    let ventureBody = "";
    if (v && v.id === "trade") {
      const cap = Math.floor((s.tradeDir === "w2r" ? h.wealth : h.resources) / (h.spaceport ? 2 : 3));
      ventureBody = `<p class="small">${esc(v.note)}</p>
        <div class="mini">${seg("house.sess.tradeDir", [{ v: "w2r", l: "Wealth → Resources" }, { v: "r2w", l: "Resources → Wealth" }])}
        Spend ${stepper("house.sess.tradeAmt", 0, Math.max(0, cap))} <span class="hint">max ${cap}</span></div>
        <div class="hint" style="margin:0.4rem 0">${s.tradeDir === "w2r" ? `${s.tradeAmt} Wealth → ${Math.floor(s.tradeAmt / 3)} Resources` : `${s.tradeAmt} Resources → ${s.tradeAmt * 3} Wealth`}</div>
        <button class="btn primary" data-act="hVenture" ${s.used >= avail ? "disabled" : ""}>Trade (uses a venture)</button>`;
    } else if (v) {
      const diff = Math.max(0, v.succ + s.adj);
      const skillVal = h.skills[v.skill];
      const o = Dice.odds({ skill: skillVal, drive: s.drive, focus: false, difficulty: diff, bonusDice: s.bonus, autoOnes: 0, compRange: 1, assistants: [] });
      const costW = (v.wealth || 0) + BONUS_COST[s.bonus];
      ventureBody = `<p class="small">${esc(v.note || "")}${v.blocked ? ` <b class="muted">${esc(v.blocked)}</b>` : ""}</p>
        ${v.id === "facility" || v.id === "improve" ? `<div class="row"><span class="lbl">Skill</span>${G.select("house.sess.vskill", D.SKILLS)}</div>` : ""}
        ${v.effect === "invasion" ? `<div class="row"><span class="lbl">Units</span>${stepper("house.sess.units", 1, 30)}</div>` : ""}
        <div class="row"><span class="lbl">Test</span><span>House <b>${v.skill} ${skillVal}</b> + leader's drive ${stepper("house.sess.drive", 4, 8)} = target <b>${skillVal + s.drive}</b>, needs <b>${diff}</b> success${diff === 1 ? "" : "es"}</span></div>
        <div class="row"><span class="lbl">Bonus d20</span>${seg("house.sess.bonus", [0, 1, 2, 3].map((n) => ({ v: n, l: `+${n}` })), "num")}<span class="hint">${BONUS_COST[s.bonus]} Wealth</span></div>
        <div class="row"><span class="lbl">Adjust</span>${stepper("house.sess.adj", -3, 3)}<span class="hint">status (${lvl.name}), loyalty, roles, traits</span></div>
        <div class="odds"><div class="stat"><div class="k">Cost</div><div class="v">${v.res ? `${v.res} R` : ""}${v.res && costW ? " + " : ""}${costW || !v.res ? `${costW} W` : ""}</div></div><div class="stat"><div class="k">Success chance</div><div class="v">${G.pct(o.pass)}</div></div></div>
        <button class="btn primary big" data-act="hVenture" ${s.used >= avail || v.blocked ? "disabled" : ""}>Attempt venture</button>`;
    }
    const last = s.last ? `<div class="callout ${s.last.passed ? "momentum" : "threat"}"><b>${esc(s.last.name)}</b>: [${s.last.dice.join(", ")}] → ${s.last.successes}/${s.last.need} — <b>${s.last.passed ? "Success" : "Failed"}</b>. ${esc(s.last.text)}</div>` : "";

    const ev = s.event;
    const evHtml = ev ? `<div class="callout ${ev.kind === "crisis" ? "threat" : ev.kind === "opp" ? "momentum" : ""}">
        <b>d20 = ${ev.d}</b> (${lvl.name}): ${ev.kind === "none" ? "No event this year." : `<b>${ev.kind === "opp" ? "Opportunity" : "Crisis"} — ${esc(ev.name)}.</b> ${esc(ev.text)}`}
        ${ev.rival ? `<br/><b>Rival suffers/gains:</b> ${esc(ev.rival.name)} — ${esc(ev.rival.text)}` : ""}</div>` : "";

    return `
    <div class="card">
      <div class="card-head"><h2>Year ${h.year} — House management</h2><span class="pg">GG p.87</span></div>
      <p class="hint">Run after every two or three adventures. Each step can be done in any order; the steps are checklists, not locks.</p>
    </div>
    <div class="card">
      ${stepHead(1, "News from the Imperium", false)}
      <textarea data-bind="house.sess.news" placeholder="Births, marriages, deaths, Imperial edicts… and each player's rumor (true, false or misleading — only the GM knows).">${esc(s.news)}</textarea>
      <button class="btn small" data-act="hRumor" style="margin-top:0.4rem">Roll a rumor about a rival</button>
    </div>
    <div class="card">
      ${stepHead(2, "Income", s.collected)}
      ${h.wealth >= 20 && !s.theftDone && !s.collected && h.year > 1 ? `<div class="callout threat small">Wealth of ${h.wealth} carried over from last year may attract thieves and crooked investors. <button class="btn small threat" data-act="hTheft">Roll for losses</button></div>` : ""}
      <table class="small" style="width:100%">${inc.lines.map((l) => `<tr><td>${esc(l.label)}</td><td style="text-align:right">+${l.r} R</td><td style="text-align:right">+${l.w} W</td></tr>`).join("") || `<tr><td class="muted">No income sources — add domains.</td></tr>`}
        <tr><td><b>Total</b></td><td style="text-align:right"><b>+${inc.r} R</b></td><td style="text-align:right"><b>+${inc.w} W</b></td></tr></table>
      <div class="mini small" style="margin:0.4rem 0">Other income: W <input type="number" data-bind="house.sess.otherW" data-type="num" value="${s.otherW}" style="width:60px"/> R <input type="number" data-bind="house.sess.otherR" data-type="num" value="${s.otherR}" style="width:60px"/> <button class="btn small ghost" data-act="hRefresh">Update</button></div>
      <button class="btn primary" data-act="hCollect" ${s.collected ? "disabled" : ""}>Collect +${inc.r} R, +${inc.w} W</button>
    </div>
    <div class="card">
      ${stepHead(3, "Event", !!ev)}
      <p class="hint">${lvl.name} Houses: opportunity on 1–${X.EVENT_CHANCE[lvl.id].opp}, crisis on ${X.EVENT_CHANCE[lvl.id].crisis}–20. The more powerful the House, the more fate has in store.</p>
      ${evHtml}
      <button class="btn" data-act="hEvent">${ev ? "Re-roll event" : "Roll event"}</button>
    </div>
    <div class="card">
      ${stepHead(4, "Upkeep", s.upkeepPaid)}
      <table class="small" style="width:100%">${up.lines.map((l) => `<tr><td>${l.skippable ? `<label class="check small" style="margin:0"><input type="checkbox" data-bind="house.sess.skip.${l.key}" data-type="bool" ${s.skip[l.key] ? "checked" : ""}/> skip</label>` : ""}</td><td ${s.skip[l.key] ? 'style="text-decoration:line-through;opacity:.6"' : ""}>${esc(l.label)}</td><td style="text-align:right">${l.w} W</td></tr>`).join("")}
        <tr><td></td><td><b>Total</b></td><td style="text-align:right"><b>${up.total} W</b></td></tr></table>
      <p class="hint">Skipping a skill's upkeep drops it by 1 permanently and costs status equal to half the upkeep.</p>
      <button class="btn primary" data-act="hUpkeep" ${s.upkeepPaid ? "disabled" : ""}>Pay ${up.total} Wealth</button>
    </div>
    <div class="card">
      ${stepHead(5, `Ventures — ${s.used}/${avail} used`, false)}
      <div class="mini" style="margin-bottom:0.6rem">
        <button class="btn small" data-act="hBuyVenture">Buy a venture (10 W)</button>
        <button class="btn small threat" data-act="hForced" ${s.forced >= 2 || h.loyalty === 0 ? "disabled" : ""} title="−1 Population Loyalty for +1 venture; loyalty costs more next year">Forced labor (${s.forced}/2)</button>
      </div>
      ${ventureSelect}
      <div style="margin-top:0.5rem">${ventureBody}</div>
      ${last}
      <details style="margin-top:0.6rem"><summary class="small">Personal ventures (one per character, own skill + drive) <span class="pg">GG p.114</span></summary>
        <table class="small" style="width:100%">${X.PERSONAL_VENTURES.map((p) => `<tr><td><b>${esc(p.name)}</b><br/><span class="muted">${esc(p.text)}</span></td><td>${esc(p.skill)}</td><td>D${esc(p.diff)}</td><td><button class="btn small" data-act="hPersonal" data-skill="${esc(p.skill.split("/")[0])}" data-diff="${esc(p.diff)}" data-name="${esc(p.name)}">Roll</button></td></tr>`).join("")}</table>
      </details>
    </div>
    <div class="card">
      ${stepHead(6, "End of year", false)}
      <p class="small">Unused ventures become +3 Wealth each (${Math.max(0, avail - s.used)} left → +${3 * Math.max(0, avail - s.used)} W). Resources above ${10 + 10 * h.storage} are lost${h.storage ? "" : " (build Storage Facilities to keep more)"}. Unfinished ventures not continued this year are abandoned.</p>
      <button class="btn primary" data-act="hEndYear">End year ${h.year}</button>
    </div>
    <div class="card">
      <h3>House chronicle</h3>
      <div class="log">${h.log.length ? h.log.map((l) => `<div class="log-item"><span class="t">Y${l.y}</span>${esc(l.text)}</div>`).join("") : `<div class="empty">Nothing recorded yet.</div>`}</div>
    </div>`;
  }

  G.views.house = () => {
    const h = H();
    return `<div class="grid-2"><section>${renderSheet(h)}</section><section>${renderSession(h)}</section></div>`;
  };

  // ---------- actions ----------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  A.hRefresh = R;
  A.hStatus = (el) => { const h = H(); h.status = clamp(h.status + +el.dataset.d, 0, 120); R(); };
  A.hStart = () => { const h = H(); const t = X.HOUSE_TYPES[h.type]; h.status = t.status; h.spaces = t.spaces; G.toast(`${t.name}: status ${t.status}, ${t.spaces} spaces`); R(); };
  A.hAddDomain = () => {
    const h = H(); const n = h.newDomain;
    h.domains.push({ id: uid(), tier: n.tier, category: n.category, kind: n.kind, name: n.name.trim() });
    h.spacesUsed += n.tier === "primary" ? 25 : 10;
    n.name = ""; R();
  };
  A.hRmDomain = (el) => { const h = H(); h.domains = h.domains.filter((d) => d.id !== el.dataset.id); R(); };
  A.hAddRole = () => { const h = H(); const n = h.newRole; h.roles.push({ id: uid(), role: n.role, flag: n.flag, who: n.who.trim() }); n.who = ""; R(); };
  A.hRmRole = (el) => { const h = H(); h.roles = h.roles.filter((r) => r.id !== el.dataset.id); R(); };
  A.hAddTrait = () => { const h = H(); if (h.newTrait.trim()) h.traits.push(h.newTrait.trim()); h.newTrait = ""; R(); };
  A.hRmTrait = (el) => { H().traits.splice(+el.dataset.i, 1); R(); };
  A.hAddBoon = () => { const h = H(); if (h.newBoon.trim()) h.boons.push({ name: h.newBoon.trim(), note: "" }); h.newBoon = ""; R(); };
  A.hRmBoon = (el) => { H().boons.splice(+el.dataset.i, 1); R(); };
  A.hAddMine = () => { H().mines.push({ id: uid(), years: 0 }); R(); };
  A.hRmMine = () => { H().mines.pop(); R(); };

  A.hRumor = () => {
    const h = H(); const opp = Math.random() < 0.5; const t = opp ? X.OPPORTUNITIES : X.CRISES;
    let e = G.pick(t.slice(0, 9));
    h.sess.news += `${h.sess.news ? "\n" : ""}Rumor: a rival House faces ${opp ? "an opportunity" : "a crisis"} — ${e.name}: ${e.text}`;
    R();
  };
  A.hTheft = () => {
    const h = H(); const r = d20(); const t = X.THEFT.find((x) => r <= x.max);
    const lose = Math.min(h.wealth, t.lose);
    h.wealth -= lose; h.sess.theftDone = true;
    hlog(`Stored-wealth roll ${r}: ${lose ? `lost ${lose} Wealth to thieves, embezzlers and envious rivals` : "no losses"}`);
    G.toast(lose ? `Rolled ${r}: −${lose} Wealth` : `Rolled ${r}: no losses`); R();
  };
  A.hCollect = () => {
    const h = H(); const inc = income(h);
    h.wealth += inc.w; h.resources += inc.r; h.sess.collected = true;
    const tapped = [];
    h.mines.forEach((m) => { m.years++; if (d20() < m.years) tapped.push(m); });
    h.mines = h.mines.filter((m) => !tapped.includes(m));
    hlog(`Income: +${inc.r} Resources, +${inc.w} Wealth${tapped.length ? `; ${tapped.length} mine(s) tapped out` : ""}`);
    if (tapped.length) G.toast(`${tapped.length} mine(s) tapped out`);
    R();
  };
  A.hEvent = () => {
    const h = H(); const lvl = statusLevel(h); const ch = X.EVENT_CHANCE[lvl.id]; const d = d20();
    const kind = d <= ch.opp ? "opp" : d >= ch.crisis ? "crisis" : "none";
    let ev = { d, kind };
    if (kind !== "none") {
      const table = kind === "opp" ? X.OPPORTUNITIES : X.CRISES;
      const e = table[Math.floor((d20() - 1) / 2)];
      Object.assign(ev, { name: e.name, text: e.text });
      if (e.rival) { const other = e.rival === "crisis" ? X.CRISES : X.OPPORTUNITIES; const r = other[Math.floor(Math.random() * 9)]; ev.rival = { name: r.name, text: r.text }; }
    }
    h.sess.event = ev;
    hlog(`Event roll ${d}: ${kind === "none" ? "quiet year" : `${kind === "opp" ? "Opportunity" : "Crisis"} — ${ev.name}${ev.rival ? ` (rival: ${ev.rival.name})` : ""}`}`);
    R();
  };
  A.hUpkeep = () => {
    const h = H(); const up = upkeep(h);
    if (up.total > h.wealth) { G.toast(`Upkeep is ${up.total} but the House has ${h.wealth} Wealth — lower a level or skip skill upkeep`); return; }
    h.wealth -= up.total;
    const notes = [];
    up.lines.filter((l) => l.skippable && h.sess.skip[l.key]).forEach((l) => {
      const sk = l.key.slice(6);
      h.skills[sk] = Math.max(1, h.skills[sk] - 1);
      h.status = Math.max(0, h.status - l.w / 2);
      notes.push(`${sk} drops to ${h.skills[sk]} (−${l.w / 2} status)`);
    });
    h.sess.upkeepPaid = true;
    hlog(`Upkeep paid: ${up.total} Wealth${notes.length ? `. ${notes.join("; ")}` : ""}`);
    R();
  };
  A.hBuyVenture = () => { const h = H(); if (h.wealth < 10) { G.toast("Not enough Wealth"); return; } h.wealth -= 10; h.sess.extra++; hlog("Bought an extra venture (10 Wealth)"); R(); };
  A.hForced = () => { const h = H(); if (h.loyalty <= 0 || h.sess.forced >= 2) return; h.loyalty--; h.sess.forced++; hlog(`Forced labor: loyalty falls to ${X.LOYALTY[h.loyalty].name}, +1 venture`); R(); };
  A.hPersonal = (el) => {
    const sk = D.SKILLS.includes(el.dataset.skill) ? el.dataset.skill : "Communicate";
    const diff = parseInt(el.dataset.diff, 10) || 2;
    G.prefillRoll({ skillName: sk, difficulty: diff, label: `Personal venture: ${el.dataset.name}` });
  };

  A.hVenture = () => {
    const h = H(); const s = h.sess; const v = resolveVenture(h);
    if (!v || v.blocked) return;
    if (s.used >= venturesAvail(h)) { G.toast("No ventures left this year — buy another for 10 Wealth"); return; }
    if (v.id === "trade") {
      const cap = Math.floor((s.tradeDir === "w2r" ? h.wealth : h.resources) / (h.spaceport ? 2 : 3));
      const amt = Math.min(s.tradeAmt, cap);
      if (s.tradeDir === "w2r") { const got = Math.floor(amt / 3); h.wealth -= got * 3; h.resources += got; hlog(`Trade: ${got * 3} Wealth → ${got} Resources`); }
      else { h.resources -= amt; h.wealth += amt * 3; hlog(`Trade: ${amt} Resources → ${amt * 3} Wealth`); }
      s.used++; R(); return;
    }
    const costR = v.res || 0, costW = (v.wealth || 0) + BONUS_COST[s.bonus];
    if (costR > h.resources) { G.toast(`Needs ${costR} Resources (have ${h.resources})`); return; }
    if (costW > h.wealth) { G.toast(`Needs ${costW} Wealth (have ${h.wealth})`); return; }
    h.resources -= costR; h.wealth -= costW;
    const need = Math.max(0, v.succ + s.adj);
    const r = Dice.rollTest({ skill: h.skills[v.skill], drive: s.drive, focus: false, difficulty: need, bonusDice: s.bonus, autoOnes: 0, compRange: 1, assistants: [] });
    s.used++;
    const notes = [];
    if (r.passed) {
      if (v.group === "Boon" && !["improve", "reduce", "invasion"].includes(v.effect)) { h.status += 1; notes.push("+1 status"); h.boons.push({ name: v.name.replace(" (continued)", ""), note: v.note }); }
      if (v.status) { h.status += v.status; notes.push(`+${v.status} status`); }
      switch (v.effect) {
        case "storage": h.storage++; notes.push("storage +10"); break;
        case "pleasure": h.pleasure++; notes.push("loyalty upkeep −1"); break;
        case "spaceport": h.spaceport = true; break;
        case "mine": h.mines.push({ id: uid(), years: 0 }); notes.push("+2 Resources per year"); break;
        case "spaceTotal": h.spaces++; notes.push("+1 space"); break;
        case "spaceUsed": h.spacesUsed++; break;
        case "improve": h.skills[v.skill] = Math.min(10, h.skills[v.skill] + 1); h.status += 1; notes.push(`${v.skill} is now ${h.skills[v.skill]}`, "+1 status"); break;
        case "reduce": { const n = Math.min(5, r.successes); h.status = Math.max(0, h.status - n); notes.push(`−${n} status`); break; }
      }
      if (v.id === "claim2" || v.id === "claim1") notes.push("add the new domain on the sheet");
      if (v.ongoing) h.ongoing = h.ongoing.filter((o) => o !== v.ongoing);
    } else {
      if (v.effect === "reduce") { const n = 3 + r.complications; h.status += n; notes.push(`backfired: +${n} status`); }
      else if (v.group === "Boon") { h.status = Math.max(0, h.status - 1); notes.push("−1 status"); }
      if (r.successes >= 1 && v.base && v.base.succ > 1) {
        if (v.ongoing) { v.ongoing.year = h.year; }
        else h.ongoing.push({ id: uid(), def: v.id, name: v.name, skill: v.skill, succ: v.base.succ - 1, cost: Math.ceil(v.base.cost / 2), costType: v.base.costType, year: h.year, base: v.base });
        notes.push("progress made — continue next year at half cost, one fewer success");
      }
    }
    if (r.complications) notes.push(`${r.complications} complication(s) — the GM may add a setback`);
    const lvl = statusLevel(h);
    const threat = lvl.id === "problematic" ? 1 : lvl.id === "dangerous" ? 2 : 0;
    if (threat) { G.adjust(threat, 0, `${lvl.name} House venture`, { force: true }); notes.push(`GM gains ${threat} Threat (${lvl.name})`); }
    s.last = { name: v.name, dice: r.dice.map((d) => d.value), successes: r.successes, need, passed: r.passed, text: notes.join("; ") };
    hlog(`${v.name}: ${r.passed ? "success" : "failed"} (${r.successes}/${need})${notes.length ? ` — ${notes.join("; ")}` : ""}`);
    R();
  };

  A.hEndYear = () => {
    const h = H(); const s = h.sess;
    if (!s.collected && !confirm("Income hasn't been collected this year. End the year anyway?")) return;
    const unused = Math.max(0, venturesAvail(h) - s.used);
    h.wealth += unused * 3;
    const cap = 10 + 10 * h.storage;
    const lost = Math.max(0, h.resources - cap);
    h.resources = Math.min(h.resources, cap);
    h.forcedLast = s.forced ? (h.loyalty === 0 ? 10 : 5) : 0;
    const dropped = h.ongoing.filter((o) => o.year < h.year);
    h.ongoing = h.ongoing.filter((o) => o.year >= h.year);
    hlog(`End of year ${h.year}: ${unused ? `+${unused * 3} Wealth from unused ventures; ` : ""}${lost ? `${lost} Resources spoiled; ` : ""}${dropped.length ? `${dropped.length} unfinished venture(s) abandoned; ` : ""}treasury ${h.wealth} W / ${h.resources} R`);
    h.year++;
    const keep = { drive: s.drive };
    h.sess = Object.assign(newSession(), keep);
    G.toast(`Year ${h.year} begins`);
    R();
  };

  // Re-render the House view when house selects/checkboxes change (handled by app's change listener).
})();
