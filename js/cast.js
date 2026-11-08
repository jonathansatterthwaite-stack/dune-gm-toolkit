// The player display: a second window for the players (projector, TV, second monitor) that the GM Tools open
// and control. What it shows is the GM Tools' "cast" key:
//   bg       the background: "none" (a plain Imperial screen), "starmap" (the galaxy map, following what the GM
//            picks in Lore's map) or "timeline" (the campaign's timeline, never past the players' year)
//   cards    up to four cards over it: NPCs, characters, Compendium entries, art, handouts
//   overlays Momentum, Threat, the scene's traits, the conflict's zones, and dice results as they're rolled
// Any tool can ask for something to be shown (G.cast.*): the request goes to the GM Tools like any other edit of
// their data, starting them in the background first if they aren't running.
//
// The display itself is display.html (DUNE_TOOL "display"): a viewer that reads all three tools' data live and
// saves nothing. In the desktop apps it is a window of the GM Tools (desktop/main.js); in a browser, a popup.
(function () {
  const G = window.GM;
  const { esc, uid } = G;
  const desk = window.duneDesktop || null;
  const MAX_CARDS = 4;
  const DEF = () => ({ open: false, screen: "", bg: "none", blank: false, momentum: true, threat: false, scene: false, conflict: false, tracks: true,
    dice: true, npcRolls: false, cards: [], handout: { title: "", text: "" } });
  const state = () => Object.assign(DEF(), G.S.cast || {});

  // ---------------- from any tool: ask the GM Tools to show something ----------------
  const ask = (op, p, label) => G.remote("gm", "cast", Object.assign({ op }, p), { wake: true, label });
  const shown = (id) => { const st = state(); return st.open && st.cards.some((c) => c.id === id); };
  G.cast = {
    state, shown,
    bg: (value) => ask("bg", { value }, value === "none" ? "Taken off the player display" : `Showing the ${value === "starmap" ? "galaxy map" : "timeline"} to the players`),
    card: (card) => ask("card", { card }, `Showing “${card.title}” to the players`),
    uncard: (id) => ask("uncard", { id }, "Taken off the player display"),
    toggle(card) { if (shown(card.id)) this.uncard(card.id); else this.card(card); },
    // the "Show to players" button every tool puts on what can be shown; its action builds the card
    button: (id, act, attrs, small) => { const on = shown(id);
      return `<button class="btn${small ? " small" : ""}${on ? " primary" : ""}" data-act="${act}" ${attrs || ""} title="${on ? "Take it off the player display" : "Show this on the player display"}">${on ? "On the player display ✓" : "Show to players"}</button>`; },
    // cards for the toolkit's own records
    fromChar(ch) {
      const C = window.DUNE_CH, art = ch.faction && window.DUNE_ART && window.DUNE_ART.factions && window.DUNE_ART.factions[ch.faction];
      return { id: "char:" + ch.id, kind: "character", title: ch.name || "Unnamed", sub: [C && C.KINDS[ch.kind] ? C.KINDS[ch.kind].name : "", ch.archetype, ch.faction].filter(Boolean).join(" · "),
        text: ch.concept || "", chips: Object.values(ch.traits || {}).filter(Boolean), img: art ? art.src : "" };
    },
    // an NPC from the GM's roster: name, role and traits only. Stats and notes stay with the GM
    fromNpc(n) {
      const row = n.dbId && G.dbRow ? G.dbRow(n.dbId) : null, art = row && G.artFor ? G.artFor(row)[0] : null;
      return { id: "npc:" + n.id, kind: "npc", title: n.name, sub: n.role || "", chips: (n.traits || []).slice(0, 4), img: art ? art.file : "" };
    },
  };

  // ---------------- the GM Tools: the state, the requests, and the window ----------------
  if (G.tool === "gm") {
    G.ensure("cast", DEF());
    G.S.cast.open = false;  // the display doesn't reopen by itself when the GM Tools start
    G.inbox.cast = (p) => {
      const c = G.S.cast;
      if (p.op === "card" && p.card) {
        const i = c.cards.findIndex((x) => x.id === p.card.id);
        if (i >= 0) c.cards[i] = p.card; else c.cards.push(p.card);
        while (c.cards.length > MAX_CARDS) c.cards.shift();
        c.open = true; c.blank = false;
      }
      if (p.op === "uncard") c.cards = c.cards.filter((x) => x.id !== p.id);
      if (p.op === "bg") { c.bg = p.value; if (p.value !== "none") { c.open = true; c.blank = false; } }
      if (p.op === "clear") c.cards = [];
    };
    // the window follows the state: open/closed, and which screen
    let applied = { open: false, screen: null }, popup = null;
    const screens = () => (desk && desk.screens ? desk.screens() : []);
    const pickScreen = (list) => { const c = G.S.cast; return list.some((s) => s.id === c.screen) ? c.screen : ((list.find((s) => !s.here) || list[0] || {}).id || ""); };
    function apply() {
      const c = G.S.cast;
      if (c.open === applied.open && (!c.open || c.screen === applied.screen)) return;
      applied = { open: c.open, screen: c.screen };
      if (desk && desk.display) desk.display(c.open, c.screen);
      else if (c.open) { if (!popup || popup.closed) popup = window.open("display.html", "dune-display", "popup,width=1280,height=720"); }
      else if (popup && !popup.closed) popup.close();
    }
    G.afterRender.push(apply);
    const closed = () => { if (!G.S.cast.open) return; G.S.cast.open = false; applied.open = false; G.save(); G.render(); };
    if (desk && desk.onDisplayClosed) desk.onDisplayClosed(closed);
    else setInterval(() => { if (applied.open && popup && popup.closed) closed(); }, 1000);

    const check = (path, label, hint) => `<label class="check"><input type="checkbox" data-bind="cast.${path}" data-type="bool" ${G.S.cast[path] ? "checked" : ""}/> <span>${label}${hint ? `<br/><span class="hint">${hint}</span>` : ""}</span></label>`;
    const BG_HINT = {
      none: "A plain Imperial screen. Cards and overlays sit on it.",
      starmap: "The galaxy map, full screen. It follows Lore's map: pick a system or world there, or open a solar system, and the display flies to it.",
      timeline: "The campaign's timeline, full screen, following the event or year you pick in Lore's timeline but never past the players' year.",
    };
    G.views.cast = () => {
      const c = G.S.cast, list = screens(), cur = pickScreen(list);
      const cp = G.timeline ? G.timeline.campaign() : null, cpB = cp && G.timeline.branchOf(cp.branch);
      const npcs = G.S.npcs || [], chars = ((G.S.chars && G.S.chars.list) || []).filter((ch) => !String(ch.kind).startsWith("npc"));
      const cardRow = (k) => `<div class="cast-cardrow">${k.img ? `<img src="${esc(k.img)}" alt=""/>` : `<span class="cast-noimg">◈</span>`}<div><b>${esc(k.title)}</b><span class="muted small">${esc(k.sub || k.kind || "")}</span></div><button class="btn small ghost" data-act="castUncard" data-id="${esc(k.id)}" aria-label="Take off the display">×</button></div>`;
      return `<div class="grid-2 cast-ctl">
      <section>
        <div class="card">
          <div class="card-head"><h2>Player display</h2>
            <div class="mini">${c.open ? `<span class="badge pass">On screen</span>` : `<span class="badge">Closed</span>`}
              <button class="btn ${c.open ? "" : "primary"}" data-act="castOpen">${c.open ? "Close the display" : "Open the display"}</button></div></div>
          <p class="small">A second window for the players, for a projector, TV or second monitor. You choose what's on it from here, and with <b>Show to players</b> in Lore, the Character maker and on NPC cards.</p>
          ${list.length ? `<h3>Screen</h3><div class="cast-screens">${list.map((sc, i) => `<button class="cast-screen ${sc.id === cur ? "on" : ""}" data-act="castScreen" data-id="${esc(sc.id)}"><b>${esc(sc.label || "Display " + (i + 1))}</b><span>${sc.w} × ${sc.h}${sc.primary ? " · main screen" : ""}${sc.here ? " · this window" : ""}</span></button>`).join("")}</div>
            ${list.length === 1 ? `<p class="hint">Only one screen is connected, so the display opens as a window you can move and resize. Connect the projector or second monitor and pick it here to fill it.</p>` : list.find((s) => s.id === cur && s.here) ? `<p class="hint">That's the screen this window is on, so the display opens as a window rather than full screen.</p>` : ""}`
            : `<p class="hint">In a browser the display opens in its own window: drag it to the second screen and make it full screen (F11).</p>`}
          ${check("blank", "Black out the display", "hides everything until you clear it")}
        </div>
        <div class="card">
          <h3>Background</h3>
          ${G.seg("cast.bg", [{ v: "none", l: "Plain" }, { v: "starmap", l: "Galaxy map" }, { v: "timeline", l: "Timeline" }])}
          <p class="small" style="margin-top:0.5rem">${BG_HINT[c.bg] || ""}</p>
          ${c.bg === "timeline" && cp ? `<p class="small">Players' year: <b>${esc(G.timeline.yearText(cp.year))}</b> in ${esc(cpB ? cpB.name : cp.branch)}${cp.set ? "" : " (the RPG's setting; set your own in Lore's timeline)"}.</p>` : ""}
          ${c.bg !== "none" ? `<button class="btn small" data-act="castOpenLore" data-tab="${c.bg}">Open it in Lore</button>` : ""}
        </div>
        <div class="card">
          <h3>On top</h3>
          ${check("momentum", "Momentum")}
          ${check("threat", "Threat")}
          ${check("scene", "Scene traits and goals", "the scene's name, traits and complications, and its goal tasks (not peril clocks)")}
          ${check("conflict", "Conflict zones", "who stands in which zone, from the Zone field on each combatant")}
          ${c.conflict ? check("tracks", "…with defeat tracks") : ""}
          ${check("dice", "Dice results", "each roll pops up for a few seconds")}
          ${c.dice ? check("npcRolls", "…including NPC rolls") : ""}
        </div>
      </section>
      <section>
        <div class="card">
          <div class="card-head"><h3>Cards on screen</h3>${c.cards.length ? `<button class="btn small ghost" data-act="castClear">Clear all</button>` : ""}</div>
          ${c.cards.map(cardRow).join("") || `<p class="empty">No cards. Use <b>Show to players</b> on an NPC, a character, a Compendium entry or a handout. Up to ${MAX_CARDS} show at once; one more replaces the oldest.</p>`}
        </div>
        <div class="card">
          <h3>Show a card</h3>
          <h4>NPC roster</h4>
          <div class="chips">${npcs.map((n) => `<button class="chip chip-add ${shown("npc:" + n.id) ? "on" : ""}" data-act="castNpc" data-npc="${esc(n.id)}">${esc(n.name)}</button>`).join("") || `<span class="empty">No NPCs saved yet.</span>`}</div>
          <h4>Characters <span class="muted small">(from the Character maker)</span></h4>
          <div class="chips">${chars.map((ch) => `<button class="chip chip-add ${shown("char:" + ch.id) ? "on" : ""}" data-act="castChar" data-id="${esc(ch.id)}">${esc(ch.name || "Unnamed")}</button>`).join("") || `<span class="empty">No characters yet.</span>`}</div>
          <h4>Handout</h4>
          <input type="text" data-bind="cast.handout.title" value="${esc(c.handout.title)}" placeholder="Title, e.g. A message from the Baron" style="width:100%"/>
          <textarea data-bind="cast.handout.text" rows="4" placeholder="Text to read aloud or show: a letter, a rumor, a clue…" style="margin-top:0.35rem">${esc(c.handout.text)}</textarea>
          <button class="btn primary" data-act="castHandout" style="margin-top:0.35rem">Show handout</button>
        </div>
      </section>
    </div>`;
    };
    const A = G.actions, R = () => { G.save(); G.render(); };
    A.castOpen = () => { const c = G.S.cast; c.open = !c.open; if (c.open) { c.screen = pickScreen(screens()); c.blank = false; } R(); };
    A.castScreen = (el) => { G.S.cast.screen = el.dataset.id; R(); };
    A.castClear = () => { G.S.cast.cards = []; R(); };
    A.castUncard = (el) => { G.S.cast.cards = G.S.cast.cards.filter((x) => x.id !== el.dataset.id); R(); };
    A.castNpc = (el) => { const n = (G.S.npcs || []).find((x) => x.id === el.dataset.npc); if (n) G.cast.toggle(G.cast.fromNpc(n)); };
    A.castChar = (el) => { const ch = ((G.S.chars && G.S.chars.list) || []).find((x) => x.id === el.dataset.id); if (ch) G.cast.toggle(G.cast.fromChar(ch)); };
    A.castHandout = () => {
      const h = G.S.cast.handout, title = h.title.trim(), text = h.text.trim();
      if (!title && !text) { G.toast("Write a title or some text first"); return; }
      G.cast.card({ id: "note:" + uid(), kind: "handout", title: title || "Handout", text });
      G.S.cast.handout = { title: "", text: "" }; R();
    };
    A.castOpenLore = (el) => G.remote("lore", "openTab", { tab: el.dataset.tab }, { focus: true, quiet: true });
  }

  // ---------------- the display window ----------------
  if (G.tool !== "display") return;
  document.body.classList.add("cast-body");
  const tiles = (n, of) => Array.from({ length: of }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");

  function pools(st) {
    const S = G.S;
    return `${st.momentum ? `<div class="cast-pool momentum"><small>Momentum</small><b>${S.momentum}</b><div class="cast-pips">${tiles(S.momentum, 6)}</div></div>` : ""}
      ${st.threat ? `<div class="cast-pool threat"><small>Threat</small><b>${S.threat}</b></div>` : ""}`;
  }
  function scene() {
    const sc = G.S.scene || {}, goals = (sc.tasks || []).filter((t) => !t.peril);
    if (!sc.name && !(sc.traits || []).length && !goals.length) return "";
    return `<div class="cast-panel cast-scene">
      ${sc.name ? `<h2>${esc(sc.name)}</h2>` : `<h2>The scene</h2>`}
      ${(sc.traits || []).length ? `<div class="cast-traits">${sc.traits.map((t) => `<span class="${t.kind === "comp" ? "comp" : ""}">${esc(t.name)}${t.rank > 1 ? ` ${t.rank}` : ""}</span>`).join("")}</div>` : ""}
      ${goals.map((t) => `<div class="cast-task"><span>${esc(t.name)}</span><div class="cast-boxes">${tiles(t.progress, t.req)}</div></div>`).join("")}
    </div>`;
  }
  function conflict(st) {
    const C = G.S.conflict; if (!C || !(C.combatants || []).length) return "";
    const zones = new Map();
    C.combatants.forEach((c) => { const z = String(c.zone || "").trim(); if (!zones.has(z)) zones.set(z, []); zones.get(z).push(c); });
    const order = [...zones.keys()].filter(Boolean).concat(zones.has("") ? [""] : []);
    const who = (c) => {
      const track = st.tracks && c.tier !== "minor" && !c.defeated ? `<div class="cast-boxes">${tiles(c.progress, G.effReq ? G.effReq(c) : c.req)}</div>` : "";
      return `<div class="cz-c ${c.side} ${c.acted ? "acted" : ""} ${c.defeated ? "defeated" : ""}"><b>${esc(c.name)}</b>${track}</div>`;
    };
    const type = G.conflictName ? G.conflictName(C.type) : C.type;
    return `<div class="cast-panel cast-conflict"><h2>${esc(type)} <span>Round ${C.round}</span></h2>
      <div class="cz">${order.map((z) => `<div class="cz-zone ${z ? "" : "none"}"><h3>${esc(z || "No zone")}</h3>${zones.get(z).map(who).join("")}</div>`).join("")}</div></div>`;
  }
  const cardHTML = (c) => `<article class="cc ${c.img ? "has-img" : ""} k-${esc(c.kind || "")}">
      ${c.img ? `<div class="cc-img"><img src="${esc(c.img)}" alt=""/></div>` : ""}
      <div class="cc-body"><h2>${esc(c.title)}</h2>${c.sub ? `<div class="cc-sub">${esc(c.sub)}</div>` : ""}
        ${(c.facts || []).length ? `<dl>${c.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
        ${(c.chips || []).length ? `<div class="cc-chips">${c.chips.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
        ${c.text ? `<p>${esc(c.text).replace(/\n/g, "<br/>")}</p>` : ""}</div></article>`;

  // The display keeps its own elements (outside #main, like the galaxy map) and redraws only the parts whose
  // content changed, so a card doesn't fade in again every time the GM spends a point of Threat.
  const root = document.createElement("div"), parts = {};
  ["bg", "left", "pools"].forEach((k) => { const el = document.createElement("div"); root.appendChild(el); parts[k] = { el, html: null }; });
  const cardsEl = document.createElement("div"); root.appendChild(cardsEl);
  parts.blank = { el: document.createElement("div"), html: null }; root.appendChild(parts.blank.el);
  document.body.appendChild(root);
  const put = (k, html) => { const p = parts[k]; if (p.html === html) return false; p.el.innerHTML = html; p.html = html; return true; };
  const fromHTML = (h) => { const t = document.createElement("div"); t.innerHTML = h; return t.firstElementChild; };
  G.views.display = () => "";

  function cards(list) {
    cardsEl.className = `cast-cards n${list.length}`;
    const ids = new Set(list.map((c) => c.id));
    [...cardsEl.children].forEach((el) => { if (!ids.has(el.dataset.id)) el.remove(); });
    list.forEach((c, i) => {
      const h = cardHTML(c);
      let el = [...cardsEl.children].find((x) => x.dataset.id === c.id);
      if (!el || el.duneHTML !== h) {
        const fresh = fromHTML(h); fresh.dataset.id = c.id; fresh.duneHTML = h;
        if (!el) { fresh.classList.add("new"); fresh.addEventListener("animationend", () => fresh.classList.remove("new"), { once: true }); }
        if (el) el.replaceWith(fresh);
        el = fresh;
      }
      if (cardsEl.children[i] !== el) cardsEl.insertBefore(el, cardsEl.children[i] || null);
    });
  }

  // the background map, the timeline's glide, and dice as they're rolled
  const tx = (x) => `translateX(calc(50vw - ${x.toFixed(1)}px))`;
  let lastX = null, seenRoll = G.S.last ? G.S.last.at : null, diceTimer = 0;
  const diceEl = document.createElement("div"); diceEl.className = "cast-dice"; document.body.appendChild(diceEl);
  function showRoll(L) {
    const r = L.result, die = (d, a) => `<i class="${d.successes === 2 ? "s2" : d.successes === 1 ? "s1" : ""} ${d.complication ? "comp" : ""} ${a ? "assist" : ""}">${d.value}</i>`;
    diceEl.innerHTML = `<div class="cd-card ${r.passed ? "pass" : "fail"}">
      <small>${L.side === "pc" ? "" : "NPC · "}${esc(L.title || "")}${L.rerolled ? " · re-rolled" : ""}</small>
      <div class="cd-dice">${r.dice.map((d) => die(d)).join("")}${(r.assists || []).map((d) => die(d, true)).join("")}</div>
      <b>${r.successes} success${r.successes === 1 ? "" : "es"} against ${L.difficulty}: ${r.passed ? "passed" : "failed"}</b>
      ${r.passed && r.momentum ? `<span class="cd-m">+${r.momentum} Momentum</span>` : ""}${r.complications ? `<span class="cd-c">${r.complications} complication${r.complications > 1 ? "s" : ""}</span>` : ""}
    </div>`;
    diceEl.classList.remove("show"); void diceEl.offsetWidth; diceEl.classList.add("show");
    clearTimeout(diceTimer); diceTimer = setTimeout(() => diceEl.classList.remove("show"), 9000);
  }
  G.afterRender.push(() => {
    const st = state(), S = G.S;
    const left = (st.scene ? scene() : "") + (st.conflict ? conflict(st) : "");
    root.className = `cast cast-bg-${st.bg}${st.cards.length ? " has-cards" : ""}${left ? " has-left" : ""}`;
    const tl = st.bg === "timeline" && G.timeline ? G.timeline.castView() : null;
    const idle = st.bg === "none" && !st.cards.length ? `<div class="cast-idle"><div class="cast-emblem">◈</div>${st.scene && S.scene && S.scene.name ? `<div class="cast-title">${esc(S.scene.name)}</div>` : ""}</div>` : "";
    const redrawn = put("bg", idle + (tl ? tl.html : ""));
    put("left", left ? `<div class="cast-left">${left}</div>` : "");
    put("pools", `<div class="cast-pools">${pools(st)}</div>`);
    cards(st.cards);
    put("blank", st.blank ? `<div class="cast-blank"></div>` : "");
    if (G.galaxyCast) { if (st.bg === "starmap" && !st.blank) G.galaxyCast.show(); else G.galaxyCast.hide(); }
    // a redrawn strip starts where the last one stood, then glides to the new year
    const track = document.getElementById("castTrack");
    if (track && tl) {
      if (redrawn && lastX != null && Math.abs(lastX - tl.x) > 0.5) { track.style.transition = "none"; track.style.transform = tx(lastX); void track.offsetWidth; track.style.transition = ""; }
      track.style.transform = tx(tl.x); lastX = tl.x;
    } else lastX = null;
    const L = G.S.last;
    if (L && L.at && L.at !== seenRoll) { seenRoll = L.at; if (st.dice && !st.blank && (L.side === "pc" || st.npcRolls)) showRoll(L); }
    if (st.blank) diceEl.classList.remove("show");
  });
})();
