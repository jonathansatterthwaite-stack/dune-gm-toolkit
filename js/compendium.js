// Compendium tab — browse, search and use the rules database (js/db.js + js/db/*.js), and keep homebrew entries.
(function () {
  const G = window.GM, DB = window.DUNE_DB, D = window.DUNE;
  const { esc, uid } = G;
  const SK = D.SKILLS;
  const BOOKS = ["Core", "Power and Pawns", "Sand and Dust", "The Great Game", "Homebrew"];
  const BOOK_TAG = { Core: "Core", "Power and Pawns": "P&P", "Sand and Dust": "S&D", "The Great Game": "GG", Homebrew: "Brew", Other: "—" };

  G.ensure("db", { table: "assets", q: "", book: "", facet: "", sel: "", custom: {}, draft: null, limit: 200, deep: false });
  const ST = () => G.S.db;
  const R = () => { G.save(); G.render(); };

  // ---- data access: book rows + homebrew rows
  const custom = (t) => (ST().custom[t] || []).map((r) => Object.assign({}, r, { _t: t, _custom: true, book: "Homebrew", src: r.src || "Homebrew" }));
  const rowsOf = (t) => DB.rows(t).concat(custom(t));
  const allTables = () => { const ts = DB.tables(); Object.keys(ST().custom).forEach((t) => { if (!ts.includes(t) && (ST().custom[t] || []).length) ts.push(t); }); return ts; };
  const getRow = (id) => { if (!id) return null; const t = id.split(":")[0]; return rowsOf(t).find((r) => r.id === id) || null; };
  const findRow = (t, name) => {
    const n = String(name || "").toLowerCase().trim(); if (!n) return null;
    const list = rowsOf(t);
    const is = (r, x) => r.name.toLowerCase() === x || (r.aliases || []).some((a) => a.toLowerCase() === x);
    return list.find((r) => is(r, n)) || list.find((r) => is(r, n.replace(/\s*\(.*\)$/, ""))) ||
      list.find((r) => r.name.toLowerCase() === "house " + n) || null;
  };
  const meta = (t) => DB.META[t] || { group: "Homebrew", title: t, desc: "", cols: [], facet: "" };

  // ---- full book text: js/db/fulltext.local.js, generated from your own PDFs by tools/build-fulltext.js.
  // Loaded only when the toolkit runs from your computer (file:// or localhost), never on the public site.
  const LOCAL = location.protocol === "file:" || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let fullState = window.DUNE_FULLTEXT ? "ready" : LOCAL ? "loading" : "off";
  if (fullState === "loading") {
    const s = document.createElement("script");
    s.src = "js/db/fulltext.local.js?t=" + Date.now();
    s.onload = () => { fullState = window.DUNE_FULLTEXT ? "ready" : "missing"; if (G.S.tab === "compendium" || G.S.tab === "characters") G.render(); };
    s.onerror = () => { fullState = "missing"; if (G.S.tab === "compendium") G.render(); };
    document.head.appendChild(s);
  }
  const FT = () => (window.DUNE_FULLTEXT && window.DUNE_FULLTEXT.entries) || {};
  const pageRow = (book, page) => rowsOf("pages").find((p) => p.bookKey === book && p.page === page) || null;
  const bookHTML = (text) => text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br/>")}</p>`).join("");

  function filtered() {
    const s = ST(), q = s.q.trim();
    let list;
    if (q) {
      const terms = q.toLowerCase().split(/\s+/);
      const pool = (s.table === "*" ? allTables() : [s.table]).flatMap(rowsOf);
      list = pool.map((r) => {
        const n = r.name.toLowerCase(), ft = s.deep && FT()[r.id], all = DB.text(r) + (ft && ft.text ? " " + ft.text.toLowerCase() : "");
        if (!terms.every((t) => all.includes(t))) return null;
        return [r, terms.every((t) => n.includes(t)) ? (n.startsWith(terms[0]) ? 0 : 1) : 2];
      }).filter(Boolean).sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name)).map((x) => x[0]);
    } else list = s.table === "*" ? [] : rowsOf(s.table);
    if (s.book) list = list.filter((r) => r.book === s.book);
    const f = s.table !== "*" && meta(s.table).facet;
    if (f && s.facet) list = list.filter((r) => String(r[f] || "") === s.facet);
    return list;
  }

  // ---- small renderers
  const tag = (r) => `<span class="db-book" title="${esc(r.src)}">${esc(BOOK_TAG[r.book] || r.book || "—")}</span>`;
  const link = (t, name, label) => { const r = findRow(t, name); return r ? `<a class="db-link" data-act="dbGo" data-id="${esc(r.id)}">${esc(label || name)}</a>` : esc(label || name); };
  const links = (t, arr) => (arr || []).map((x) => link(t, x)).join(", ") || "—";
  const list = (arr) => (arr && arr.length ? arr.map(esc).join(", ") : "—");
  const chips = (arr) => (arr && arr.length ? `<div class="chips">${arr.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>` : "—");

  // field specs per table: [key, label, how]
  const FIELDS = {
    assets: [["cat", "Type"], ["group", "Group"], ["kw", "Keywords", "chips"], ["q", "Quality", "q"], ["tangible", "Tangible", "bool"], ["special", "Special"], ["aliases", "Also called", "list"]],
    talents: [["faction", "Faction"], ["param", "Choose a"]],
    archetypes: [["primary", "Primary skill"], ["secondary", "Secondary skill"], ["focuses", "Focuses", "links:focuses"], ["talents", "Talents", "links:talents"]],
    factions: [["trait", "Trait"], ["mandatory", "Talents", "links:talents"], ["rule", "Rule"], ["archetypes", "Suggested archetypes", "links:archetypes"]],
    houses: [["rank", "Rank"], ["liege", "Serves", "link:houses"], ["homeworld", "Homeworld", "link:planets"], ["crest", "Crest"], ["colors", "Colors"], ["motto", "Motto", "motto"], ["traits", "Traits", "links:traits"], ["primary", "Primary domains", "lines"], ["secondary", "Secondary domains", "lines"], ["family", "Household", "family"]],
    planets: [["system", "Star system"], ["designation", "Designation"], ["moons", "Moons"], ["habitable", "Habitability"], ["house", "Ruling House", "link:houses"], ["vassal", "Held for them by", "link:houses"], ["ruler", "Ruled by", "link:organizations"], ["note", "Note"], ["exports", "Exports"], ["population", "Population"], ["languages", "Languages"], ["places", "Places of interest", "list"]],
    houseTypes: [["threatNote", "Threat"], ["domains", "Starting domains"], ["enemies", "Starting enemies"], ["gg", "House management"]],
    domains: [["trait", "House trait"], ["machinery", "Machinery"], ["produce", "Produce"], ["expertise", "Expertise"], ["workers", "Workers"], ["understanding", "Understanding"]],
    houseRoles: [["rights", "Rights and duties"], ["gg", "In House management"]],
    houseTemplates: [["minor", "As a House Minor"], ["major", "As a House Major"], ["great", "As a Great House"]],
    enmity: [["kind", "Table"], ["roll", "Roll (d20)"]],
    ventures: [["group", "Type"], ["skill", "Skill"], ["cost", "Cost"], ["successes", "Successes needed"]],
    drives: [["set", "Set"], ["examples", "Example statements", "list"]],
    focuses: [["skill", "Skill"], ["specify", "Specialty"], ["examples", "Specialties in the books", "list"], ["set", "Listed in"], ["usedBy", "Used by", "uses"]],
    organizations: [["kind", "Kind"]],
    traits: [["kind", "Kind"], ["usedBy", "Used by", "uses"]],
  };
  function fieldHTML(r, [k, label, how]) {
    let v = r[k];
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
    let out;
    if (how === "chips") out = chips(v);
    else if (how === "list") out = list(v);
    else if (how === "lines") out = v.map(esc).join("<br/>");
    else if (how === "bool") out = v ? "Yes" : "No — intangible";
    else if (how === "q") out = `${v}`;
    else if (how === "motto") out = `<i>“${esc(v)}”</i>`;
    else if (how === "family") out = v.map((m) => `${link("npcs", m.name)}${m.role ? ` <span class="muted">(${esc(m.role)})</span>` : ""}`).join("<br/>");
    else if (how === "uses") out = v.map((who) => ["houses", "npcs", "archetypes"].map((t) => link(t, who)).find((h) => h !== esc(who)) || esc(who)).join(", ");
    else if (how && how.startsWith("links:")) out = links(how.slice(6), v);
    else if (how && how.startsWith("link:")) out = link(how.slice(5), String(v).replace(/\s*\(.*\)$/, "").replace(/,.*$/, ""), v);
    else out = Array.isArray(v) ? list(v) : esc(String(v));
    return `<dt>${esc(label)}</dt><dd>${out}</dd>`;
  }
  function genericFields(r) {
    const skip = new Set(["id", "name", "text", "src", "book", "title", "_t", "_custom"]);
    return Object.keys(r).filter((k) => !skip.has(k)).map((k) => fieldHTML(r, [k, k[0].toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1")])).join("");
  }

  function npcBlock(n) {
    const DR = Object.keys(n.drives || {});
    return `<div class="statgrid">${SK.map((s) => `<div class="s"><div class="k">${s}</div><div class="v">${n.skills[s] ?? "—"}</div></div>`).join("")}</div>
      <div class="statgrid db-drives">${DR.map((d) => `<div class="s"><div class="k">${esc(d)}</div><div class="v">${n.drives[d]}</div></div>`).join("")}</div>
      <dl class="kv">
        <dt>Focuses</dt><dd>${Object.entries(n.focuses || {}).map(([s, fs]) => `<b>${esc(s)}:</b> ${links("focuses", fs)}`).join("<br/>") || "—"}</dd>
        <dt>Talents</dt><dd>${links("talents", n.talents)}</dd>
        <dt>Traits</dt><dd>${links("traits", n.traits)}</dd>
        <dt>Assets</dt><dd>${(n.assets || []).map((a) => link("assets", a)).join(", ") || "—"}</dd>
        ${n.faction ? `<dt>Faction</dt><dd>${link("houses", n.faction) !== esc(n.faction) ? link("houses", n.faction) : link("organizations", n.faction)}</dd>` : ""}
      </dl>`;
  }

  function actionsFor(r) {
    const ch = G.S.chars && G.S.chars.list.find((c) => c.id === G.S.chars.sel);
    const b = (act, label, extra) => `<button class="btn${extra || ""}" data-act="${act}" data-id="${esc(r.id)}">${label}</button>`;
    const out = [];
    if (r._t === "npcs") out.push(b("dbNpcRoster", "Save to NPC roster", " primary"), b("dbNpcConflict", "Add to conflict"), b("dbNpcCreator", "Open in creator"));
    if (r._t === "assets") { if (ch) out.push(b("dbGiveAsset", `Give to ${esc(ch.name || "current character")}`, " primary")); out.push(b("dbSceneTrait", "Add to scene")); }
    if (r._t === "talents" && ch) out.push(b("dbGiveTalent", `Give to ${esc(ch.name || "current character")}`, " primary"));
    if (r._t === "traits") out.push(b("dbSceneTrait", "Add to scene", " primary"));
    if (r._t === "planets" && G.hasStarmapPlanet && G.hasStarmapPlanet(r.name)) out.push(b("dbStarmap", "Show on galaxy map", " primary"));
    if (r._t === "houses") out.push(b("dbSceneTrait", "Add House to scene"));
    out.push(b("dbCopy", "Copy as text"));
    if (r._custom) out.push(b("dbEdit", "Edit"), b("dbDelete", "Delete", " ghost danger"));
    else out.push(b("dbClone", "Copy to homebrew", " ghost"));
    return `<div class="c-actions">${out.join("")}</div>`;
  }

  // "From the book": the entry's own section, or its whole page when the section couldn't be isolated
  function bookSection(r) {
    const e = FT()[r.id]; if (!e) return "";
    const pg = pageRow(e.book, e.page);
    const text = e.how === "section" ? e.text : pg ? pg.text : "";
    if (!text) return "";
    return `<h4>From the book</h4>
      <div class="db-fulltext">${bookHTML(text)}</div>
      <p class="pg">${e.how === "section" ? "The book's text for this entry" : "This entry couldn't be isolated, so this is its whole page"} — ${esc(pg ? pg.name : "")}.
      ${pg ? `<a class="db-link" data-act="dbGo" data-id="${esc(pg.id)}">Open the page</a>` : ""}</p>`;
  }
  function pageDetail(r) {
    const sib = rowsOf("pages").filter((p) => p.bookKey === r.bookKey);
    const i = sib.findIndex((p) => p.id === r.id), prev = sib[i - 1], next = sib[i + 1];
    const here = Object.entries(FT()).filter(([, e]) => e.book === r.bookKey && e.page === r.page && e.page > 0).map(([id]) => getRow(id)).filter(Boolean);
    return `<div class="card-head"><div><h2>${esc(r.name)}</h2><div class="muted small">Book page · PDF page ${r.pdfPage}</div></div>${tag(r)}</div>
      <div class="c-actions">${prev ? `<button class="btn small" data-act="dbGo" data-id="${esc(prev.id)}">◀ ${esc(prev.name.replace(/^.* (p\.|PDF page )/, "$1"))}</button>` : ""}${next ? `<button class="btn small" data-act="dbGo" data-id="${esc(next.id)}">${esc(next.name.replace(/^.* (p\.|PDF page )/, "$1"))} ▶</button>` : ""}</div>
      ${here.length ? `<h4>Entries on this page</h4><p>${here.map((x) => link(x._t, x.name)).join(", ")}</p>` : ""}
      <div class="db-fulltext db-page">${bookHTML(r.text)}</div>
      <p class="pg">From your PDF of ${esc(r.src.replace(/ (p\.|PDF page ).*$/, ""))}. Personal use — this text is only loaded on your own computer.</p>
      <div class="c-actions"><button class="btn" data-act="dbCopy" data-id="${esc(r.id)}">Copy page text</button></div>`;
  }

  function detailHTML(r) {
    if (!r) return `<div class="hint">Pick an entry to see it here.</div>`;
    if (r._t === "pages") return pageDetail(r);
    const t = r._t, m = meta(t);
    let body = "";
    if (t === "npcs") body = npcBlock(r);
    else { const spec = FIELDS[t]; body = `<dl class="kv">${spec ? spec.map((f) => fieldHTML(r, f)).join("") : genericFields(r)}</dl>`; }
    let extra = "";
    if (t === "houses") {
      const vassals = rowsOf("houses").filter((h) => h.liege === r.name);
      if (vassals.length) extra += `<h4>Vassal Houses</h4><dl class="kv">${vassals.map((v) => `<dt>${link("houses", v.name, v.name.replace(/^House /, ""))}</dt><dd>${esc(v.text)}</dd>`).join("")}</dl>`;
      const worlds = rowsOf("planets").filter((p) => p.house === r.name || p.vassal === r.name);
      if (worlds.length) extra += `<h4>Worlds</h4><p>${worlds.map((p) => link("planets", p.name)).join(", ")}</p>`;
    }
    if (t === "talents") {
      const who = rowsOf("npcs").filter((n) => (n.talents || []).some((x) => x.replace(/\s*\(.*\)$/, "") === r.name));
      if (who.length) extra += `<h4>NPCs with this talent</h4><p>${who.map((n) => link("npcs", n.name)).join(", ")}</p>`;
    }
    if (t === "assets") {
      const names = [r.name].concat(r.aliases || []).map((x) => x.toLowerCase());
      const who = rowsOf("npcs").filter((n) => (n.assets || []).some((a) => names.includes(a.toLowerCase())));
      if (who.length) extra += `<h4>Carried by</h4><p>${who.map((n) => link("npcs", n.name)).join(", ")}</p>`;
    }
    return `<div class="card-head"><div><h2>${esc(r.name)}</h2><div class="muted small">${esc(m.title)}${r.title ? ` · ${esc(r.title)}` : ""}${r.kind && t === "npcs" ? ` · ${esc(r.kind)}` : ""}</div></div>${tag(r)}</div>
      ${r.text ? `<p>${esc(r.text)}</p>` : ""}
      ${body}${extra}
      <p class="pg">Source: ${esc(r.src || "—")}${r.book && r.book !== "Homebrew" && !FT()[r.id] ? " — summary written for this tool; see the book for the full text." : ""}</p>
      ${bookSection(r)}
      ${actionsFor(r)}`;
  }

  // ---- homebrew editor
  const EDIT_SKIP = new Set(["id", "_t", "_custom", "book", "usedBy", "aliases"]);
  function draftFrom(t, r) {
    const base = r ? JSON.parse(JSON.stringify(r)) : { name: "", text: "" };
    const tmpl = rowsOf(t)[0] || {};
    const keys = Array.from(new Set(["name", ...Object.keys(tmpl), ...Object.keys(base), "text", "src"])).filter((k) => !EDIT_SKIP.has(k));
    const d = { _table: t, _id: r && r._custom ? r.id : "", _shape: {}, fields: {} };
    keys.forEach((k) => {
      const v = base[k] != null ? base[k] : tmpl[k] != null ? (Array.isArray(tmpl[k]) ? [] : typeof tmpl[k] === "object" ? {} : typeof tmpl[k] === "number" ? 0 : typeof tmpl[k] === "boolean" ? false : "") : "";
      d._shape[k] = Array.isArray(v) ? "list" : typeof v === "number" ? "num" : typeof v === "boolean" ? "bool" : v && typeof v === "object" ? "json" : "text";
      d.fields[k] = d._shape[k] === "list" ? v.map((x) => (typeof x === "object" ? JSON.stringify(x) : x)).join(", ") : d._shape[k] === "json" ? JSON.stringify(v) : d._shape[k] === "bool" ? !!v : String(v);
    });
    if (!r || !r._custom) d.fields.src = "Homebrew";
    return d;
  }
  function editorHTML(d) {
    const fld = (k) => {
      const shape = d._shape[k], b = `db.draft.fields.${k}`, label = k[0].toUpperCase() + k.slice(1);
      if (shape === "bool") return `<label class="field-inline"><input type="checkbox" data-bind="${b}" ${d.fields[k] ? "checked" : ""}/> ${esc(label)}</label>`;
      if (k === "text") return `<label class="field">Description<textarea data-bind="${b}">${esc(d.fields[k])}</textarea></label>`;
      return `<label class="field">${esc(label)}${shape === "list" ? " <span class='muted small'>(comma-separated)</span>" : shape === "json" ? " <span class='muted small'>(JSON)</span>" : ""}<input type="text" data-bind="${b}" value="${esc(d.fields[k])}"/></label>`;
    };
    return `<div class="card-head"><h2>${d._id ? "Edit" : "New"} ${esc(meta(d._table).title)} entry</h2><span class="db-book">Brew</span></div>
      <div class="db-form">${Object.keys(d.fields).map(fld).join("")}</div>
      <div class="c-actions"><button class="btn primary" data-act="dbSaveDraft">Save</button><button class="btn ghost" data-act="dbCancelDraft">Cancel</button></div>`;
  }

  // ---- the view
  G.views.compendium = () => {
    const s = ST();
    if (s.table !== "*" && !allTables().includes(s.table)) s.table = "assets";
    const groups = {};
    allTables().forEach((t) => { const g = meta(t).group; (groups[g] = groups[g] || []).push(t); });
    const total = allTables().reduce((n, t) => n + rowsOf(t).length, 0);
    const side = `<section class="card db-side">
        <input type="search" class="db-search" placeholder="Search everything…" data-bind="db.q" data-live="1" value="${esc(s.q)}" aria-label="Search the database"/>
        <button class="db-tab ${s.table === "*" ? "on" : ""}" data-act="dbTable" data-t="*">All tables <span>${total}</span></button>
        ${Object.entries(groups).map(([g, ts]) => `<div class="db-group">${esc(g)}</div>${ts.map((t) => `<button class="db-tab ${s.table === t ? "on" : ""}" data-act="dbTable" data-t="${t}">${esc(meta(t).title)} <span>${rowsOf(t).length}</span></button>`).join("")}`).join("")}
        ${fullState === "ready" ? `<label class="db-deep"><input type="checkbox" data-bind="db.deep" ${s.deep ? "checked" : ""}/> Search the book text too</label>`
          : fullState === "missing" ? `<p class="hint small">For the books' full text, run <code>node tools/build-fulltext.js</code> once (it reads your PDFs in [rulebooks]/), then reload.</p>`
          : fullState === "loading" ? `<p class="hint small">Loading the books' text…</p>` : ""}
        <label class="field" style="margin-top:0.8rem">Book<select data-bind="db.book"><option value="">All books</option>${BOOKS.map((b) => `<option ${s.book === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>
        <div class="db-io">
          <button class="btn small" data-act="dbExport">Export JSON</button>
          <button class="btn small" data-act="dbExportCsv" ${s.table === "*" ? "disabled" : ""}>Export CSV</button>
          <button class="btn small" data-act="dbImport">Import homebrew</button>
          <input type="file" id="dbImportFile" accept=".json,application/json" hidden/>
        </div>
      </section>`;

    const m = s.table === "*" ? { title: "All tables", desc: "Type in the search box to search every table at once.", cols: [], facet: "" } : meta(s.table);
    const rows = filtered();
    const facetVals = m.facet ? Array.from(new Set(rowsOf(s.table).map((r) => String(r[m.facet] || "")).filter(Boolean))).sort() : [];
    const shown = rows.slice(0, s.limit);
    const colsHTML = (r) => (s.table === "*" ? `<span class="muted small">${esc(meta(r._t).title)}</span>` : m.cols.map(([k]) => `<span class="muted small">${esc(Array.isArray(r[k]) ? r[k].join(", ") : r[k] ?? "")}</span>`).join(""));
    const listCard = `<section class="card db-list">
        <div class="card-head"><div><h2>${esc(m.title)}</h2><div class="muted small">${esc(m.desc)}</div></div>
          ${s.table !== "*" ? `<button class="btn small" data-act="dbNew">+ Homebrew</button>` : ""}</div>
        <div class="db-filters">
          ${facetVals.length ? `<select data-bind="db.facet" aria-label="Filter"><option value="">Every ${esc(m.cols.find((c) => c[0] === m.facet)?.[1] || "kind").toLowerCase()}</option>${facetVals.map((v) => `<option ${s.facet === v ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : ""}
          <span class="muted small">${rows.length} entr${rows.length === 1 ? "y" : "ies"}${s.q ? ` matching “${esc(s.q)}”` : ""}</span>
        </div>
        <div class="db-rows">${shown.map((r) => `<button class="db-row ${s.sel === r.id ? "on" : ""}" data-act="dbSel" data-id="${esc(r.id)}"><span class="n">${esc(r.name)}</span>${colsHTML(r)}${tag(r)}</button>`).join("") || `<div class="hint">${s.table === "*" && !s.q ? "Search to see results from every table." : "Nothing matches."}</div>`}</div>
        ${rows.length > shown.length ? `<button class="btn small" data-act="dbMore" style="margin-top:0.5rem">Show ${Math.min(200, rows.length - shown.length)} more</button>` : ""}
      </section>`;
    const detail = `<section class="card db-detail">${s.draft ? editorHTML(s.draft) : detailHTML(getRow(s.sel))}</section>`;
    return `<div class="db-layout">${side}${listCard}${detail}</div>`;
  };

  // ---- reset facet / paging when the table or filters change
  G.onChange.push((b) => { if (b === "db.book") ST().limit = 200; });
  G.onInput.push((b) => { if (b === "db.q") ST().limit = 200; });

  // ---- converters to the other tools
  function npcToRoster(n) {
    const tier = n.kind === "Named" ? "major" : "notable";
    const focuses = Object.values(n.focuses || {}).flat();
    const abilities = (n.talents || []).map((t) => { const d = findRow("talents", t); return { name: t, text: d ? d.text : "" }; });
    return { id: uid(), name: n.name, tier, role: n.title || (n.kind === "Archetype" ? n.name : n.faction || "NPC"), traits: (n.traits || []).slice(0, 4), skills: Object.assign({}, n.skills),
      drives: Object.assign({}, n.drives), driveNames: D.DRIVES.slice(), statements: {}, focuses, abilities,
      notes: [n.text, n.assets && n.assets.length ? "Assets: " + n.assets.join(", ") : "", "Source: " + n.src].filter(Boolean).join("\n") };
  }
  const textOf = (r) => {
    if (r._t === "pages") return `${r.name}

${r.text}`;
    const lines = [`${r.name} (${meta(r._t).title}, ${r.src})`];
    if (r.text) lines.push(r.text);
    const ft = FT()[r.id], pg = ft && pageRow(ft.book, ft.page);
    if (ft && (ft.text || pg)) lines.push("", "From the book:", ft.how === "section" ? ft.text : pg.text);
    Object.entries(r).forEach(([k, v]) => {
      if (["id", "name", "text", "src", "book", "_t", "_custom"].includes(k) || v == null || v === "") return;
      lines.push(`${k}: ${typeof v === "object" ? (Array.isArray(v) ? v.map((x) => (typeof x === "object" ? Object.values(x).join(" ") : x)).join(", ") : Object.entries(v).map(([a, b]) => `${a} ${Array.isArray(b) ? b.join("/") : b}`).join(", ")) : v}`);
    });
    return lines.join("\n");
  };
  function download(name, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const A = G.actions;
  const rowFrom = (el) => getRow(el.dataset.id);
  A.dbTable = (el) => { const s = ST(); s.table = el.dataset.t; s.facet = ""; s.limit = 200; s.draft = null; R(); };
  A.dbSel = (el) => { ST().sel = el.dataset.id; ST().draft = null; R(); if (window.innerWidth < 960) setTimeout(() => document.querySelector(".db-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); };
  A.dbGo = (el) => { const r = rowFrom(el); if (!r) return; const s = ST(); s.sel = r.id; s.draft = null; if (s.table !== "*" && s.table !== r._t) { s.table = r._t; s.facet = ""; s.q = ""; } R(); };
  A.dbMore = () => { ST().limit += 200; R(); };

  A.dbNpcRoster = (el) => { const n = rowFrom(el); if (!n) return; G.S.npcs.unshift(npcToRoster(n)); G.toast(`${n.name} saved to the NPC roster`); G.save(); };
  A.dbNpcConflict = (el) => {
    const n = rowFrom(el); if (!n) return;
    const sk = G.conflictSkill();
    G.addCombatant({ name: n.name, side: "opponents", tier: n.kind === "Named" ? "major" : "notable", req: n.skills[sk] || 4,
      assets: (n.assets || []).map((a) => { const d = findRow("assets", a); return { id: uid(), name: a, q: d ? d.q || 0 : 0, def: /shield|armou?r/i.test(a) }; }) });
    G.toast(`${n.name} added to the conflict`);
  };
  A.dbNpcCreator = (el) => {
    const n = rowFrom(el); if (!n) return;
    if (!G.actions.chFromNpc) return;
    // reuse the NPCs tab's converter via a temporary roster entry, then carry over talents and assets
    const r = npcToRoster(n); G.S.npcs.unshift(r);
    G.actions.chFromNpc({ dataset: { npc: r.id } });
    G.S.npcs = G.S.npcs.filter((x) => x.id !== r.id);
    const ch = G.S.chars.list.find((c) => c.id === G.S.chars.sel);
    if (ch) {
      ch.abilities = [];
      ch.talents = (n.talents || []).filter((t) => findRow("talents", t)).map((t) => { const m = t.match(/^(.*?)\s*\((.*)\)$/); return { id: uid(), name: m ? findRow("talents", t).name : t, param: m ? m[2] : "" }; });
      ch.assets = (n.assets || []).map((a) => { const d = findRow("assets", a); return { id: uid(), name: a, tangible: d ? d.tangible !== false : true, q: d ? d.q || 0 : 0 }; });
      ch.details.notes = [n.text, "Source: " + n.src].join("\n");
    }
    R();
  };
  A.dbGiveAsset = (el) => {
    const r = rowFrom(el), ch = G.S.chars.list.find((c) => c.id === G.S.chars.sel); if (!r || !ch) return;
    ch.assets.push({ id: uid(), name: r.name, tangible: r.tangible !== false, q: r.q || 0 });
    G.toast(`${r.name} given to ${ch.name || "the character"}`); G.save();
  };
  A.dbGiveTalent = (el) => {
    const r = rowFrom(el), ch = G.S.chars.list.find((c) => c.id === G.S.chars.sel); if (!r || !ch) return;
    if (ch.talents.some((t) => t.name === r.name)) { G.toast(`${ch.name || "The character"} already has ${r.name}`); return; }
    ch.talents.push({ id: uid(), name: r.name, param: "" });
    G.toast(`${r.name} given to ${ch.name || "the character"}`); G.save();
  };
  A.dbSceneTrait = (el) => { const r = rowFrom(el); if (!r) return; G.addSceneTrait(r.name, "trait"); G.toast(`Added “${r.name}” to the scene`); };
  A.dbStarmap = (el) => { const r = rowFrom(el); if (r && G.showOnStarmap) G.showOnStarmap(r.name); };
  A.dbCopy = (el) => {
    const r = rowFrom(el); if (!r) return;
    const t = textOf(r);
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => G.toast("Copied"), () => { window.prompt("Copy this text:", t); });
  };

  // homebrew
  A.dbNew = () => { const s = ST(); s.draft = draftFrom(s.table, null); R(); };
  A.dbClone = (el) => { const r = rowFrom(el); if (!r) return; const d = draftFrom(r._t, r); d.fields.name = r.name + " (homebrew)"; ST().draft = d; R(); };
  A.dbEdit = (el) => { const r = rowFrom(el); if (!r) return; ST().draft = draftFrom(r._t, r); R(); };
  A.dbCancelDraft = () => { ST().draft = null; R(); };
  A.dbSaveDraft = () => {
    const s = ST(), d = s.draft; if (!d) return;
    const name = String(d.fields.name || "").trim(); if (!name) { G.toast("Give the entry a name"); return; }
    const row = {};
    for (const [k, shape] of Object.entries(d._shape)) {
      const v = d.fields[k];
      if (shape === "list") row[k] = String(v || "").split(",").map((x) => x.trim()).filter(Boolean);
      else if (shape === "num") row[k] = Number(v) || 0;
      else if (shape === "bool") row[k] = !!v;
      else if (shape === "json") { try { row[k] = JSON.parse(v || "{}"); } catch (e) { G.toast(`“${k}” isn't valid JSON`); return; } }
      else row[k] = String(v || "").trim();
    }
    row.name = name;
    const list = (s.custom[d._table] = s.custom[d._table] || []);
    if (d._id) { const i = list.findIndex((x) => x.id === d._id); row.id = d._id; if (i >= 0) list[i] = row; else list.push(row); }
    else { row.id = `${d._table}:brew-${uid()}`; list.push(row); }
    s.sel = row.id; s.draft = null; G.toast(`Saved “${name}”`); R();
  };
  A.dbDelete = (el) => {
    const r = rowFrom(el); if (!r || !r._custom) return;
    if (!confirm(`Delete the homebrew entry “${r.name}”?`)) return;
    const s = ST(); s.custom[r._t] = (s.custom[r._t] || []).filter((x) => x.id !== r.id); s.sel = ""; R();
  };

  // export / import
  const strip = (r) => { const o = Object.assign({}, r); delete o._t; delete o._custom; return o; };
  A.dbExport = () => {
    const out = { exported: new Date().toISOString(), note: "Dune GM Toolkit database. Summaries are paraphrased for this tool; see the books for full text.", tables: {}, homebrew: ST().custom };
    DB.tables().forEach((t) => (out.tables[t] = DB.rows(t).map(strip)));
    download("dune-gm-database.json", JSON.stringify(out, null, 1), "application/json");
  };
  A.dbExportCsv = () => {
    const t = ST().table; if (t === "*") return;
    const rows = rowsOf(t).map(strip), keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const cell = (v) => { const s = v == null ? "" : typeof v === "object" ? (Array.isArray(v) ? v.map((x) => (typeof x === "object" ? Object.values(x).join(" ") : x)).join("; ") : JSON.stringify(v)) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    download(`dune-${t}.csv`, [keys.join(","), ...rows.map((r) => keys.map((k) => cell(r[k])).join(","))].join("\n"), "text/csv");
  };
  A.dbImport = () => { const f = document.getElementById("dbImportFile"); if (f) f.click(); };
  document.addEventListener("change", (e) => {
    if (e.target.id !== "dbImportFile" || !e.target.files[0]) return;
    const file = e.target.files[0];
    file.text().then((txt) => {
      let data; try { data = JSON.parse(txt); } catch (err) { G.toast("That file isn't valid JSON"); return; }
      const brew = data.homebrew || data;
      if (!brew || typeof brew !== "object" || Array.isArray(brew)) { G.toast("No homebrew tables found in that file"); return; }
      let n = 0;
      Object.entries(brew).forEach(([t, list]) => {
        if (!Array.isArray(list)) return;
        const dest = (ST().custom[t] = ST().custom[t] || []);
        list.forEach((r) => { if (!r || !r.name) return; const row = Object.assign({}, r, { id: r.id && !dest.some((x) => x.id === r.id) ? r.id : `${t}:brew-${uid()}` }); dest.push(row); n++; });
      });
      G.toast(`Imported ${n} homebrew entr${n === 1 ? "y" : "ies"}`); R();
    });
    e.target.value = "";
  });
})();
