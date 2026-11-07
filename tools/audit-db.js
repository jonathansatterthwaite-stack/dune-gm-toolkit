#!/usr/bin/env node
// Audit the rules database: loads the same data scripts the page does, builds DUNE_DB and checks that every
// table follows the house style and that cross-references resolve.
//
//   node tools/audit-db.js            report problems; exit code 1 if there are any
//   node tools/audit-db.js --verbose  also list the loose references that are expected (NPC gear and the like)
//
// House style:
//   - src is "<Book> p.N" (or p.N–M), several joined with "; ". Books: Core, Power and Pawns, Great Game, Sand and Dust.
//   - US spelling (the books use it): armor, color, defense, favor, honor …
//   - no stray whitespace; Houses are always named "House X" wherever a field refers to one.
//   - enum fields only use their known values (skills, drives, asset types, House ranks …).
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.dirname(__dirname);
const verbose = process.argv.includes("--verbose");

// the data scripts index.html loads, in its order (never the *.local.js personal files)
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"?]+)/g)].map((m) => m[1])
  .filter((s) => /^js\/(data|expansions|characters-data|db)(\.js|\/)/.test(s) && !/\.local\.js$/.test(s));
const win = { location: { protocol: "https:", hostname: "audit" }, console };
win.window = win;
const ctx = vm.createContext(win);
scripts.forEach((s) => vm.runInContext(fs.readFileSync(path.join(ROOT, s), "utf8"), ctx, { filename: s }));
const DB = win.DUNE_DB;

const errors = [], notes = [];
const err = (t, msg) => errors.push(`[${t}] ${msg}`);
const note = (t, msg) => notes.push(`[${t}] ${msg}`);

const SKILLS = ["Battle", "Communicate", "Discipline", "Move", "Understand"];
const DRIVES = ["Duty", "Faith", "Justice", "Power", "Truth"];
const ENUMS = {
  "archetypes.primary": SKILLS, "archetypes.secondary": SKILLS, "focuses.skill": SKILLS,
  "focuses.set": ["Core", "Sand and Dust", "The Great Game", "From stat blocks"],
  "assets.cat": ["Personal", "Warfare", "Espionage", "Intrigue"],
  "houses.rank": ["Great", "Major", "Minor", "Imperial", "Unranked"],
  "npcs.kind": ["Named", "Archetype", "Player character"], "drives.set": ["Core", "Power and Pawns"],
  "ventures.group": ["Trade", "Construction", "Boon"], "ventures.skill": SKILLS.concat(["varies", "—"]),
  "enmity.kind": ["Hatred", "Reason", "Rule"],
};
const SRC = /^(Core|Power and Pawns|Great Game|Sand and Dust|Agents of Dune|Agents of Dune (Cards|Folios|Handouts|Trackers|Zone Maps)|Masters of Dune|GM Toolkit|GM Screen) p\.\d+(–\d+)?$/;
const UK = /\b\w*(colour|favour|defence|armour|honour|behaviour|neighbour|rumour|labour|organis|recognis|realis|travell|idolis|penalis|catalogue|centre|theatre|licence|offence|programme(?!d)|grey)\w*\b/i;
// the Core's nine areas (p.88), plus two The Great Game uses: Logistics (House Alexin) and Farming and Industrial (House Mikarrol)
const DOMAINS = "Artistic|Espionage|Farming|Industrial|Kanly|Military|Political|Religion|Science|Logistics|Farming and Industrial";
const DOMAIN = new RegExp(`^(${DOMAINS}) \\((Machinery|Produce|Expertise|Workers|Understanding)\\)(: .+)?$`);

function strings(v, f, p) {
  if (typeof v === "string") f(v, p);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, f, `${p}[${i}]`));
  else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => strings(x, f, `${p}.${k}`));
}

// ---- per-row style checks
for (const t of DB.tables()) {
  if (t === "pages") continue;
  const ids = new Set();
  for (const r of DB.rows(t)) {
    const who = `${r.name}`;
    if (ids.has(r.id)) err(t, `duplicate id ${r.id}`); ids.add(r.id);
    if (/-\d+$/.test(r.id) && !/-\d+$/.test(DB.slug(r.name))) err(t, `${who}: a second row has the same name (${r.id})`);
    if (!r.src) err(t, `${who}: no src`);
    else r.src.split("; ").forEach((s) => SRC.test(s) || err(t, `${who}: src "${r.src}" is not "<Book> p.N"`));
    strings(r, (s, p) => {
      if (/^\._|^\.(id|book)$/.test(p)) return;
      if (s !== s.trim()) err(t, `${who}${p}: leading or trailing space`);
      if (/ {2}/.test(s)) err(t, `${who}${p}: double space`);
      if (/[‘’“”]/.test(s)) err(t, `${who}${p}: curly quote`);
      const uk = s.match(UK); if (uk) err(t, `${who}${p}: UK spelling "${uk[0]}"`);
    }, "");
    for (const [key, allowed] of Object.entries(ENUMS)) {
      const [tt, k] = key.split("."); if (tt !== t) continue;
      if (!allowed.includes(r[k])) err(t, `${who}: ${k} "${r[k]}" is not one of ${allowed.join(", ")}`);
    }
  }
}

