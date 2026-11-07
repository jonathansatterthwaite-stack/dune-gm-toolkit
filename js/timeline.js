// Timeline tab: the eras, timelines that branch into alternate histories, and dated events that can change
// database entries. The built-in timelines and events come from js/db/timeline.js; yours live in app state.
//
// How branching works: a timeline forks from its parent at a point (year + order within the year). It inherits
// the parent's events up to that point, and from then on only its own events apply. The Compendium can show any
// entry "as of" a year in a chosen timeline, with each changed field marked.
(function () {
  const G = window.GM, DB = window.DUNE_DB, TL = window.DUNE_TIMELINE;
  const { esc, uid } = G;
  G.ensure("timeline", { now: { branch: "novels", year: "" }, view: "novels", branches: [], events: [], form: null, newBranch: { name: "", parent: "", year: "" }, sel: null, center: "", follow: true });
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
  G.timeline = { branches, branchOf, visible, asOf, eventsFor, yearText, eraOf, nowSet, describeChange, now: () => T().now, stateAt: (b, y) => stateAt(b, y) };

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
  // ---------------- the horizontal strip ----------------
  // Every year with an event (and every era edge and fork) is a stop on the axis. The space between two stops
  // grows with the log of the years between them, so 10191 and 10193 sit side by side while Leto II's
  // 3,500 years stay one stretch. The year under the center line drives the Compendium and the panel below.
  const GAP = (g) => 86 + 46 * Math.log10(1 + Math.abs(g));
  let scale = { stops: [], width: 0 };
  function buildScale(years) {
    const ys = Array.from(new Set(years.map(Number).filter((y) => !isNaN(y)))).sort((a, b) => a - b);
    const stops = [];
    let x = 0;
    ys.forEach((y, i) => { if (i) x += GAP(y - ys[i - 1]); stops.push({ y, x }); });
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

  function lorePanel(year) {
    const view = branchOf(T().view) || branchOf("novels"), era = eraOf(year);
    const thisYear = visible(view.id).filter((e) => +e.year === year);
    const state = stateAt(view.id, year);
    const groups = {};
    state.forEach((s) => (groups[s.row.id] = groups[s.row.id] || { row: s.row, items: [] }).items.push(s));
    return `<div class="card-head"><h3>The Known Universe in ${esc(yearText(year))}</h3>
        <button class="btn small ${T().follow ? "primary" : "ghost"}" data-act="tlFollow" aria-pressed="${!!T().follow}" title="When on, the Compendium shows every entry as it stands at the year under the center line">${T().follow ? "Compendium follows this year" : "Compendium shows the books"}</button></div>
      ${era ? `<p><b>${esc(era.name)}</b> <span class="muted small">${esc(yearText(era.from))} – ${esc(yearText(era.to))} · ${esc(era.src)}</span><br/>${esc(era.text)}</p>` : `<p class="muted">Before the eras of play.</p>`}
      ${thisYear.length ? `<h4>This year</h4><ul class="tl-thisyear">${thisYear.map((e) => `<li><button class="db-link" data-act="tlSel" data-id="${esc(e.id)}">${esc(e.name)}</button></li>`).join("")}</ul>` : ""}
      <h4>As things stand</h4>
      ${state.length ? `<dl class="kv tl-state">${Object.values(groups).map((g) => `<dt><a class="db-link" data-act="tlOpen" data-id="${esc(g.row.id)}">${esc(g.row.name)}</a></dt><dd>${g.items.map((s) =>
        `${esc(FIELD_LABEL[s.field] || s.field)}: <b>${s.value === "" ? "none" : esc(s.value)}</b> <span class="muted small">since ${esc(yearText(s.e.year, s.e.circa))}</span>`).join("<br/>")}</dd>`).join("")}</dl>`
        : `<p class="muted small">Nothing has changed from the books yet in this timeline.</p>`}`;
  }

  function eventDetail(e) {
    if (!e) return `<div class="card-head"><h3>Events</h3></div><p class="hint">Scroll the timeline left and right, or drag it. Pick a dot to read that event. ◀ ▶ step from event to event.</p>`;
    const b = branchOf(e._from || e.branch);
    const refs = (e.refs || []).map((r) => { const t = resolve(r); return t ? `<a class="db-link" data-act="tlOpen" data-id="${esc(t.id)}">${esc(t.name)}</a>` : esc(r.slice(r.indexOf(":") + 1)); });
    const changes = (e.changes || []).map((c) => `<li>${describeChange(c).html}</li>`).join("");
    const source = e.src && e.src !== "Homebrew" ? esc(e.src) : e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">Dune Wiki${e.canon ? ` (${esc(e.canon === "Original" ? "Frank Herbert's novels" : e.canon)})` : ""} ↗</a>` : e._custom ? "Your event" : "";
    return `<div class="card-head"><div><div class="muted small">${esc(yearText(e.year, e.circa))}${b && e._inherited ? ` · from ${esc(b.name)}` : ""}</div><h3>${esc(e.name)}</h3></div></div>
      ${e.text ? `<p>${esc(e.text)}</p>` : ""}
      ${refs.length ? `<p class="small">Involves ${refs.join(", ")}</p>` : ""}
      ${changes ? `<h4>Changes from this date</h4><ul class="tl-changes">${changes}</ul>` : ""}
      <p class="pg">${source}</p>
      <div class="c-actions">
        <button class="btn small" data-act="tlFork" data-id="${esc(e.id)}" title="Start an alternate timeline that splits off right after this event">Branch from here</button>
        ${e._custom ? `<button class="btn small ghost" data-act="tlEdit" data-id="${esc(e.id)}">Edit</button><button class="btn small ghost danger" data-act="tlDel" data-id="${esc(e.id)}">Delete</button>` : ""}
      </div>`;
  }

  function strip(view, evs) {
    const kids = branches().filter((b) => b.parent === view.id && b.fork);
    const forkYears = kids.map((k) => k.fork.year).concat(view.fork ? [view.fork.year] : []);
    scale = buildScale(evs.map((e) => e.year).concat(TL.eras.flatMap((e) => [e.from, e.to]), forkYears));
    const byYear = {};
    evs.forEach((e) => (byYear[e.year] = byYear[e.year] || []).push(e));
    const lanes = Math.max(1, ...Object.values(byYear).map((l) => l.length));
    const sel = T().sel;
    const at = (x) => `left:calc(var(--pad) + ${x.toFixed(1)}px)`;
    const s = scale.stops;
    const gaps = s.slice(1).map((b, i) => { const a = s[i], g = b.y - a.y; return g >= 150 ? `<div class="tl-gap" style="${at((a.x + b.x) / 2)}">${g.toLocaleString()} years</div>` : ""; }).join("");
    const ticks = s.map((p) => `<div class="tl-tick" style="${at(p.x)}"><span>${esc(yearText(p.y))}</span></div>`).join("");
    const eras = TL.eras.map((er, i) => { const x0 = xAt(er.from), x1 = xAt(er.to);
      return `<div class="tl-band b${i % 2}" style="${at(x0)};width:${Math.max(0, x1 - x0).toFixed(1)}px" title="${esc(er.name)}: ${esc(er.text)}"><span>${esc(er.name)}</span></div>`; }).join("");
    const forks = kids.map((k) => `<div class="tl-forkline" style="${at(xAt(k.fork.year) + 18)}"><button class="db-link" data-act="tlView" data-b="${esc(k.id)}" title="Switch to ${esc(k.name)}">⑂ ${esc(k.name)}</button></div>`).join("");
    const dots = Object.entries(byYear).map(([y, list]) => list.map((e, i) =>
      `<button class="tl-dot ${e._inherited ? "inherited" : ""} ${e._custom ? "custom" : ""} ${e.id === sel ? "on" : ""}" style="${at(xAt(+y))};--lane:${i}" data-act="tlSel" data-id="${esc(e.id)}" title="${esc(yearText(e.year, e.circa))}: ${esc(e.name)}" aria-label="${esc(yearText(e.year, e.circa))}: ${esc(e.name)}"></button>`).join("")).join("");
    return `<div class="tl-viewport" style="--lanes:${lanes}">
        <div class="tl-center" aria-hidden="true"><span id="tlCenterYear">${esc(yearText(centerYear()))}</span></div>
        <button class="tl-step prev" data-act="tlStep" data-dir="-1" aria-label="Previous event">◀</button>
        <button class="tl-step next" data-act="tlStep" data-dir="1" aria-label="Next event">▶</button>
        <div class="tl-scroller" id="tlScroller" tabindex="0" aria-label="Timeline: scroll or drag left and right; arrow keys step between events">
          <div class="tl-track" style="width:calc(var(--pad) * 2 + ${scale.width.toFixed(0)}px)">
            ${eras}${gaps}<div class="tl-axis"></div>${ticks}${forks}${dots}
          </div>
        </div>
      </div>
      <div class="tl-eras">${TL.eras.map((er) => `<button class="chip" data-act="tlJump" data-y="${er.from}">${esc(er.name)}</button>`).join("")}<button class="chip" data-act="tlJump" data-y="10190">The RPG's setting (10190 AG)</button></div>`;
  }

  G.views.timeline = () => {
    const tl = T(), view = branchOf(tl.view) || branchOf("novels"), evs = visible(view.id);
    const nb = tl.newBranch || (tl.newBranch = { name: "", parent: "", year: "" });
    if (!nb.parent) nb.parent = view.id;
    const selEv = evs.find((e) => e.id === tl.sel) || null;
    return `<div class="tl-wrap">
      <div class="card tl-stripcard">
        <div class="card-head"><div>
            ${editable(view) ? `<input class="c-name" data-bind="timeline.branches.#${esc(view.id)}.name" value="${esc(view.name)}" aria-label="Timeline name"/>` : `<h2>${esc(view.name)}</h2>`}
            <div class="muted small">${view.fork ? `Splits from ${esc((branchOf(view.parent) || {}).name || "?")} after ${esc(yearText(view.fork.year))}; earlier events are shared` : "The root timeline"} · ${evs.length} events</div></div>
          <div class="mini">${G.select("timeline.view", branches().map((b) => ({ v: b.id, l: (b.parent ? "↳ " : "") + b.name })))}<button class="btn primary small" data-act="tlNewEvent">Add event</button></div></div>
        ${strip(view, evs)}
      </div>
      ${form()}
      <div class="tl-below">
        <div class="card tl-detail" id="tlDetail">${eventDetail(selEv)}</div>
        <div class="card tl-lore" id="tlLore">${lorePanel(centerYear())}</div>
      </div>
      <div class="card tl-manage">
        <div class="tl-manage-cols">
          <div><h3>Timelines</h3><ul class="tl-treelist">${tree("", 0)}</ul>
            ${editable(view) ? `<textarea data-bind="timeline.branches.#${esc(view.id)}.text" rows="2" placeholder="What makes ${esc(view.name)} different?">${esc(view.text || "")}</textarea><button class="btn small ghost danger" data-act="tlDelBranch">Delete this timeline</button>` : `<p class="small">${esc(view.text || "")}</p>`}</div>
          <div><h3>New timeline</h3>
            <label class="small">Name <input type="text" data-bind="timeline.newBranch.name" value="${esc(nb.name)}" placeholder="e.g. Our campaign"/></label>
            <label class="small">Splits from ${G.select("timeline.newBranch.parent", branches().map((b) => ({ v: b.id, l: b.name })))}</label>
            <label class="small">after the year <input type="number" data-bind="timeline.newBranch.year" value="${esc(nb.year)}" placeholder="10191"/></label>
            <button class="btn small primary" data-act="tlNewBranch">Create timeline</button>
            <p class="hint small">Or pick an event and use “Branch from here” to split off right after it.</p></div>
        </div>
      </div>
    </div>`;
  };

  // ---------------- scrolling: the center line sets the year ----------------
  let saveTimer = 0, lastYear = null;
  function onCenter(sc, exact) {
    if (!sc.isConnected) return;  // a strip replaced by a re-render resets to 0 and fires one last scroll: ignore it
    const y = exact != null ? exact : yearAtX(sc.scrollLeft);
    if (y === lastYear) return;
    lastYear = y;
    T().center = y;
    const label = document.getElementById("tlCenterYear"); if (label) label.textContent = yearText(y);
    if (T().follow) T().now = { branch: T().view, year: y };
    const lore = document.getElementById("tlLore"); if (lore) lore.innerHTML = lorePanel(y);
    clearTimeout(saveTimer); saveTimer = setTimeout(() => G.save(), 400);
  }
  function centerOn(y, smooth) {
    const sc = document.getElementById("tlScroller"); if (!sc) return;
    const left = xAt(y);
    if (smooth && sc.scrollTo) {
      sc.scrollTo({ left, behavior: "smooth" });
      setTimeout(() => { if (Math.abs(sc.scrollLeft - left) > 2) sc.scrollLeft = left; lastYear = null; onCenter(sc, y); }, 450);  // land on the exact year, even if frames stall
    } else { sc.scrollLeft = left; lastYear = null; onCenter(sc, y); }
  }
  G.afterRender.push((tab) => {
    if (tab !== "timeline") return;
    const sc = document.getElementById("tlScroller"); if (!sc) return;
    sc.style.setProperty("--pad", Math.round(sc.clientWidth / 2) + "px");
    lastYear = null;
    const y0 = centerYear();
    sc.scrollLeft = xAt(y0);
    onCenter(sc, y0);  // keep the saved year exactly, whatever pixel it rounds to
    let restoring = true; setTimeout(() => (restoring = false), 60);
    sc.addEventListener("scroll", () => { if (!restoring) onCenter(sc); }, { passive: true });
    // the mouse wheel scrolls sideways; at either end it hands back to the page
    sc.addEventListener("wheel", (e) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = sc.scrollWidth - sc.clientWidth, dy = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? sc.clientWidth : 1);
      if ((dy < 0 && sc.scrollLeft <= 0) || (dy > 0 && sc.scrollLeft >= max - 1)) return;
      e.preventDefault(); sc.scrollLeft += dy;
    }, { passive: false });
    // drag to pan (but a click on a dot still selects it)
    let drag = null;
    sc.addEventListener("pointerdown", (e) => { if (e.button !== 0 || e.target.closest("button")) return; drag = { x: e.clientX, left: sc.scrollLeft, id: e.pointerId }; sc.setPointerCapture(e.pointerId); sc.classList.add("dragging"); });
    sc.addEventListener("pointermove", (e) => { if (drag && e.pointerId === drag.id) sc.scrollLeft = drag.left - (e.clientX - drag.x); });
    const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; sc.classList.remove("dragging"); } };
    sc.addEventListener("pointerup", end); sc.addEventListener("pointercancel", end);
    sc.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); step(e.key === "ArrowRight" ? 1 : -1); } });
  });
  window.addEventListener("resize", () => { if (G.S.tab === "timeline") G.render(); });

  // select an event without rebuilding the page: mark its dot, show it, glide it to the center
  function select(id, glide) {
    const e = visible(T().view).find((x) => x.id === id) || null;
    T().sel = e ? e.id : null;
    document.querySelectorAll(".tl-dot.on").forEach((d) => d.classList.remove("on"));
    const dot = document.querySelector(`.tl-dot[data-id="${CSS.escape(id)}"]`); if (dot) dot.classList.add("on");
    const box = document.getElementById("tlDetail"); if (box) box.innerHTML = eventDetail(e);
    if (e && glide !== false) centerOn(+e.year, true);
    G.save();
  }
  function step(dir) {
    const evs = visible(T().view); if (!evs.length) return;
    const cur = evs.findIndex((e) => e.id === T().sel), y = centerYear();
    let i;
    if (cur >= 0 && +evs[cur].year === y) i = cur + dir;
    else if (dir > 0) i = evs.findIndex((e) => +e.year > y);
    else { i = -1; evs.forEach((e, k) => { if (+e.year < y) i = k; }); }
    if (i < 0 || i >= evs.length) return;
    select(evs[i].id);
  }

  // switching timelines from the dropdown: drop the selection, and keep the Compendium on the same timeline
  G.onChange.push((path) => { if (path === "timeline.view") { T().sel = null; T().form = null; if (T().follow && nowSet()) T().now.branch = T().view; } });

  // ---------------- actions ----------------
  const A = G.actions;
  const R = () => { G.save(); G.render(); };
  const findEvent = (id) => allEvents().find((e) => e.id === id) || null;
  A.tlView = (el) => { T().view = el.dataset.b; T().form = null; T().sel = null; if (T().follow && nowSet()) T().now.branch = T().view; R(); };
  A.tlSel = (el) => { if (G.S.tab !== "timeline") return; select(el.dataset.id); };
  A.tlStep = (el) => step(+el.dataset.dir);
  A.tlJump = (el) => centerOn(+el.dataset.y, true);
  A.tlFollow = () => { T().follow = !T().follow; T().now = T().follow ? { branch: T().view, year: centerYear() } : { branch: T().view, year: "" }; R(); };
  A.tlOpen = (el) => { G.S.tab = "compendium"; A.dbGo(el); window.scrollTo(0, 0); };
  A.tlClearNow = () => { T().now.year = ""; T().follow = false; R(); };
  A.tlFork = (el) => {
    const e = findEvent(el.dataset.id); if (!e) return;
    const parent = branchOf(T().view);
    const b = { id: "b" + uid(), name: `${parent.name}: after ${e.name}`, parent: parent.id, fork: { year: +e.year, seq: e.seq == null ? 50 : +e.seq }, text: "" };
    T().branches.push(b); T().view = b.id; T().form = null; T().sel = null; T().center = +e.year;
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
  A.tlNewEvent = () => { T().form = { year: centerYear(), seq: 50, circa: false, name: "", text: "", table: "npcs", entry: "", field: "status", value: "", refs: [], changes: [] }; R(); };
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
  A.tlGoEvent = (el) => { const e = findEvent(el.dataset.id); if (!e) return; G.S.tab = "timeline"; T().view = e.branch; T().sel = e.id; T().center = +e.year; if (T().follow) T().now = { branch: e.branch, year: +e.year }; R(); window.scrollTo(0, 0); };
})();
