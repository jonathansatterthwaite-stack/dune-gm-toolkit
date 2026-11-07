#!/usr/bin/env node
// Builds js/db/fulltext.local.js — the full text of your own rulebook PDFs, for personal use.
//
//   node tools/build-fulltext.js
//
// Needs pdftotext (Xpdf or Poppler) on PATH and the PDFs in [rulebooks]/.
// The output is gitignored and never published: the GitHub Pages site doesn't load it.
// It adds a "Book pages" table (every page of every book, searchable) and attaches the book's own
// wording to each Compendium entry, matched by the entry's page reference and heading.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "js", "db", "fulltext.local.js");
const BOOKS = [
  { key: "core", title: "Core", file: "DUNE_CoreRules.pdf", re: /^Core\b/ },
  { key: "pp", title: "Power and Pawns", file: "DUNE_PowerAndPawns.pdf", re: /^(Power and Pawns|PP)\b/ },
  { key: "sd", title: "Sand and Dust", file: "DUNE_SandAndDust.pdf", re: /^(Sand and Dust|SD)\b/ },
  { key: "gg", title: "The Great Game", file: "DUNE_TheGreatGame.pdf", re: /^(The Great Game|Great Game|GG)\b/ },
  // adventures and GM aids
  { key: "aod", title: "Agents of Dune", file: "Agents of Dune Digital.pdf", re: /^Agents of Dune p\./ },
  { key: "mod", title: "Masters of Dune", file: "masters of dune digital edition 18-04-23.pdf", re: /^Masters of Dune\b/ },
  { key: "gmt", title: "GM Toolkit", file: "dune gm toolkit digital 1-4-21.pdf", re: /^GM Toolkit\b/ },
  // play materials print no page numbers: their pages are numbered by PDF page
  { key: "gms", title: "GM Screen", file: "gm screen inside digital 23-3-21.pdf", re: /^GM Screen\b/, unnumbered: true },
  { key: "aodc", title: "Agents of Dune Cards", file: "Agents of Dune Cards Digital.pdf", re: /^Agents of Dune Cards\b/, unnumbered: true },
  { key: "aodf", title: "Agents of Dune Folios", file: "Agents of Dune Folios_Print at home.pdf", re: /^Agents of Dune Folios\b/, unnumbered: true },
  { key: "aodh", title: "Agents of Dune Handouts", file: "Agents of Dune Handouts_Digital.pdf", re: /^Agents of Dune Handouts\b/, unnumbered: true },
  { key: "aodt", title: "Agents of Dune Trackers", file: "Agents of Dune Trackers_Digital.pdf", re: /^Agents of Dune Trackers\b/, unnumbered: true },
  { key: "aodz", title: "Agents of Dune Zone Maps", file: "Agents of Dune Zone Maps_Digital.pdf", re: /^Agents of Dune Zone Maps\b/, unnumbered: true },
];
// a footer line such as "DUNE | POWER AND PAWNS 27", "AGENTS OF DUNE / CAMPAIGN SET 9" or "D U N E G A M E M A S T E R' S T O O L K I T 13"
const FOOTER = /^(D\s?U\s?N\s?E\s*\||AGENTS OF DUNE \/|MASTERS OF DUNE\s+\d|D U N E G A M E M A S T E R)/;

// ---------- 1. extract and put each page into reading order ----------
function pdfPages(file) {
  const txt = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", "-eol", "unix", file, "-"], { maxBuffer: 1 << 28 }).toString("utf8");
  return txt.split("\f");
}

// Two-column pages: find the gutter, then read band by band (full-width lines stay in place).
function readingOrder(raw) { return columns(raw.split("\n"), 0); }
function columns(input, depth) {
  let lines = input.map((l) => l.replace(/\s+$/, ""));
  const indent = Math.min(...lines.filter(Boolean).map((l) => l.match(/^ */)[0].length), 1e9);
  if (indent < 1e9 && indent > 0) lines = lines.map((l) => l.slice(indent));
  // a gutter must have text on both sides: ignore columns that are blank on every line's left
  const width = Math.max(0, ...lines.map((l) => l.length));
  let gutter = -1;
  if (width > 60 && depth < 3) {
    let best = 1e9;
    for (let c = Math.floor(width * 0.3); c <= Math.ceil(width * 0.7); c++) {
      let long = 0, hit = 0;
      for (const l of lines) {
        if (l.length <= c + 1) continue;
        long++;
        if (l[c] !== " " || l[c + 1] !== " ") hit++;
      }
      if (long >= 6 && hit < best) { best = hit; gutter = c; }
      if (long >= 6 && hit === best && Math.abs(c - width / 2) < Math.abs(gutter - width / 2)) gutter = c;
    }
    const long = lines.filter((l) => l.length > gutter + 1).length;
    if (gutter < 0 || best > Math.max(2, long * 0.08)) gutter = -1;
  }
  if (gutter < 0) return lines.map((l) => l.trim());
  const out = [];
  let left = [], right = [];
  // each column keeps its indentation so it can be split again (three-column pages, sidebars)
  const flush = () => { if (left.length) out.push(...columns(left, depth + 1), "", ...columns(right, depth + 1)); left = []; right = []; };
  for (const l of lines) {
    const crosses = l.length > gutter + 1 && (l[gutter] !== " " || l[gutter + 1] !== " ") && l.slice(0, gutter).trim() && l.slice(gutter).trim();
    if (crosses) { flush(); out.push(l.trim().replace(/\s{3,}/g, "   ")); continue; }
    left.push(l.slice(0, gutter));
    right.push(l.slice(gutter + 2));
  }
  flush();
  return out;
}

