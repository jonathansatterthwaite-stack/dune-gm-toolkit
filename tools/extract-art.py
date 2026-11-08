#!/usr/bin/env python3
"""Extract the character art, House banners and crests from your own rulebook PDFs.

    python tools/extract-art.py

Needs pypdfium2 and Pillow (pip install pypdfium2 pillow), plus numpy and scipy for the five Power and Pawns
court NPCs, whose figures are flattened into the page and have to be cut out of it. The PDFs go in [rulebooks]/.
Covers the Core Rules, Power and Pawns, Sand and Dust, The Great Game, Masters of Dune and the Agents of Dune folios
and cards. Writes transparent WebP images to img/local/art/ and a manifest to js/db/art.local.js, which adds an "art" table
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
       "sd": ("DUNE_SandAndDust.pdf", "Sand and Dust", 3), "gg": ("DUNE_TheGreatGame.pdf", "Great Game", 7),
       "mod": ("masters of dune digital edition 18-04-23.pdf", "Masters of Dune", 7), "gmt": ("dune gm toolkit digital 1-4-21.pdf", "GM Toolkit", 0),
       "aodc": ("Agents of Dune Cards Digital.pdf", "Agents of Dune Cards", 0), "aodf": ("Agents of Dune Folios_Print at home.pdf", "Agents of Dune Folios", 0)}

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
    ("kara-molay", "core", 134, "largest", C, "Kara Molay, the Core Rules' example character", [], [], []),
    ("fremen-camp", "core", 131, "largest", C, "Fremen at rest (character creation)", ["factions:Fremen"], [], []),
    # ---- Core Rules: allies and adversaries (p.271-294)
    ("arrakeen-native", "core", 280, "largest", C, "Arrakeen Native", ["npcs:Arrakeen Native"], [], []),
    ("criminal", "core", 284, "largest", C, "Criminal", ["npcs:Criminal"], [], []),
    ("courtier", "core", 285, "largest", C, "Courtier", ["npcs:Courtier"], [], ["Core p.7"]),
    ("fremen-elder", "core", 288, "largest", C, "Fremen Elder", ["npcs:Fremen Elder"], [], []),
    ("swordmaster", "pp", 54, "largest", C, "Swordmaster", ["npcs:House Soldier/Guard", "factions:Ginaz Cadet", "factions:Ginaz Swordmaster"], ["Ginaz Swordmaster"], ["Core p.283"]),
    ("choam-agent", "pp", 125, "largest", C, "CHOAM agent", ["factions:CHOAM Agent", "npcs:Mentat"], ["CHOAM Agent"], ["Core p.284"]),
    ("sardaukar", "core", 297, "largest", C, "Sardaukar", ["npcs:Sardaukar (Elite Soldier)", "factions:Sardaukar"], ["Sardaukar"], ["Power and Pawns p.27"]),
    ("scientist", "core", 298, "largest", C, "Scientist", ["npcs:Scientist"], [], []),
    ("servant", "core", 299, "largest", C, "Servant", ["npcs:Servant"], [], []),
    ("smuggler", "core", 300, "largest", C, "Smuggler", ["npcs:Smuggler", "npcs:Brewen Ayd"], [], ["GM Toolkit p.31"]),
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
    # ---- Agents of Dune: the five player characters' folios (a full figure and a portrait each; Jiro has only the portrait)
    ("shizu-nagara", "aodf", 5, "largest", C, "Shizu Nagara", ["npcs:Shizu Nagara"], [], []),
    ("shizu-nagara-portrait", "aodf", 6, "largest", "portrait", "Shizu Nagara (portrait)", ["npcs:Shizu Nagara"], [], ["Agents of Dune Cards p.2"]),
    ("jiro-nagara-portrait", "aodf", 10, "largest", "portrait", "Jiro Nagara (portrait)", ["npcs:Jiro Nagara"], [], ["Agents of Dune Cards p.4"]),
    ("zafir-callas", "aodf", 13, "largest", C, "Zafir Callas", ["npcs:Zafir Callas"], [], []),
    ("zafir-callas-portrait", "aodf", 14, "largest", "portrait", "Zafir Callas (portrait)", ["npcs:Zafir Callas"], [], ["Agents of Dune Cards p.6"]),
    ("natalia-khan", "aodf", 17, "largest", C, "Natalia Khan", ["npcs:Natalia Khan"], [], []),
    ("natalia-khan-portrait", "aodf", 18, "largest", "portrait", "Natalia Khan (portrait)", ["npcs:Natalia Khan"], [], ["Agents of Dune Cards p.8"]),
    ("alice-dominica", "aodf", 21, "largest", C, "Alice Dominica", ["npcs:Alice Dominica"], [], []),
    ("alice-dominica-portrait", "aodf", 22, "largest", "portrait", "Alice Dominica (portrait)", ["npcs:Alice Dominica"], [], ["Agents of Dune Cards p.10"]),
    ("banner-nagara", "aodf", 9, "largest", "banner", "House Nagara banner", ["houses:House Nagara"], [], ["Agents of Dune Folios p.5"]),
    ("crest-nagara", "aodf", 1, "largest", "crest", "Nagara crest", ["houses:House Nagara"], [], ["Masters of Dune p.27"]),
    # ---- Masters of Dune
    ("geeta-nagara", "mod", 29, "largest", C, "Geeta Nagara", ["npcs:Geeta Nagara"], [], []),
    ("crest-alexin", "mod", 107, "largest", "crest", "Alexin crest", ["houses:House Alexin"], [], []),
    ("crest-ecaz", "mod", 111, "largest", "crest", "Ecaz crest", ["houses:House Ecaz"], [], []),
]
# Agents of Dune: the portrait on the back of each character card (back page = front page + 1)
for back, who in [(12, "Turo Imshel"), (14, "Niran Rani"), (16, "Korbus Zaan"), (18, "Qu'shan"), (20, "Captain Taras Nikula"), (22, "Dr. Erika Ganio"),
                  (24, "Sabrya Zayr"), (26, "Xav Camran"), (28, "Colrin Bentlix"), (30, "Callum Ruta"), (32, "Kira Jaro"), (38, "Major Roj Varis"),
                  (40, "Ashem Perro"), (42, "Vadim Saarela"), (44, "Ustad Turan"), (46, "Cenric"), (48, "Qadira Lariel Narilan"), (50, "Harun"),
                  (52, "Musa"), (54, "Spice Smuggler")]:
    slug_ = "".join(ch if ch.isalnum() else "-" for ch in who.lower()).replace("--", "-").strip("-")
    ART.append((slug_ + "-portrait", "aodc", back, "card", "portrait", f"{who} (portrait)", [f"npcs:{who}"], [], ["Agents of Dune Cards p.56", "Agents of Dune Cards p.58", "Agents of Dune Cards p.60"] if who == "Spice Smuggler" else []))
# The Great Game's House banners, one per House page (p.30-64)
for i, h in enumerate(["Alexin", "Atreides", "Ecaz", "Hagal", "Harkonnen", "Kenola", "Lindaren", "Maros", "Mikarrol",
                       "Moritani", "Mutelli", "Novebruns", "Richese", "Spinnette", "Taligari", "Thorvald", "Vernius", "Wydras"]):
    ART.append((f"banner-{h.lower()}", "gg", 37 + 2 * i, "largest", "banner", f"House {h} banner", [f"houses:House {h}"], [], []))

# cut-out settings for the flattened Power and Pawns pages (even pages have a decorative band to strip)
CUTOUT = {27: {}, 29: {}, 31: {}, 28: {"parch": 160, "far": 70}, 30: {"parch": 160, "far": 70}}


def figures(page):
    """Cut-out images on a page: images with transparency that aren't full-page backgrounds."""
    out = []
    pw, ph = page.get_size()
    for obj in page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE], max_depth=6):
        w, h = obj.get_px_size()
        l, b, r, t = obj.get_bounds()
        if (r - l) * (t - b) > 0.8 * pw * ph or w * h < 100000:  # full-page backgrounds and small ornaments
            continue
        img = obj.get_bitmap(render=True).to_pil().convert("RGBA")
        if img.getextrema()[3][0] == 255:  # fully opaque: a scene, not a cut-out
            continue
        left, _, right, _ = obj.get_bounds()
        out.append({"img": img, "x": (left + right) / 2, "area": w * h})
    return out


