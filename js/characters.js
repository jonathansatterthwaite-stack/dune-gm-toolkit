// Characters tab — guided creator for player characters, supporting characters and NPCs, with live rule checks.
(function () {
  const G = window.GM, D = window.DUNE, X = window.DUNE_X, C = window.DUNE_CH;
  const { esc, uid, pick, shuffle, clamp } = G;
  const SK = D.SKILLS;
  const ALL_DRIVES = D.DRIVES.concat(Object.keys(X.COURT_DRIVES));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const arch = (name) => C.ARCHETYPES.find((a) => a.name === name);
  const fac = (name) => C.FACTIONS.find((f) => f.name === name);
  const talentDef = (name) => C.TALENTS.find((t) => t.name === name);
  const isPC = (k) => k === "pc" || k === "quick";
  const isMinor = (k) => k === "supMinor" || k === "npcMinor";
  const isNotable = (k) => k === "supNotable" || k === "npcNotable";
  const isSup = (k) => k === "supMinor" || k === "supNotable";
  const tierOf = (k) => (isPC(k) ? "pc" : isMinor(k) ? "minor" : isNotable(k) ? "notable" : "major");
  const focusQuota = (v) => (v >= 8 ? 3 : v === 7 ? 2 : v === 6 ? 1 : 0);

  G.ensure("chars", { list: [], sel: "", filter: "all", nf: { skill: "Battle", name: "" }, nt: { name: "" }, na: { name: "", tangible: true }, nab: { name: "Proficiency", skill: "Battle" }, rollDrive: "" });
  const CS = () => G.S.chars;
  const cur = () => CS().list.find((c) => c.id === CS().sel);

  function blank(kind) {
    const ch = {
      id: uid(), kind, name: "", concept: "", faction: "", archetype: "",
      traits: { role: "", faction: "", personal: "", extra: "" },
      skills: { Battle: 4, Communicate: 4, Discipline: 4, Move: 4, Understand: 4 },
      focuses: [], talents: [], abilities: [], assets: [],
      driveNames: D.DRIVES.slice(), drives: {}, statements: {}, single: 5, top: "", second: "",
      ambition: "", details: { appearance: "", personality: "", relationships: "", notes: "" },
      extras: { rep: false, stmt2: false, bump: false, focus2: false, talent2: false },
    };
    if (kind === "quick") SK.forEach((s) => (ch.skills[s] = 0));
    if (isMinor(kind)) Object.assign(ch.skills, { Battle: 6, Communicate: 5, Discipline: 5, Move: 4, Understand: 4 });
    if (isNotable(kind)) Object.assign(ch.skills, { Battle: 7, Communicate: 6, Discipline: 5, Move: 5, Understand: 4 });
    return ch;
  }

  // Effective drive ratings, whatever the kind.
  function drives(ch) {
    const out = {};
    ch.driveNames.forEach((n) => {
      if (isMinor(ch.kind)) out[n] = ch.single;
      else if (isNotable(ch.kind)) out[n] = n === ch.top ? 7 : n === ch.second ? 6 : 5;
      else out[n] = ch.drives[n] || 0;
    });
    return out;
  }
  const bestDrive = (ch) => { const d = drives(ch); return ch.driveNames.reduce((a, b) => ((d[b] || 0) > (d[a] || 0) ? b : a), ch.driveNames[0]); };

  // Apply an archetype's skill pattern for the character's kind.
  function applyArchetype(ch) {
    const a = arch(ch.archetype); if (!a) return;
    ch.traits.role = a.name;
    const others = SK.filter((s) => s !== a.primary && s !== a.secondary);
    const set = (p, s2, rest) => { ch.skills[a.primary] = p; ch.skills[a.secondary] = s2; others.forEach((s, i) => (ch.skills[s] = rest[i])); };
    if (ch.kind === "pc") set(6, 5, [4, 4, 4]);
    else if (ch.kind === "quick") set(7, 6, [0, 0, 0]);
    else if (isMinor(ch.kind)) set(6, 5, shuffle([5, 4, 4]));
    else if (isNotable(ch.kind)) set(7, 6, shuffle([5, 5, 4]));
    else set(8, 7, [4, 4, 4]);
  }

  // ---------- rule checks ----------
  function assetQuota(ch) {
    let n = ch.kind === "pc" ? 3 : ch.kind === "quick" ? 1 : 0;
    ch.talents.forEach((t) => { if (t.name === "Improved Resources") n += 1; if (t.name === "Specialist") n += 2; });
    return n;
  }
  function supCost(ch) {
    if (ch.kind === "supMinor") return 1;
    if (ch.kind !== "supNotable") return 0;
    const e = ch.extras;
    return 3 + (e.rep ? 1 : 0) + (e.stmt2 ? 1 : 0) + (e.bump ? 1 : 0) + (e.focus2 ? 1 : 0) + (e.talent2 ? 2 : 0);
  }
  function validate(ch) {
    const v = { concept: [], archetype: [], skills: [], focuses: [], talents: [], drives: [], assets: [], finish: [] };
    const k = ch.kind, a = arch(ch.archetype), f = fac(ch.faction), sk = ch.skills, vals = SK.map((s) => sk[s]);
    const sorted = (arr) => arr.slice().sort((x, y) => y - x).join(",");
    const sum = vals.reduce((x, y) => x + y, 0);
    if (!ch.name.trim()) v.finish.push("Give them a name.");
    // archetype
    if (isPC(k) && !a) v.archetype.push("Choose an archetype.");
    if (!isPC(k) && !ch.traits.role.trim()) v.archetype.push("Give them a role trait (pick an archetype or type one).");
    // skills
    if (k === "pc") {
      if (a) {
        const base = (s) => (s === a.primary ? 6 : s === a.secondary ? 5 : 4);
        SK.forEach((s) => { if (sk[s] < base(s)) v.skills.push(`${s} can't go below its archetype value of ${base(s)}.`); if (sk[s] > 8) v.skills.push(`${s} can't exceed 8.`); });
        const spent = sum - 23; // archetype base 6+5+4+4+4
        if (spent !== 5) v.skills.push(spent < 5 ? `${5 - spent} of 5 skill points left to spend.` : `${spent - 5} point(s) too many spent.`);
      } else v.skills.push("Choose an archetype first — it sets your starting skills.");
    } else if (k === "quick") {
      if (a && (sk[a.primary] !== 7 || sk[a.secondary] !== 6)) v.skills.push(`${a.primary} should be 7 and ${a.secondary} 6.`);
    } else if (isMinor(k)) {
      if (sorted(vals) !== "6,5,5,4,4") v.skills.push("Skills should be one 6, two 5s and two 4s.");
    } else if (isNotable(k)) {
      const bump = k === "supNotable" ? ch.extras.bump : sum === 29;
      if (!bump && sorted(vals) !== "7,6,5,5,4") v.skills.push("Skills should be 7, 6, 5, 5, 4.");
      if (bump && (sum !== 29 || Math.max(...vals) > 8)) v.skills.push("With the +1/+1 option, skills total 29 (7, 6, 5, 5, 4 with two raised), max 8.");
    } else {
      if (vals.some((x) => x < 4 || x > 8)) v.skills.push("Every skill is between 4 and 8.");
      if (sum !== 31) v.skills.push(sum < 31 ? `${31 - sum} of 11 skill points left to spend.` : `${sum - 31} point(s) too many spent.`);
    }
    // focuses
    const nf = ch.focuses.length;
    if (k === "pc") {
      if (nf !== 4) v.focuses.push(`Choose 4 focuses (${nf} so far).`);
      if (a && !ch.focuses.some((x) => x.skill === a.primary)) v.focuses.push(`At least one focus should be for ${a.primary}.`);
    } else if (k === "quick") { if (nf < 2) v.focuses.push(`Choose your archetype's 2 focuses (${nf} so far). The other two come in play.`); }
    else if (k === "npcMajor") { if (nf < 3 || nf > 5) v.focuses.push(`Major NPCs have 3–5 focuses (${nf} now).`); }
    else {
      const want = SK.reduce((n, s) => n + focusQuota(sk[s]), 0) + (k === "supNotable" && ch.extras.focus2 ? 2 : 0);
      if (nf !== want && !(k === "npcNotable" && nf >= want && nf <= want + 2)) v.focuses.push(`Expected ${want} focus${want === 1 ? "" : "es"} (1 per skill at 6, 2 at 7, 3 at 8${k === "supNotable" && ch.extras.focus2 ? ", +2 extra" : ""}); have ${nf}.`);
    }
    // talents
    const nt = ch.talents.length, na = ch.abilities.length;
    if (k === "pc" && nt !== 3) v.talents.push(`Choose 3 talents (${nt} so far).`);
    if (k === "quick" && nt !== 1) v.talents.push(`Choose 1 talent (${nt} so far). The other two come in play.`);
    if (k === "supNotable") { const want = ch.extras.talent2 ? 2 : 1; if (nt !== want) v.talents.push(`Choose ${want} talent${want > 1 ? "s" : ""} (${nt} so far).`); }
    if (k === "npcNotable" && (nt + na < 1 || nt + na > 2)) v.talents.push(`Notable NPCs have 1–2 talents or abilities (${nt + na} now).`);
    if (k === "npcMajor" && (nt + na < 2 || nt + na > 4)) v.talents.push(`Major NPCs have 2–4 talents or abilities (${nt + na} now).`);
    if (isMinor(k) && nt > 1) v.talents.push("Minor characters have at most one talent (from House training).");
    if (f) {
      const has = (n) => ch.talents.some((t) => t.name === n);
      if (f.anyOf ? !f.mandatory.some(has) : !f.mandatory.every(has)) v.talents.push(`${f.name} must take ${f.anyOf ? "one of: " : ""}${f.mandatory.join(", ")}.`);
    }
    ch.talents.forEach((t) => { const d = talentDef(t.name); if (d && d.param && !t.param) v.talents.push(`${t.name} needs a ${d.param} choice.`); });
    // drives
    const dv = drives(ch);
    if (new Set(ch.driveNames).size !== 5) v.drives.push("Each drive can only appear once.");
    if (k === "pc" || k === "npcMajor") {
      const got = ch.driveNames.map((n) => dv[n]).sort((x, y) => y - x).join(",");
      if (got !== "8,7,6,5,4") v.drives.push("Assign 8, 7, 6, 5 and 4 — one each.");
      ch.driveNames.forEach((n) => { if (dv[n] >= 6 && !(ch.statements[n] || "").trim()) v.drives.push(`${n} (${dv[n]}) needs a drive statement.`); });
    } else if (k === "quick") {
      const eights = ch.driveNames.filter((n) => dv[n] === 8);
      if (eights.length !== 1) v.drives.push("Choose one drive at 8 (the rest are set in play).");
      else if (!(ch.statements[eights[0]] || "").trim()) v.drives.push(`${eights[0]} needs a drive statement.`);
    } else if (isNotable(k)) {
      if (!ch.top || !ch.second || ch.top === ch.second) v.drives.push("Pick two different drives at 7 and 6.");
      const st = [ch.top, ch.second].filter((n) => n && (ch.statements[n] || "").trim()).length;
      const want = k === "supNotable" ? (ch.extras.stmt2 ? 2 : 1) : 0;
      if (k === "supNotable" && st !== want) v.drives.push(`Write ${want} drive statement${want > 1 ? "s" : ""} for the 7/6 drives (${st} now).`);
      if (k === "npcNotable" && (st < 1 || st > 2)) v.drives.push("Write 1–2 statements for the 7/6 drives.");
    } else if (ch.single < 4 || ch.single > 8) v.drives.push("The single Drive rating is 4–8.");
    // assets
    const qa = assetQuota(ch);
    if (isPC(k)) {
      if (ch.assets.length !== qa) v.assets.push(`Choose ${qa} asset${qa === 1 ? "" : "s"} (${ch.assets.length} so far).`);
      if (k === "pc" && ch.assets.length && !ch.assets.some((x) => x.tangible)) v.assets.push("At least one asset must be tangible.");
    }
    // finishing touches
    if (k === "pc" && !ch.traits.personal.trim()) v.finish.push("Add a personal trait (reputation or personality).");
    if (k === "pc" && !ch.ambition.trim()) v.finish.push("Write an ambition tied to the highest drive.");
    if ((k === "npcMajor") && !ch.traits.personal.trim()) v.finish.push("Major NPCs have a reputation trait.");
    if (k === "supNotable" && ch.extras.rep && !ch.traits.personal.trim()) v.finish.push("You paid for a reputation trait — write it.");
    const issues = Object.values(v).reduce((n, x) => n + x.length, 0);
    return { v, issues };
  }

  // ---------- auto-fill ----------
  function autofill(ch) {
    const k = ch.kind, f = fac(ch.faction);
    if (!ch.archetype && (isPC(k) || !ch.traits.role)) {
      let pool = C.ARCHETYPES.filter((a) => a.book === "Core");
      if (f) { const sug = f.suggest.split(",").map((s) => s.trim()); const m = pool.filter((a) => sug.includes(a.name)); if (m.length) pool = m; }
      ch.archetype = pick(pool).name; applyArchetype(ch);
    }
    const a = arch(ch.archetype);
    if (f && !ch.traits.faction) ch.traits.faction = f.trait;
    // skills
    const prim = a ? a.primary : SK.reduce((x, y) => (ch.skills[y] > ch.skills[x] ? y : x));
    const sec = a ? a.secondary : SK.filter((s) => s !== prim).reduce((x, y) => (ch.skills[y] > ch.skills[x] ? y : x));
    const spend = (total) => { let guard = 0; while (SK.reduce((n, s) => n + ch.skills[s], 0) < total && guard++ < 200) { const s = pick([prim, prim, sec, sec].concat(SK)); if (ch.skills[s] < 8) ch.skills[s]++; } };
    if (k === "pc" && a) spend(28);
    if (k === "npcMajor") spend(31);
    // focuses
    const fwant = k === "pc" ? 4 : k === "quick" ? 2 : k === "npcMajor" ? 4 : SK.reduce((n, s) => n + focusQuota(ch.skills[s]), 0) + (k === "supNotable" && ch.extras.focus2 ? 2 : 0);
    const cands = [];
    if (a) a.focuses.forEach((n, i) => cands.push({ skill: i === 0 ? a.primary : a.secondary, name: n }));
    shuffle(D.FOCUSES[prim]).forEach((n) => cands.push({ skill: prim, name: n }));
    shuffle(D.FOCUSES[sec]).forEach((n) => cands.push({ skill: sec, name: n }));
    if (!isPC(k)) { SK.forEach((s) => { const q = focusQuota(ch.skills[s]); const have = ch.focuses.filter((x) => x.skill === s).length; shuffle(D.FOCUSES[s]).slice(0, Math.max(0, q - have)).forEach((n) => { if (ch.focuses.length < fwant && !ch.focuses.some((x) => x.name === n)) ch.focuses.push({ id: uid(), skill: s, name: n }); }); }); }
    for (const c of cands) { if (ch.focuses.length >= fwant) break; if (!ch.focuses.some((x) => x.name === c.name)) ch.focuses.push({ id: uid(), skill: c.skill, name: c.name }); }
    // talents
    const twant = k === "pc" ? 3 : k === "quick" ? 1 : k === "supNotable" ? (ch.extras.talent2 ? 2 : 1) : k === "npcNotable" ? 1 : k === "npcMajor" ? 3 : 0;
    const addT = (n) => { if (ch.talents.length < twant && !ch.talents.some((t) => t.name === n) && talentDef(n)) { const d = talentDef(n); ch.talents.push({ id: uid(), name: n, param: d.param === "skill" ? prim : d.param === "drive" ? bestDrive(ch) || "Duty" : d.param === "asset" ? "dueling" : "" }); } };
    if (f && !(f.anyOf ? f.mandatory.some((n) => ch.talents.some((t) => t.name === n)) : f.mandatory.every((n) => ch.talents.some((t) => t.name === n)))) (f.anyOf ? [pick(f.mandatory)] : f.mandatory).forEach(addT);
    if (a) a.talents.forEach(addT);
    shuffle(C.TALENTS.filter((t) => !t.faction && t.book.startsWith("Core"))).forEach((t) => addT(t.name));
    // drives
    if (k === "pc" || k === "npcMajor") {
      const used = new Set(ch.driveNames.map((n) => ch.drives[n]).filter(Boolean));
      const left = shuffle([8, 7, 6, 5, 4].filter((x) => !used.has(x)));
      ch.driveNames.forEach((n) => { if (!ch.drives[n]) ch.drives[n] = left.shift(); });
    } else if (k === "quick") { if (!ch.driveNames.some((n) => ch.drives[n] === 8)) ch.drives[pick(ch.driveNames)] = 8; }
    else if (isNotable(k)) { const order = shuffle(ch.driveNames); if (!ch.top) ch.top = order[0]; if (!ch.second || ch.second === ch.top) ch.second = order.find((n) => n !== ch.top); }
    const dv = drives(ch);
    const bank = (n) => (D.STATEMENTS[n] || (X.COURT_DRIVES[n] || {}).statements || ["I will see this through."]);
    const needSt = k === "pc" || k === "npcMajor" ? ch.driveNames.filter((n) => dv[n] >= 6) : k === "quick" ? ch.driveNames.filter((n) => dv[n] === 8) : isNotable(k) ? [ch.top].concat(k === "supNotable" && ch.extras.stmt2 ? [ch.second] : []) : [];
    needSt.forEach((n) => { if (n && !(ch.statements[n] || "").trim()) ch.statements[n] = pick(bank(n)); });
    // assets
    const qa = assetQuota(ch);
    const pool = shuffle((C.ASSETS[prim] || []).concat(C.ASSETS[sec] || []));
    while (isPC(k) && ch.assets.length < qa && pool.length) { const [n, t] = pool.shift(); if (!ch.assets.some((x) => x.name === n)) ch.assets.push({ id: uid(), name: n, tangible: t, q: 0 }); }
    if (k === "pc" && ch.assets.length && !ch.assets.some((x) => x.tangible)) ch.assets[0].tangible = true;
    // finishing
    if (!ch.traits.role && a) ch.traits.role = a.name;
    if ((k === "pc" || k === "npcMajor" || (k === "supNotable" && ch.extras.rep)) && !ch.traits.personal) ch.traits.personal = pick(D.REPUTATION);
    if (isPC(k) && !ch.ambition) ch.ambition = pick(C.AMBITIONS[bestDrive(ch)] || C.AMBITIONS.Duty);
    if (!ch.name) { const fr = ch.faction === "Fremen" || (a && a.book === "Sand and Dust"); const N = fr ? D.NAMES.fremen : D.NAMES.imperial; ch.name = fr ? `${pick(N.given)} ${pick(N.epithet)}` : `${pick(N.given)} ${pick(N.family)}`; }
  }

  // ---------- rendering ----------
  const badge = (msgs) => (msgs.length ? `<span class="badge npc" title="${esc(msgs.join(" "))}">${msgs.length} to do</span>` : `<span class="badge pass">✓</span>`);
  const notes = (msgs) => (msgs.length ? `<ul class="ch-issues">${msgs.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : "");
  const sec = (n, title, msgs, body, open) => `<details class="card ch-step" ${open ? "open" : ""}><summary><span class="ch-n">${n}</span><b>${title}</b>${badge(msgs)}</summary>${notes(msgs)}${body}</details>`;

  function roster() {
    const cs = CS(), f = cs.filter;
    const list = cs.list.filter((c) => f === "all" || (f === "pc" && isPC(c.kind)) || (f === "sup" && isSup(c.kind)) || (f === "npc" && c.kind.startsWith("npc")));
    return `<div class="card">
      <div class="card-head"><h2>Characters</h2>${G.seg("chars.filter", [{ v: "all", l: "All" }, { v: "pc", l: "Players" }, { v: "sup", l: "Supporting" }, { v: "npc", l: "NPCs" }])}</div>
      <div class="mini" style="margin-bottom:0.6rem"><span class="small muted">New:</span>${Object.keys(C.KINDS).map((k) => `<button class="btn small ${isPC(k) ? "primary" : ""}" data-act="chNew" data-k="${k}" title="${esc(C.KINDS[k].desc)}">${esc(C.KINDS[k].name)}</button>`).join("")}</div>
      <div class="ch-roster">${list.map((c) => { const { issues } = validate(c); return `<button class="ch-chip ${c.id === cs.sel ? "on" : ""}" data-act="chOpen" data-id="${c.id}"><b>${esc(c.name || "Unnamed")}</b><span>${esc(C.KINDS[c.kind].name)}${c.archetype ? ` · ${esc(c.archetype)}` : ""}</span>${issues ? `<i class="ch-dot" title="${issues} rule issue(s)"></i>` : ""}</button>`; }).join("") || `<span class="empty">No characters yet — start one above, or open a generated NPC from the NPCs tab.</span>`}</div>
    </div>`;
  }

  function editor(ch) {
    const { v, issues } = validate(ch), k = ch.kind, base = `chars.list.#${ch.id}`, a = arch(ch.archetype), f = fac(ch.faction), cs = CS();
    const kinds = Object.keys(C.KINDS).map((x) => ({ v: x, l: C.KINDS[x].name }));
    // 1 concept
    const s1 = `<div class="row"><span class="lbl">Kind</span>${G.select(`${base}.kind`, kinds)}</div>
      <p class="hint">${esc(C.KINDS[k].desc)}</p>
      <label class="field">Name<input type="text" data-bind="${base}.name" value="${esc(ch.name)}" placeholder="e.g. Kara Molay"/></label>
      <label class="field">Concept<input type="text" data-bind="${base}.concept" value="${esc(ch.concept)}" placeholder="One line: who are they and what do they do?"/></label>
      ${isPC(k) || k !== "npcMinor" ? `<label class="field">Faction template (optional)<select data-bind="${base}.faction"><option value="">None — a House agent</option>${C.FACTIONS.map((x) => `<option value="${esc(x.name)}" ${ch.faction === x.name ? "selected" : ""}>${esc(x.name)} (${esc(x.book)})</option>`).join("")}</select></label>` : ""}
      ${f ? `<p class="hint">Bonus trait <b>${esc(f.trait)}</b>. Must take ${f.anyOf ? "one of" : ""} <b>${esc(f.mandatory.join(", "))}</b>. Suits: ${esc(f.suggest)}.</p>` : ""}`;
    // 2 archetype
    const books = ["Core", "Sand and Dust", "Great Game"];
    const s2 = `<label class="field">Archetype${isPC(k) ? "" : " (optional template)"}<select data-bind="${base}.archetype"><option value="">${isPC(k) ? "Choose…" : "None"}</option>${books.map((b) => `<optgroup label="${b}">${C.ARCHETYPES.filter((x) => x.book === b).map((x) => `<option value="${esc(x.name)}" ${ch.archetype === x.name ? "selected" : ""}>${esc(x.name)} — ${x.primary}/${x.secondary}</option>`).join("")}</optgroup>`).join("")}</select></label>
      ${a ? `<p class="hint">Primary <b>${a.primary}</b>, secondary <b>${a.secondary}</b>. Suggested focuses: ${esc(a.focuses.join(", "))}. Suggested talent: ${esc(a.talents.join(" or "))}.</p>` : ""}
      <div class="mini"><label class="field" style="flex:1">Role trait<input type="text" data-bind="${base}.traits.role" value="${esc(ch.traits.role)}" placeholder="e.g. Duelist"/></label>
      <label class="field" style="flex:1">Faction trait<input type="text" data-bind="${base}.traits.faction" value="${esc(ch.traits.faction)}" placeholder="—"/></label></div>`;
    // 3 skills
    let skillRows;
    if (k === "pc" && a) {
      const baseV = (s) => (s === a.primary ? 6 : s === a.secondary ? 5 : 4);
      const left = 5 - (SK.reduce((n, s) => n + ch.skills[s], 0) - 23);
      skillRows = `<p class="small">Archetype gives ${a.primary} 6, ${a.secondary} 5, others 4. Spend <b>${left}</b> more point${left === 1 ? "" : "s"} (max 8 each).</p>` +
        SK.map((s) => `<div class="row ch-skill"><span class="lbl">${s}</span><span class="stepper"><button data-act="chSkill" data-s="${s}" data-d="-1" ${ch.skills[s] <= baseV(s) ? "disabled" : ""}>−</button><span class="v">${ch.skills[s]}</span><button data-act="chSkill" data-s="${s}" data-d="1" ${ch.skills[s] >= 8 || left <= 0 ? "disabled" : ""}>+</button></span><span class="hint">base ${baseV(s)}</span></div>`).join("");
    } else if (k === "pc") skillRows = `<p class="hint">Choose an archetype first.</p>`;
    else {
      const guide = { quick: "Primary 7, secondary 6. Leave the rest at 0 and set them in play.", supMinor: "One 6, two 5s, two 4s.", npcMinor: "One 6, two 5s, two 4s.", supNotable: "7, 6, 5, 5, 4.", npcNotable: "7, 6, 5, 5, 4 (optionally raise two by 1).", npcMajor: "All start at 4; spend 11 more points (max 8)." }[k];
      skillRows = `<p class="small">${guide}${k === "npcMajor" ? ` <b>${31 - SK.reduce((n, s) => n + ch.skills[s], 0)}</b> left.` : ""}</p>` + SK.map((s) => `<div class="row ch-skill"><span class="lbl">${s}</span>${G.stepper(`${base}.skills.${s}`, 0, 8)}</div>`).join("");
      if (k === "supNotable") skillRows += `<label class="check small"><input type="checkbox" data-bind="${base}.extras.bump" data-type="bool" ${ch.extras.bump ? "checked" : ""}/> +1 to two different skills (+1 cost)</label>`;
    }
    // 4 focuses
    const sugg = [];
    if (a) a.focuses.forEach((n, i) => sugg.push({ s: i === 0 ? a.primary : a.secondary, n }));
    const s4 = `<div class="chips">${ch.focuses.map((x) => `<span class="chip"><b>${esc(x.name)}</b>&nbsp;<span class="muted">${esc(x.skill)}</span><button data-act="chRm" data-list="focuses" data-id="${x.id}" aria-label="remove">×</button></span>`).join("") || `<span class="empty small">None yet.</span>`}</div>
      ${sugg.length ? `<div class="chips"><span class="small muted">Archetype:</span>${sugg.filter((x) => !ch.focuses.some((y) => y.name === x.n)).map((x) => `<span class="chip chip-add" data-act="chAddFocus" data-s="${esc(x.s)}" data-n="${esc(x.n)}">+ ${esc(x.n)}</span>`).join("")}</div>` : ""}
      <div class="mini">${G.select("chars.nf.skill", SK)}<input type="text" list="chFocusList" placeholder="Focus" data-bind="chars.nf.name" value="${esc(cs.nf.name)}"/><datalist id="chFocusList">${(D.FOCUSES[cs.nf.skill] || []).map((n) => `<option value="${esc(n)}">`).join("")}</datalist><button class="btn small" data-act="chAddFocus">Add</button></div>
      <p class="hint">Focuses apply to any test where they fit; the skill is just where they usually help. Some need a speciality, like Music (Baliset).</p>`;
    // 5 talents
    const suggested = [].concat(f ? f.mandatory : [], a ? a.talents : []).filter((n, i, arr) => arr.indexOf(n) === i);
    const tOpt = (t) => `<option value="${esc(t.name)}" ${cs.nt.name === t.name ? "selected" : ""}>${esc(t.name)}${t.param ? ` (${t.param})` : ""}</option>`;
    const selT = talentDef(cs.nt.name);
    const s5 = `<div class="ch-talents">${ch.talents.map((t) => { const d = talentDef(t.name) || { text: "", book: "" }; return `<div class="ch-talent"><div><b>${esc(t.name)}</b>${d.param === "skill" ? ` ${G.select(`${base}.talents.#${t.id}.param`, [""].concat(SK).map((x) => ({ v: x, l: x || "skill…" })))}` : d.param === "drive" ? ` ${G.select(`${base}.talents.#${t.id}.param`, [""].concat(ch.driveNames).map((x) => ({ v: x, l: x || "drive…" })))}` : d.param === "asset" ? ` ${G.select(`${base}.talents.#${t.id}.param`, ["dueling", "warfare", "espionage", "intrigue"])}` : ""}<div class="hint">${esc(d.text)} <span class="pg">${esc(d.book)}</span></div></div><button class="btn small ghost danger" data-act="chRm" data-list="talents" data-id="${t.id}">×</button></div>`; }).join("") || `<span class="empty small">None yet.</span>`}</div>
      ${suggested.length ? `<div class="chips"><span class="small muted">Suggested:</span>${suggested.filter((n) => !ch.talents.some((t) => t.name === n)).map((n) => `<span class="chip chip-add" data-act="chAddTalent" data-n="${esc(n)}">+ ${esc(n)}</span>`).join("")}</div>` : ""}
      <div class="mini"><select data-bind="chars.nt.name"><option value="">Choose a talent…</option>
        <optgroup label="General">${C.TALENTS.filter((t) => !t.faction && t.book.startsWith("Core")).map(tOpt).join("")}</optgroup>
        <optgroup label="Faction">${C.TALENTS.filter((t) => t.faction).map(tOpt).join("")}</optgroup>
        <optgroup label="Expansions">${C.TALENTS.filter((t) => !t.faction && !t.book.startsWith("Core")).map(tOpt).join("")}</optgroup></select>
        <button class="btn small" data-act="chAddTalent">Add</button></div>
      ${selT ? `<p class="hint"><b>${esc(selT.name)}:</b> ${esc(selT.text)}${selT.faction ? ` <i>(${esc(selT.faction)})</i>` : ""} <span class="pg">${esc(selT.book)}</span></p>` : ""}
      ${k === "npcNotable" || k === "npcMajor" ? `<hr class="divider"/><p class="small"><b>NPC special abilities</b> can replace talents (Core p.240).</p>
        <div class="chips">${ch.abilities.map((x) => `<span class="chip"><b>${esc(x.name)}</b>&nbsp;${esc(x.skill)}<button data-act="chRm" data-list="abilities" data-id="${x.id}">×</button></span>`).join("")}</div>
        <div class="mini">${G.select("chars.nab.name", D.SPECIAL_ABILITIES.map((x) => x.name))}${G.select("chars.nab.skill", SK)}<button class="btn small" data-act="chAddAbility">Add ability</button></div>` : ""}
      ${k === "supNotable" ? `<label class="check small"><input type="checkbox" data-bind="${base}.extras.talent2" data-type="bool" ${ch.extras.talent2 ? "checked" : ""}/> Second talent (+2 cost)</label>` : ""}`;
    // 6 drives
    const dv = drives(ch);
    const nameSel = (i) => `<select data-bind="${base}.driveNames.${i}">${ALL_DRIVES.map((n) => `<option ${ch.driveNames[i] === n ? "selected" : ""}>${n}</option>`).join("")}</select>`;
    let s6;
    if (isMinor(k)) s6 = `<div class="row"><span class="lbl">Drive</span>${G.stepper(`${base}.single`, 4, 8)}<span class="hint">One rating for every test, no statements. Usually 5; 6 serving the House's secondary domain, 7 its primary.</span></div>`;
    else if (isNotable(k)) s6 = `<div class="mini"><label class="field">Drive at 7<select data-bind="${base}.top"><option value="">—</option>${ch.driveNames.map((n) => `<option ${ch.top === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        <label class="field">Drive at 6<select data-bind="${base}.second"><option value="">—</option>${ch.driveNames.map((n) => `<option ${ch.second === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
        <p class="hint">All other drives are 5.</p>
        ${[ch.top, ch.second].filter(Boolean).map((n) => `<label class="field">${n} statement<input type="text" data-bind="${base}.statements.${n}" value="${esc(ch.statements[n] || "")}" placeholder="${esc(pick(D.STATEMENTS[n] || ["…"]))}"/></label>`).join("")}
        ${k === "supNotable" ? `<label class="check small"><input type="checkbox" data-bind="${base}.extras.stmt2" data-type="bool" ${ch.extras.stmt2 ? "checked" : ""}/> Statement for both drives (+1 cost)</label>` : ""}`;
    else s6 = `<table class="ch-drives">${ch.driveNames.map((n, i) => `<tr><td>${nameSel(i)}</td><td><select data-bind="${base}.drives.${n}" data-type="num"><option value="0">—</option>${[8, 7, 6, 5, 4].map((x) => `<option value="${x}" ${dv[n] === x ? "selected" : ""}>${x}</option>`).join("")}</select></td>
        <td style="width:100%">${dv[n] >= (k === "quick" ? 8 : 6) ? `<input type="text" data-bind="${base}.statements.${n}" value="${esc(ch.statements[n] || "")}" placeholder="${esc(((D.STATEMENTS[n] || (X.COURT_DRIVES[n] || {}).statements) || ["Statement…"])[0])}" style="width:100%"/>` : `<span class="hint">${dv[n] ? "No statement below 6" : ""}</span>`}</td></tr>`).join("")}</table>
        <p class="hint">${k === "quick" ? "Pick one drive at 8 and write its statement; the others are set during play." : "Rank them 8 to 4. Drives at 6+ get a statement — what the character believes."} Power and Pawns drives (Challenge, Glory, Hate, Honor, Indulgence, Love) can replace one or two.</p>`;
    // 7 assets
    const aPool = a ? (C.ASSETS[a.primary] || []).concat(C.ASSETS[a.secondary] || []) : [];
    const s7 = `<div class="ch-talents">${ch.assets.map((x) => `<div class="ch-talent"><div><input type="text" data-bind="${base}.assets.#${x.id}.name" value="${esc(x.name)}" style="min-width:160px"/>
        <label class="check small" style="display:inline-flex;margin:0 0 0 0.4rem"><input type="checkbox" data-bind="${base}.assets.#${x.id}.tangible" data-type="bool" ${x.tangible ? "checked" : ""}/> Tangible</label>
        <span class="small">Quality</span> ${G.stepper(`${base}.assets.#${x.id}.q`, 0, 4)}</div><button class="btn small ghost danger" data-act="chRm" data-list="assets" data-id="${x.id}">×</button></div>`).join("") || `<span class="empty small">None yet.</span>`}</div>
      ${aPool.length ? `<div class="chips"><span class="small muted">Ideas:</span>${aPool.filter(([n]) => !ch.assets.some((x) => x.name === n)).map(([n, t]) => `<span class="chip chip-add" data-act="chAddAsset" data-n="${esc(n)}" data-t="${t ? 1 : 0}">+ ${esc(n)}</span>`).join("")}</div>` : ""}
      <div class="mini"><input type="text" placeholder="Asset" data-bind="chars.na.name" value="${esc(cs.na.name)}"/><label class="check small" style="margin:0"><input type="checkbox" data-bind="chars.na.tangible" data-type="bool" ${cs.na.tangible ? "checked" : ""}/> Tangible</label><button class="btn small" data-act="chAddAsset">Add</button></div>
      <p class="hint">${isPC(k) ? `${assetQuota(ch)} asset(s)${k === "pc" ? ", at least one tangible (something you can hold or command)" : ""}. Improved Resources adds 1, Specialist adds 2.` : "Supporting characters and NPCs only have assets the GM decides they need."}</p>`;
    // 8 finishing touches
    const s8 = `<div class="mini"><label class="field" style="flex:1">${k === "pc" ? "Personal trait" : "Reputation trait"}<input type="text" data-bind="${base}.traits.personal" value="${esc(ch.traits.personal)}" placeholder="${esc(pick(D.REPUTATION))}"/></label>
        ${k === "npcMajor" ? `<label class="field" style="flex:1">Faction trait (optional)<input type="text" data-bind="${base}.traits.extra" value="${esc(ch.traits.extra)}"/></label>` : ""}</div>
      ${k === "supNotable" ? `<label class="check small"><input type="checkbox" data-bind="${base}.extras.rep" data-type="bool" ${ch.extras.rep ? "checked" : ""}/> Reputation trait (+1 cost)</label>` : ""}
      ${isPC(k) ? `<label class="field">Ambition (tied to ${esc(bestDrive(ch))})<input type="text" data-bind="${base}.ambition" value="${esc(ch.ambition)}" placeholder="${esc(pick(C.AMBITIONS[bestDrive(ch)] || C.AMBITIONS.Duty))}"/></label>` : ""}
      <label class="field">Appearance<textarea data-bind="${base}.details.appearance" rows="2">${esc(ch.details.appearance)}</textarea></label>
      <label class="field">Personality<textarea data-bind="${base}.details.personality" rows="2">${esc(ch.details.personality)}</textarea></label>
      <label class="field">Relationships<textarea data-bind="${base}.details.relationships" rows="2">${esc(ch.details.relationships)}</textarea></label>
      <label class="field">Notes<textarea data-bind="${base}.details.notes" rows="2">${esc(ch.details.notes)}</textarea></label>`;
    return `<div class="card ch-head">
        <div class="card-head"><h2>${esc(ch.name || "New character")}</h2><span class="badge">${esc(C.KINDS[k].name)}</span></div>
        <div class="c-actions"><button class="btn primary" data-act="chAuto" title="Fill every empty choice with valid picks">Auto-fill the rest</button><button class="btn" data-act="chDup">Duplicate</button><button class="btn ghost danger" data-act="chDel">Delete</button></div>
        <p class="small ${issues ? "" : "ch-ready"}">${issues ? `${issues} thing${issues === 1 ? "" : "s"} left before this character is ready.` : "Ready to play — every creation rule checks out."}${isSup(k) ? ` · Bringing them in costs <b>${supCost(ch)}</b> Momentum (or Threat)${k === "supNotable" ? `; reusing costs ${Math.ceil(supCost(ch) / 2)}` : ""}.` : ""}</p>
      </div>
      ${sec(1, "Concept", v.concept, s1, true)}
      ${sec(2, isPC(k) ? "Archetype" : "Role", v.archetype, s2, isPC(k) && !a)}
      ${sec(3, "Skills", v.skills, skillRows, !!v.skills.length)}
      ${sec(4, "Focuses", v.focuses, s4, !!v.focuses.length)}
      ${sec(5, "Talents", v.talents, s5, !!v.talents.length)}
      ${sec(6, "Drives", v.drives, s6, !!v.drives.length)}
      ${isPC(k) ? sec(7, "Assets", v.assets, s7, !!v.assets.length) : sec(7, "Assets (optional)", [], s7, false)}
      ${sec(8, "Finishing touches", v.finish, s8, false)}`;
  }

  function sheetHTML(ch) {
    const dv = drives(ch), k = ch.kind;
    const traits = [ch.traits.role, ch.traits.faction, ch.traits.personal, ch.traits.extra].filter(Boolean);
    return `<div class="ch-sheet">
      <div class="ch-sheet-head"><div><h2>${esc(ch.name || "Unnamed")}</h2><div class="muted small">${esc(C.KINDS[k].name)}${ch.archetype ? ` · ${esc(ch.archetype)}` : ""}${ch.faction ? ` · ${esc(ch.faction)}` : ""}</div></div></div>
      ${ch.concept ? `<p class="small"><i>${esc(ch.concept)}</i></p>` : ""}
      <div class="chips">${traits.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <h4>Skills</h4>
      <table class="ch-st">${SK.map((s) => `<tr data-act="chRoll" data-s="${s}" title="Roll ${s}"><td>${s}</td><td class="v">${ch.skills[s] || "—"}</td><td class="small muted">${ch.focuses.filter((f) => f.skill === s).map((f) => esc(f.name)).join(", ")}</td></tr>`).join("")}</table>
      <h4>Drives</h4>
      <table class="ch-st">${isMinor(k) ? `<tr><td>Drive</td><td class="v">${ch.single}</td><td></td></tr>` : ch.driveNames.map((n) => `<tr><td>${n}</td><td class="v">${dv[n] || "—"}</td><td class="small"><i>${esc(ch.statements[n] || "")}</i></td></tr>`).join("")}</table>
      ${ch.talents.length || ch.abilities.length ? `<h4>Talents</h4><ul class="ch-ul">${ch.talents.map((t) => `<li><b>${esc(t.name)}</b>${t.param ? ` (${esc(t.param)})` : ""}</li>`).join("")}${ch.abilities.map((x) => `<li><b>${esc(x.name)}</b> (${esc(x.skill)})</li>`).join("")}</ul>` : ""}
      ${ch.assets.length ? `<h4>Assets</h4><ul class="ch-ul">${ch.assets.map((x) => `<li>${esc(x.name)} <span class="muted small">${x.tangible ? "tangible" : "intangible"}${x.q ? ` · Q${x.q}` : ""}</span></li>`).join("")}</ul>` : ""}
      ${ch.ambition ? `<h4>Ambition</h4><p class="small">${esc(ch.ambition)}</p>` : ""}
      ${["appearance", "personality", "relationships", "notes"].filter((x) => ch.details[x]).map((x) => `<h4>${x[0].toUpperCase() + x.slice(1)}</h4><p class="small">${esc(ch.details[x])}</p>`).join("")}
    </div>`;
  }

  function sidebar(ch) {
    const cs = CS();
    if (!cs.rollDrive || !ch.driveNames.includes(cs.rollDrive)) cs.rollDrive = bestDrive(ch);
    return `<div class="card ch-side">
      ${sheetHTML(ch)}
      <hr class="divider"/>
      <div class="row small"><span class="lbl">Roll with</span>${isMinor(ch.kind) ? "<span>Drive " + ch.single + "</span>" : G.select("chars.rollDrive", ch.driveNames)}<span class="hint">then click a skill row</span></div>
      <div class="c-actions"><button class="btn" data-act="chConflict">Add to conflict</button><button class="btn" data-act="chPrint">Print sheet</button></div>
    </div>`;
  }

  G.views.characters = () => {
    const ch = cur();
    return `${roster()}${ch ? `<div class="ch-layout"><section>${editor(ch)}</section><section>${sidebar(ch)}</section></div>` : ""}`;
  };

  // React to archetype / faction / kind changes.
  G.onChange.push((bind) => {
    if (!bind.startsWith("chars.list.#")) return;
    const ch = CS().list.find((c) => c.id === bind.split(".")[2].slice(1)); if (!ch) return;
    if (bind.endsWith(".archetype")) applyArchetype(ch);
    if (bind.endsWith(".faction")) { const f = fac(ch.faction); ch.traits.faction = f ? f.trait : ""; }
    if (bind.endsWith(".kind")) { const b = blank(ch.kind); ch.skills = b.skills; if (ch.archetype) applyArchetype(ch); }
    if (/\.driveNames\.\d$/.test(bind)) { // carry the rating and statement over to the renamed drive
      const nn = ch.driveNames[+bind.split(".").pop()];
      const old = Object.keys(ch.drives).concat(Object.keys(ch.statements), [ch.top, ch.second]).find((x) => x && !ch.driveNames.includes(x));
      if (old) {
        if (ch.drives[old] !== undefined) { ch.drives[nn] = ch.drives[old]; delete ch.drives[old]; }
        if (ch.statements[old]) { ch.statements[nn] = ch.statements[old]; delete ch.statements[old]; }
        if (ch.top === old) ch.top = nn;
        if (ch.second === old) ch.second = nn;
      }
    }
  });

  // ---------- actions ----------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  A.chNew = (el) => { const ch = blank(el.dataset.k); CS().list.unshift(ch); CS().sel = ch.id; CS().rollDrive = ""; R(); };
  A.chOpen = (el) => { CS().sel = el.dataset.id; CS().rollDrive = ""; R(); };
  A.chDel = () => { const cs = CS(), ch = cur(); if (!ch || !confirm(`Delete ${ch.name || "this character"}?`)) return; cs.list = cs.list.filter((c) => c !== ch); cs.sel = ""; R(); };
  A.chDup = () => { const cs = CS(), ch = cur(); const c = clone(ch); c.id = uid(); c.name = `${ch.name || "Unnamed"} (copy)`; ["focuses", "talents", "assets", "abilities"].forEach((l) => c[l].forEach((x) => (x.id = uid()))); cs.list.unshift(c); cs.sel = c.id; R(); };
  A.chAuto = () => { const ch = cur(); autofill(ch); const { issues } = validate(ch); G.toast(issues ? `Filled what I could — ${issues} item(s) still need you` : "Character complete"); R(); };
  A.chSkill = (el) => { const ch = cur(); ch.skills[el.dataset.s] = clamp(ch.skills[el.dataset.s] + +el.dataset.d, 0, 8); R(); };
  A.chRm = (el) => { const ch = cur(); ch[el.dataset.list] = ch[el.dataset.list].filter((x) => x.id !== el.dataset.id); R(); };
  A.chAddFocus = (el) => {
    const ch = cur(), cs = CS();
    const skill = el.dataset.s || cs.nf.skill, name = (el.dataset.n || cs.nf.name).trim();
    if (!name) { G.toast("Type a focus first"); return; }
    if (ch.focuses.some((f) => f.name.toLowerCase() === name.toLowerCase())) { G.toast("Already has that focus"); return; }
    ch.focuses.push({ id: uid(), skill, name }); if (!el.dataset.n) cs.nf.name = ""; R();
  };
  A.chAddTalent = (el) => {
    const ch = cur(), cs = CS(), name = el.dataset.n || cs.nt.name;
    if (!name) { G.toast("Choose a talent first"); return; }
    const d = talentDef(name);
    const repeatable = name === "Improved Resources" || name === "Specialist";
    if (!repeatable && ch.talents.some((t) => t.name === name)) { G.toast("No talent may be taken twice (except Improved Resources and Specialist)"); return; }
    const a = arch(ch.archetype);
    ch.talents.push({ id: uid(), name, param: d && d.param === "skill" ? (a ? a.primary : "") : d && d.param === "asset" ? "dueling" : "" }); R();
  };
  A.chAddAbility = () => { const ch = cur(), cs = CS(); ch.abilities.push({ id: uid(), name: cs.nab.name, skill: cs.nab.skill }); R(); };
  A.chAddAsset = (el) => {
    const ch = cur(), cs = CS(), name = (el.dataset.n || cs.na.name).trim();
    if (!name) { G.toast("Name the asset first"); return; }
    ch.assets.push({ id: uid(), name, tangible: el.dataset.t !== undefined ? el.dataset.t === "1" : cs.na.tangible, q: 0 }); if (!el.dataset.n) cs.na.name = ""; R();
  };
  A.chRoll = (el) => {
    const ch = cur(), s = el.dataset.s, cs = CS();
    const dn = isMinor(ch.kind) ? "Drive" : cs.rollDrive || bestDrive(ch), dval = isMinor(ch.kind) ? ch.single : drives(ch)[dn] || 4;
    G.prefillRoll({ side: isPC(ch.kind) || isSup(ch.kind) ? "pc" : "npc", skillName: s, skill: ch.skills[s] || 4, driveName: ALL_DRIVES.includes(dn) ? dn : "Drive", drive: dval, label: `${ch.name || "Character"}: ${s} + ${dn}` });
  };
  A.chConflict = () => {
    const ch = cur(), sk = G.conflictSkill();
    G.addCombatant({ name: ch.name || "Unnamed", side: isPC(ch.kind) || isSup(ch.kind) ? "players" : "opponents", tier: tierOf(ch.kind), req: ch.skills[sk] || 4, assets: ch.assets.map((x) => ({ id: uid(), name: x.name, q: x.q || 0, def: /shield|armou?r/i.test(x.name) })) });
    G.toast(`${ch.name || "Character"} added to the conflict`);
  };
  A.chPrint = () => {
    const ch = cur(), w = window.open("", "_blank");
    if (!w) { G.toast("Pop-up blocked — allow pop-ups to print"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(ch.name || "Character")}</title><style>
      body{font:13px/1.45 Georgia,serif;color:#222;margin:24px;max-width:720px} h2{margin:0;font-size:26px} h4{margin:14px 0 4px;text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#8a5a20;border-bottom:1px solid #d8c8a8}
      table{border-collapse:collapse;width:100%} td{padding:3px 6px;border-bottom:1px solid #eee;vertical-align:top} td.v{font-weight:bold;width:2.5em;text-align:center;font-size:15px}
      .chip{display:inline-block;border:1px solid #c8b088;border-radius:10px;padding:1px 8px;margin:2px;font-size:12px} .muted{color:#777} .small{font-size:12px} ul{margin:4px 0;padding-left:18px}
    </style></head><body>${sheetHTML(ch).replace(/data-act="[^"]*"/g, "")}<p class="small muted">Dune: Adventures in the Imperium · made with Dune GM Toolkit</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };
  // Open a generated NPC (NPCs tab) in the creator.
  A.chFromNpc = (el) => {
    const n = G.findNpc(el.dataset.npc); if (!n) return;
    const kind = n.tier === "minor" ? "npcMinor" : n.tier === "notable" ? "npcNotable" : "npcMajor";
    const ch = blank(kind);
    Object.assign(ch, { name: n.name, concept: n.role, skills: clone(n.skills), driveNames: (n.driveNames || D.DRIVES).slice(), statements: clone(n.statements || {}) });
    ch.traits.role = n.traits[0] || n.role; ch.traits.personal = n.traits[1] || ""; ch.traits.extra = n.traits[2] || "";
    ch.focuses = n.focuses.map((f) => ({ id: uid(), skill: G.focusSkill(f) || SK.reduce((a, b) => (n.skills[b] > n.skills[a] ? b : a)), name: f }));
    ch.abilities = (n.abilities || []).map((x) => ({ id: uid(), name: x.name, skill: (SK.find((s) => x.text.includes(s)) || "Battle") }));
    if (kind === "npcMinor") ch.single = n.drives[ch.driveNames[0]];
    else if (kind === "npcNotable") { const by = ch.driveNames.slice().sort((a, b) => n.drives[b] - n.drives[a]); ch.top = by[0]; ch.second = by[1]; }
    else ch.driveNames.forEach((d) => (ch.drives[d] = n.drives[d]));
    ch.details.notes = n.notes || "";
    CS().list.unshift(ch); CS().sel = ch.id; CS().rollDrive = ""; G.S.tab = "characters"; R();
  };
})();
