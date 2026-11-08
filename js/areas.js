// The toolkit's Blender-style layout. The window below the top bar is divided into areas; each area shows one
// editor (Dice, Compendium, Galaxy map…), picked from the menu in its header. Areas can be split, joined, swapped
// and resized by dragging the borders between them, and one can be maximized (Ctrl+Space). Workspaces, the tabs
// in the top bar, each keep their own arrangement (Session, Prep, Lore, Characters, and any you add).
//
// The arrangement is a tree saved in S.layout: a leaf { id, ed } is an area; a split { id, dir, r, a, b } puts
// a beside b (dir "row") or above it (dir "col"), with a taking the share r. An editor appears at most once per
// workspace: picking one that's already showing swaps the two areas.
//
// Other code asks for an editor by setting S.tab (as it did when there were tabs): the next draw brings that
// editor into view, in this workspace if it has it, else in a workspace that does, else in the largest area.
(function () {
  const G = window.GM, STORE = window.DUNE_STORE;
  if (STORE.VIEWER) return;
  const { esc, uid } = G;
  const DOMAINS = window.DUNE_DOMAINS;
  const NAME = {}; Object.values(DOMAINS).forEach((d) => d.editors.forEach(([id, label]) => (NAME[id] = label)));
  const EDITORS = Object.keys(NAME);
  const MIN = 140;  // smallest area, in pixels

  // ---------------- the workspaces ----------------
  const leaf = (ed) => ({ id: uid(), ed });
  const split = (dir, r, a, b) => ({ id: uid(), dir, r, a, b });
  const PRESETS = {
    session: () => ({ name: "Session", root: split("row", 0.34, split("col", 0.6, leaf("roller"), leaf("scene")),
      split("row", 0.62, split("col", 0.55, leaf("conflict"), leaf("npcs")), split("col", 0.5, leaf("cast"), leaf("reference")))) }),
    prep: () => ({ name: "Prep", root: split("row", 0.42, leaf("compendium"), split("row", 0.5, split("col", 0.55, leaf("npcs"), leaf("hooks")), split("col", 0.5, leaf("worlds"), leaf("house")))) }),
    lore: () => ({ name: "Lore", root: split("row", 0.6, leaf("starmap"), split("col", 0.42, leaf("timeline"), leaf("compendium"))) }),
    characters: () => ({ name: "Characters", root: split("row", 0.62, leaf("characters"), leaf("compendium")) }),
  };
  const fresh = (key) => Object.assign({ id: key, preset: key, max: null }, PRESETS[key]());
  const defaults = () => ({ ws: "session", list: Object.keys(PRESETS).map(fresh) });
  const L = () => G.S.layout;
  G.ensure("layout", defaults());
  const cur = () => L().list.find((w) => w.id === L().ws) || L().list[0];

  const leaves = (n) => (!n ? [] : n.ed ? [n] : leaves(n.a).concat(leaves(n.b)));
  const nodes = (n) => (!n ? [] : n.ed ? [n] : [n].concat(nodes(n.a), nodes(n.b)));
  const find = (ws, id) => nodes(ws.root).find((n) => n.id === id) || null;
  const parentOf = (ws, id) => nodes(ws.root).find((n) => !n.ed && (n.a.id === id || n.b.id === id)) || null;
  function replace(ws, id, node) {
    if (ws.root.id === id) { ws.root = node; return; }
    const p = parentOf(ws, id); if (!p) return;
    if (p.a.id === id) p.a = node; else p.b = node;
  }
  const shown = (ws) => { const m = ws.max && find(ws, ws.max); return m && m.ed ? [m] : leaves(ws.root); };
  const unused = (ws) => EDITORS.find((e) => !leaves(ws.root).some((l) => l.ed === e)) || "reference";

  // repair saved layouts: known editors only, each once per workspace, ratios in range
  function tidy() {
    const lay = L();
    if (!Array.isArray(lay.list) || !lay.list.length) Object.assign(lay, defaults());
    lay.list.forEach((ws) => {
      if (!ws.root) ws.root = leaf("compendium");
      const seen = new Set();
      leaves(ws.root).forEach((l) => { if (!NAME[l.ed] || seen.has(l.ed)) l.ed = EDITORS.find((e) => !seen.has(e)) || "reference"; seen.add(l.ed); });
      nodes(ws.root).forEach((n) => { if (!n.ed) n.r = Math.min(0.9, Math.max(0.1, +n.r || 0.5)); });
      if (ws.max && !find(ws, ws.max)) ws.max = null;
    });
    if (!lay.list.some((w) => w.id === lay.ws)) lay.ws = lay.list[0].id;
  }
  tidy();

  // ---------------- bringing an editor into view ----------------
  let lastArea = null;  // the area last clicked or pointed at: layout commands act on it, and "show" avoids it
  const areaEl = (id) => main.querySelector(`.area[data-area="${CSS.escape(id)}"]`);
  function flash(id) { requestAnimationFrame(() => { const el = areaEl(id); if (!el) return; el.classList.remove("area-flash"); void el.offsetWidth; el.classList.add("area-flash"); }); }
  function showEditor(ed) {
    if (!NAME[ed]) return;
    const ws = cur();
    let l = shown(ws).find((x) => x.ed === ed);
    if (l) { flash(l.id); return; }
    l = leaves(ws.root).find((x) => x.ed === ed);
    if (l) { ws.max = null; flash(l.id); return; }                                   // hidden behind a maximized area
    const other = L().list.find((w) => leaves(w.root).some((x) => x.ed === ed));
    if (other) { L().ws = other.id; other.max = null; flash(leaves(other.root).find((x) => x.ed === ed).id); return; }
    // nowhere: take over the largest area that isn't the one being worked in
    const sizes = shown(ws).map((x) => { const el = areaEl(x.id), r = el ? el.getBoundingClientRect() : { width: 0, height: 0 }; return [x, r.width * r.height]; })
      .sort((p, q) => q[1] - p[1]);
    const pickL = (sizes.find(([x]) => x.id !== lastArea) || sizes[0] || [])[0];
    if (pickL) { pickL.ed = ed; flash(pickL.id); }
  }
  const visible = (ed) => shown(cur()).some((l) => l.ed === ed);

  // ---------------- drawing ----------------
  const main = document.getElementById("main");
  const cache = {};  // leaf id → { el, head, body, ed, drawn } (kept across draws, so scroll and the map survive)
  let builtKey = "";
  const shapeKey = (ws) => ws.id + "|" + (ws.max || "") + "|" + JSON.stringify(ws.root, (k, v) => (k === "r" ? undefined : v));
  const groups = Object.entries(DOMAINS);
  function editorMenu(ws, l) {
    const onShow = new Set(leaves(ws.root).filter((x) => x.id !== l.id).map((x) => x.ed));
    return `<select class="area-ed" data-area="${esc(l.id)}" aria-label="Editor in this area" title="Change what this area shows">${groups.map(([, d]) =>
      `<optgroup label="${esc(d.title)}">${d.editors.map(([id, label]) => `<option value="${id}" ${id === l.ed ? "selected" : ""}>${esc(label)}${onShow.has(id) ? " ⇄" : ""}</option>`).join("")}</optgroup>`).join("")}</select>`;
  }
  function areaFor(ws, l) {
    let c = cache[l.id];
    if (!c) {
      const el = document.createElement("section"); el.className = "area"; el.dataset.area = l.id;
      const head = document.createElement("header"); head.className = "area-head";
      const body = document.createElement("div"); body.className = "area-body";
      el.append(head, body);
      new ResizeObserver(() => body.style.setProperty("--area-h", body.clientHeight + "px")).observe(body);
      c = cache[l.id] = { el, head, body, ed: null, drawn: null };
    }
    c.el.dataset.ed = l.ed;
    c.head.innerHTML = `${editorMenu(ws, l)}<span class="area-title">${esc(NAME[l.ed])}</span>
      <button class="area-btn" data-act="areaMax" data-area="${esc(l.id)}" title="${ws.max === l.id ? "Back to the workspace" : "Maximize this area"} (Ctrl+Space)">${ws.max === l.id ? "⤡" : "⤢"}</button>
      <button class="area-btn" data-act="areaMenu" data-area="${esc(l.id)}" title="Split, join or swap this area" aria-haspopup="menu">⋮</button>`;
    c.el.classList.toggle("maxed", ws.max === l.id);
    return c.el;
  }
  function build(ws, n) {
    if (n.ed) return areaFor(ws, n);
    const box = document.createElement("div"); box.className = "split split-" + n.dir; box.dataset.split = n.id;
    const a = build(ws, n.a), b = build(ws, n.b);
    const handle = document.createElement("div"); handle.className = "split-handle"; handle.dataset.split = n.id;
    handle.title = "Drag to resize · right-click to join or swap";
    box.append(a, handle, b);
    return box;
  }
  function sizes(ws) {
    nodes(ws.root).forEach((n) => {
      if (n.ed) return;
      const box = main.querySelector(`.split[data-split="${CSS.escape(n.id)}"]`); if (!box) return;
      box.children[0].style.flex = `${n.r} 1 0`; box.children[2].style.flex = `${1 - n.r} 1 0`;
    });
  }
  function render(views) {
    if (G.S.tab) { const t = G.S.tab; G.S.tab = ""; showEditor(t); }
    const ws = cur(), list = shown(ws);
    const key = shapeKey(ws);
    if (key !== builtKey) {
      main.replaceChildren(ws.max ? areaFor(ws, list[0]) : build(ws, ws.root));
      builtKey = key;
    } else list.forEach((l) => areaFor(ws, l));
    sizes(ws);
    // each area's editor: redrawn in place, keeping where it was scrolled to (a fresh editor starts at the top)
    list.forEach((l) => {
      const c = cache[l.id], view = views[l.ed];
      if (view && view.keep && c.drawn === l.ed) return;  // the galaxy map draws itself
      const same = c.drawn === l.ed, top = c.body.scrollTop, left = c.body.scrollLeft;
      // one editor failing to draw shouldn't take the others with it
      let html;
      try { html = view ? view() : `<div class="empty">Nothing to show.</div>`; }
      catch (err) { console.error(err); html = `<div class="card"><h3>${esc(NAME[l.ed])} couldn't be drawn</h3><p class="small muted">${esc(err && err.message)}</p></div>`; }
      c.body.innerHTML = html;
      if (same) { c.body.scrollTop = top; c.body.scrollLeft = left; }
      c.drawn = l.ed;
    });
    const safely = (f, ...args) => { try { f(...args); } catch (err) { console.error(err); } };
    list.forEach((l) => { const c = cache[l.id]; c.body.style.setProperty("--area-h", c.body.clientHeight + "px"); G.afterRender.forEach((f) => safely(f, l.ed, c.body)); });
    G.afterLayout.forEach((f) => safely(f, list.map((l) => l.ed)));
    tabs();
  }

  // ---------------- the workspace tabs ----------------
  let renaming = null;
  function tabs() {
    const nav = document.getElementById("workspaces"); if (!nav) return;
    nav.innerHTML = L().list.map((w) => w.id === renaming
      ? `<input class="ws-rename" id="wsRename" value="${esc(w.name)}" aria-label="Workspace name"/>`
      : `<button class="ws-tab ${w.id === L().ws ? "on" : ""}" data-act="wsGo" data-ws="${esc(w.id)}" title="Double-click to rename · right-click for more">${esc(w.name)}</button>`).join("")
      + `<button class="ws-tab ws-add" data-act="wsNew" title="New workspace (a copy of this one)" aria-label="New workspace">+</button>`;
    const inp = document.getElementById("wsRename");
    if (inp) {
      inp.focus(); inp.select();
      const done = (keep) => { const w = L().list.find((x) => x.id === renaming); if (w && keep && inp.value.trim()) w.name = inp.value.trim(); renaming = null; G.save(); tabs(); };
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") done(true); if (e.key === "Escape") done(false); });
      inp.addEventListener("blur", () => done(true));
    }
  }

  // ---------------- commands ----------------
  const R = () => { G.save(); G.render(); };
  const clone = (n) => (n.ed ? leaf(n.ed) : split(n.dir, n.r, clone(n.a), clone(n.b)));
  const C = {
    split(id, dir) { const ws = cur(), l = find(ws, id); if (!l || !l.ed) return; ws.max = null; replace(ws, id, split(dir, 0.5, l, leaf(unused(ws)))); },
    // remove this area; its neighbor takes the space
    close(id) { const ws = cur(), p = parentOf(ws, id); if (!p) { G.toast("The last area in a workspace stays"); return; } ws.max = null; replace(ws, p.id, p.a.id === id ? p.b : p.a); delete cache[id]; },
    // this area takes over its neighbor's space (the neighbor's areas close)
    join(id) {
      const ws = cur(), p = parentOf(ws, id); if (!p) return;
      const other = p.a.id === id ? p.b : p.a, gone = leaves(other);
      ws.max = null; replace(ws, p.id, find(ws, id)); gone.forEach((g) => delete cache[g.id]);
    },
    swap(id) {
      const ws = cur(), p = parentOf(ws, id); if (!p) return;
      [p.a, p.b] = [p.b, p.a];
    },
    flip(splitId) { const n = find(cur(), splitId); if (n && !n.ed) n.dir = n.dir === "row" ? "col" : "row"; },
    keep(splitId, side) { const ws = cur(), n = find(ws, splitId); if (!n || n.ed) return; const gone = leaves(side === "a" ? n.b : n.a); ws.max = null; replace(ws, n.id, side === "a" ? n.a : n.b); gone.forEach((g) => delete cache[g.id]); },
    max(id) { const ws = cur(); ws.max = ws.max === id ? null : id; },
    setEditor(id, ed) {
      const ws = cur(), l = find(ws, id); if (!l || !NAME[ed] || l.ed === ed) return;
      const other = leaves(ws.root).find((x) => x.ed === ed);
      if (other) { other.ed = l.ed; if (cache[other.id]) cache[other.id].drawn = null; }  // already showing elsewhere: swap
      l.ed = ed;
    },
    wsNew() { const ws = cur(), n = { id: "w" + uid(), name: "Workspace " + (L().list.length + 1), max: null, root: clone(ws.root) }; L().list.push(n); L().ws = n.id; renaming = n.id; },
    wsDelete(id) { if (L().list.length < 2) { G.toast("Keep at least one workspace"); return; } L().list = L().list.filter((w) => w.id !== id); if (L().ws === id) L().ws = L().list[0].id; },
    wsReset(id) { const w = L().list.find((x) => x.id === id); if (!w) return; if (w.preset && PRESETS[w.preset]) Object.assign(w, PRESETS[w.preset](), { max: null }); else G.toast("Only the built-in workspaces have a layout to reset to"); },
    resetAll() { Object.assign(L(), defaults()); Object.keys(cache).forEach((k) => delete cache[k]); },
  };
  const A = G.actions;
  A.areaMax = (el) => { C.max(el.dataset.area); R(); };
  A.areaMenu = (el) => {
    const id = el.dataset.area, ws = cur(), p = parentOf(ws, id);
    menu(el, [
      ["Split left and right", () => C.split(id, "row")],
      ["Split top and bottom", () => C.split(id, "col")],
      null,
      p && ["Swap with neighbor", () => C.swap(id)],
      p && ["Take over neighbor's space", () => C.join(id)],
      p && ["Close this area", () => C.close(id)],
      null,
      [ws.max === id ? "Back to the workspace" : "Maximize", () => C.max(id), "Ctrl+Space"],
    ]);
  };
  A.wsGo = (el) => { if (L().ws === el.dataset.ws) return; L().ws = el.dataset.ws; R(); };
  A.wsNew = () => { C.wsNew(); R(); };

  // a small menu under a button (or at the pointer): items [label, fn, hint] and null for a divider
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function menu(anchor, items, at) {
    closeMenu();
    menuEl = document.createElement("div"); menuEl.className = "area-menu"; menuEl.setAttribute("role", "menu");
    const live = items.filter((x, i) => x !== false && x !== undefined && !(x === null && (i === 0 || items[i - 1] === null)));
    live.forEach((it) => {
      if (!it) { const hr = document.createElement("hr"); menuEl.appendChild(hr); return; }
      const b = document.createElement("button"); b.setAttribute("role", "menuitem");
      b.innerHTML = `<span>${esc(it[0])}</span>${it[2] ? `<kbd>${esc(it[2])}</kbd>` : ""}`;
      b.addEventListener("click", (e) => { e.stopPropagation(); closeMenu(); it[1](); R(); });
      menuEl.appendChild(b);
    });
    document.body.appendChild(menuEl);
    const r = at || anchor.getBoundingClientRect(), w = menuEl.offsetWidth, h = menuEl.offsetHeight;
    menuEl.style.left = Math.max(4, Math.min(innerWidth - w - 4, (at ? r.x : r.right - w))) + "px";
    menuEl.style.top = Math.max(4, Math.min(innerHeight - h - 4, at ? r.y : r.bottom + 2)) + "px";
    const first = menuEl.querySelector("button"); if (first) first.focus();
  }
  document.addEventListener("pointerdown", (e) => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }, true);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuEl) { e.stopPropagation(); closeMenu(); } }, true);

  // the editor picker in each area's header
  main.addEventListener("change", (e) => {
    const sel = e.target.closest(".area-ed"); if (!sel) return;
    e.stopPropagation();
    C.setEditor(sel.dataset.area, sel.value); R();
  }, true);
  // where the pointer is: Ctrl+Space and the menu's commands act on that area
  main.addEventListener("pointerover", (e) => { const a = e.target.closest(".area"); if (a) lastArea = a.dataset.area; });
  main.addEventListener("pointerdown", (e) => { const a = e.target.closest(".area"); if (a) lastArea = a.dataset.area; });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && (e.ctrlKey || e.metaKey) && !e.altKey) {
      const id = lastArea && find(cur(), lastArea) ? lastArea : shown(cur())[0].id;
      e.preventDefault(); C.max(id); R();
    }
  });

  // dragging a border; right-click on it to join or swap
  main.addEventListener("pointerdown", (e) => {
    const h = e.target.closest(".split-handle"); if (!h || e.button !== 0) return;
    const n = find(cur(), h.dataset.split); if (!n) return;
    const box = h.parentElement, row = n.dir === "row";
    e.preventDefault(); h.setPointerCapture(e.pointerId); h.classList.add("drag"); document.body.classList.add(row ? "resizing-row" : "resizing-col");
    const move = (ev) => {
      const r = box.getBoundingClientRect(), total = row ? r.width : r.height, pos = row ? ev.clientX - r.left : ev.clientY - r.top;
      const lo = Math.max(0.05, MIN / total), hi = Math.min(0.95, 1 - MIN / total);
      n.r = Math.min(hi, Math.max(lo, pos / total));
      box.children[0].style.flex = `${n.r} 1 0`; box.children[2].style.flex = `${1 - n.r} 1 0`;
    };
    const up = () => { h.removeEventListener("pointermove", move); h.removeEventListener("pointerup", up); h.classList.remove("drag"); document.body.classList.remove("resizing-row", "resizing-col"); R(); };
    h.addEventListener("pointermove", move); h.addEventListener("pointerup", up);
  });
  main.addEventListener("dblclick", (e) => { const h = e.target.closest(".split-handle"); if (!h) return; const n = find(cur(), h.dataset.split); if (n) { n.r = 0.5; R(); } });
  main.addEventListener("contextmenu", (e) => {
    const h = e.target.closest(".split-handle"); if (!h) return;
    e.preventDefault();
    const n = find(cur(), h.dataset.split); if (!n) return;
    const [first, second] = n.dir === "row" ? ["left", "right"] : ["top", "bottom"];
    menu(h, [
      [`Join: keep the ${first} side`, () => C.keep(n.id, "a")],
      [`Join: keep the ${second} side`, () => C.keep(n.id, "b")],
      null,
      ["Swap the two sides", () => { [n.a, n.b] = [n.b, n.a]; }],
      [n.dir === "row" ? "Stack them top and bottom" : "Put them side by side", () => C.flip(n.id)],
      ["Even split", () => { n.r = 0.5; }],
    ], { x: e.clientX, y: e.clientY });
  });
  // workspace tabs: double-click to rename, right-click for more
  const wsBar = () => document.getElementById("workspaces");
  document.addEventListener("dblclick", (e) => { const t = e.target.closest(".ws-tab[data-ws]"); if (t && wsBar().contains(t)) { renaming = t.dataset.ws; tabs(); } });
  document.addEventListener("contextmenu", (e) => {
    const t = e.target.closest(".ws-tab[data-ws]"); if (!t) return;
    e.preventDefault();
    const id = t.dataset.ws, w = L().list.find((x) => x.id === id);
    menu(t, [
      ["Rename", () => { renaming = id; }],
      ["Duplicate", () => { L().ws = id; C.wsNew(); }],
      w && w.preset ? ["Reset to its starting layout", () => C.wsReset(id)] : null,
      null,
      ["Delete", () => C.wsDelete(id)],
    ], { x: e.clientX, y: e.clientY });
  });
  // the desktop app's Layout menu
  if (window.duneDesktop && window.duneDesktop.onLayoutCommand) window.duneDesktop.onLayoutCommand((cmd) => {
    const id = lastArea && find(cur(), lastArea) ? lastArea : shown(cur())[0].id;
    ({ splitRight: () => C.split(id, "row"), splitDown: () => C.split(id, "col"), join: () => C.join(id), maximize: () => C.max(id),
      newWorkspace: () => C.wsNew(), resetWorkspace: () => C.wsReset(L().ws), resetAll: () => C.resetAll() }[cmd] || (() => {}))();
    R();
  });

  G.layout = { render, visible, showEditor, names: NAME, commands: C, current: cur };
})();
