#!/usr/bin/env python3
"""Extract the character art, House banners and crests from your own rulebook PDFs.

    python tools/extract-art.py

Needs pypdfium2 and Pillow (pip install pypdfium2 pillow), plus numpy and scipy for the five Power and Pawns
court NPCs, whose figures are flattened into the page and have to be cut out of it. The PDFs go in [rulebooks]/.
Writes transparent WebP images to img/local/art/ and a manifest to js/db/art.local.js, which adds an "art" table
to the database and links each image to the entries it shows. Both are gitignored: personal use only, and the
public site never loads them.
"""
import json
import os
import sys

import pypdfium2 as pdfium
import pypdfium2.raw as raw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = os.path.join(ROOT, "[rulebooks]")
OUT_DIR = os.path.join(ROOT, "img", "local", "art")
MANIFEST = os.path.join(ROOT, "js", "db", "art.local.js")
PDF = {"core": ("DUNE_CoreRules.pdf", "Core", 9), "pp": ("DUNE_PowerAndPawns.pdf", "Power and Pawns", 5),
       "sd": ("DUNE_SandAndDust.pdf", "Sand and Dust", 3), "gg": ("DUNE_TheGreatGame.pdf", "Great Game", 7)}

# One row per image: (id, book, PDF page, pick, kind, name, links, faction templates it illustrates, other pages it
# also appears on). pick is "largest", "left", "right", "middle", or "cutout" (figure flattened into the page).
# links are "table:Name" entries the image shows. Where the same art is printed more than once, the sharpest copy
# is listed and the others go in `also`.
C = "character"
ART = [
    # ---- Core Rules: faction templates (p.110-112) and the example character (p.125)
    ("bene-gesserit", "core", 119, "largest", C, "Bene Gesserit Sister", ["factions:Bene Gesserit"], ["Bene Gesserit"], ["Core p.54"]),
    ("fremen", "core", 120, "left", C, "Fremen warrior", ["factions:Fremen"], ["Fremen"], []),
    ("mentat", "core", 120, "right", C, "Mentat", ["factions:Mentat"], ["Mentat"], ["Core p.52"]),
    ("guild-agent", "pp", 112, "largest", C, "Spacing Guild agent", ["factions:Spacing Guild", "npcs:Guild Agent"], ["Spacing Guild"], ["Core p.112", "Great Game p.71"]),
    ("suk-doctor", "pp", 62, "largest", C, "Suk doctor", ["factions:Suk Doctor", "npcs:Healer"], ["Suk Doctor"], ["Core p.112", "Core p.282"]),
    ("kara-molay", "core", 134, "largest", C, "Kara Molay, the Core Rules' example character", [], [""], []),
    ("fremen-camp", "core", 131, "largest", C, "Fremen at rest (character creation)", ["factions:Fremen"], [], []),
    # ---- Core Rules: allies and adversaries (p.271-294)
    ("arrakeen-native", "core", 280, "largest", C, "Arrakeen Native", ["npcs:Arrakeen Native"], [], []),
    ("criminal", "core", 284, "largest", C, "Criminal", ["npcs:Criminal"], [], []),
    ("courtier", "core", 285, "largest", C, "Courtier", ["npcs:Courtier"], [], ["Core p.7"]),
    ("fremen-elder", "core", 288, "largest", C, "Fremen Elder", ["npcs:Fremen Elder"], [], []),
    ("swordmaster", "pp", 54, "largest", C, "Swordmaster", ["npcs:House Soldier/Guard", "factions:Ginaz Cadet", "factions:Ginaz Swordmaster"], ["Ginaz Cadet", "Ginaz Swordmaster"], ["Core p.283"]),
    ("choam-agent", "pp", 125, "largest", C, "CHOAM agent", ["factions:CHOAM Agent", "npcs:Mentat"], ["CHOAM Agent"], ["Core p.284"]),
    ("sardaukar", "core", 297, "largest", C, "Sardaukar", ["npcs:Sardaukar (Elite Soldier)", "factions:Sardaukar"], ["Sardaukar"], ["Power and Pawns p.27"]),
    ("scientist", "core", 298, "largest", C, "Scientist", ["npcs:Scientist"], [], []),
    ("servant", "core", 299, "largest", C, "Servant", ["npcs:Servant"], [], []),
    ("smuggler", "core", 300, "largest", C, "Smuggler", ["npcs:Smuggler"], [], []),
    ("spy", "core", 301, "largest", C, "Spy", ["npcs:Spy/Infiltrator"], [], ["Core p.7", "Core p.39"]),
    ("tleilaxu-master", "pp", 48, "largest", C, "Tleilaxu Master", ["npcs:Tleilaxu Master", "factions:Tleilaxu Face Dancer"], ["Tleilaxu Face Dancer"], ["Core p.294"]),
    # ---- Power and Pawns: the Imperial court (p.22-26), cut out of the page
    ("bodyguard", "pp", 27, "cutout", C, "Bodyguard", ["npcs:Bodyguard"], [], []),
    ("confidante", "pp", 28, "cutout", C, "Confidante", ["npcs:Confidante"], [], []),
    ("scheming-noble", "pp", 29, "cutout", C, "Scheming Noble", ["npcs:Scheming Noble"], [], []),
    ("socialite", "pp", 30, "cutout", C, "Socialite", ["npcs:Socialite"], [], []),
    ("weak-noble", "pp", 31, "cutout", C, "Weak Noble", ["npcs:Weak Noble"], [], []),
    # ---- Sand and Dust: the people of Arrakis (p.100-118)
    ("fremen-craftsperson", "sd", 107, "largest", C, "Fremen Craftsperson", ["npcs:Fremen Craftsperson"], [], []),
    ("fremen-sayyadina", "sd", 110, "largest", C, "Fremen Sayyadina", ["npcs:Fremen Sayyadina"], [], []),
    ("informant", "sd", 113, "largest", C, "Informant", ["npcs:Informant"], [], []),
    ("mystic", "sd", 116, "largest", C, "Mystic", ["npcs:Mystic"], [], []),
    ("ornithopter-pilot", "sd", 117, "largest", C, "Ornithopter Pilot", ["npcs:Ornithopter Pilot"], [], []),
    ("spice-worker", "sd", 121, "largest", C, "Spice Worker", ["npcs:Spice Worker"], [], []),
    # ---- The Great Game: Spacing Guild archetypes (p.72-75)
    ("guild-financier", "gg", 79, "largest", C, "Guild archetype", ["archetypes:Guild Engineer", "archetypes:Guild Financier"], [], []),
    ("guild-operative", "gg", 82, "largest", C, "Guild operative", ["organizations:Spacing Guild"], [], []),
    # ---- Crests of the three Houses in the Core Rules (p.41)
    ("crest-atreides", "core", 50, "middle", "crest", "Atreides crest", ["houses:House Atreides"], [], ["Core p.241"]),
    ("crest-harkonnen", "core", 50, "left", "crest", "Harkonnen crest", ["houses:House Harkonnen"], [], ["Core p.250"]),
    ("crest-corrino", "core", 50, "right", "crest", "Corrino crest", ["houses:House Corrino"], [], ["Core p.255"]),
]
# The Great Game's House banners, one per House page (p.30-64)
for i, h in enumerate(["Alexin", "Atreides", "Ecaz", "Hagal", "Harkonnen", "Kenola", "Lindaren", "Maros", "Mikarrol",
                       "Moritani", "Mutelli", "Novebruns", "Richese", "Spinnette", "Taligari", "Thorvald", "Vernius", "Wydras"]):
    ART.append((f"banner-{h.lower()}", "gg", 37 + 2 * i, "largest", "banner", f"House {h} banner", [f"houses:House {h}"], [], []))

