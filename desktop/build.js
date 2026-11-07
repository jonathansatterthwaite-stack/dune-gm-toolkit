#!/usr/bin/env node
// Builds the three portable Windows exes: Dune Character Maker.exe, Dune Lore.exe and Dune GM Tools.exe.
//   npm run build        (output: desktop/dist/)
// Each exe is the same code with a different "duneTool" in its package.json. The exes include your locally built
// book text and art (js/db/*.local.js, img/local/): they are for your own use, so don't share them publicly.
"use strict";
const path = require("path"), fs = require("fs"), { execFileSync } = require("child_process");
const { build, Platform } = require("electron-builder");
const ROOT = path.resolve(__dirname, "..");
const TOOLS = { character: "Dune Character Maker", lore: "Dune Lore", gm: "Dune GM Tools" };

(async () => {
  execFileSync(process.execPath, [path.join(ROOT, "tools/make-pages.js")], { stdio: "inherit" });  // pages up to date
  const only = process.argv.slice(2).filter((a) => TOOLS[a]);
  for (const [tool, title] of Object.entries(TOOLS)) {
    if (only.length && !only.includes(tool)) continue;
    console.log(`\n=== ${title}`);
    await build({
      projectDir: ROOT,
      targets: Platform.WINDOWS.createTarget("portable"),
      config: {
        appId: "dune.gm." + tool,
        productName: title,
        copyright: "Personal use",
        directories: { output: "desktop/dist", buildResources: "desktop" },
        files: ["package.json", "desktop/main.js", "desktop/preload.js", "desktop/icon.png", "character.html", "lore.html", "gm.html",
          "js/**/*", "css/**/*", "img/**/*"],
        extraMetadata: { duneTool: tool, main: "desktop/main.js" },
        asar: true,
        npmRebuild: false,
        win: { target: "portable", icon: "desktop/icon.png" },
        portable: { artifactName: title + ".exe" },
      },
    });
  }
  console.log("\nBuilt into " + path.join(ROOT, "desktop", "dist"));
  fs.readdirSync(path.join(ROOT, "desktop", "dist")).filter((f) => f.endsWith(".exe")).forEach((f) => console.log("  " + f));
})().catch((e) => { console.error(e); process.exit(1); });
