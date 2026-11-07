"""Generate css/imperial.css: the Imperial theme's ornaments (original SVG line work) and component styling."""
import math, sys, urllib.parse

def uri(svg):
    return 'url("data:image/svg+xml,' + urllib.parse.quote(svg.strip(), safe=" =:/;,'()-.") + '")'

W = 'xmlns="http://www.w3.org/2000/svg"'
# ---- shapes (white strokes: these are used as masks, the color comes from CSS)
def corner(rot):
    return f'''<svg {W} viewBox="0 0 40 40"><g fill="none" stroke="#fff" stroke-width="1.4" transform="rotate({rot} 20 20)">
<path d="M1.5 39 V1.5 H39"/><path d="M6 30 V6 H30"/><path d="M6 1.5 L10.5 6 L6 10.5 L1.5 6 Z"/><path d="M11 20 V11 H20"/><path d="M14.5 14.5 h4 v4 h-4 z"/></g></svg>'''

def star_points(cx, cy, R, r, n=8, rot=-90):
    pts = []
    for k in range(2 * n):
        a = math.radians(rot + k * 180 / n)
        rad = R if k % 2 == 0 else r
        pts.append(f"{cx + rad * math.cos(a):.2f},{cy + rad * math.sin(a):.2f}")
    return " ".join(pts)

STAR = f'<svg {W} viewBox="0 0 100 100"><polygon fill="#fff" points="{star_points(50, 50, 50, 30)}"/></svg>'
# octagram line ornament: two squares and a ring (dividers, the brand mark)
OCTA = f'''<svg {W} viewBox="0 0 100 100"><g fill="none" stroke="#fff" stroke-width="5">
<rect x="20" y="20" width="60" height="60"/><rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="15"/></g></svg>'''
# an arch with an ogee point, like the reference banners: stretched to its box, the stroke stays thin
ARCH = f'''<svg {W} viewBox="0 0 100 160" preserveAspectRatio="none"><g fill="none" stroke="#fff" stroke-width="1.6" vector-effect="non-scaling-stroke">
<path vector-effect="non-scaling-stroke" d="M4 158 V46 C4 30 30 24 42 13 C47 9 49 5 50 1 C51 5 53 9 58 13 C70 24 96 30 96 46 V158 Z"/>
<path vector-effect="non-scaling-stroke" d="M10 152 V48 C10 35 33 29 44 19 C47 16 49 13 50 9 C51 13 53 16 56 19 C67 29 90 35 90 48 V152 Z"/>
<path vector-effect="non-scaling-stroke" d="M44 158 L50 152 L56 158"/></g></svg>'''

# ---- colored pieces (drawn in fixed colors)
CLOUD = f'''<svg {W} viewBox="0 0 132 44">
<g stroke="#e2c391" stroke-linecap="round" fill="none" stroke-width="1.3"><path d="M2 33 H46"/><path d="M14 38 H58"/><path d="M104 36 H130"/><path d="M92 40 H120"/></g>
<path d="M50 34 C44 30 46 20 54 20 C54 12 64 8 71 12 C75 5 88 4 92 12 C99 9 108 14 106 21 C114 21 118 30 111 34 Z" fill="#2a50a6" stroke="#e2c391" stroke-width="1.6"/>
<path d="M55 34 C51 31 53 25 58 25" fill="none" stroke="#7ea5ee" stroke-width="1.2"/>
<g fill="none" stroke="#e2c391" stroke-width="1.3" stroke-linecap="round">
<path d="M74 24 c-4 0 -5 -6 -1 -7 c4 -1 6 4 3 6 c-2 1 -3 -1 -2 -2"/>
<path d="M92 22 c-4 0 -5 -6 -1 -7 c4 -1 6 4 3 6 c-2 1 -3 -1 -2 -2"/></g>
<g fill="none" stroke="#7ea5ee" stroke-width="1.1" stroke-linecap="round"><path d="M63 29 c-2 -3 1 -6 4 -4"/><path d="M100 28 c2 -3 -1 -6 -4 -4"/><path d="M82 15 c3 -2 6 1 4 4"/></g>
<g fill="#e2c391"><circle cx="40" cy="26" r="2"/><circle cx="122" cy="26" r="1.6"/><circle cx="6" cy="27" r="1.2"/></g></svg>'''