// Footer page number if the page prints one, else null.
function printedNumber(lines) {
  const tail = lines.filter(Boolean).slice(-4).concat(lines.filter(Boolean).slice(0, 2));
  for (const l of tail) {
    const m = l.match(/^(\d{1,3})$/) || l.match(/(?:IMPERIUM|PAWNS|DUST|LANDSRAAD|GAME|SET|DUNE|T)\s+(\d{1,3})$/) || l.match(/^(\d{1,3})\s+[A-Z]/);
    if (m) return +m[1];
  }
  return null;
}

// Join wrapped lines into paragraphs, mend hyphenation.
function reflow(lines) {
  const paras = [];
  let cur = "";
  for (const l of lines) {
    if (!l) { if (cur) paras.push(cur); cur = ""; continue; }
    if (/^(@|•)\s/.test(l) && cur) { paras.push(cur); cur = ""; }
    if (!cur) cur = l;
    else if (/[a-z]-$/.test(cur) && /^[a-z]/.test(l)) cur = cur.slice(0, -1) + l;
    else cur += " " + l;
  }
  if (cur) paras.push(cur);
  return paras.map((p) => p.replace(/^@\s/, "• ")).join("\n\n");
}

// ---------- 2. load the database rows ----------
function loadDB() {
  const ctx = { console };
  ctx.window = ctx;
  const files = ["js/data.js", "js/expansions.js", "js/characters-data.js", "js/db.js",
    ...fs.readdirSync(path.join(ROOT, "js/db")).filter((f) => f.endsWith(".js") && !f.endsWith(".local.js")).map((f) => "js/db/" + f)];
  const vm = require("vm");
  vm.createContext(ctx);
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }));
  return ctx.DUNE_DB;
}

// ---------- 3. match entries to their text ----------
const norm = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "");
const looksLikeHeading = (l) => {
  if (!l || l.length > 60 || /[.,;:]$/.test(l) || /^(As an Asset|Keywords|Quality|Special|Example)\b/i.test(l)) return false;
  const letters = l.replace(/[^A-Za-z]/g, "");
  if (letters.length < 3) return false;
  if (letters === letters.toUpperCase() && l.split(/\s+/).length <= 9) return true;   // ALL CAPS
  const toks = l.split(/\s+/);
  return toks.length >= 4 && toks.filter((t) => t.length <= 2).length / toks.length > 0.6;  // l e t t e r - s p a c e d
};

