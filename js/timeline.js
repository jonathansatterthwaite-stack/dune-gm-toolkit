// Timeline editor: the eras, timelines that branch into alternate histories, and dated events that can change
// database entries. It fills its area like the starmap, with every timeline drawn as a line. The built-in timelines and events come from js/db/timeline.js; yours live in app state.
//
// How branching works: a timeline forks from its parent at a point (year + order within the year). It inherits
// the parent's events up to that point, and from then on only its own events apply. The Compendium can show any
// entry "as of" a year in a chosen timeline, with each changed field marked.
(function () {
  const G = window.GM, DB = window.DUNE_DB, TL = window.DUNE_TIMELINE;
  const { esc, uid } = G;
  G.ensure("timeline", { now: { branch: "novels", year: "" }, view: "novels", branches: [], events: [], form: null, newBranch: { name: "", parent: "", year: "" }, sel: null, center: "", follow: true, campaign: { branch: "", year: "" }, side: { year: true, info: true, key: false }, hideKinds: [] });
  const T = () => G.S.timeline;

  // ---------------- engine ----------------
  const branches = () => TL.branches.concat(T().branches.map((b) => Object.assign({ custom: true }, b)));
  const branchOf = (id) => branches().find((b) => b.id === id) || null;
  const key = (year, seq) => (+year || 0) * 1000 + (seq == null || seq === "" ? 50 : +seq);
  const yearText = (y, circa) => (y === "" || y == null || isNaN(+y) ? "—" : (circa ? "c. " : "") + (+y < 0 ? `${-y} BG` : `${+y} AG`));
  const eraOf = (y) => TL.eras.find((e) => y >= e.from && y < e.to) || (y >= TL.eras[TL.eras.length - 1].to ? TL.eras[TL.eras.length - 1] : null);
  const customEvents = () => T().events.map((e) => Object.assign({ _t: "events", _custom: true, book: "Homebrew", src: "Homebrew" }, e));
  const allEvents = () => DB.rows("events").concat(customEvents());
  // "table:Name" → the database row it names
  const resolve = (ref) => { const i = String(ref).indexOf(":"); return i > 0 ? DB.find(ref.slice(0, i), ref.slice(i + 1)) : null; };

  // the events a timeline sees, in order: its own, plus each ancestor's up to the point where the line forked
  function visible(bid) {
    const out = [], seen = new Set();
    let b = branchOf(bid), limit = Infinity;
    while (b && !seen.has(b.id)) {
      seen.add(b.id);
      const here = b.id;
      allEvents().forEach((e) => { if (e.branch === here && key(e.year, e.seq) <= limit) out.push(Object.assign({}, e, { _from: here, _inherited: here !== bid })); });
      if (!b.parent) break;
      if (b.fork) limit = Math.min(limit, key(b.fork.year, b.fork.seq));
      b = branchOf(b.parent);
    }
    return out.sort((a, z) => key(a.year, a.seq) - key(z.year, z.seq));
  }
  const nowSet = () => String(T().now.year == null ? "" : T().now.year).trim() !== "" && !isNaN(+T().now.year);

  // a database row as it stands at the chosen year in the chosen timeline; changed fields are listed in _changes
  function asOf(row) {
    if (!row || !nowSet() || row._t === "events" || row._t === "pages" || row._t === "art") return row;
    const lim = key(T().now.year, 999), out = Object.assign({}, row), changes = {};
    visible(T().now.branch).forEach((e) => {
      if (key(e.year, e.seq) > lim) return;
      (e.changes || []).forEach((c) => {
        const t = resolve(c.ref);
        if (!t || t.id !== row.id) return;
        if (!changes[c.field]) changes[c.field] = { from: row[c.field] };
        Object.assign(changes[c.field], { to: c.value, event: e.name, year: e.year, circa: e.circa, id: e.id });
        out[c.field] = c.value;
      });
    });
    out._changes = changes;
    return out;
  }
  // every event that involves or changes a row, across all timelines (the viewed one first)
  function eventsFor(row) {
    const hits = allEvents().filter((e) => (e.refs || []).concat((e.changes || []).map((c) => c.ref)).some((ref) => { const t = resolve(ref); return t && t.id === row.id; }));
    return hits.sort((a, z) => key(a.year, a.seq) - key(z.year, z.seq));
  }
  const describeChange = (c) => { const t = resolve(c.ref); const label = t ? t.name : c.ref.slice(c.ref.indexOf(":") + 1);
    return { t, html: `${t ? `<a class="db-link" data-act="tlOpen" data-id="${esc(t.id)}">${esc(label)}</a>` : esc(label)}: <b>${esc(c.field)}</b> → ${c.value === "" ? "<i>none</i>" : esc(c.value)}` }; };
  // the players' year: the player display never shows an event after it (default: the RPG's setting, 10190 AG)
  const campaign = () => { const c = T().campaign || {}, set = String(c.year == null ? "" : c.year).trim() !== "" && !isNaN(+c.year);
    return { branch: branchOf(c.branch) ? c.branch : "novels", year: set ? +c.year : 10190, set }; };

  // ---------------- kinds of event: each has its own symbol on the timeline ----------------
  // Built-in events say their kind (js/db/timeline.js). Yours can pick one; left on Automatic, the kind is guessed
  // from the title, the details and what the event links to or changes.
  const KINDS = [
    { id: "birth", name: "Birth", text: "A character is born",
      svg: '<path d="M8 .8l1.7 5.5L15.2 8l-5.5 1.7L8 15.2l-1.7-5.5L.8 8l5.5-1.7z"/>' },
    { id: "death", name: "Death", text: "A character dies, is killed or assassinated",
      svg: '<path d="M6.8 1h2.4v3.6h3.6V7H9.2v8H6.8V7H3.2V4.6h3.6z"/>' },
    { id: "character", name: "Character", text: "A turning point in someone's life: an exile, a flight, a vow, a disappearance",
      svg: '<circle cx="8" cy="4.6" r="3"/><path d="M2.4 15c0-3.5 2.4-6 5.6-6s5.6 2.5 5.6 6z"/>' },
    { id: "house", name: "House", text: "A Great or Minor House: a fief granted or lost, an alliance, a feud, a marriage",
      svg: '<path d="M8 .9l6 2.3v4.6c0 3.7-2.6 6.2-6 7.4-3.4-1.2-6-3.7-6-7.4V3.2z"/>' },
    { id: "rule", name: "Throne", text: "Rule and succession: an emperor crowned, a throne taken, an abdication",
      svg: '<path d="M1.5 4.5l3.7 3.3L8 2.2l2.8 5.6 3.7-3.3-1.2 8.3H2.7z"/><rect x="2.7" y="13.2" width="10.6" height="1.8"/>' },
    { id: "planet", name: "World", text: "A planet changes: settled, conquered, ruined, terraformed",
      svg: '<circle cx="8" cy="8" r="3.9"/><ellipse cx="8" cy="8" rx="7.1" ry="2.3" fill="none" stroke="currentColor" stroke-width="1.3" transform="rotate(-24 8 8)"/>' },
    { id: "battle", name: "War", text: "A battle, an attack, a war or a conquest",
      svg: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 2.5l10 10M13.5 2.5l-10 10M10 13.4l3.4-3.4M2.6 10l3.4 3.4"/></g>' },
    { id: "intrigue", name: "Intrigue", text: "A scheme, a plot, a betrayal, a secret",
      svg: '<path d="M.6 8C2.6 4.5 5 2.8 8 2.8s5.4 1.7 7.4 5.2C13.4 11.5 11 13.2 8 13.2S2.6 11.5.6 8z"/><circle class="hole" cx="8" cy="8" r="2.4"/>' },
    { id: "founding", name: "Founding", text: "An order, school, guild or institution is founded",
      svg: '<path d="M8 .9l7 3.9H1z"/><rect x="2.2" y="5.8" width="2.4" height="6.6"/><rect x="6.8" y="5.8" width="2.4" height="6.6"/><rect x="11.4" y="5.8" width="2.4" height="6.6"/><rect x="1" y="13.3" width="14" height="1.9"/>' },
    { id: "discovery", name: "Discovery", text: "A discovery or new technology: a machine, a voyage, a find",
      svg: '<circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 2.9l1.9 5.1L8 13.1 6.1 8z"/>' },
    { id: "religion", name: "Faith", text: "Religion and prophecy: a messiah, a sect, a vision, the Missionaria Protectiva",
      svg: '<path d="M8 1.2c1.3 2.6 4.2 4 4.2 7.4A4.2 4.2 0 0 1 8 13a4.2 4.2 0 0 1-4.2-4.4C3.8 6.9 5 5.8 5.6 4.3c.8 1.4 1.5 2 2.1 2.2C7.4 4.7 7.5 2.8 8 1.2z"/><rect x="4" y="13.6" width="8" height="1.6"/>' },
    { id: "spice", name: "Spice & trade", text: "The spice, CHOAM, a harvest, a market, a monopoly",
      svg: '<path d="M8 1.2c3 3.7 4.9 6.3 4.9 8.8a4.9 4.9 0 0 1-9.8 0c0-2.5 1.9-5.1 4.9-8.8z"/><circle class="hole" cx="6.4" cy="10" r="1.2"/>' },
    { id: "ghola", name: "Ghola", text: "The dead return: grown again from their cells in a Tleilaxu axlotl tank, sometimes with their memories woken",
      svg: '<path d="M13.3 4.3A6.6 6.6 0 1 0 14.6 8.6" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M15.6 2.2l-.4 4.6-4.3-1.5z"/><circle cx="8" cy="6.1" r="1.9"/><path d="M4.7 12.4c0-2 1.5-3.6 3.3-3.6s3.3 1.6 3.3 3.6z"/>' },
    { id: "galactic", name: "Galactic", text: "A turning point for the whole Imperium",
      svg: '<path d="M8 .4l1.4 4.3 4-2.1-2.1 4L15.6 8l-4.3 1.4 2.1 4-4-2.1L8 15.6l-1.4-4.3-4 2.1 2.1-4L.4 8l4.3-1.4-2.1-4 4 2.1z"/>' },
  ];
  const OTHER = { id: "other", name: "Event", text: "Any other event", svg: '<circle cx="8" cy="8" r="3.4"/>' };
  const kindById = (id) => KINDS.find((k) => k.id === id) || null;
  // a guess, for events that don't say: the words first, then what the event links to
  function guessKind(e) {
    const t = `${e.name || ""} ${e.text || ""}`.toLowerCase(), refs = (e.refs || []).concat((e.changes || []).map((c) => c.ref));
    if (/\b(ghola|axlotl|reborn|revived|resurrect\w*)\b/.test(t)) return "ghola";
    if (/\bborn\b|\bbirth\b/.test(t)) return "birth";
    if (/\b(dies|died|death|killed|kills|assassinat\w*|murder\w*|executed|slain|poisoned)\b/.test(t) || (e.changes || []).some((c) => /^dead$/i.test(c.value))) return "death";
    if (/\b(battle|war|attack\w*|invasion|invades?|siege|conquer\w*|jihad|raid|skirmish|rebellion|revolt|massacre)\b/.test(t)) return "battle";
    if (/\b(emperor|empress|throne|crown\w*|abdicat\w*|succe\w*|regent|reign|coronation)\b/.test(t)) return "rule";
    if (/\b(scheme\w*|plot\w*|betray\w*|conspira\w*|spy|spies|secret\w*|treacher\w*|blackmail\w*|traitor)\b/.test(t)) return "intrigue";
    if (/\b(spice|melange|choam|harvest\w*|trade|market|monopoly|smuggl\w*)\b/.test(t)) return "spice";
    if (/\b(prophe\w*|messiah|religio\w*|faith|sect|missionaria|temple|priest\w*|vision)\b/.test(t)) return "religion";
    if (/\b(founded|founds|founding|establish\w*|charter\w*)\b/.test(t)) return "founding";
    if (/\b(discover\w*|invent\w*|machines?|technolog\w*|expedition)\b/.test(t)) return "discovery";
    if ((e.changes || []).some((c) => c.field === "house") || refs.some((r) => /^houses:/.test(r))) return "house";
    if (refs.some((r) => /^planets:/.test(r))) return "planet";
    if (refs.some((r) => /^npcs:/.test(r))) return "character";
    return "galactic";
  }
  const kindOf = (e) => kindById(e && e.kind) || kindById(guessKind(e || {})) || OTHER;
  const icon = (k, cls) => `<svg class="tl-ico${cls ? " " + cls : ""}" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">${k.svg}</svg>`;

  G.timeline = { campaign, branches, branchOf, visible, asOf, eventsFor, yearText, eraOf, nowSet, describeChange, now: () => T().now, stateAt: (b, y) => stateAt(b, y), KINDS, kindOf, icon };


  // ---------------- the scale: years to pixels ----------------
  // Every year with an event (and every era edge and fork) is a stop on the axis. The space between two stops
  // grows with the log of the years between them, so 10191 and 10193 sit side by side while Leto II's
  // 3,500 years stay one stretch. The year under the center line drives the Compendium and the Year panel.
  const GAP = (g) => 86 + 46 * Math.log10(1 + Math.abs(g));
  let scale = { stops: [], width: 0 };
  // crowd: how many events share a year on one line; they sit side by side, so that year gets room for them
  function buildScale(years, crowd, spread) {
    const ys = Array.from(new Set(years.map(Number).filter((y) => !isNaN(y)))).sort((a, b) => a - b);
    const room = (y) => (crowd && crowd[y] > 1 ? (crowd[y] - 1) * spread : 0);
    const stops = [];
    let x = 0;
    ys.forEach((y, i) => { if (i) x += GAP(y - ys[i - 1]) + (room(ys[i - 1]) + room(y)) / 2; stops.push({ y, x }); });
    return { stops, width: x };
  }
  function xAt(y) {
    const s = scale.stops; if (!s.length) return 0;
    if (y <= s[0].y) return s[0].x;
    for (let i = 1; i < s.length; i++) if (y <= s[i].y) { const a = s[i - 1], b = s[i]; return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y); }
    return s[s.length - 1].x;
  }
  function yearAtX(x) {
    const s = scale.stops; if (!s.length) return 0;
    const near = s.find((p) => Math.abs(p.x - x) <= 4);  // a pixel can span many years in a long gap: snap to a stop
    if (near) return near.y;
    if (x <= s[0].x) return s[0].y;
    for (let i = 1; i < s.length; i++) if (x <= s[i].x) { const a = s[i - 1], b = s[i]; return Math.round(a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x)); }
    return s[s.length - 1].y;
  }
  const centerYear = () => { const c = T().center; return c === "" || c == null || isNaN(+c) ? (nowSet() ? +T().now.year : 10190) : +c; };

  // what is in effect at a year: the latest change to each field of each entry, in the viewed timeline
  const FIELD_LABEL = { house: "Ruling House", vassal: "Held for them by", ruler: "Ruled by", status: "Status", note: "Note", rank: "Rank", homeworld: "Homeworld", habitable: "Habitability" };
  function stateAt(bid, year) {
    const lim = key(year, 999), out = {};
    visible(bid).forEach((e) => {
      if (key(e.year, e.seq) > lim) return;
      (e.changes || []).forEach((c) => { const row = resolve(c.ref); if (row) out[row.id + "|" + c.field] = { row, field: c.field, value: c.value, from: row[c.field], e }; });
    });
    return Object.values(out).sort((a, b) => a.row.name.localeCompare(b.row.name) || a.field.localeCompare(b.field));
  }

  // ---------------- the panel ----------------
  // The timeline fills its area, like the starmap. Every timeline is a line across it: the novels run straight
  // through, and each alternate timeline forks off the line it splits from at the point where its history
  // changes, then runs alongside with its own events. The viewed timeline's history (its own line, and its
  // parents' lines up to each fork) is lit. Floating panels: the Year (what holds at the center line) on the
  // left, the Details (the picked event, the new-event form, or the viewed timeline) on the right.
  const editable = (b) => b && b.custom;
  const side = () => (T().side = Object.assign({ year: true, info: true }, T().side));
  const COLORS = ["#e2c391", "#86aef0", "#7fc48b", "#d98bd0", "#e8a050", "#6fd0c8", "#f08a78"];
  const ROW = 62, AXIS = 34, CURVE = 42, SPREAD = 27;  // SPREAD: between events in the same year
  const CAST_SPREAD = 44;  // the same on the player display  // a row's height, the year axis under the rows, a fork's curve
  let colorOf = {};
  const color = (bid) => colorOf[bid] || COLORS[0];
  const forkKey = (b) => (b.fork ? key(b.fork.year, b.fork.seq) : -Infinity);
  // the rows: each root timeline, then the timelines that split from it (in the order they split), depth first
  function rowsOf() {
    const all = branches(), out = [], seen = new Set();
    const add = (b) => { if (seen.has(b.id)) return; seen.add(b.id); out.push({ b });
      all.filter((k) => k.parent === b.id).sort((a, z) => forkKey(a) - forkKey(z)).forEach(add); };
    all.filter((b) => !b.parent || !branchOf(b.parent)).forEach(add);
    all.forEach(add);  // anything left over (parents that loop) still gets a row
    return out;
  }

  function graph(view) {
    const rows = rowsOf(), byB = {}, evs = allEvents(), hide = new Set(T().hideKinds || []);
    // the kinds hidden in the Key stay off the lines (the picked event always shows); the scale keeps every year
    evs.forEach((e) => { if (e.id === T().sel || !hide.has(kindOf(e).id)) (byB[e.branch] = byB[e.branch] || []).push(e); });
    const crowd = {};
    Object.values(byB).forEach((list) => { const n = {}; list.forEach((e) => { n[e.year] = (n[e.year] || 0) + 1; crowd[e.year] = Math.max(crowd[e.year] || 0, n[e.year]); }); });
    scale = buildScale(evs.map((e) => e.year).concat(TL.eras.flatMap((er) => [er.from, er.to]), rows.filter((r) => r.b.fork).map((r) => r.b.fork.year)), crowd, SPREAD);
    const W = scale.width, at = {};
    colorOf = {};
    rows.forEach((r, i) => { r.y = 18 + i * ROW + ROW / 2; r.c = COLORS[i % COLORS.length]; at[r.b.id] = r; colorOf[r.b.id] = r.c; });
    const H = 18 + rows.length * ROW + AXIS;
    rows.forEach((r) => {
      const p = r.b.fork && at[r.b.parent] && at[r.b.parent] !== r ? at[r.b.parent] : null;
      r.p = p;
      r.fx = p ? xAt(r.b.fork.year) + 12 : 0;  // where it leaves its parent's line: just after the fork's year
      r.x0 = p ? r.fx + CURVE : 0;             // where it runs level on its own row
      // its own events; several in one year spread a little sideways, and none sits on the curve
      const years = {};
      (byB[r.b.id] || []).slice().sort((a, z) => key(a.year, a.seq) - key(z.year, z.seq)).forEach((e) => (years[e.year] = years[e.year] || []).push(e));
      r.dots = [];
      Object.keys(years).forEach((y) => {
        const g = years[y], n = g.length, sp = n > 1 ? SPREAD : 0, half = (sp * (n - 1)) / 2;
        const base = Math.max(xAt(+y), p ? r.x0 + 10 + half : -Infinity);
        g.forEach((e, i) => r.dots.push({ e, x: base - half + i * sp }));
      });
      r.dots.sort((a, z) => a.x - z.x);
      r.x1 = !p ? W : Math.min(W, Math.max(r.x0 + 70, r.dots.length ? r.dots[r.dots.length - 1].x + 34 : 0));
    });
    // the viewed timeline's history: from the root, along each line up to the fork that leads on
    const chain = [];
    for (let r = at[view.id], seen = new Set(); r && !seen.has(r); r = r.p) { seen.add(r); chain.unshift(r); }
    const f = (n) => n.toFixed(1);
    const lineD = (r, to) => (r.p ? `M${f(r.fx)} ${r.p.y} C${f(r.fx + CURVE / 2)} ${r.p.y} ${f(r.fx + CURVE / 2)} ${r.y} ${f(r.x0)} ${r.y} L${f(Math.max(r.x0, to))} ${r.y}` : `M0 ${r.y} L${f(to)} ${r.y}`);
    const lit = view && at[view.id] ? at[view.id].c : COLORS[0];
    const pathD = chain.map((r, i) => lineD(r, i < chain.length - 1 ? chain[i + 1].fx : r.x1)).join(" ");
    const svg = `<svg class="tlx-lines" width="${Math.ceil(W) + 2}" height="${H}" viewBox="0 0 ${Math.ceil(W) + 2} ${H}">
      ${rows.map((r) => `<path class="ln" style="--c:${r.c}" d="${lineD(r, r.x1)}"/>${r.p && r.x1 < W ? `<path class="ln tail" style="--c:${r.c}" d="M${f(r.x1)} ${r.y} L${f(W)} ${r.y}"/>` : ""}`).join("")}
      <path class="ln glow" style="--c:${lit}" d="${pathD}"/><path class="ln lit" style="--c:${lit}" d="${pathD}"/>
      ${rows.map((r) => `<path class="hit" d="${lineD(r, W)}" data-act="tlView" data-b="${esc(r.b.id)}"><title>${esc(r.b.name)}</title></path>`).join("")}
    </svg>`;
    const X = (x) => `calc(var(--pad) + ${f(x)}px)`;
    const inView = new Set(visible(view.id).map((e) => e.id)), sel = T().sel;
    let dots = "", names = "";
    // names above the dots where they fit: the picked event's first, then the rest left to right
    const span = (d) => { const w = Math.min(d.e.id === sel ? 240 : 140, 6.4 * d.e.name.length + 8); return [d.x - w / 2 - 6, d.x + w / 2 + 6]; };
    rows.forEach((r) => {
      const placed = [], fits = (d) => { const [a, b] = span(d); return placed.every(([c, z]) => b <= c || a >= z); };
      r.dots.filter((d) => d.e.id === sel).concat(r.dots.filter((d) => d.e.id !== sel)).forEach((d) => { if (fits(d)) { placed.push(span(d)); d.named = true; } });
      r.dots.forEach(({ e, x, named }) => {
        const on = e.id === sel, cls = `${on ? " on" : ""}${inView.has(e.id) ? "" : " off"}`, k = kindOf(e), t = `${yearText(e.year, e.circa)} · ${k.name}: ${e.name}`;
        dots += `<button class="tlx-dot k-${k.id}${cls}${e._custom ? " custom" : ""}" style="left:${X(x)};top:${r.y}px;--c:${r.c}" data-act="tlSel" data-id="${esc(e.id)}" title="${esc(t)}" aria-label="${esc(t)}">${icon(k)}</button>`;
        if (named) names += `<button class="tlx-name${cls}" style="left:${X(x)};top:${r.y - 15}px" data-act="tlSel" data-id="${esc(e.id)}" tabindex="-1">${esc(e.name)}</button>`;
      });
    });
    // each line's name rides along its line at the left edge of what you can see (js: placeTags)
    const tags = rows.map((r) => `<button class="tlx-tag${r.b.id === view.id ? " on" : ""}" style="left:${X(r.x0 + 8)};top:${r.y + 15}px;--c:${r.c}" data-act="tlView" data-b="${esc(r.b.id)}" data-x0="${f(r.x0 + 8)}" data-x1="${f(r.x1)}" title="${esc(r.b.text || r.b.name)}">${r.p ? "⑂ " : ""}${esc(r.b.name)}</button>`).join("");
    const s = scale.stops;
    const ticks = s.map((p) => `<div class="tlx-tick" style="left:${X(p.x)}"><span>${esc(yearText(p.y))}</span></div>`).join("");
    const gaps = s.slice(1).map((b, i) => { const a = s[i], g = b.y - a.y; return g >= 150 ? `<div class="tlx-gap" style="left:${X((a.x + b.x) / 2)}">${g.toLocaleString()} years</div>` : ""; }).join("");
    const bands = TL.eras.map((er, i) => { const x0 = xAt(er.from), x1 = xAt(er.to);
      return `<div class="tlx-band b${i % 2}" style="left:${X(x0)};width:${f(Math.max(0, x1 - x0))}px" title="${esc(er.name)}: ${esc(er.text)}"><span>${esc(er.name)}</span></div>`; }).join("");
    return { W, H, vy: at[view.id] ? at[view.id].y : 0, bands, html: `${svg}<div class="tlx-axis">${ticks}${gaps}</div>${tags}${names}${dots}` };
  }

  // the Year panel: the era, this year's events and what holds now in the viewed timeline
  function lorePanel(year) {
    const view = branchOf(T().view) || branchOf("novels"), era = eraOf(year);
    const thisYear = visible(view.id).filter((e) => +e.year === year);
    const state = stateAt(view.id, year);
    const groups = {};
    state.forEach((s) => (groups[s.row.id] = groups[s.row.id] || { row: s.row, items: [] }).items.push(s));
    return `<div class="gx-head"><div class="gx-kicker">The Known Universe in</div><h2 class="tlx-h">${esc(yearText(year))}</h2>
        <button class="gx-close" data-act="tlSide" data-s="year" aria-label="Hide the year panel" title="Hide">✕</button></div>
      <div class="gx-body">
        ${era ? `<p><b>${esc(era.name)}</b> <span class="muted small">${esc(yearText(era.from))} – ${esc(yearText(era.to))} · ${esc(era.src)}</span><br/>${esc(era.text)}</p>` : `<p class="muted">Before the eras of play.</p>`}
        <button class="gx-btn small ${T().follow ? "on" : ""}" data-act="tlFollow" aria-pressed="${!!T().follow}" title="When on, the Compendium shows every entry as it stands at the year under the center line">${T().follow ? "✓ Compendium follows this year" : "Compendium shows the books"}</button>
        ${thisYear.length ? `<h4>This year</h4><ul>${thisYear.map((e) => `<li>${icon(kindOf(e))}<button class="db-link" data-act="tlSel" data-id="${esc(e.id)}">${esc(e.name)}</button></li>`).join("")}</ul>` : ""}
        <h4>As things stand in ${esc(view.name)}</h4>
        ${state.length ? `<dl class="tlx-state">${Object.values(groups).map((g) => `<dt><a class="db-link" data-act="tlOpen" data-id="${esc(g.row.id)}">${esc(g.row.name)}</a></dt><dd>${g.items.map((s) =>
          `${esc(FIELD_LABEL[s.field] || s.field)}: <b>${s.value === "" ? "none" : esc(s.value)}</b> <span class="muted small">since ${esc(yearText(s.e.year, s.e.circa))}</span>`).join("<br/>")}</dd>`).join("")}</dl>`
          : `<p class="muted small">Nothing has changed from the books yet in this timeline.</p>`}
      </div>`;
  }

  // the Details panel: the new-event form, else the picked event, else the viewed timeline
  function detail(view) {
    if (T().form) return form();
    const e = visible(view.id).find((x) => x.id === T().sel);
    return e ? eventDetail(e) : branchDetail(view);
  }
  const swatch = (bid) => `<i class="tlx-sw" style="--c:${color(bid)}"></i>`;

  function eventDetail(e) {
    const b = branchOf(e._from || e.branch);
    const refs = (e.refs || []).map((r) => { const t = resolve(r); return t ? `<a class="db-link" data-act="tlOpen" data-id="${esc(t.id)}">${esc(t.name)}</a>` : esc(r.slice(r.indexOf(":") + 1)); });
    const changes = (e.changes || []).map((c) => `<li>${describeChange(c).html}</li>`).join("");
    const source = e.cite ? `Sources: ${esc(e.cite)}${e.url ? `<br/><a href="${esc(e.url)}" target="_blank" rel="noopener">Read the ${esc(e.canon || "Wikipedia")} article ↗</a>` : ""}`
      : e.src && e.src !== "Homebrew" ? esc(e.src) : e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">Dune Wiki${e.canon ? ` (${esc(e.canon === "Original" ? "Frank Herbert's novels" : e.canon)})` : ""} ↗</a>` : e._custom ? "Your event" : "";
    const k = kindOf(e);
    return `<div class="gx-head"><div class="gx-kicker">${swatch(b ? b.id : "")}${esc(yearText(e.year, e.circa))} · ${esc(b ? b.name : "")}</div>
        <div class="tlx-kind" title="${esc(k.text)}">${icon(k)}${esc(k.name)}</div>
        <h2 class="tlx-h">${esc(e.name)}</h2><button class="gx-close" data-act="tlClose" aria-label="Close the event" title="Close (Esc)">✕</button></div>
      <div class="gx-body">
        ${e._inherited ? `<p class="gx-note">Shared history: ${esc((branchOf(T().view) || {}).name || "")} splits from ${esc(b ? b.name : "")} after this.</p>` : ""}
        ${e.text ? `<p>${esc(e.text)}</p>` : `<p class="muted">No details yet.</p>`}
        ${refs.length ? `<h4>Involves</h4><p>${refs.join(", ")}</p>` : ""}
        ${changes ? `<h4>Changes from this date</h4><ul class="tlx-changes">${changes}</ul>` : ""}
        ${source ? `<p class="gx-note">${source}</p>` : ""}
        <div class="gx-actions">
          <button class="gx-btn" data-act="tlStep" data-dir="-1" title="Previous event (←)">◀</button><button class="gx-btn" data-act="tlStep" data-dir="1" title="Next event (→)">▶</button>
          <button class="gx-btn" data-act="tlFork" data-id="${esc(e.id)}" title="Start an alternate timeline that splits off right after this event">⑂ Branch from here</button>
          ${e._custom ? `<button class="gx-btn" data-act="tlEdit" data-id="${esc(e.id)}">Edit</button><button class="gx-btn danger" data-act="tlDel" data-id="${esc(e.id)}">Delete</button>` : ""}
        </div>
      </div>`;
  }

  function branchDetail(view) {
    const p = branchOf(view.parent), n = visible(view.id).length, own = allEvents().filter((e) => e.branch === view.id).length;
    const kids = branches().filter((b) => b.parent === view.id).length;
    const nb = T().newBranch || (T().newBranch = { name: "", parent: "", year: "" });
    if (!nb.parent) nb.parent = view.id;
    return `<div class="gx-head"><div class="gx-kicker">${swatch(view.id)}${view.fork ? `Splits from ${esc(p ? p.name : "?")} after ${esc(yearText(view.fork.year))}` : "The root timeline"}</div>
        ${editable(view) ? `<input class="gx-title" data-bind="timeline.branches.#${esc(view.id)}.name" value="${esc(view.name)}" aria-label="Timeline name"/>` : `<h2 class="tlx-h">${esc(view.name)}</h2>`}
        <button class="gx-close" data-act="tlClose" aria-label="Hide the details panel" title="Hide">✕</button></div>
      <div class="gx-body">
        ${editable(view) ? `<textarea data-bind="timeline.branches.#${esc(view.id)}.text" rows="3" placeholder="What makes ${esc(view.name)} different?">${esc(view.text || "")}</textarea>` : view.text ? `<p class="gx-lore">${esc(view.text)}</p>` : ""}
        <div class="gx-stats"><div><span>Events</span><b>${n}</b></div><div><span>Its own</span><b>${own}</b></div><div><span>Splits</span><b>${kids}</b></div></div>
        <p class="gx-note">${view.fork ? `Up to the fork it shares ${esc(p ? p.name : "its parent")}'s history; after it, only its own events apply.` : "Alternate timelines fork off this line where their history changes."} Pick a dot to read an event, or a line to follow that timeline.</p>
        <div class="gx-actions"><button class="gx-btn primary" data-act="tlNewEvent">＋ Add an event here</button>
          ${editable(view) ? `<button class="gx-btn danger" data-act="tlDelBranch">Delete this timeline</button>` : ""}</div>
        <div class="gx-sec tlx-form"><h4>New timeline</h4>
          <label>Name <input type="text" data-bind="timeline.newBranch.name" value="${esc(nb.name)}" placeholder="e.g. Our campaign"/></label>
          <div class="gx-row2"><label>Splits from ${G.select("timeline.newBranch.parent", branches().map((b) => ({ v: b.id, l: b.name })))}</label>
            <label>After <input type="number" data-bind="timeline.newBranch.year" value="${esc(nb.year)}" placeholder="10191" style="width:6rem"/></label></div>
          <div class="gx-actions"><button class="gx-btn" data-act="tlNewBranch">⑂ Create timeline</button></div>
          <p class="gx-note">Or pick an event and use “Branch from here” to split off right after it.</p></div>
      </div>`;
  }

  const tableOptions = ["npcs", "houses", "planets", "organizations", "assets", "factions", "traits"];
  function form() {
    const f = T().form; if (!f) return "";
    const t = f.table || "npcs", rows = DB.rows(t);
    const sample = DB.find(t, f.entry) || rows[0] || {};
    const fields = Object.keys(sample).filter((k) => !/^(_|id$|src$|book$|text$|lore$|aliases$|name$)/.test(k)).concat(t === "npcs" ? ["status"] : []).filter((v, i, a) => a.indexOf(v) === i);
    const pending = (f.refs || []).map((r, i) => `<span class="tlx-chip">${esc(r.slice(r.indexOf(":") + 1))}<button data-act="tlRmPending" data-kind="refs" data-i="${i}" aria-label="Remove">×</button></span>`).join("") +
      (f.changes || []).map((c, i) => `<span class="tlx-chip chg">${describeChange(c).html}<button data-act="tlRmPending" data-kind="changes" data-i="${i}" aria-label="Remove">×</button></span>`).join("");
    const b = branchOf(f.editId ? (T().events.find((e) => e.id === f.editId) || {}).branch : T().view) || {};
    return `<div class="gx-head"><div class="gx-kicker">${swatch(b.id)}${f.editId ? "Edit event" : "New event"} · ${esc(b.name || "")}</div>
        <h2 class="tlx-h">${esc(f.name || (f.editId ? "Event" : "What happened?"))}</h2><button class="gx-close" data-act="tlCancel" aria-label="Cancel" title="Cancel (Esc)">✕</button></div>
      <div class="gx-body tlx-form">
        <div class="gx-row3"><label>Year <input type="number" data-bind="timeline.form.year" value="${esc(f.year)}" placeholder="10191"/></label>
          <label>Order in year <input type="number" data-bind="timeline.form.seq" value="${esc(f.seq)}"/></label>
          <label class="check"><input type="checkbox" data-bind="timeline.form.circa" data-type="bool" ${f.circa ? "checked" : ""}/> Approximate</label></div>
        <label>Title <input type="text" data-bind="timeline.form.name" value="${esc(f.name)}" placeholder="What happened"/></label>
        <label>Details <textarea data-bind="timeline.form.text" rows="4">${esc(f.text)}</textarea></label>
        <div class="tlx-lbl">Kind</div>
        <div class="tlx-kinds">${[{ id: "", name: "Automatic", text: `Guess from the title, details and links (now: ${kindOf(Object.assign({}, f, { kind: "" })).name})`, svg: kindOf(Object.assign({}, f, { kind: "" })).svg }].concat(KINDS).map((k) =>
          `<button class="tlx-kbtn${(f.kind || "") === k.id ? " on" : ""}${k.id ? "" : " auto"}" data-act="tlFormKind" data-k="${k.id}" title="${esc(k.text)}">${icon(k)}${esc(k.name)}</button>`).join("")}</div>
        <div class="gx-sec"><h4>Links</h4>
          <p class="gx-note">Pick an entry, then add it as involved, or change one of its fields from this date on (a character's status, a planet's ruling House…).</p>
          <div class="tlx-pick">${G.select("timeline.form.table", tableOptions.map((k) => ({ v: k, l: (DB.META[k] || {}).title || k })))}
            <input type="text" list="tlEntries" data-bind="timeline.form.entry" value="${esc(f.entry)}" placeholder="Entry name"/>
            <datalist id="tlEntries">${rows.slice(0, 400).map((r) => `<option value="${esc(r.name)}"></option>`).join("")}</datalist>
            ${G.select("timeline.form.field", fields.map((k) => ({ v: k, l: k })))}
            <input type="text" data-bind="timeline.form.value" value="${esc(f.value)}" placeholder="New value"/></div>
          <div class="gx-actions"><button class="gx-btn" data-act="tlAddRef">＋ Involved</button><button class="gx-btn" data-act="tlAddChange">＋ Change the field</button></div>
          <div class="tlx-chips">${pending || `<span class="muted small">Nothing linked yet.</span>`}</div></div>
        <div class="gx-actions"><button class="gx-btn primary" data-act="tlSave">${f.editId ? "Save changes" : "Add event"}</button><button class="gx-btn" data-act="tlCancel">Cancel</button></div>
      </div>`;
  }

  // the Key: every kind of event with its symbol and how many the followed timeline has; click to show or hide
  function keyPanel(view) {
    const hide = new Set(T().hideKinds || []), count = {};
    visible(view.id).forEach((e) => { const k = kindOf(e).id; count[k] = (count[k] || 0) + 1; });
    return `<section class="gx-panel tlx-key" aria-label="Key">
        <div class="tlx-key-head"><b>Key</b><span class="muted small">click to show or hide</span><button class="gx-close" data-act="tlSide" data-s="key" aria-label="Close the key">✕</button></div>
        <div class="tlx-key-list">${KINDS.map((k) => `<button class="tlx-krow${hide.has(k.id) ? " hidden" : ""}" data-act="tlKind" data-k="${k.id}" aria-pressed="${!hide.has(k.id)}" title="${esc(k.text)}">
          <span class="tlx-kdot">${icon(k)}</span><span class="tlx-kname">${esc(k.name)}</span><span class="tlx-kn">${count[k.id] || ""}</span></button>`).join("")}</div>
        <div class="gx-actions"><button class="gx-btn small" data-act="tlKind" data-k="*">Show all</button></div>
      </section>`;
  }

  G.views.timeline = () => {
    const tl = T(), view = branchOf(tl.view) || branchOf("novels"), sd = side(), g = graph(view);
    return `<div class="gx tlx${sd.year ? "" : " no-year"}${sd.info ? "" : " no-info"}${sd.year || sd.info ? " panels" : ""}">
      <div class="tlx-scroller" id="tlScroller" tabindex="0" aria-label="Timeline: scroll or drag left and right; arrow keys step between events">
        <div class="tlx-track" style="width:calc(var(--pad) * 2 + ${g.W.toFixed(0)}px);--h:${g.H}px"><div class="tlx-graph" style="height:${g.H}px" data-vy="${g.vy}">${g.bands}${g.html}</div></div>
      </div>
      <div class="tlx-center"><div class="tlx-now"><button class="tlx-step" data-act="tlStep" data-dir="-1" aria-label="Previous event" title="Previous event (←)">◀</button><b id="tlCenterYear">${esc(yearText(centerYear()))}</b><button class="tlx-step" data-act="tlStep" data-dir="1" aria-label="Next event" title="Next event (→)">▶</button></div></div>
      <div class="gx-top tlx-top">
        <div class="gx-brand"><span class="gx-mark">⟡</span><div><b>Timeline</b><small>${swatch(view.id)}${esc(view.name)} · ${visible(view.id).length} events</small></div></div>
        <div class="gx-tools">
          ${G.select("timeline.view", rowsOf().map((r) => ({ v: r.b.id, l: (r.b.parent ? "⑂ " : "") + r.b.name })))}
          <button class="gx-btn" data-act="tlNewEvent" title="Add an event to ${esc(view.name)} at the year under the center line">＋ Event</button>
          <button class="gx-btn ${sd.year ? "on" : ""}" data-act="tlSide" data-s="year" aria-pressed="${!!sd.year}" title="The year under the center line: its era and what holds">Year</button>
          <button class="gx-btn ${sd.info ? "on" : ""}" data-act="tlSide" data-s="info" aria-pressed="${!!sd.info}" title="The picked event, or the timeline">Details</button>
          <button class="gx-btn ${sd.key ? "on" : ""}${(tl.hideKinds || []).length ? " filtered" : ""}" data-act="tlSide" data-s="key" aria-pressed="${!!sd.key}" title="What the symbols mean; show or hide each kind of event">Key${(tl.hideKinds || []).length ? ` · ${KINDS.length - tl.hideKinds.length} of ${KINDS.length}` : ""}</button>
          ${castButtons()}
          <button class="gx-btn" data-act="tlFull" title="Full screen">⛶</button>
        </div>
      </div>
      <section class="gx-panel gx-left tlx-left" id="tlLore" ${sd.year ? "" : "hidden"}>${sd.year ? lorePanel(centerYear()) : ""}</section>
      <section class="gx-panel gx-right tlx-right" id="tlDetail" ${sd.info ? "" : "hidden"}>${sd.info ? detail(view) : ""}</section>
      ${sd.key ? keyPanel(view) : ""}
      <div class="gx-bottom tlx-bottom"><div class="tlx-eras">${TL.eras.map((er) => `<button class="gx-btn" data-act="tlJump" data-y="${er.from}" title="${esc(er.text)}">${esc(er.name)}</button>`).join("")}<button class="gx-btn" data-act="tlJump" data-y="10190">The RPG (10190 AG)</button></div>
        <span class="tlx-hint">Drag or scroll · ← → step · click a line to follow it</span></div>
    </div>`;
  };

  // the players' year and the player display, from the top bar
  function castButtons() {
    const cp = campaign(), b = branchOf(cp.branch), st = G.cast ? G.cast.state() : null, on = !!(st && st.open && st.bg === "timeline");
    return `<button class="gx-btn" data-act="tlCampaign" title="The player display shows ${esc(b.name)} up to here and nothing later. Click to set it to the year under the center line, in the viewed timeline">Players: ${esc(yearText(cp.year))}${cp.branch !== "novels" ? ` · ${esc(b.name)}` : ""}</button>
      ${G.cast ? `<button class="gx-btn ${on ? "on" : ""}" data-act="tlCast" title="Put the timeline on the player display. It glides to the event or year you pick here, never past the players' year">${on ? "On the display" : "Show to players"}</button>` : ""}`;
  }

  // ---------------- the player display's timeline (js/cast.js): the campaign's timeline up to the players' year ----------------
  function castView() {
    const cp = campaign(), view = branchOf(cp.branch), lim = key(cp.year, 999);
    const evs = visible(view.id).filter((e) => key(e.year, e.seq) <= lim);
    const eras = TL.eras.filter((er) => er.from <= cp.year);
    const crowd = {}; evs.forEach((e) => (crowd[e.year] = (crowd[e.year] || 0) + 1));
    scale = buildScale(evs.map((e) => e.year).concat(eras.flatMap((er) => [er.from, Math.min(er.to, cp.year)]), [cp.year]), crowd, CAST_SPREAD);
    // follow Lore: the event picked there, else the year under its center line, but never past the players' year
    const sel = evs.find((e) => e.id === T().sel) || null;
    const c = T().center, focus = sel ? +sel.year : Math.min(c === "" || c == null || isNaN(+c) ? cp.year : +c, cp.year);
    const X = (x) => `left:${x.toFixed(1)}px`;
    const bands = eras.map((er, i) => { const x0 = xAt(er.from), x1 = xAt(Math.min(er.to, cp.year)); return `<div class="ct-band b${i % 2}" style="${X(x0)};width:${Math.max(0, x1 - x0).toFixed(1)}px"><span>${esc(er.name)}</span></div>`; }).join("");
    const ticks = scale.stops.map((p) => `<div class="ct-tick" style="${X(p.x)}"><span>${esc(yearText(p.y))}</span></div>`).join("");
    // names beside the dots, in two rows above the line, skipping any that would overlap
    const lastX = [-1e9, -1e9], byYear = {};
    const dots = evs.map((e) => {
      const y = +e.year, lane = (byYear[y] = (byYear[y] || 0) + 1) - 1, x = xAt(y) + (lane - (crowd[y] - 1) / 2) * CAST_SPREAD;
      let label = "";
      const row = lastX[0] <= lastX[1] ? 0 : 1;
      if (e.id === (sel && sel.id) || x - lastX[row] > 230) { lastX[row] = x; label = `<span class="ct-name r${row}" style="${X(x)}">${esc(e.name)}</span>`; }
      return `<i class="ct-dot k-${kindOf(e).id} ${e._custom ? "custom" : ""} ${sel && e.id === sel.id ? "on" : ""}" style="${X(x)};--lane:0">${icon(kindOf(e))}</i>${label}`;
    }).join("");
    const era = eraOf(focus);
    const card = sel ? `<div class="ct-card"><small>${icon(kindOf(sel))}${esc(yearText(sel.year, sel.circa))} · ${esc(kindOf(sel).name)}</small><h2>${esc(sel.name)}</h2>${sel.text ? `<p>${esc(sel.text)}</p>` : ""}</div>` : "";
    return { x: xAt(focus), html: `<div class="ct">
        <div class="ct-head"><small>${esc(view.name)}</small><b>${esc(yearText(focus))}</b>${era ? `<span>${esc(era.name)}</span>` : ""}</div>
        <div class="ct-strip"><div class="ct-center"></div><div class="ct-track" id="castTrack" style="width:${scale.width.toFixed(0)}px">${bands}<div class="ct-axis"></div>${ticks}${dots}</div></div>
        ${card}</div>` };
  }
  G.timeline.castView = castView;

  // ---------------- scrolling: the center line sets the year ----------------
  let saveTimer = 0, lastYear = null, pad = 0, ro = null;
  const scroller = () => document.getElementById("tlScroller");
  // each line's name stays at the left edge of what you can see (past the Year panel), between its line's ends
  function placeTags(sc) {
    const tags = sc.querySelectorAll(".tlx-tag"); if (!tags.length) return;
    const host = sc.parentElement, lp = host.querySelector(".tlx-left:not([hidden])"), gr = sc.querySelector(".tlx-graph");
    const r0 = sc.getBoundingClientRect();
    let inset = 12;
    if (lp && gr) { const a = lp.getBoundingClientRect(), b = gr.getBoundingClientRect(); if (a.top < b.bottom && a.bottom > b.top) inset = a.right - r0.left + 12; }
    const want = sc.scrollLeft + inset - pad, widths = Array.from(tags, (t) => t.offsetWidth);
    tags.forEach((t, i) => { const x0 = +t.dataset.x0, x1 = +t.dataset.x1 - widths[i] - 12; t.style.left = pad + Math.max(x0, Math.min(want, x1)) + "px"; });
  }
  function onCenter(sc, exact) {
    if (!sc.isConnected) return;  // a strip replaced by a re-render resets to 0 and fires one last scroll: ignore it
    placeTags(sc);
    const y = exact != null ? exact : yearAtX(sc.scrollLeft);
    if (y === lastYear) return;
    lastYear = y;
    T().center = y;
    const label = document.getElementById("tlCenterYear"); if (label) label.textContent = yearText(y);
    if (T().follow) T().now = { branch: T().view, year: y };
    const lore = document.getElementById("tlLore");
    if (lore && !lore.hidden) { const b = lore.querySelector(".gx-body"), keep = b ? b.scrollTop : 0; lore.innerHTML = lorePanel(y); const nb = lore.querySelector(".gx-body"); if (nb) nb.scrollTop = keep; }
    clearTimeout(saveTimer); saveTimer = setTimeout(() => G.save(), 400);
  }
  function centerOn(y, smooth) {
    const sc = scroller(); if (!sc) return;
    const left = xAt(y);
    if (smooth && sc.scrollTo) {
      sc.scrollTo({ left, behavior: "smooth" });
      setTimeout(() => { if (!sc.isConnected) return; if (Math.abs(sc.scrollLeft - left) > 2) sc.scrollLeft = left; lastYear = null; onCenter(sc, y); }, 450);  // land on the exact year, even if frames stall
    } else { sc.scrollLeft = left; lastYear = null; onCenter(sc, y); }
  }
  G.afterRender.push((tab) => {
    if (tab !== "timeline") return;
    const sc = scroller(); if (!sc) return;
    if (ro) ro.disconnect();
    let restoring = true, timer = 0;
    // the center line sits at half the width: the track has that much room at each end
    const fit = () => {
      pad = Math.round(sc.clientWidth / 2); sc.style.setProperty("--pad", pad + "px");
      restoring = true; clearTimeout(timer); timer = setTimeout(() => (restoring = false), 60);
      sc.scrollLeft = xAt(centerYear());
      // more lines than fit: bring the followed timeline's line to the middle
      const gr = sc.querySelector(".tlx-graph"); if (gr) sc.scrollTop = Math.max(0, gr.offsetTop + (+gr.dataset.vy || 0) - sc.clientHeight / 2);
      placeTags(sc);
    };
    fit();
    lastYear = null; onCenter(sc, centerYear());  // keep the saved year exactly, whatever pixel it rounds to
    ro = new ResizeObserver(() => { if (sc.isConnected && Math.round(sc.clientWidth / 2) !== pad) fit(); else if (sc.isConnected) placeTags(sc); });
    ro.observe(sc);
    sc.addEventListener("scroll", () => { if (!restoring) onCenter(sc); else placeTags(sc); }, { passive: true });
    // the mouse wheel scrolls sideways (with Shift, up and down when there are more lines than fit)
    sc.addEventListener("wheel", (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? sc.clientWidth : 1);
      e.preventDefault();
      if (e.shiftKey) sc.scrollTop += d; else sc.scrollLeft += d;
    }, { passive: false });
    // drag to pan (a click on a dot, a name or a line still picks it)
    let drag = null;
    sc.addEventListener("pointerdown", (e) => { if (e.button !== 0 || e.target.closest("button, [data-act]")) return; drag = { x: e.clientX, y: e.clientY, left: sc.scrollLeft, top: sc.scrollTop, id: e.pointerId }; sc.setPointerCapture(e.pointerId); sc.classList.add("dragging"); });
    sc.addEventListener("pointermove", (e) => { if (drag && e.pointerId === drag.id) { sc.scrollLeft = drag.left - (e.clientX - drag.x); sc.scrollTop = drag.top - (e.clientY - drag.y); } });
    const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; sc.classList.remove("dragging"); } };
    sc.addEventListener("pointerup", end); sc.addEventListener("pointercancel", end);
    sc.parentElement.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); }
      else if (e.key === "Escape" && (T().form || T().sel)) { e.preventDefault(); if (T().form) A.tlCancel(); else select(""); }
    });
  });

  // pick an event in the viewed timeline without rebuilding the panel: mark its dot, show it, glide it to the center
  function select(id, glide) {
    const view = branchOf(T().view) || branchOf("novels"), e = visible(view.id).find((x) => x.id === id) || null;
    T().sel = e ? e.id : null;
    document.querySelectorAll(".tlx-dot.on, .tlx-name.on").forEach((d) => d.classList.remove("on"));
    if (e) document.querySelectorAll(`.tlx-dot[data-id="${CSS.escape(e.id)}"], .tlx-name[data-id="${CSS.escape(e.id)}"]`).forEach((d) => d.classList.add("on"));
    const box = document.getElementById("tlDetail"); if (box && !box.hidden) box.innerHTML = detail(view);
    if (e && !document.querySelector(`.tlx-name[data-id="${CSS.escape(e.id)}"]`)) G.render();  // its name wasn't shown: lay the names out again
    if (e && glide !== false) centerOn(+e.year, true);
    G.save();
  }
  function step(dir) {
    const hide = new Set(T().hideKinds || []), evs = visible(T().view).filter((e) => !hide.has(kindOf(e).id)); if (!evs.length) return;
    const cur = evs.findIndex((e) => e.id === T().sel), y = centerYear();
    let i;
    if (cur >= 0 && +evs[cur].year === y) i = cur + dir;
    else if (dir > 0) i = evs.findIndex((e) => +e.year > y);
    else { i = -1; evs.forEach((e, k) => { if (+e.year < y) i = k; }); }
    if (i < 0 || i >= evs.length) return;
    if (!side().info) { side().info = true; T().sel = evs[i].id; R(); centerOn(+evs[i].year, true); return; }
    select(evs[i].id);
  }

  // switching timelines from the dropdown: drop the selection, and keep the Compendium on the same timeline
  G.onChange.push((path) => { if (path === "timeline.view") { T().sel = null; T().form = null; if (T().follow && nowSet()) T().now.branch = T().view; } });

  // ---------------- actions ----------------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  const findEvent = (id) => allEvents().find((e) => e.id === id) || null;
  // follow a timeline: light its history and show it in the Details panel
  A.tlView = (el) => { const b = branchOf(el.dataset.b); if (!b) return; T().view = b.id; T().form = null; T().sel = null; side().info = true; if (T().follow && nowSet()) T().now.branch = b.id; R(); };
  // pick an event; one on another line follows that line's timeline too
  A.tlSel = (el) => {
    if (!G.visible("timeline")) return;
    const e = findEvent(el.dataset.id); if (!e) return;
    const inView = visible(T().view).some((x) => x.id === e.id);
    if (inView && side().info && !T().form) { select(e.id); return; }
    if (!inView) { T().view = e.branch; if (T().follow && nowSet()) T().now.branch = e.branch; }
    T().sel = e.id; T().form = null; side().info = true; R(); centerOn(+e.year, true);
  };
  // ✕ on an event goes back to its timeline; on the timeline it hides the panel
  A.tlClose = () => { if (T().sel) { select("", false); return; } side().info = false; R(); };
  A.tlSide = (el) => { const k = el.dataset.s; side()[k] = !side()[k]; R(); };
  // the Key: show or hide a kind of event (or all of them)
  A.tlKind = (el) => { const k = el.dataset.k, h = new Set(T().hideKinds || []);
    if (k === "*") h.clear(); else if (h.has(k)) h.delete(k); else h.add(k);
    T().hideKinds = Array.from(h); R(); };
  A.tlFormKind = (el) => { if (T().form) { T().form.kind = el.dataset.k; R(); } };
  A.tlFull = () => { const sc = scroller(), area = sc && sc.closest(".area"); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else (area || document.documentElement).requestFullscreen().catch(() => G.toast("Full screen isn't available here")); };
  A.tlStep = (el) => step(+el.dataset.dir);
  A.tlJump = (el) => centerOn(+el.dataset.y, true);
  A.tlCampaign = () => { T().campaign = { branch: T().view, year: centerYear() }; G.toast(`Players' year set to ${yearText(centerYear())} in ${(branchOf(T().view) || {}).name}`); R(); };
  A.tlCast = () => { if (!G.cast) return; const st = G.cast.state(); G.cast.bg(st.open && st.bg === "timeline" ? "none" : "timeline"); };
  A.tlFollow = () => { T().follow = !T().follow; T().now = T().follow ? { branch: T().view, year: centerYear() } : { branch: T().view, year: "" }; R(); };
  A.tlOpen = (el) => { G.S.tab = "compendium"; A.dbGo(el); G.areaTop("compendium"); };
  A.tlClearNow = () => { T().now.year = ""; T().follow = false; R(); };
  A.tlFork = (el) => {
    const e = findEvent(el.dataset.id); if (!e) return;
    const parent = branchOf(T().view);
    const b = { id: "b" + uid(), name: `${parent.name}: after ${e.name}`, parent: parent.id, fork: { year: +e.year, seq: e.seq == null ? 50 : +e.seq }, text: "" };
    T().branches.push(b); T().view = b.id; T().form = null; T().sel = null; T().center = +e.year; side().info = true;
    if (T().follow) T().now = { branch: b.id, year: +e.year };
    G.toast("New timeline: rename it and add what happens differently"); R();
  };
  A.tlNewBranch = () => {
    const nb = T().newBranch || {}; const parent = branchOf(nb.parent || T().view);
    if (!parent) return;
    if (!String(nb.name || "").trim()) { G.toast("Give the timeline a name"); return; }
    const year = String(nb.year == null ? "" : nb.year).trim() === "" || isNaN(+nb.year) ? null : +nb.year;
    if (year == null) { G.toast("Say after which year it splits off"); return; }
    const b = { id: "b" + uid(), name: nb.name.trim(), parent: parent.id, fork: { year, seq: 999 }, text: "" };
    T().branches.push(b); T().view = b.id; T().sel = null; T().newBranch = { name: "", parent: "", year: "" }; R(); centerOn(year, true);
  };
  A.tlDelBranch = () => {
    const b = branchOf(T().view); if (!editable(b)) return;
    if (branches().some((x) => x.parent === b.id)) { G.toast("Delete the timelines that split from this one first"); return; }
    if (!confirm(`Delete the timeline "${b.name}" and its ${T().events.filter((e) => e.branch === b.id).length} events?`)) return;
    T().events = T().events.filter((e) => e.branch !== b.id);
    T().branches = T().branches.filter((x) => x.id !== b.id);
    if (T().now.branch === b.id) T().now = { branch: b.parent, year: T().now.year };
    if ((T().campaign || {}).branch === b.id) T().campaign.branch = b.parent;
    T().view = b.parent; T().sel = null; R();
  };
  A.tlNewEvent = () => { T().form = { year: centerYear(), seq: 50, circa: false, name: "", text: "", table: "npcs", entry: "", field: "status", value: "", refs: [], changes: [] }; side().info = true; R(); };
  A.tlCancel = () => { T().form = null; R(); };
  const pickRef = () => { const f = T().form; const t = DB.find(f.table, f.entry); if (!t) { G.toast(`No ${((DB.META[f.table] || {}).title || f.table).toLowerCase()} entry called “${f.entry}”`); return null; } return `${f.table}:${t.name}`; };
  A.tlAddRef = () => { const ref = pickRef(); if (!ref) return; const f = T().form; if (!f.refs.includes(ref)) f.refs.push(ref); f.entry = ""; R(); };
  A.tlAddChange = () => { const ref = pickRef(); if (!ref) return; const f = T().form; if (!f.field) { G.toast("Pick a field to change"); return; } f.changes.push({ ref, field: f.field, value: String(f.value || "") }); f.value = ""; R(); };
  A.tlRmPending = (el) => { T().form[el.dataset.kind].splice(+el.dataset.i, 1); R(); };
  A.tlSave = () => {
    const f = T().form; if (!f) return;
    if (!String(f.name || "").trim()) { G.toast("Give the event a title"); return; }
    if (String(f.year == null ? "" : f.year).trim() === "" || isNaN(+f.year)) { G.toast("Give the event a year"); return; }
    const data = { name: f.name.trim(), year: +f.year, seq: String(f.seq == null ? "" : f.seq).trim() === "" || isNaN(+f.seq) ? 50 : +f.seq, circa: !!f.circa, kind: f.kind || "", text: f.text || "", refs: f.refs.slice(), changes: f.changes.slice() };
    let id = f.editId;
    if (id) Object.assign(T().events.find((e) => e.id === id), data);
    else { id = "events:mine-" + uid(); T().events.push(Object.assign({ id, branch: T().view }, data)); }
    T().form = null; T().sel = id; R(); centerOn(data.year, true);
  };
  A.tlEdit = (el) => { const e = T().events.find((x) => x.id === el.dataset.id); if (!e) return; T().form = Object.assign({ table: "npcs", entry: "", field: "status", value: "" }, JSON.parse(JSON.stringify(e)), { editId: e.id }); side().info = true; R(); };
  A.tlDel = (el) => { const e = T().events.find((x) => x.id === el.dataset.id); if (!e || !confirm(`Delete the event "${e.name}"?`)) return; T().events = T().events.filter((x) => x !== e); if (T().sel === e.id) T().sel = null; R(); };
  // from the Compendium: jump to an event in its timeline
  A.tlGoEvent = (el) => { const e = findEvent(el.dataset.id); if (!e) return; G.S.tab = "timeline"; T().view = e.branch; T().sel = e.id; T().form = null; T().center = +e.year; side().info = true; if (T().follow) T().now = { branch: e.branch, year: +e.year }; R(); };
})();
