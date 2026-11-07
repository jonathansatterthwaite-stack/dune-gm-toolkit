// Electron main process for the three Dune desktop tools. One codebase, three apps: which tool this is comes from
// --tool=… on the command line (development) or from package.json's "duneTool" (set per exe by desktop/build.js).
//
// Shared data: Documents\Dune GM\<tool>.json, one file per tool. Each tool writes only its own file and watches
// the other two. Requests from one tool to another are files in Documents\Dune GM\inbox\<tool>\, so they wait
// there until that tool is running.
"use strict";
const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require("electron");
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");

const TOOLS = {
  character: { title: "Dune Character Maker", page: "character.html", key: "1" },
  lore: { title: "Dune Lore", page: "lore.html", key: "2" },
  gm: { title: "Dune GM Tools", page: "gm.html", key: "3" },
};
const NAMES = Object.keys(TOOLS);
function whichTool() {
  const arg = process.argv.find((a) => a.startsWith("--tool="));
  if (arg && TOOLS[arg.slice(7)]) return arg.slice(7);
  try { const pkg = require(path.join(app.getAppPath(), "package.json")); if (TOOLS[pkg.duneTool]) return pkg.duneTool; } catch (e) {}
  return "gm";
}
const TOOL = whichTool();
app.setName(TOOLS[TOOL].title);                 // separate settings and single-instance lock per tool
app.setAppUserModelId("dune.gm." + TOOL);

// ---------------- the shared data folder ----------------
const DATA = process.env.DUNE_GM_DATA || path.join(app.getPath("documents"), "Dune GM");
const fileOf = (t) => path.join(DATA, t + ".json");
const inboxOf = (t) => path.join(DATA, "inbox", t);
function ensureDirs() { fs.mkdirSync(DATA, { recursive: true }); NAMES.forEach((t) => fs.mkdirSync(inboxOf(t), { recursive: true })); }
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return {}; } }
let lastSaved = "";
function writeOwn(text) {
  if (text === lastSaved) return;
  const tmp = fileOf(TOOL) + ".tmp";
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, fileOf(TOOL));          // atomic: the other tools never read half a file
  lastSaved = text;
}

let win = null;
function send(channel, ...args) { if (win && !win.isDestroyed()) win.webContents.send(channel, ...args); }

// ---------------- launching the other tools ----------------
function openTool(t) {
  if (!TOOLS[t] || t === TOOL) return;
  if (app.isPackaged) {
    // the three portable exes sit side by side; a running one just comes to the front (single-instance lock)
    const dir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);
    const exe = path.join(dir, TOOLS[t].title + ".exe");
    if (!fs.existsSync(exe)) { dialog.showMessageBox(win, { type: "warning", message: `${TOOLS[t].title} isn't next to this app`, detail: `Put “${TOOLS[t].title}.exe” in the same folder as this one:\n${dir}` }); return; }
    spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
  } else {
    spawn(process.execPath, [app.getAppPath(), "--tool=" + t], { detached: true, stdio: "ignore", env: process.env }).unref();
  }
}

// ---------------- importing the old browser version's data ----------------
async function importBrowserData() {
  const res = await dialog.showOpenDialog(win, { title: "Import browser data", filters: [{ name: "Exported data", extensions: ["json"] }], properties: ["openFile"] });
  if (res.canceled || !res.filePaths[0]) return;
  let exported; try { exported = JSON.parse(fs.readFileSync(res.filePaths[0], "utf8")); } catch (e) { dialog.showErrorBox("Import browser data", "That file isn't an export from export-browser-data.html."); return; }
  const ls = exported.localStorage || {};
  const parts = {};
  NAMES.forEach((t) => { try { if (ls["duneGM.tool." + t]) parts[t] = JSON.parse(ls["duneGM.tool." + t]); } catch (e) {} });
  if (!Object.keys(parts).length && ls["duneGM.v1"]) {
    // the old single-page toolkit kept everything in one object: split it by owner
    const all = JSON.parse(ls["duneGM.v1"]);
    const owns = { character: ["chars"], lore: ["db", "timeline", "galaxy", "worlds", "house"],
      gm: ["threat", "momentum", "players", "history", "roller", "last", "log", "conflict", "npcs", "scene", "hook", "savedHooks"] };
    NAMES.forEach((t) => { parts[t] = {}; owns[t].forEach((k) => { if (k in all) parts[t][k] = all[k]; }); });
    if (typeof all.house === "string") { parts.gm.threatHouse = all.house; delete parts.lore.house; }
  }
  if (!Object.keys(parts).length) { dialog.showErrorBox("Import browser data", "No toolkit data found in that file."); return; }
  const { response } = await dialog.showMessageBox(win, { type: "question", buttons: ["Replace my data", "Cancel"], defaultId: 1, cancelId: 1,
    message: "Replace the data in all three tools with the imported data?", detail: `This overwrites ${Object.keys(parts).map((t) => TOOLS[t].title).join(", ")} in ${DATA}. A backup of the current files is kept next to them.` });
  if (response !== 0) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  Object.entries(parts).forEach(([t, data]) => {
    if (fs.existsSync(fileOf(t))) fs.copyFileSync(fileOf(t), path.join(DATA, `${t}.backup-${stamp}.json`));
    fs.writeFileSync(fileOf(t), JSON.stringify(data));
    if (t === TOOL) lastSaved = "";
  });
  win.reload();
}

