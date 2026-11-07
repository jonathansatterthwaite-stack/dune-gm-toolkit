// Timeline tab: the eras, timelines that branch into alternate histories, and dated events that can change
// database entries. The built-in timelines and events come from js/db/timeline.js; yours live in app state.
//
// How branching works: a timeline forks from its parent at a point (year + order within the year). It inherits
// the parent's events up to that point, and from then on only its own events apply. The Compendium can show any
// entry "as of" a year in a chosen timeline, with each changed field marked.
(function () {
  const G = window.GM, DB = window.DUNE_DB, TL = window.DUNE_TIMELINE;
  const { esc, uid } = G;
  G.ensure("timeline", { now: { branch: "novels", year: "" }, view: "novels", branches: [], events: [], form: null, newBranch: { name: "", parent: "", year: "" } });
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
  G.timeline = { branches, branchOf, visible, asOf, eventsFor, yearText, eraOf, nowSet, describeChange, now: () => T().now };

  // ---------------- view ----------------
  const editable = (b) => b && b.custom;
  function tree(parent, depth) {
    return branches().filter((b) => (b.parent || "") === parent).map((b) => {
      const on = T().view === b.id, p = branchOf(b.parent);
      const fork = b.fork ? `from ${esc(p ? p.name : "?")} after ${esc(yearText(b.fork.year))}` : "the root timeline";
      return `<li class="tl-node ${on ? "on" : ""}" style="--d:${depth}">
        <button class="tl-branch" data-act="tlView" data-b="${esc(b.id)}"><b>${esc(b.name)}</b><span class="muted small">${fork}</span></button>
        ${tree(b.id, depth + 1)}</li>`;
    }).join("");
  }
  const tableOptions = ["npcs", "houses", "planets", "organizations", "assets", "factions", "traits"];
  function form() {
    const f = T().form; if (!f) return "";
    const t = f.table || "npcs", rows = DB.rows(t);
    const sample = DB.find(t, f.entry) || rows[0] || {};
    const fields = Object.keys(sample).filter((k) => !/^(_|id$|src$|book$|text$|lore$|aliases$|name$)/.test(k)).concat(t === "npcs" ? ["status"] : []).filter((v, i, a) => a.indexOf(v) === i);
    const pending = (f.refs || []).map((r, i) => `<span class="chip">${esc(r.slice(r.indexOf(":") + 1))}<button data-act="tlRmPending" data-kind="refs" data-i="${i}" aria-label="Remove">×</button></span>`).join("") +
      (f.changes || []).map((c, i) => `<span class="chip on">${describeChange(c).html}<button data-act="tlRmPending" data-kind="changes" data-i="${i}" aria-label="Remove">×</button></span>`).join("");
    return `<div class="card tl-form">
      <h3>${f.editId ? "Edit event" : "New event in " + esc((branchOf(T().view) || {}).name || "")}</h3>
      <div class="tl-grid">
        <label>Year <input type="number" data-bind="timeline.form.year" value="${esc(f.year)}" placeholder="10191"/></label>
        <label class="check small"><input type="checkbox" data-bind="timeline.form.circa" data-type="bool" ${f.circa ? "checked" : ""}/> Approximate</label>
        <label>Order in year <input type="number" data-bind="timeline.form.seq" value="${esc(f.seq)}" style="width:5rem"/></label>
        <label class="wide">Title <input type="text" data-bind="timeline.form.name" value="${esc(f.name)}" placeholder="What happened"/></label>
        <label class="wide">Details <textarea data-bind="timeline.form.text" rows="2">${esc(f.text)}</textarea></label>
      </div>
      <p class="hint">Pick an entry, then add it as involved, or change one of its fields from this date on (a character's status, a planet's ruling House…).</p>
      <div class="mini tl-pick">${G.select("timeline.form.table", tableOptions.map((k) => ({ v: k, l: (DB.META[k] || {}).title || k })))}
        <input type="text" list="tlEntries" data-bind="timeline.form.entry" value="${esc(f.entry)}" placeholder="Entry name"/>
        <datalist id="tlEntries">${rows.slice(0, 400).map((r) => `<option value="${esc(r.name)}"></option>`).join("")}</datalist>
        <button class="btn small" data-act="tlAddRef">Involved</button>
        ${G.select("timeline.form.field", fields.map((k) => ({ v: k, l: k })))}
        <input type="text" data-bind="timeline.form.value" value="${esc(f.value)}" placeholder="New value"/>
        <button class="btn small" data-act="tlAddChange">Change</button></div>
      <div class="chips">${pending || `<span class="empty small">Nothing linked yet.</span>`}</div>
      <div class="c-actions"><button class="btn primary" data-act="tlSave">${f.editId ? "Save changes" : "Add event"}</button><button class="btn ghost" data-act="tlCancel">Cancel</button></div>
    </div>`;
  }
  function eventCard(e, viewing) {
    const b = branchOf(e._from || e.branch);
    const refs = (e.refs || []).map((r) => { const t = resolve(r); return t ? `<a class="db-link" data-act="tlOpen" data-id="${esc(t.id)}">${esc(t.name)}</a>` : esc(r.slice(r.indexOf(":") + 1)); });
    const changes = (e.changes || []).map((c) => `<li>${describeChange(c).html}</li>`).join("");
    const source = e.src && e.src !== "Homebrew" ? esc(e.src) : e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">Dune Wiki${e.canon ? ` (${esc(e.canon === "Original" ? "Frank Herbert's novels" : e.canon)})` : ""} ↗</a>` : e._custom ? "Your event" : "";
    return `<li class="tl-ev ${e._inherited ? "inherited" : ""} ${e._custom ? "custom" : ""}" id="tl-${esc(e.id)}">
      <div class="tl-year">${esc(yearText(e.year, e.circa))}</div>
      <div class="tl-body">
        <div class="tl-title"><b>${esc(e.name)}</b>${e._inherited ? `<span class="badge">${esc(b ? b.name : "")}</span>` : ""}</div>
        ${e.text ? `<p>${esc(e.text)}</p>` : ""}
        ${refs.length ? `<p class="small">Involves ${refs.join(", ")}</p>` : ""}
        ${changes ? `<ul class="tl-changes">${changes}</ul>` : ""}
        <div class="tl-actions"><span class="pg">${source}</span>
          <button class="btn small ghost" data-act="tlNowAt" data-y="${esc(e.year)}" title="View the Compendium as of this year in this timeline">As of this year</button>
          <button class="btn small ghost" data-act="tlFork" data-id="${esc(e.id)}" title="Start an alternate timeline that splits off after this event">Branch from here</button>
          ${e._custom ? `<button class="btn small ghost" data-act="tlEdit" data-id="${esc(e.id)}">Edit</button><button class="btn small ghost danger" data-act="tlDel" data-id="${esc(e.id)}">Delete</button>` : ""}
        </div>
      </div></li>`;
  }

  G.views.timeline = () => {
    const tl = T(), view = branchOf(tl.view) || branchOf("novels"), evs = visible(view.id);
    const nb = tl.newBranch || (tl.newBranch = { name: "", parent: "", year: "" });
    if (!nb.parent) nb.parent = view.id;
    // fork markers: timelines that split off this one, placed where they leave it
    const kids = branches().filter((b) => b.parent === view.id && b.fork);
    const items = [];
    let era = null;
    const marks = kids.map((k) => ({ k, at: key(k.fork.year, k.fork.seq) }));
    evs.forEach((e) => {
      const at = key(e.year, e.seq);
      marks.filter((m) => !m.done && m.at < at).forEach((m) => { m.done = true; items.push(forkMark(m.k)); });
      const er = eraOf(+e.year);
      if (er && er !== era) { era = er; items.push(`<li class="tl-era"><b>${esc(er.name)}</b><span class="muted small">${esc(yearText(er.from))} – ${esc(yearText(er.to))} · ${esc(er.text)} <span class="pg">${esc(er.src)}</span></span></li>`); }
      items.push(eventCard(e, view));
    });
    marks.filter((m) => !m.done).forEach((m) => items.push(forkMark(m.k)));
    const nowB = branchOf(tl.now.branch);
    return `<div class="tl-wrap">
      <div class="card tl-now">
        <div class="card-head"><h2>Timeline</h2>
          <div class="mini"><span class="small">Show the Compendium as of</span>
            ${G.select("timeline.now.branch", branches().map((b) => ({ v: b.id, l: b.name })))}
            <input type="number" data-bind="timeline.now.year" data-live="1" value="${esc(tl.now.year)}" placeholder="year" style="width:7rem" aria-label="Year (negative for BG)"/><span class="small">AG</span>
            ${nowSet() ? `<button class="btn small ghost" data-act="tlClearNow">Clear</button>` : ""}</div></div>
        <p class="hint">${nowSet() ? `The Compendium now shows entries as they stand in <b>${esc(yearText(+tl.now.year))}</b> in <b>${esc(nowB ? nowB.name : "")}</b>, with each changed field marked.` : "Pick a timeline and a year (negative for BG) to see entries as they stand then. With no year set, the Compendium shows the books' own values."}</p>
      </div>
      <div class="tl-cols">
        <aside class="card tl-tree"><h3>Timelines</h3><ul>${tree("", 0)}</ul>
          <h4>New timeline</h4>
          <label class="small">Name <input type="text" data-bind="timeline.newBranch.name" value="${esc(nb.name)}" placeholder="e.g. Our campaign"/></label>
          <label class="small">Splits from ${G.select("timeline.newBranch.parent", branches().map((b) => ({ v: b.id, l: b.name })))}</label>
          <label class="small">after the year <input type="number" data-bind="timeline.newBranch.year" value="${esc(nb.year)}" placeholder="10191"/></label>
          <button class="btn small primary" data-act="tlNewBranch">Create timeline</button>
          <p class="hint small">Or use “Branch from here” on any event to split off right after it.</p>
        </aside>
        <section>
          <div class="card">
            <div class="card-head"><div>
              ${editable(view) ? `<input class="c-name" data-bind="timeline.branches.#${esc(view.id)}.name" value="${esc(view.name)}" aria-label="Timeline name"/>` : `<h2>${esc(view.name)}</h2>`}
              <div class="muted small">${view.fork ? `Splits from ${esc((branchOf(view.parent) || {}).name || "?")} after ${esc(yearText(view.fork.year))}; earlier events are shared` : "The root timeline"} · ${evs.length} events</div></div>
              <div class="c-actions"><button class="btn primary" data-act="tlNewEvent">Add event</button>${editable(view) ? `<button class="btn ghost danger" data-act="tlDelBranch">Delete timeline</button>` : ""}</div></div>
            ${editable(view) ? `<textarea data-bind="timeline.branches.#${esc(view.id)}.text" rows="2" placeholder="What makes this timeline different?">${esc(view.text || "")}</textarea>` : `<p>${esc(view.text || "")}</p>`}
          </div>
          ${form()}
          <ul class="tl-list">${items.join("") || `<li class="empty">No events yet.</li>`}</ul>
        </section>
      </div>
    </div>`;
  };
  const forkMark = (k) => `<li class="tl-fork"><span>⑂</span> <button class="db-link" data-act="tlView" data-b="${esc(k.id)}">${esc(k.name)}</button> splits off here</li>`;

  // ---------------- actions ----------------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  const findEvent = (id) => allEvents().find((e) => e.id === id) || null;
  A.tlView = (el) => { T().view = el.dataset.b; T().form = null; R(); };
  A.tlOpen = (el) => { G.S.tab = "compendium"; A.dbGo(el); window.scrollTo(0, 0); };
  A.tlNowAt = (el) => { T().now = { branch: T().view, year: +el.dataset.y }; G.toast(`Compendium set to ${yearText(+el.dataset.y)}`); R(); };
  A.tlClearNow = () => { T().now.year = ""; R(); };
  A.tlFork = (el) => {
    const e = findEvent(el.dataset.id); if (!e) return;
    const parent = branchOf(T().view);
    const b = { id: "b" + uid(), name: `${parent.name}: after ${e.name}`, parent: parent.id, fork: { year: +e.year, seq: e.seq == null ? 50 : +e.seq }, text: "" };
    T().branches.push(b); T().view = b.id; T().form = null;
    G.toast("New timeline: rename it and add what happens differently"); R();
  };
  A.tlNewBranch = () => {
    const nb = T().newBranch || {}; const parent = branchOf(nb.parent || T().view);
    if (!parent) return;
    if (!String(nb.name || "").trim()) { G.toast("Give the timeline a name"); return; }
    const year = String(nb.year == null ? "" : nb.year).trim() === "" || isNaN(+nb.year) ? null : +nb.year;
    if (year == null) { G.toast("Say after which year it splits off"); return; }
    const b = { id: "b" + uid(), name: nb.name.trim(), parent: parent.id, fork: { year, seq: 999 }, text: "" };
    T().branches.push(b); T().view = b.id; T().newBranch = { name: "", parent: "", year: "" }; R();
  };
  A.tlDelBranch = () => {
    const b = branchOf(T().view); if (!editable(b)) return;
    if (branches().some((x) => x.parent === b.id)) { G.toast("Delete the timelines that split from this one first"); return; }
    if (!confirm(`Delete the timeline "${b.name}" and its ${T().events.filter((e) => e.branch === b.id).length} events?`)) return;
    T().events = T().events.filter((e) => e.branch !== b.id);
    T().branches = T().branches.filter((x) => x.id !== b.id);
    if (T().now.branch === b.id) T().now = { branch: b.parent, year: T().now.year };
    T().view = b.parent; R();
  };
  A.tlNewEvent = () => { T().form = { year: nowSet() ? +T().now.year : "", seq: 50, circa: false, name: "", text: "", table: "npcs", entry: "", field: "status", value: "", refs: [], changes: [] }; R(); };
  A.tlCancel = () => { T().form = null; R(); };
  const pickRef = () => { const f = T().form; const t = DB.find(f.table, f.entry); if (!t) { G.toast(`No ${((DB.META[f.table] || {}).title || f.table).toLowerCase()} entry called “${f.entry}”`); return null; } return `${f.table}:${t.name}`; };
  A.tlAddRef = () => { const ref = pickRef(); if (!ref) return; const f = T().form; if (!f.refs.includes(ref)) f.refs.push(ref); f.entry = ""; R(); };
  A.tlAddChange = () => { const ref = pickRef(); if (!ref) return; const f = T().form; if (!f.field) { G.toast("Pick a field to change"); return; } f.changes.push({ ref, field: f.field, value: String(f.value || "") }); f.value = ""; R(); };
  A.tlRmPending = (el) => { T().form[el.dataset.kind].splice(+el.dataset.i, 1); R(); };
  A.tlSave = () => {
    const f = T().form; if (!f) return;
    if (!String(f.name || "").trim()) { G.toast("Give the event a title"); return; }
    if (String(f.year == null ? "" : f.year).trim() === "" || isNaN(+f.year)) { G.toast("Give the event a year"); return; }
    const data = { name: f.name.trim(), year: +f.year, seq: String(f.seq == null ? "" : f.seq).trim() === "" || isNaN(+f.seq) ? 50 : +f.seq, circa: !!f.circa, text: f.text || "", refs: f.refs.slice(), changes: f.changes.slice() };
    if (f.editId) Object.assign(T().events.find((e) => e.id === f.editId), data);
    else T().events.push(Object.assign({ id: "events:mine-" + uid(), branch: T().view }, data));
    T().form = null; R();
  };
  A.tlEdit = (el) => { const e = T().events.find((x) => x.id === el.dataset.id); if (!e) return; T().form = Object.assign({ table: "npcs", entry: "", field: "status", value: "" }, JSON.parse(JSON.stringify(e)), { editId: e.id }); R(); window.scrollTo(0, 0); };
  A.tlDel = (el) => { const e = T().events.find((x) => x.id === el.dataset.id); if (!e || !confirm(`Delete the event "${e.name}"?`)) return; T().events = T().events.filter((x) => x !== e); R(); };
  // from the Compendium: jump to an event in its timeline
  A.tlGoEvent = (el) => { const e = findEvent(el.dataset.id); if (!e) return; G.S.tab = "timeline"; T().view = e.branch; R(); setTimeout(() => { const n = document.getElementById("tl-" + e.id); if (n) n.scrollIntoView({ block: "center" }); }, 30); };
})();
