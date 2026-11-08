// Electron main process for the Dune GM Toolkit: one window with the whole toolkit (index.html), laid out in
// workspaces of areas (js/areas.js), plus the player display (display.html, js/cast.js), a second window, full
// screen on the screen the GM picks, that reads the toolkit's data and saves nothing.
//
// Data: Documents\Dune GM\toolkit.json. The first time it runs, the data of the three earlier apps
// (character.json, lore.json, gm.json in the same folder) is combined into it; those files are left as they were.
"use strict";
const { app, BrowserWindow, ipcMain, Menu, shell, dialog, screen } = require("electron");
const fs = require("fs"), path = require("path");

const TITLE = "Dune GM Toolkit", TOOL = "toolkit", PAGE = "index.html";
app.setName(TITLE);
app.setAppUserModelId("dune.gm.toolkit");

// ---------------- the data folder ----------------
const DATA = process.env.DUNE_GM_DATA || path.join(app.getPath("documents"), "Dune GM");
const FILE = path.join(DATA, TOOL + ".json");
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return null; } }
// combine earlier data: each part's keys, with the "ui" drafts merged and the old shared "house" key sorted out
function merge(parts) {
  const out = {}, ui = {};
  parts.filter(Boolean).forEach((p) => Object.keys(p).forEach((k) => { if (k === "ui") Object.assign(ui, p.ui); else if (k !== "tab") out[k] = p[k]; }));
  if (typeof out.house === "string") { out.threatHouse = out.threatHouse || out.house; delete out.house; }
  if (Object.keys(ui).length) out.ui = ui;
  return out;
}
function migrate() {
  fs.mkdirSync(DATA, { recursive: true });
  if (fs.existsSync(FILE)) return;
  const old = ["character", "lore", "gm"].map((t) => readJson(path.join(DATA, t + ".json")));
  if (old.some(Boolean)) fs.writeFileSync(FILE, JSON.stringify(merge(old)));
}
let lastSaved = "";
function writeOwn(text) {
  if (text === lastSaved) return;
  fs.writeFileSync(FILE + ".tmp", text);
  fs.renameSync(FILE + ".tmp", FILE);          // atomic: never half a file
  lastSaved = text;
}

let win = null, disp = null;
function send(channel, ...args) { if (win && !win.isDestroyed()) win.webContents.send(channel, ...args); }
const dispAlive = () => disp && !disp.isDestroyed();
function toDisplay(channel, ...args) { if (dispAlive()) disp.webContents.send(channel, ...args); }

