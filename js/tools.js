// The toolkit's editors and saved data. Everything runs in one app (the "toolkit"). The editors are grouped as
// they were when they were three apps (Characters, Lore, GM), which is how each area's editor menu lists them.
// tools/make-pages.js builds index.html (the toolkit) and display.html (the player display) from this.
window.DUNE_DOMAINS = {
  character: {
    title: "Characters",
    editors: [["characters", "Characters"], ["sheet", "Character sheet"]],
    owns: ["chars"],
  },
  lore: {
    title: "Lore",
    editors: [["compendium", "Compendium"], ["entry", "Entry"], ["timeline", "Timeline"], ["universe", "Known universe"], ["event", "Event details"], ["starmap", "Galaxy map"], ["world", "World view"], ["system", "System details"], ["worlds", "Worlds"], ["house", "House"]],
    owns: ["db", "timeline", "galaxy", "worlds", "house"],
  },
  gm: {
    title: "GM",
    editors: [["controls", "Controls"], ["roller", "Dice"], ["conflict", "Conflict"], ["npcs", "NPCs"], ["scene", "Scene"], ["hooks", "Hooks"], ["reference", "Reference"], ["cast", "Player display"]],
    owns: ["threat", "momentum", "players", "threatHouse", "history", "roller", "last", "log", "conflict", "npcs", "scene", "hook", "savedHooks", "cast"],
  },
};
(function () {
  const all = Object.values(window.DUNE_DOMAINS);
  window.DUNE_TOOLS = {
    toolkit: {
      title: "GM Toolkit", short: "Toolkit", exe: "Dune GM Toolkit",
      tabs: all.flatMap((d) => d.editors),
      owns: all.flatMap((d) => d.owns).concat(["layout"]),  // layout: the workspaces and their areas (js/areas.js)
    },
  };
})();
// The player display: a window the toolkit opens on a second screen (js/cast.js). It owns nothing and only shows
// the toolkit's data; what it shows is the "cast" key.
window.DUNE_VIEWERS = {
  display: { title: "Player Display", short: "Display", tabs: [["display", "Display"]], owns: [] },
};
// the app also keeps "tab" and "ui" (form drafts) in its file
window.DUNE_TOOL = window.DUNE_TOOL || "toolkit";