def cutout(page, **kw):
    """Cut the figure out of a page that is one flattened image (the largest image object on the page)."""
    o = max(page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE], max_depth=10), key=lambda o: o.get_px_size()[0] * o.get_px_size()[1])
    return cutout_image(o.get_bitmap(render=False).to_pil().convert("RGB"), **kw)


def card_portrait(page, **kw):
    """The portrait on the back of an Agents of Dune character card: the card-sized layer with transparency,
    laid on white, then cut out of its parchment background."""
    from PIL import Image
    layer = None
    for o in page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE], max_depth=6):
        w, h = o.get_px_size()
        if h > 900 and w < h:
            im = o.get_bitmap(render=True).to_pil().convert("RGBA")
            if im.getextrema()[3][0] < 255 and (layer is None or im.getchannel("A").histogram()[255] > layer.getchannel("A").histogram()[255]):
                layer = im
    if layer is None:
        raise LookupError("no portrait layer")
    import numpy as np
    flat = Image.new("RGBA", layer.size, (255, 255, 255, 255))
    flat.alpha_composite(layer)
    # every card has the same gold frame flourishes (top right, bottom left): blank their light and gold pixels
    a = np.asarray(flat.convert("RGB"), dtype=np.float32).copy()
    H, W, _ = a.shape
    L, sat = a.mean(2), a.max(2) - a.min(2)
    # gold: red close to green, both well above blue (skin has far more red than green, so it is spared)
    gold = (np.abs(a[..., 0] - a[..., 1]) < 25) & (a[..., 1] > a[..., 2] + 35) & (L > 120)
    corner = np.zeros(L.shape, bool)
    corner[: int(H * 0.36), int(W * 0.62):] = True
    corner[int(H * 0.76):, : int(W * 0.42)] = True  # and the small flourish under the bust's lower-left corner
    a[corner & (((L > 190) & (sat < 32)) | gold)] = 255
    return cutout_image(Image.fromarray(a.astype(np.uint8)), **dict({"whole": True, "keep_holes": True, "bridge": 18, "light": 226, "gray": 20, "smooth": 9}, **kw))