// ---- cross-references
const has = (t, n) => !!DB.find(t, n);
const base = (n) => n.replace(/\s*\(.*\)$/, "");
const hasFocus = (f) => has("focuses", f) || has("focuses", base(f));
for (const n of DB.rows("npcs")) {
  Object.keys(n.skills).forEach((s) => SKILLS.includes(s) || err("npcs", `${n.name}: unknown skill ${s}`));
  Object.keys(n.drives).forEach((d) => DRIVES.includes(d) || err("npcs", `${n.name}: unknown drive ${d}`));
  Object.values(n.skills).concat(Object.values(n.drives)).forEach((v) => (Number.isInteger(v) && v >= 0 && v <= 12) || err("npcs", `${n.name}: odd rating ${v}`));
  Object.entries(n.focuses).forEach(([s, list]) => { SKILLS.includes(s) || err("npcs", `${n.name}: focuses under unknown skill ${s}`); list.forEach((f) => hasFocus(f) || err("npcs", `${n.name}: focus "${f}" is not in Focuses`)); });
  n.talents.forEach((x) => has("talents", base(x)) || has("abilities", base(x)) || err("npcs", `${n.name}: talent "${x}" is not in Talents or NPC abilities`));
  n.assets.forEach((a) => has("assets", a) || note("npcs", `${n.name}: asset "${a}" is the stat block's own (no Assets entry)`));
}
for (const a of DB.rows("archetypes")) {
  a.talents.forEach((x) => has("talents", x) || err("archetypes", `${a.name}: talent "${x}" is not in Talents`));
  a.focuses.forEach((f) => hasFocus(f) || err("archetypes", `${a.name}: focus "${f}" is not in Focuses`));
}
for (const f of DB.rows("factions")) {
  f.mandatory.forEach((x) => has("talents", x) || err("factions", `${f.name}: talent "${x}" is not in Talents`));
  f.archetypes.forEach((x) => has("archetypes", x) || err("factions", `${f.name}: archetype "${x}" is not in Archetypes`));
}
for (const h of DB.rows("houses")) {
  if (!/^House /.test(h.name)) err("houses", `${h.name}: name should start "House "`);
  if (h.liege && !has("houses", h.liege)) err("houses", `${h.name}: liege "${h.liege}" is not a House`);
  if (h.homeworld && !has("planets", h.homeworld)) err("houses", `${h.name}: homeworld "${h.homeworld}" is not in Planets`);
  h.primary.concat(h.secondary).forEach((d) => DOMAIN.test(d) || err("houses", `${h.name}: domain "${d}" is not "Area (Type): detail"`));
}
for (const p of DB.rows("planets")) {
  ["house", "vassal"].forEach((k) => p[k] && !has("houses", p[k]) && err("planets", `${p.name}: ${k} "${p[k]}" is not a House`));
  if (p.ruler && !has("organizations", p.ruler)) err("planets", `${p.name}: ruler "${p.ruler}" is not in Factions and powers`);
  if (p.house && p.ruler) err("planets", `${p.name}: has both a ruling House and a non-House ruler`);
}
for (const tr of DB.rows("traits")) tr.usedBy.forEach((w) => has("houses", w) || has("npcs", w) || /template$|^Any House/.test(w) || err("traits", `${tr.name}: used by unknown "${w}"`));
// lore notes (js/db/lore.js) must each attach to a real row and say which canon they come from
for (const [t, n] of DB.loreTargets ? DB.loreTargets() : []) if (!DB.find(t, n)) err(t, `lore for "${n}" matches no entry`);
for (const t of DB.tables()) for (const r of t === "pages" ? [] : DB.rows(t)) (r.lore || []).forEach((n) => {
  if (!["Original", "Expanded", "Encyclopedia"].includes(n.canon)) err(t, `${r.name}: lore note with unknown canon "${n.canon}"`);
  if (!n.text || !/^https:\/\//.test(n.url || "")) err(t, `${r.name}: lore note needs text and a source url`);
});
for (const t of DB.rows("talents")) if (t.faction && !DB.rows("factions").some((f) => f.name === t.faction)) err("talents", `${t.name}: faction "${t.faction}" is not a faction template`);

// ---- report
const counts = DB.stats().filter(([t]) => t !== "pages");
console.log(`DUNE_DB: ${counts.reduce((a, [, n]) => a + n, 0)} rows in ${counts.length} tables (${counts.map(([t, n]) => `${t} ${n}`).join(", ")})`);
if (verbose && notes.length) { console.log(`\n${notes.length} expected loose references:`); notes.forEach((n) => console.log("  " + n)); }
else if (notes.length) console.log(`${notes.length} NPC assets are the stat blocks' own items (run with --verbose to list them).`);
if (errors.length) { console.log(`\n${errors.length} problem(s):`); errors.forEach((e) => console.log("  " + e)); process.exit(1); }
console.log("No problems found.");