// ---------------- importing the old browser version's data ----------------
async function importBrowserData() {
  const res = await dialog.showOpenDialog(win, { title: "Import browser data", filters: [{ name: "Exported data", extensions: ["json"] }], properties: ["openFile"] });
  if (res.canceled || !res.filePaths[0]) return;
  let exported; try { exported = JSON.parse(fs.readFileSync(res.filePaths[0], "utf8")); } catch (e) { dialog.showErrorBox("Import browser data", "That file isn't an export from export-browser-data.html."); return; }
  const ls = exported.localStorage || {}, parse = (k) => { try { return ls[k] ? JSON.parse(ls[k]) : null; } catch (e) { return null; } };
  const old = ["character", "lore", "gm"].map((t) => parse("duneGM.tool." + t));
  const data = parse("duneGM.tool.toolkit") || (old.some(Boolean) ? merge(old) : parse("duneGM.v1") ? merge([parse("duneGM.v1")]) : null);
  if (!data || !Object.keys(data).length) { dialog.showErrorBox("Import browser data", "No toolkit data found in that file."); return; }
  const { response } = await dialog.showMessageBox(win, { type: "question", buttons: ["Replace my data", "Cancel"], defaultId: 1, cancelId: 1,
    message: "Replace the toolkit's data with the imported data?", detail: `This overwrites ${FILE}. A backup of the current file is kept next to it.` });
  if (response !== 0) return;
  if (fs.existsSync(FILE)) fs.copyFileSync(FILE, path.join(DATA, `${TOOL}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
  fs.writeFileSync(FILE, JSON.stringify(data));
  lastSaved = "";
  win.reload();
}

// ---------------- the player display ----------------
function screens() {
  const prim = screen.getPrimaryDisplay().id, here = win ? screen.getDisplayMatching(win.getBounds()).id : prim;
  return screen.getAllDisplays().map((d, i) => ({ id: String(d.id), label: d.label || `Display ${i + 1}`, w: d.size.width, h: d.size.height, primary: d.id === prim, here: d.id === here }));
}
function openDisplay(screenId) {
  const all = screen.getAllDisplays(), here = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
  const d = all.find((x) => String(x.id) === String(screenId)) || all.find((x) => x.id !== here.id) || here;
  const windowed = d.id === here.id;  // on the GM's own screen: a window to move and resize, not full screen
  if (dispAlive()) {
    if (disp.duneScreen === d.id) { disp.showInactive(); return; }
    disp.removeAllListeners("closed"); disp.destroy();
  }
  const w = Math.round(d.workArea.width * 0.55), h = Math.round((w * 9) / 16);
  disp = new BrowserWindow({
    title: "Player Display", backgroundColor: "#07060a", show: false, frame: windowed, autoHideMenuBar: true, icon: path.join(__dirname, "icon.png"),
    x: windowed ? d.workArea.x + d.workArea.width - w - 24 : d.bounds.x, y: windowed ? d.workArea.y + 48 : d.bounds.y,
    width: windowed ? w : d.bounds.width, height: windowed ? h : d.bounds.height,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  disp.duneScreen = d.id;
  disp.setMenu(null);
  disp.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  disp.webContents.on("will-navigate", (e) => e.preventDefault());
  disp.once("ready-to-show", () => { disp.showInactive(); if (!windowed) disp.setFullScreen(true); });
  disp.on("closed", () => { disp = null; send("display:closed"); });
  disp.loadFile(path.join(app.getAppPath(), "display.html"));
  // development self-test: DUNE_EVAL_DISPLAY=<script file> runs it in the display, writes the result and a screenshot next to it
  if (process.env.DUNE_EVAL_DISPLAY) disp.webContents.once("did-finish-load", () => setTimeout(async () => {
    let out; try { out = await disp.webContents.executeJavaScript(fs.readFileSync(process.env.DUNE_EVAL_DISPLAY, "utf8")); } catch (e) { out = { error: String(e) }; }
    fs.writeFileSync(process.env.DUNE_EVAL_DISPLAY + ".out.json", JSON.stringify(out, null, 1));
    if (dispAlive()) fs.writeFileSync(process.env.DUNE_EVAL_DISPLAY + ".png", (await disp.webContents.capturePage()).toPNG());
  }, +process.env.DUNE_EVAL_DELAY || 2500));
}
function closeDisplay() { if (dispAlive()) disp.close(); }
ipcMain.on("display:screens", (e) => { e.returnValue = screens(); });
ipcMain.on("display:set", (e, open, screenId) => { if (!win || e.sender !== win.webContents) return; if (open) openDisplay(screenId); else closeDisplay(); });

// ---------------- IPC for js/store.js (via desktop/preload.js) ----------------
const fromDisplay = (e) => dispAlive() && e.sender === disp.webContents;
ipcMain.on("store:loadAll", (e) => { e.returnValue = { tool: fromDisplay(e) ? "display" : TOOL, files: { [TOOL]: readJson(FILE) || {} }, dataDir: DATA }; });
ipcMain.on("store:save", (e, text) => {
  if (fromDisplay(e)) return;
  try { writeOwn(text); } catch (err) { console.error("save failed", err); }
  if (dispAlive()) { try { toDisplay("store:changed", TOOL, JSON.parse(text)); } catch (err) {} }
});
ipcMain.on("data:openFolder", () => shell.openPath(DATA));
ipcMain.on("data:import", () => importBrowserData());

// ---------------- window and menu ----------------
function menu() {
  // the layout commands live in the page (js/areas.js); the menu passes them on
  const area = (cmd, label, accelerator) => ({ label, accelerator, click: () => send("layout:cmd", cmd) });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "File", submenu: [
      { label: "Open data folder", click: () => shell.openPath(DATA) },
      { label: "Import browser data…", click: importBrowserData },
      { type: "separator" }, { role: "quit" } ] },
    { label: "Layout", submenu: [
      area("splitRight", "Split area left and right"), area("splitDown", "Split area top and bottom"), area("join", "Join area into its neighbor"),
      { type: "separator" }, area("maximize", "Maximize area (toggle)", "CmdOrCtrl+Space"),
      { type: "separator" }, area("newWorkspace", "New workspace"), area("resetWorkspace", "Reset this workspace"), area("resetAll", "Reset all workspaces") ] },
    { label: "View", submenu: [ { role: "reload" }, { role: "toggleDevTools" }, { type: "separator" },
      { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" } ] },
  ]));
}
function createWindow() {
  win = new BrowserWindow({
    title: TITLE, width: 1600, height: 960, minWidth: 1180, minHeight: 720, backgroundColor: "#141116", show: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.once("ready-to-show", () => { win.maximize(); win.show(); });
  win.on("closed", () => { if (dispAlive()) disp.destroy(); });
  // links to the web (the Dune Wiki notes) open in the real browser, not inside the tool
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.loadFile(path.join(app.getAppPath(), PAGE));
  // development self-test: DUNE_EVAL=<script file> runs it in the page, writes the result and a screenshot next to it, then quits
  if (process.env.DUNE_EVAL) win.webContents.once("did-finish-load", () => setTimeout(async () => {
    let out; try { out = await win.webContents.executeJavaScript(fs.readFileSync(process.env.DUNE_EVAL, "utf8")); } catch (e) { out = { error: String(e) }; }
    fs.writeFileSync(process.env.DUNE_EVAL + ".out.json", JSON.stringify(out, null, 1));
    fs.writeFileSync(process.env.DUNE_EVAL + ".png", (await win.webContents.capturePage()).toPNG());
    app.quit();
  }, +process.env.DUNE_EVAL_DELAY || 2500));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(() => { migrate(); menu(); createWindow(); });
  app.on("window-all-closed", () => app.quit());
}
