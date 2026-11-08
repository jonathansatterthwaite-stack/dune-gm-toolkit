// Saved data for the three tools. Each tool saves only the keys it owns (js/tools.js), reads the other two tools'
// data, and hears when it changes. A tool asks another to change that tool's data by sending it a request.
//
// In the desktop apps (desktop/preload.js provides window.duneDesktop) the data lives in Documents\Dune GM\:
// one file per tool, plus an inbox folder per tool for requests. In a plain browser (for development) the same
// thing runs on localStorage: one key per tool and one inbox key per tool, with "storage" events for live updates.
window.DUNE_STORE = (function () {
  const TOOLS = window.DUNE_TOOLS, TOOL = window.DUNE_TOOL, NAMES = Object.keys(TOOLS);
  // the player display is a viewer: it reads every tool's data and saves nothing
  const VIEWER = !TOOLS[TOOL], CFG = TOOLS[TOOL] || (window.DUNE_VIEWERS || {})[TOOL];
  const desk = window.duneDesktop || null;
  const OWN = VIEWER ? [] : TOOLS[TOOL].owns.concat(["tab", "ui"]);
  const ownerOf = (key) => NAMES.find((t) => TOOLS[t].owns.includes(key)) || null;
  const pick = (obj, keys) => { const o = {}; keys.forEach((k) => { if (obj && k in obj) o[k] = obj[k]; }); return o; };
  const LS = (t) => "duneGM.tool." + t, INBOX = (t) => "duneGM.inbox." + t;

  // the single-file state of the old browser version: split it among the three tools, once
  function splitLegacy(all) {
    const out = {};
    NAMES.forEach((t) => (out[t] = pick(all, TOOLS[t].owns)));
    if (typeof all.house === "string") { out.gm.threatHouse = all.house; delete out.lore.house; }
    return out;
  }
  function browserLoad() {
    const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
    if (!NAMES.some((t) => read(LS(t))) && read("duneGM.v1")) {
      const parts = splitLegacy(read("duneGM.v1"));
      NAMES.forEach((t) => { try { localStorage.setItem(LS(t), JSON.stringify(parts[t])); } catch (e) {} });
    }
    const files = {}; NAMES.forEach((t) => (files[t] = read(LS(t)) || {}));
    return files;
  }

  // every tool's file, keyed by tool
  const files = desk ? desk.loadAll() : browserLoad();

  // the merged state: own keys (editable) plus the other tools' owned keys (read-only snapshots)
  function load() {
    const S = {};
    NAMES.filter((t) => t !== TOOL).forEach((t) => Object.assign(S, pick(files[t], TOOLS[t].owns)));
    return Object.assign(S, pick(files[TOOL], OWN));
  }
  function save(S) {
    if (VIEWER) return;
    const own = JSON.stringify(pick(S, OWN));
    if (desk) desk.save(own);
    else try { localStorage.setItem(LS(TOOL), own); } catch (e) { /* storage unavailable: keep working in memory */ }
  }
  // another tool's data changed: cb(tool, data)
  function onExternal(cb) {
    if (desk) desk.onChange((t, data) => { if (t !== TOOL && TOOLS[t]) cb(t, pick(data || {}, TOOLS[t].owns)); });
    else window.addEventListener("storage", (e) => {
      const t = NAMES.find((n) => e.key === LS(n));
      if (t && t !== TOOL) { try { cb(t, pick(JSON.parse(e.newValue || "{}"), TOOLS[t].owns)); } catch (err) {} }
      if (e.key && e.key.startsWith(INBOX(TOOL) + ".") && e.newValue) drainBrowserInbox();
    });
  }
  // requests to other tools: { type, payload, focus }
  function send(to, msg) {
    msg = Object.assign({ from: TOOL, at: Date.now() }, msg);
    if (desk) return desk.send(to, msg);
    // one key per request, so two quick requests can't race over a shared queue
    try { localStorage.setItem(INBOX(to) + "." + msg.at + "." + Math.random().toString(36).slice(2, 8), JSON.stringify(msg)); } catch (e) {}
  }
  let handler = null;
  function drainBrowserInbox() {
    if (!handler) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(INBOX(TOOL) + ".")) keys.push(k); }
    keys.sort().forEach((k) => { let m = null; try { m = JSON.parse(localStorage.getItem(k)); localStorage.removeItem(k); } catch (e) {} if (m) handler(m); });
  }
  function onMessage(cb) {
    handler = cb;
    if (desk) desk.onMessage(cb);
    else setTimeout(drainBrowserInbox, 0);  // requests sent while this tool was closed
  }
  // open (or bring forward) another tool
  function open(t) {
    if (desk) return desk.openTool(t);
    window.open(t + ".html", "dune-" + t);
  }
  return { TOOL, TOOLS, CFG, VIEWER, OWN, ownerOf, owns: (key) => OWN.includes(key), load, save, onExternal, send, onMessage, open, desktop: !!desk,
    dataFolder: () => desk && desk.openDataFolder(), importData: () => desk && desk.importData(),
    // start another tool in the background if it isn't running, so a request to it is carried out now
    wake: (t) => desk && desk.wake && desk.wake(t) };
})();
