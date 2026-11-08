// Saved data. The toolkit keeps everything in one file; the player display (display.html) reads it live and
// saves nothing.
//
// In the desktop app (desktop/preload.js provides window.duneDesktop) the data lives in Documents\Dune GM\toolkit.json.
// In a plain browser (for development) it lives in localStorage under "duneGM.tool.toolkit", and "storage" events
// carry changes to the display's window.
window.DUNE_STORE = (function () {
  const TOOLS = window.DUNE_TOOLS, TOOL = window.DUNE_TOOL, NAMES = Object.keys(TOOLS);
  // the player display is a viewer: it reads the toolkit's data and saves nothing
  const VIEWER = !TOOLS[TOOL], CFG = TOOLS[TOOL] || (window.DUNE_VIEWERS || {})[TOOL];
  const desk = window.duneDesktop || null;
  const OWN = VIEWER ? [] : TOOLS[TOOL].owns.concat(["tab", "ui"]);
  const ownerOf = (key) => NAMES.find((t) => TOOLS[t].owns.includes(key)) || null;
  const pick = (obj, keys) => { const o = {}; keys.forEach((k) => { if (obj && k in obj) o[k] = obj[k]; }); return o; };
  const LS = (t) => "duneGM.tool." + t;

  // Data from before the merge: the three apps' files (Character Maker, Lore, GM Tools) or the old single-page
  // toolkit's one object. Combined once into the toolkit's file.
  function merge(parts) {
    const out = {}, ui = {};
    parts.filter(Boolean).forEach((p) => { Object.keys(p).forEach((k) => { if (k === "ui") Object.assign(ui, p.ui); else if (k !== "tab") out[k] = p[k]; }); });
    if (typeof out.house === "string") { out.threatHouse = out.threatHouse || out.house; delete out.house; }
    if (Object.keys(ui).length) out.ui = ui;
    return out;
  }
  function browserLoad() {
    const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
    let data = read(LS("toolkit"));
    if (!data) {
      const old = ["character", "lore", "gm"].map((t) => read(LS(t)));
      data = old.some(Boolean) ? merge(old) : read("duneGM.v1") ? merge([read("duneGM.v1")]) : {};
      if (Object.keys(data).length && !VIEWER) try { localStorage.setItem(LS("toolkit"), JSON.stringify(data)); } catch (e) {}
    }
    return { toolkit: data };
  }

  const files = desk ? desk.loadAll() : browserLoad();

  function load() { return VIEWER ? pick(files.toolkit, TOOLS.toolkit.owns) : pick(files.toolkit, OWN); }
  function save(S) {
    if (VIEWER) return;
    const own = JSON.stringify(pick(S, OWN));
    if (desk) desk.save(own);
    else try { localStorage.setItem(LS(TOOL), own); } catch (e) { /* storage unavailable: keep working in memory */ }
  }
  // the toolkit's data changed (the display listens): cb(tool, data)
  function onExternal(cb) {
    if (!VIEWER) return;
    if (desk) desk.onChange((t, data) => { if (TOOLS[t]) cb(t, pick(data || {}, TOOLS[t].owns)); });
    else window.addEventListener("storage", (e) => {
      const t = NAMES.find((n) => e.key === LS(n));
      if (t) { try { cb(t, pick(JSON.parse(e.newValue || "{}"), TOOLS[t].owns)); } catch (err) {} }
    });
  }
  return { TOOL, TOOLS, CFG, VIEWER, OWN, ownerOf, owns: (key) => OWN.includes(key), load, save, onExternal, desktop: !!desk,
    dataFolder: () => desk && desk.openDataFolder(), importData: () => desk && desk.importData() };
})();