SPECKS = f'''<svg {W} viewBox="0 0 320 320"><g fill="#c0334a">
<circle cx="31" cy="44" r="1.3" opacity=".55"/><circle cx="212" cy="18" r="0.9" opacity=".4"/><circle cx="288" cy="97" r="1.6" opacity=".5"/>
<circle cx="140" cy="133" r="1" opacity=".35"/><circle cx="62" cy="201" r="1.8" opacity=".45"/><circle cx="251" cy="236" r="1.1" opacity=".5"/>
<circle cx="176" cy="290" r="1.4" opacity=".35"/><circle cx="12" cy="300" r="0.8" opacity=".5"/><circle cx="305" cy="172" r="0.7" opacity=".6"/>
<circle cx="99" cy="88" r="0.6" opacity=".6"/><circle cx="231" cy="149" r="0.6" opacity=".45"/></g></svg>'''

V = {
    "corner-tl": uri(corner(0)), "corner-tr": uri(corner(90)), "corner-br": uri(corner(180)), "corner-bl": uri(corner(270)),
    "star": uri(STAR), "octa": uri(OCTA), "arch": uri(ARCH), "cloud": uri(CLOUD), "specks": uri(SPECKS),
}

css = """/* Imperial theme: the ornaments and the dressing of shared components.
   GENERATED from tools/gen-imperial.py — edit that, then run: python tools/gen-imperial.py
   All shapes are original line work in the spirit of the style references (pointed arches, eight-point stars,
   stepped corners, gold on smoky charcoal, blue-and-gold clouds). Colors come from the theme tokens in
   css/styles.css, so the Parchment theme gets the same ornaments in its own colors. */
:root {
""" + "".join(f"  --i-{k}: {v};\n" for k, v in V.items()) + """}

/* ---------- page: smoky charcoal with crimson specks ---------- */
body {
  background:
    var(--i-specks) 0 0 / 320px 320px,
    radial-gradient(ellipse 60% 45% at 18% 8%, rgba(255, 255, 255, 0.045), transparent 70%),
    radial-gradient(ellipse 55% 40% at 85% 55%, rgba(140, 50, 70, 0.07), transparent 70%),
    radial-gradient(ellipse 70% 50% at 40% 100%, rgba(255, 255, 255, 0.03), transparent 70%),
    var(--bg);
  background-attachment: fixed;
}
:root[data-theme="light"] body { background: var(--bg); }
h1, h2, h3 { letter-spacing: 0.03em; }
.card-head h2, .card > h2:first-child { color: var(--gold-strong); }
:root[data-theme="light"] .card-head h2, :root[data-theme="light"] .card > h2:first-child { color: var(--ink); }
a, .db-link { color: var(--gold); }
button.db-link { background: none; border: 0; padding: 0; font: inherit; color: var(--gold); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
button.db-link:hover { color: var(--gold-strong); }
:root[data-theme="light"] a, :root[data-theme="light"] .db-link { color: var(--accent); }

/* ---------- top bar ---------- */
.topbar { background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), transparent), var(--surface); border-bottom: 1px solid var(--line); box-shadow: 0 1px 0 var(--line-faint), 0 6px 18px rgba(0, 0, 0, 0.35); }
:root[data-theme="light"] .topbar { background: var(--surface); box-shadow: 0 1px 0 var(--line-faint), var(--shadow); }
.brand { position: relative; }
.brand-mark { width: 30px; height: 30px; font-size: 0; display: inline-block; background: var(--gold); -webkit-mask: var(--i-octa) center / contain no-repeat; mask: var(--i-octa) center / contain no-repeat; flex: none; }
.brand-title { font-size: 1.3rem; letter-spacing: 0.06em; color: var(--gold-strong); }
.brand > div { position: relative; padding-right: 88px; }
.brand > div::after { content: ""; position: absolute; right: 0; top: 50%; width: 80px; height: 27px; transform: translateY(-50%); background: var(--i-cloud) center / contain no-repeat; opacity: 0.95; }
.pool { border: 1px solid var(--line); background-clip: padding-box; }
.pool-threat { border-color: rgba(192, 51, 74, 0.55); }
.pool-momentum { border-color: rgba(126, 165, 238, 0.45); }

/* ---------- tabs: serif small caps; the open tab gets a pointed gold frame ---------- */
.tabs { border-bottom: 1px solid var(--line); box-shadow: 0 1px 0 var(--line-faint); gap: 0.15rem; padding-top: 0.6rem; }
.tabs button { font-variant: small-caps; letter-spacing: 0.06em; color: var(--muted); border-bottom: 0; padding: 0.45rem 1.05rem; position: relative; isolation: isolate; }
.tabs button:hover { color: var(--gold); }
.tabs button.on { color: var(--gold-strong);
  --tab: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
  background: var(--gold); clip-path: var(--tab); }
.tabs button.on::before { content: ""; position: absolute; inset: 1px 1.4px; z-index: -1; background: var(--surface); clip-path: var(--tab); }

/* ---------- cards: thin gold frame, a faint inner rule and stepped corner pieces ---------- */
.card { position: relative; isolation: isolate; background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), transparent 120px), var(--surface); border: 1px solid var(--line); border-radius: 3px;
  box-shadow: inset 0 0 0 4px var(--surface), inset 0 0 0 5px var(--line-faint), var(--shadow); }
.card::before { content: ""; position: absolute; inset: 3px; pointer-events: none; z-index: -1; background: var(--orn);
  -webkit-mask: var(--i-corner-tl) top left / 26px 26px no-repeat, var(--i-corner-tr) top right / 26px 26px no-repeat, var(--i-corner-br) bottom right / 26px 26px no-repeat, var(--i-corner-bl) bottom left / 26px 26px no-repeat;
  mask: var(--i-corner-tl) top left / 26px 26px no-repeat, var(--i-corner-tr) top right / 26px 26px no-repeat, var(--i-corner-br) bottom right / 26px 26px no-repeat, var(--i-corner-bl) bottom left / 26px 26px no-repeat; }
.card .card, .tl-form.card { box-shadow: inset 0 0 0 4px var(--surface), inset 0 0 0 5px var(--line-faint); }

/* ---------- controls ---------- */
input, select, textarea { background: rgba(0, 0, 0, 0.22); border-color: var(--line); border-radius: 3px; color: var(--ink); }
:root[data-theme="light"] input, :root[data-theme="light"] select, :root[data-theme="light"] textarea { background: var(--surface); }
select option { background: var(--surface); color: var(--ink); }
.btn { border-radius: 3px; border-color: var(--line); background: rgba(255, 255, 255, 0.03); color: var(--ink); }
.btn:hover { border-color: var(--gold); color: var(--gold-strong); }
.btn.primary { background: linear-gradient(180deg, var(--gold-strong), var(--gold)); border-color: var(--gold); color: var(--on-accent); letter-spacing: 0.02em; }
.btn.primary:hover { color: var(--on-accent); filter: brightness(1.08); }
:root[data-theme="light"] .btn.primary { background: var(--accent); border-color: var(--accent); }
.btn.ghost { background: transparent; }
.seg { border-color: var(--line); border-radius: 3px; }
.seg button { background: transparent; border-right-color: var(--line); }
.seg button.on { background: var(--gold); color: var(--on-accent); }
:root[data-theme="light"] .seg button.on { background: var(--accent); }
.chip { border-color: var(--line) !important; }
.badge { border-color: var(--line); background: transparent; color: var(--gold); }
dialog { background: var(--surface); color: var(--ink); border: 1px solid var(--line); box-shadow: inset 0 0 0 4px var(--surface), inset 0 0 0 5px var(--line-faint), var(--shadow); }
dialog::backdrop { background: rgba(8, 6, 10, 0.65); }

/* ---------- rules and dividers: a gold line broken by an eight-point star ---------- */
.divider { border: 0; height: 14px; margin: 0.8rem 0; background:
  linear-gradient(var(--line), var(--line)) left center / calc(50% - 14px) 1px no-repeat,
  linear-gradient(var(--line), var(--line)) right center / calc(50% - 14px) 1px no-repeat; position: relative; }
.divider::after { content: ""; position: absolute; left: 50%; top: 0; width: 14px; height: 14px; transform: translateX(-50%); background: var(--orn); -webkit-mask: var(--i-octa) center / contain no-repeat; mask: var(--i-octa) center / contain no-repeat; }

/* ---------- blue-and-gold cloud accents, used sparingly ---------- */
.tl-lore .card-head h3::after, .cg-h h2::after { content: ""; display: inline-block; width: 58px; height: 19px; margin-left: 0.5rem; vertical-align: -2px; background: var(--i-cloud) center / contain no-repeat; }
.empty::before { content: ""; display: block; width: 70px; height: 23px; margin: 0.2rem 0 0.35rem; background: var(--i-cloud) left center / contain no-repeat; opacity: 0.85; }

/* ---------- art: figures stand in a pointed gold arch ---------- */
.db-art-fig, .cg-fac-art { position: relative; isolation: isolate; }
.db-art-fig.k-character::before, .db-art-fig.k-portrait::before, .cg-fac-art::before { content: ""; position: absolute; z-index: -1; left: 8%; right: 8%; top: 0; bottom: 1.6rem; background: var(--line);
  -webkit-mask: var(--i-arch) center / 100% 100% no-repeat; mask: var(--i-arch) center / 100% 100% no-repeat; }
.db-art-fig.big::before { bottom: 0; }
.cg-fac-art::before { bottom: 0; left: 6%; right: 6%; }

/* ---------- timeline: dots become eight-point stars ---------- */
.tl-dot { border: 0; border-radius: 0; box-shadow: none; width: 18px; height: 18px; background: var(--gold); -webkit-mask: var(--i-star) center / contain no-repeat; mask: var(--i-star) center / contain no-repeat; }
.tl-dot.inherited { background: var(--gold-dim); box-shadow: none; }
.tl-dot.custom { background: var(--good); box-shadow: none; }
.tl-dot.on { background: var(--crimson); box-shadow: none; transform: translateX(-50%) scale(1.6); }
.tl-scroller { background: rgba(0, 0, 0, 0.2); border-color: var(--line); border-radius: 3px; }
:root[data-theme="light"] .tl-scroller { background: var(--surface-2); }
.tl-axis { background: var(--line); }
.tl-band { border-left-color: var(--line-faint); }
.tl-band.b0 { background: rgba(226, 195, 145, 0.05); }
.tl-band.b1 { background: transparent; }
.tl-band span { color: var(--gold-dim); }
.tl-center { border-left-color: var(--crimson); }
.tl-center span { background: var(--crimson); color: #fff; font-family: var(--serif); letter-spacing: 0.04em; }
.tl-step { background: var(--surface); border-color: var(--line); color: var(--gold); }
.tl-forkline { border-left-color: var(--gold); }
.tl-forkline button { background: var(--surface); border-color: var(--gold); }

/* ---------- smaller pieces that used warm parchment colors ---------- */
.db-row.on, .db-tab.on { border-color: var(--gold) !important; }
.cg-arch, .cg-kind, .cg-skill, .cg-drive, .cg-talent { border-radius: 3px; }
"""
import os
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "css", "imperial.css")
open(out, "w", encoding="utf-8").write(css)
print("wrote", out, len(css), "bytes")