def cutout_image(im, parch=0, far=18, tol=34, whole=False, keep_holes=False, bridge=10, light=212, gray=24, smooth=0):
    """Grow the light page background in from the edges and keep the figure."""
    import numpy as np
    from PIL import Image
    from scipy import ndimage as ndi
    a = np.asarray(im, dtype=np.float32)
    H, W, _ = a.shape
    L, sat = a.mean(2), a.max(2) - a.min(2)
    ink = (L < 150) | (sat > 70)  # where the figure is: dark or colorful (on a page, right of the text column)
    if not whole:
        ink[:, : int(W * 0.3)] = False
        ink[: int(H * 0.08)] = False
    lab, n = ndi.label(ndi.binary_dilation(ink, iterations=12))
    k = int(np.argmax(ndi.sum(ink, lab, range(1, n + 1)))) + 1
    ys, xs = np.where(lab == k)
    c = a[max(0, ys.min() - 30): ys.max() + 30, max(0, xs.min() - 30): xs.max() + 30]
    cL, cs = c.mean(2), c.max(2) - c.min(2)
    # judge "background" on a smoothed copy when the background is textured (parchment speckle)
    cm = np.stack([ndi.median_filter(c[..., i], size=smooth) for i in range(3)], -1) if smooth else c
    mL, ms = cm.mean(2), cm.max(2) - cm.min(2)
    bg = np.median(np.concatenate([cm[0], cm[-1], cm[:, 0], cm[:, -1]]), axis=0)
    near = (np.sqrt(((cm - bg) ** 2).sum(2)) < tol) | ((mL > light) & (ms < gray))
    lab, n = ndi.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ndi.binary_opening(~np.isin(lab, list(edge)), iterations=3)
    filled = ndi.binary_fill_holes(fg)
    hl, hn = ndi.label(filled & ~fg)  # enclosed holes that are mostly page background stay clear
    if hn and not keep_holes:
        share = ndi.mean(near.astype(float), hl, range(1, hn + 1))
        filled[np.isin(hl, [i + 1 for i, v in enumerate(share) if v > 0.5])] = False
    fg = filled if keep_holes else filled & ~ndi.binary_opening(near & filled, iterations=4)
    lab, n = ndi.label(fg)
    sizes = ndi.sum(fg, lab, range(1, n + 1))
    fg = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 0.02 * sizes.max()])
    core = ndi.binary_opening(fg, iterations=bridge)  # drop blobs hanging on by a thin bridge
    cl, cn = ndi.label(core)
    if cn:
        core = cl == int(np.argmax(ndi.sum(core, cl, range(1, cn + 1)))) + 1
        fg = fg & ndi.binary_dilation(core, iterations=bridge + 3)
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
        if pick in ("cutout", "card"):
            try:
                img = card_portrait(page) if pick == "card" else cutout(page, **CUTOUT.get(pdf_page, {}))
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
        cap = 500 if kind == "crest" else 800 if kind == "portrait" else 1000
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
