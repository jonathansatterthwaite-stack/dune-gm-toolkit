// The bridge js/store.js uses in the desktop apps: load every tool's data, save this tool's, hear changes and
// requests, send requests, open the other tools. Nothing else from Node or Electron reaches the page.
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
});
