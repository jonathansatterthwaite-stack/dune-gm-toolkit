// The bridge js/store.js and the page use in the desktop app: load the toolkit's data, save it, hear it change
// (the player display), color the window buttons, and run the player display (js/cast.js).
// Nothing else from Node or Electron reaches the page.
"use strict";
const { contextBridge, ipcRenderer } = require("electron");
const boot = ipcRenderer.sendSync("store:loadAll");
contextBridge.exposeInMainWorld("duneDesktop", {
  tool: boot.tool,
  dataDir: boot.dataDir,
  loadAll: () => boot.files,
  save: (text) => ipcRenderer.send("store:save", String(text)),
  onChange: (cb) => ipcRenderer.on("store:changed", (e, tool, data) => cb(tool, data)),
  openDataFolder: () => ipcRenderer.send("data:openFolder"),
  importData: () => ipcRenderer.send("data:import"),
  // the window buttons drawn in the page's top strip: their colors, to match the theme
  setTitleBar: (color, symbolColor) => ipcRenderer.send("window:titleBar", String(color), String(symbolColor)),
  // the player display: the screens to choose from, open or close it on one, hear it being closed
  screens: () => ipcRenderer.sendSync("display:screens"),
  display: (open, screenId) => ipcRenderer.send("display:set", !!open, String(screenId || "")),
  onDisplayClosed: (cb) => ipcRenderer.on("display:closed", () => cb()),
});