// ---------------- IPC for js/store.js (via desktop/preload.js) ----------------
ipcMain.on("store:loadAll", (e) => { const files = {}; NAMES.forEach((t) => (files[t] = readJson(fileOf(t)))); e.returnValue = { tool: TOOL, files, dataDir: DATA }; });
ipcMain.on("store:save", (e, text) => { try { writeOwn(text); } catch (err) { console.error("save failed", err); } });
ipcMain.on("store:send", (e, to, msg) => {
  if (!TOOLS[to]) return;
  const f = path.join(inboxOf(to), `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`);
  fs.writeFileSync(f + ".tmp", JSON.stringify(msg)); fs.renameSync(f + ".tmp", f);
});
ipcMain.on("tool:open", (e, t) => openTool(t));
ipcMain.on("data:openFolder", () => shell.openPath(DATA));
ipcMain.on("data:import", () => importBrowserData());

// watch the other tools' files, and this tool's inbox (polling: dependable on Windows and network drives)
function watch() {
  NAMES.filter((t) => t !== TOOL).forEach((t) => {
    fs.watchFile(fileOf(t), { interval: 600 }, (cur, prev) => { if (cur.mtimeMs !== prev.mtimeMs) send("store:changed", t, readJson(fileOf(t))); });
  });
  setInterval(() => {
    let names = [];
    try { names = fs.readdirSync(inboxOf(TOOL)).filter((n) => n.endsWith(".json")).sort(); } catch (e) { return; }
    names.forEach((n) => {
      const f = path.join(inboxOf(TOOL), n);
      let msg = null; try { msg = JSON.parse(fs.readFileSync(f, "utf8")); fs.unlinkSync(f); } catch (e) { return; }
      if (msg && msg.focus && win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
      send("store:message", msg);
    });
  }, 500);
}

// ---------------- window and menu ----------------
function menu() {
  const tools = NAMES.map((t) => ({ label: TOOLS[t].title, accelerator: "CmdOrCtrl+" + TOOLS[t].key, enabled: t !== TOOL, click: () => openTool(t) }));
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "File", submenu: [
      { label: "Open data folder", click: () => shell.openPath(DATA) },
      { label: "Import browser data…", click: importBrowserData },
      { type: "separator" }, { role: "quit" } ] },
    { label: "Tools", submenu: tools },
    { label: "View", submenu: [ { role: "reload" }, { role: "toggleDevTools" }, { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" } ] },
  ]));
}
function createWindow() {
  win = new BrowserWindow({
    title: TOOLS[TOOL].title, width: 1500, height: 940, minWidth: 1180, minHeight: 720, backgroundColor: "#141116", show: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once("ready-to-show", () => win.show());
  // links to the web (the Dune Wiki notes) open in the real browser, not inside the tool
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.loadFile(path.join(app.getAppPath(), TOOLS[TOOL].page));
  // development self-test: DUNE_EVAL=<script file> runs it in the page and writes the result next to it, then quits
  if (process.env.DUNE_EVAL) win.webContents.once("did-finish-load", () => setTimeout(async () => {
    let out; try { out = await win.webContents.executeJavaScript(fs.readFileSync(process.env.DUNE_EVAL, "utf8")); } catch (e) { out = { error: String(e) }; }
    fs.writeFileSync(process.env.DUNE_EVAL + "." + TOOL + ".out.json", JSON.stringify(out, null, 1)); app.quit();
  }, +process.env.DUNE_EVAL_DELAY || 2500));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(() => { ensureDirs(); menu(); createWindow(); watch(); });
  app.on("window-all-closed", () => app.quit());
}
