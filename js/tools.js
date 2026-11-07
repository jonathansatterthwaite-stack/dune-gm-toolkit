// The three desktop tools: their tabs and the saved data each one owns. Everything else reads that data but never
// edits it; an edit another tool needs is sent to the owner as a request (see js/store.js and GM.remote).
// tools/make-pages.js builds character.html, lore.html and gm.html from this.
window.DUNE_TOOLS = {
  character: {
    title: "Character Maker", short: "Character maker", exe: "Dune Character Maker",
    tabs: [["characters", "Characters"]],
    owns: ["chars"],
  },
  lore: {
    title: "Lore", short: "Lore", exe: "Dune Lore",
    tabs: [["compendium", "Compendium"], ["timeline", "Timeline"], ["starmap", "Galaxy map"], ["worlds", "Worlds"], ["house", "House"]],
    owns: ["db", "timeline", "galaxy", "worlds", "house"],
  },
  gm: {
    title: "GM Tools", short: "GM tools", exe: "Dune GM Tools",
    tabs: [["roller", "Dice"], ["conflict", "Conflict"], ["npcs", "NPCs"], ["scene", "Scene"], ["hooks", "Hooks"], ["reference", "Reference"]],
    owns: ["threat", "momentum", "players", "threatHouse", "history", "roller", "last", "log", "conflict", "npcs", "scene", "hook", "savedHooks"],
  },
};
// every tool also keeps its own "tab" and "ui" (which tab is open, form drafts) in its own file
window.DUNE_TOOL = window.DUNE_TOOL || "gm";