function main() {
  const pages = {}, pageNo = {};
  for (const b of BOOKS) {
    const file = path.join(ROOT, "[rulebooks]", b.file);
    if (!fs.existsSync(file)) { console.warn("missing", file); continue; }
    process.stdout.write(`Reading ${b.title}… `);
    const ordered = pdfPages(file).map(readingOrder);
    if (ordered.length && !ordered[ordered.length - 1].some(Boolean)) ordered.pop();  // pdftotext ends on a form feed
    if (b.unnumbered) {
      pageNo[b.key] = ordered.map((_, i) => i + 1);
      pages[b.key] = ordered;
      console.log(`${ordered.length} pages (numbered by PDF page)`);
      continue;
    }
    // printed page numbers: read footers, fill gaps from the nearest known offset
    const printed = ordered.map(printedNumber);
    const offs = printed.map((n, i) => (n != null ? i - n : null));
    let common = {}; offs.forEach((o) => o != null && (common[o] = (common[o] || 0) + 1));
    const off = +Object.entries(common).sort((a, b) => b[1] - a[1])[0][0];
    pageNo[b.key] = ordered.map((_, i) => i - off);
    pages[b.key] = ordered;
    console.log(`${ordered.length} pages (printed page = PDF page − ${off + 1})`);
  }

  const DB = loadDB();
  const entries = {};
  let section = 0, pageOnly = 0, none = 0;
  const WHOLE_PAGE = new Set(["npcs", "houses", "planets"]);
  for (const t of DB.tables()) {
    for (const r of DB.rows(t)) {
      const ref = String(r.src || "").split(";")[0].trim();
      const b = BOOKS.find((x) => x.re.test(ref));
      const m = ref.match(/p\.\s*(\d+)(?:\s*[–-]\s*(\d+))?/);
      if (!b || !m || !pages[b.key]) { none++; continue; }
      const p = +m[1], pEnd = m[2] ? +m[2] : p;
      const idx = pageNo[b.key].indexOf(p);
      if (idx < 0) { none++; continue; }
      const span = (pEnd - p) + (WHOLE_PAGE.has(t) ? 2 : t === "ventures" ? 13 : 4);
      const win = [];
      for (let i = Math.max(0, idx - 1); i < Math.min(pages[b.key].length, idx + span); i++) pages[b.key][i].forEach((l) => win.push({ l, i }));
      // names to look for: the entry name, its title, and the name without honorifics or "House"
      const base = r.name.replace(/\s*\(.*\)$/, "");
      // strong names may match loosely; weak ones (last two words, an NPC's first name) only exactly
      const strong = Array.from(new Set([base, base.replace(/^House\s+/, ""), r.title || ""].map(norm).filter((c) => c.length >= 4)));
      const weak = [base.split(/\s+/).slice(-2).join(" "), t === "npcs" ? base.split(/\s+/)[0] : ""].map(norm).filter((c) => c.length >= 6 && !strong.includes(c));
      const cands = strong.concat(weak);
      const plain = base.replace(/^House\s+/, "");
      let at = -1, inline = false;
      const exact = (x) => x.l.length < 70 && cands.includes(norm(x.l));
      const headed = (x) => looksLikeHeading(x.l) && strong.some((c) => { const n = norm(x.l); return n.length >= 4 && (n.includes(c) || (c.startsWith(n) && n.length >= 6)); });
      // an entry that starts a paragraph: "HOUSE TALOS Heads…", "@ Desert Navigation (Understand) – …", "Keres (Kora II) is…"
      const lead = (x) => { const l = x.l.replace(/^[@•]\s*/, "").replace(/^HOUSE\s+/, ""); return x.l.length >= 30 && (l.startsWith(plain + " ") || l.toUpperCase().startsWith(plain.toUpperCase() + " ")) && (l.startsWith(plain.toUpperCase()) || /^[@•]/.test(x.l) || /^\S+\s+\(/.test(l) || t === "planets"); };
      if (cands.length) {
        at = win.findIndex((x) => x.i >= idx && exact(x));
        if (at < 0) at = win.findIndex((x) => x.i >= idx && headed(x));
        if (at < 0) { at = win.findIndex((x) => x.i >= idx && lead(x)); inline = at >= 0; }
        if (at < 0) at = win.findIndex(exact);
      }
      if (at >= 0) {
        const body = [win[at].l];
        const limit = WHOLE_PAGE.has(t) ? 4000 : 400;
        for (let j = at + 1; j < win.length && body.length < limit; j++) {
          const l = win[j].l;
          if (inline && !l) break;
          if (!WHOLE_PAGE.has(t) && looksLikeHeading(l) && body.filter(Boolean).length > 1) break;
          if (WHOLE_PAGE.has(t) && win[j].i > idx + 1) break;
          if (FOOTER.test(l) || /^\d{1,3}$/.test(l)) continue;
          body.push(l);
        }
        entries[r.id] = { book: b.key, page: p, how: "section", text: reflow(body) };
        section++;
      } else {
        entries[r.id] = { book: b.key, page: p, how: "page" };
        pageOnly++;
      }
    }
  }

  const bookPages = [];
  for (const b of BOOKS) {
    if (!pages[b.key]) continue;
    pages[b.key].forEach((lines, i) => {
      const text = reflow(lines.filter((l) => !FOOTER.test(l)));
      if (!text.trim()) return;
      const n = pageNo[b.key][i];
      const label = n > 0 ? `p.${n}` : `PDF page ${i + 1}`;
      const spaced = (l) => { const t = l.split(/\s+/); return t.length >= 3 && t.filter((x) => x.length <= 2).length / t.length > 0.4; };
      const ok = lines.filter((l) => l && l.length <= 60 && !spaced(l) && !/^D\s?U\s?N\s?E|^\d+$/.test(l) && /[A-Za-z]{3}/.test(l));
      const head = ok.find(looksLikeHeading) || ok[0] || "";
      bookPages.push({ id: `pages:${b.key}-${i + 1}`, name: `${b.title} ${label}`, bookKey: b.key, pdfPage: i + 1, page: n, heading: head.slice(0, 50), text, src: `${b.title} ${label}` });
    });
  }

  const js = "// GENERATED by tools/build-fulltext.js from your own PDFs — personal use only. Gitignored; do not publish.\n" +
    "window.DUNE_FULLTEXT = " + JSON.stringify({ built: new Date().toISOString(), entries }) + ";\n" +
    "if (window.DUNE_DB) DUNE_DB.add(\"pages\", " + JSON.stringify(bookPages) + ");\n";
  fs.writeFileSync(OUT, js);
  console.log(`Matched ${section} entries to their section, ${pageOnly} to their page only, ${none} without a page reference.`);
  console.log(`${bookPages.length} book pages. Wrote ${path.relative(ROOT, OUT)} (${(js.length / 1048576).toFixed(1)} MB).`);
}
main();
