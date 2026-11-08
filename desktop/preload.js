// The bridge js/store.js uses in the desktop apps: load every tool's data, save this tool's, hear changes and
// requests, send requests, open the other tools, and run the player display (js/cast.js). Nothing else from Node or Electron reaches the page.
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const boot = ipcRenderer.sendSync("store:loadAll");
contextBridge.exposeInMainWorld("duneDesktop", {
  tool: boot.tool,
  dataDir: boot.dataDir,
  loadAll: () => boot.files,
  save: (text) => ipcRenderer.send("store:save", String(text)),
  send: (to, msg) => ipcRenderer.send("store:send", String(to), msg),
  onChange: (cb) => ipcRenderer.on("store:changed", (e, tool, data) => cb(tool, data)),
  onMessage: (cb) => ipcRenderer.on("store:message", (e, msg) => cb(msg)),
  openTool: (t) => ipcRenderer.send("tool:open", String(t)),
  openDataFolder: () => ipcRenderer.send("data:openFolder"),
  importData: () => ipcRenderer.send("data:import"),
  // start another tool in the background if it isn't running (to carry out a request now)
  wake: (t) => ipcRenderer.send("tool:wake", String(t)),
  // the player display (GM Tools): the screens to choose from, open or close it on one, hear it being closed
  screens: () => ipcRenderer.sendSync("display:screens"),
  display: (open, screenId) => ipcRenderer.send("display:set", !!open, String(screenId || "")),
  onDisplayClosed: (cb) => ipcRenderer.on("display:closed", () => cb()),
});
