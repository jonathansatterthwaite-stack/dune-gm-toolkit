#!/usr/bin/env node
// Builds the portable Windows exe: Dune GM Toolkit.exe.
//   npm run build        (output: desktop/dist/)
// The exe includes your locally built book text and art (js/db/*.local.js, img/local/): it's for your own use,
// so don't share it publicly.
"use strict";
const path = require("path"), fs = require("fs"), { execFileSync } = require("child_process");
const { build, Platform } = require("electron-builder");
const ROOT = path.resolve(__dirname, "..");
const TITLE = "Dune GM Toolkit";

(async () => {
  execFileSync(process.execPath, [path.join(ROOT, "tools/make-pages.js")], { stdio: "inherit" });  // pages up to date
  await build({
    projectDir: ROOT,
    targets: Platform.WINDOWS.createTarget("portable"),
    config: {
      appId: "dune.gm.toolkit",
      productName: TITLE,
      copyright: "Personal use",
      directories: { output: "desktop/dist", buildResources: "desktop" },
      files: ["package.json", "desktop/main.js", "desktop/preload.js", "desktop/icon.png", "index.html", "display.html",
        "js/**/*", "css/**/*", "img/**/*"],
      extraMetadata: { main: "desktop/main.js" },
      asar: true,
      npmRebuild: false,
      // the Electron already installed for `npx electron .` (same version), so building needs no download
      electronDist: "node_modules/electron/dist",
      win: { target: "portable", icon: "desktop/icon.png" },
      portable: { artifactName: TITLE + ".exe" },
    },
  });
  console.log("\nBuilt into " + path.join(ROOT, "desktop", "dist"));
  fs.readdirSync(path.join(ROOT, "desktop", "dist")).filter((f) => f.endsWith(".exe")).forEach((f) => console.log("  " + f));
})().catch((e) => { console.error(e); process.exit(1); });