# cut-out settings for the flattened Power and Pawns pages (even pages have a decorative band to strip)
CUTOUT = {27: {}, 29: {}, 31: {}, 28: {"parch": 160, "far": 70}, 30: {"parch": 160, "far": 70}}


def figures(page):
    """Cut-out images on a page: images with transparency that aren't full-page backgrounds."""
    out = []
    for obj in page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE], max_depth=6):
        w, h = obj.get_px_size()
        if (w >= 1200 and h >= 1600) or w * h < 100000:
            continue
        img = obj.get_bitmap(render=True).to_pil().convert("RGBA")
        if img.getextrema()[3][0] == 255:  # fully opaque: a scene, not a cut-out
            continue
        left, _, right, _ = obj.get_bounds()
        out.append({"img": img, "x": (left + right) / 2, "area": w * h})
    return out


def cutout(page, parch=0, far=18, tol=34):
    """Cut the figure out of a page that is one flattened image: grow the page background in from the edges."""
    import numpy as np
    from PIL import Image
    from scipy import ndimage as ndi
    o = max(page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE], max_depth=10), key=lambda o: o.get_px_size()[0] * o.get_px_size()[1])
    im = o.get_bitmap(render=False).to_pil().convert("RGB")
    a = np.asarray(im, dtype=np.float32)
    H, W, _ = a.shape
    L, sat = a.mean(2), a.max(2) - a.min(2)
    ink = (L < 150) | (sat > 70)  # where the figure is: dark or colorful, right of the text column
    ink[:, : int(W * 0.3)] = False
    ink[: int(H * 0.08)] = False
    lab, n = ndi.label(ndi.binary_dilation(ink, iterations=12))
    k = int(np.argmax(ndi.sum(ink, lab, range(1, n + 1)))) + 1
    ys, xs = np.where(lab == k)
    c = a[max(0, ys.min() - 30): ys.max() + 30, max(0, xs.min() - 30): xs.max() + 30]
    cL, cs = c.mean(2), c.max(2) - c.min(2)
    bg = np.median(np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]]), axis=0)
    near = (np.sqrt(((c - bg) ** 2).sum(2)) < tol) | ((cL > 212) & (cs < 24))
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ndi.binary_opening(~np.isin(lab, list(edge)), iterations=3)
    filled = ndi.binary_fill_holes(fg)
    hl, hn = ndi.label(filled & ~fg)  # enclosed holes that are mostly page background stay clear
    if hn:
        share = ndi.mean(near.astype(float), hl, range(1, hn + 1))
        filled[np.isin(hl, [i + 1 for i, v in enumerate(share) if v > 0.5])] = False
    fg = filled & ~ndi.binary_opening(near & filled, iterations=4)
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.02 * sizes.max()])
    core = ndi.binary_opening(fg, iterations=10)  # drop blobs hanging on by a thin bridge
    cl, cn = ndi.label(core)
    if cn:
        core = cl == int(np.argmax(ndi.sum(core, cl, range(1, cn + 1)))) + 1
        fg = fg & ndi.binary_dilation(core, iterations=13)
    fg = ndi.binary_erosion(fg, iterations=3)
    alpha = ndi.gaussian_filter(fg.astype(np.float32), 1.0)
    if parch:  # the decorative page band: light parchment away from the figure, or past its right edge
        cy = (c[..., 0] + c[..., 1]) / 2 - c[..., 2]
        core_d = ndi.distance_transform_edt(~ndi.binary_dilation(cL < 135, iterations=2))
        band = (cL > parch) & (cs < 46) & (cy > 10) & (cy < 36) & (core_d > far)
        dark = ndi.binary_opening(cL < 135, iterations=2)
        right = ndi.maximum_filter1d(np.array([np.where(r)[0].max() if r.any() else -1 for r in dark], dtype=float), 25)
        band |= (cL > parch - 25) & (cy > 6) & (cy < 40) & (np.arange(c.shape[1])[None, :] > right[:, None] + 10)
        alpha = ndi.gaussian_filter(alpha * ~ndi.binary_dilation(band, iterations=2), 0.8)
    img = Image.fromarray(np.dstack([c, alpha * 255]).clip(0, 255).astype(np.uint8), "RGBA")
    return img.crop(img.getbbox())


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    docs, images, factions = {}, [], {}
    for aid, book, pdf_page, pick, kind, name, links, facs, also in ART:
        pdf_name, book_name, off = PDF[book]
        path = os.path.join(BOOKS, pdf_name)
        if not os.path.exists(path):
            print("missing", path)
            continue
        doc = docs.setdefault(book, pdfium.PdfDocument(path))
        page = doc[pdf_page - 1]
        if pick == "cutout":
            try:
                img = cutout(page, **CUTOUT.get(pdf_page, {}))
            except ImportError:
                print(f"skipped {name}: needs numpy and scipy (pip install numpy scipy)")
                continue
        else:
            figs = sorted(figures(page), key=lambda f: f["x"])
            if not figs:
                print(f"no figure found for {name} on {pdf_name} PDF page {pdf_page}")
                continue
            fig = (figs[0] if pick == "left" else figs[-1] if pick == "right" else figs[len(figs) // 2] if pick == "middle"
                   else max(figs, key=lambda f: f["area"]))
            img = fig["img"]
            img = img.crop(img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox())
        cap = 500 if kind == "crest" else 1000
        if max(img.size) > cap:
            s = cap / max(img.size)
            img = img.resize((round(img.width * s), round(img.height * s)))
        file = f"{aid}.webp"
        img.save(os.path.join(OUT_DIR, file), "WEBP", quality=82, method=6)
        printed = f"{book_name} p.{pdf_page - off}"
        rec = {"id": aid, "kind": kind, "name": name, "src": f"img/local/art/{file}", "w": img.width, "h": img.height,
               "page": printed, "also": also, "links": links}
        images.append(rec)
        for f in facs:
            factions[f] = {"src": rec["src"], "w": img.width, "h": img.height, "caption": printed}
        print(f"{name:42} {img.width}x{img.height}  <- {printed}")
    with open(MANIFEST, "w", encoding="utf-8") as f:
        f.write("// GENERATED by tools/extract-art.py from your own PDFs - personal use only. Gitignored; do not publish.\n")
        f.write("window.DUNE_ART = " + json.dumps({"factions": factions, "images": images}) + ";\n")
        f.write("if (window.DUNE_DB) DUNE_DB.add(\"art\", DUNE_ART.images.map((i) => ({ id: \"art:\" + i.id, name: i.name, kind: i.kind, "
                "file: i.src, w: i.w, h: i.h, links: i.links, also: i.also, src: i.page })));\n")
    print(f"Wrote {len(images)} images and {os.path.relpath(MANIFEST, ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
