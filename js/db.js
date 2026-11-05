// DUNE_DB — the toolkit's rules database.
// Tables are filled by js/db/*.js (DUNE_DB.add) and by views over data the other tools already hold
// (talents, archetypes and faction templates from the character creator, House ventures, focuses …).
// Every row gets a stable id ("table:slug") and a src page reference. Homebrew rows live in app state
// (GM.S.db.custom) and are merged in by the Compendium tab, not here.
window.DUNE_DB = (function () {
  const META = {
    // group, title, one-line description, list columns [key, label], facet key for the filter dropdown
    npcs:          { group: "Characters", title: "NPCs", desc: "Named characters and ready-made archetypes with full stat blocks.", cols: [["kind", "Kind"], ["faction", "Faction"]], facet: "kind" },
    talents:       { group: "Characters", title: "Talents", desc: "Every talent in the four books, with a short summary of what it does.", cols: [["faction", "Faction"]], facet: "faction" },
    archetypes:    { group: "Characters", title: "Archetypes", desc: "Character archetypes: primary and secondary skill, suggested focuses and talents.", cols: [["primary", "Primary"], ["secondary", "Secondary"]], facet: "primary" },
    factions:      { group: "Characters", title: "Faction templates", desc: "Bene Gesserit, Mentat, Fremen, Sardaukar and other templates with mandatory talents.", cols: [["trait", "Trait"]], facet: "" },
    abilities:     { group: "Characters", title: "NPC special abilities", desc: "Abilities NPCs can take in place of talents.", cols: [], facet: "" },
    drives:        { group: "Characters", title: "Drives", desc: "The five core drives and the six Power and Pawns drives.", cols: [["set", "Set"]], facet: "set" },
    focuses:       { group: "Characters", title: "Focuses", desc: "Focuses by skill, including expansion focuses.", cols: [["skill", "Skill"]], facet: "skill" },
    assets:        { group: "Equipment", title: "Assets", desc: "Weapons, gear, troops, vehicles, agents, poisons, leverage and trade goods.", cols: [["cat", "Type"], ["group", "Group"], ["q", "Q"]], facet: "cat" },
    houses:        { group: "Houses", title: "Noble Houses", desc: "The Houses of the Landsraad with their traits, domains, homeworlds and families.", cols: [["rank", "Rank"], ["liege", "Serves"]], facet: "rank" },
    houseTypes:    { group: "Houses", title: "House types", desc: "Nascent, Minor, Major and Great Houses: Threat, domains, enemies and House management stats.", cols: [["threat", "Threat/player"]], facet: "" },
    domains:       { group: "Houses", title: "Areas of expertise", desc: "Domain areas with example machinery, produce, expertise, workers and understanding.", cols: [], facet: "" },
    houseRoles:    { group: "Houses", title: "House roles", desc: "Ruler, Heir, Spymaster and the other household offices.", cols: [], facet: "" },
    houseTemplates:{ group: "Houses", title: "Rival House templates", desc: "Military, Espionage, Industrial, Artistic and Farming Houses with sample domains.", cols: [], facet: "" },
    enmity:        { group: "Houses", title: "Enemies and hatred", desc: "How many enemies a House starts with, how much they hate it, and why.", cols: [["kind", "Table"], ["roll", "Roll"]], facet: "kind" },
    ventures:      { group: "Houses", title: "House ventures", desc: "The Great Game's yearly House management ventures and their costs.", cols: [["group", "Type"], ["skill", "Skill"]], facet: "group" },
    planets:       { group: "World", title: "Planets", desc: "Worlds of the Imperium: system, ruling House, exports and places of interest.", cols: [["system", "System"], ["house", "House"]], facet: "" },
    organizations: { group: "World", title: "Factions and powers", desc: "The great powers of the Imperium and the factions of Arrakis.", cols: [["kind", "Kind"]], facet: "kind" },
    traits:        { group: "World", title: "Traits", desc: "Traits used in the books — reputations, House traits, conditions and scene traits.", cols: [["kind", "Kind"]], facet: "kind" },
  };
  const ORDER = Object.keys(META);
  const T = {};
  const views = [];
  let built = false;

  const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
  const bookOf = (src) => (/^Core/.test(src) ? "Core" : /Power and Pawns|^PP/.test(src) ? "Power and Pawns" : /Sand and Dust|^SD/.test(src) ? "Sand and Dust" : /Great Game|^GG/.test(src) ? "The Great Game" : src ? "Other" : "");

  function add(name, rows) { (T[name] = T[name] || []).push(...rows); built = false; }
  // view(name, fn): rows computed on first use from data other scripts define (they may load after db.js).
  // fn receives tbl(name) → the rows of tables built so far (book tables, then views in registration order).
  function view(name, fn) { views.push([name, fn]); built = false; }

  function build() {
    if (built) return;
    const base = {};
    Object.keys(T).forEach((k) => (base[k] = T[k].slice()));
    views.forEach(([name, fn]) => { try { base[name] = (base[name] || []).concat(fn((n) => base[n] || []) || []); } catch (e) { console.warn("DB view failed:", name, e); } });
    Object.keys(base).forEach((k) => {
      const seen = {};
      base[k] = base[k].map((r) => {
        let id = r.id || `${k}:${slug(r.name)}`;
        if (seen[id]) id += "-" + ++seen[id]; else seen[id] = 1;
        return Object.assign({}, r, { id, _t: k, src: r.src || "", book: bookOf(r.src) });
      });
    });
    built = base;
  }
  const rows = (name) => (build(), built[name] || []);
  const tables = () => (build(), ORDER.filter((k) => built[k] && built[k].length).concat(Object.keys(built).filter((k) => !META[k])));
  const get = (id) => { build(); const t = String(id).split(":")[0]; return (built[t] || []).find((r) => r.id === id) || null; };
  const find = (name, rowName) => rows(name).find((r) => r.name.toLowerCase() === String(rowName).toLowerCase()) || null;

  // all searchable text of a row
  function text(r) {
    const out = [];
    (function walk(v) { if (v == null) return; if (typeof v === "string" || typeof v === "number") out.push(String(v)); else if (Array.isArray(v)) v.forEach(walk); else if (typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (k[0] !== "_" && k !== "id") { out.push(k); walk(x); } }); })(r);
    return out.join(" ").toLowerCase();
  }
  // search(query, {table}) → rows ranked: name match first, then any-field match
  function search(q, opt) {
    build();
    const terms = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    const list = opt && opt.table ? rows(opt.table) : tables().flatMap(rows);
    if (!terms.length) return list;
    return list.map((r) => {
      const n = r.name.toLowerCase(), all = text(r);
      if (!terms.every((t) => all.includes(t))) return null;
      return [r, terms.every((t) => n.includes(t)) ? (n.startsWith(terms[0]) ? 0 : 1) : 2];
    }).filter(Boolean).sort((a, b) => a[1] - b[1] || a[0].name.localeCompare(b[0].name)).map((x) => x[0]);
  }
  function stats() { build(); return tables().map((k) => [k, built[k].length]); }

  return { META, add, view, rows, tables, get, find, search, text, stats, slug, bookOf };
})();
