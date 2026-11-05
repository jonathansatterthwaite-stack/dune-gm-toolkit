// Planet types and procedural planet textures for the starmap.
// No three.js here: paint() draws equirectangular canvases that starmap.js wraps as textures.
window.Planets = (function () {
  // A "look" fully describes a planet's appearance. Types are named presets of a look.
  const BASE = {
    low: "#555555", mid: "#888888", high: "#bbbbbb",
    water: 0, waterColor: "#1d4f91", ice: 0, clouds: 0, cloudColor: "#ffffff",
    atmo: "#88bbff", atmoStrength: 0.6,
    bands: false, spot: false, rings: false, ringColor: "#c9b48a",
    lava: false, lavaColor: "#ff5a1a", lights: false, craters: false, dunes: false,
    detail: 1.6, size: 1, tilt: 15, spin: 0.25, moons: 0,
  };
  const t = (name, desc, look) => ({ name, desc, look: Object.assign({}, BASE, look) });
  const TYPES = {
    desert: t("Desert world", "Endless dunes and rock, tiny polar caps. Arrakis.", { low: "#7a4a24", mid: "#c38c4f", high: "#ecd3a2", dunes: true, ice: 0.05, atmo: "#e8a96a", atmoStrength: 0.5, detail: 2 }),
    ocean: t("Ocean world", "Seas cover almost everything; scattered archipelagos.", { low: "#3a6b3a", mid: "#6f8f4a", high: "#c4b88e", water: 0.82, waterColor: "#1b4f8a", ice: 0.12, clouds: 0.55, atmo: "#6fb4ff", atmoStrength: 0.9 }),
    garden: t("Garden world", "Continents, oceans, ice caps — nearly Earth-like.", { low: "#2f6b34", mid: "#6b8f45", high: "#a89a74", water: 0.58, waterColor: "#1d4f91", ice: 0.14, clouds: 0.5, atmo: "#7fb8ff", atmoStrength: 0.9 }),
    forest: t("Forest world", "Temperate woodland under heavy cloud.", { low: "#1f4a24", mid: "#2f6b2f", high: "#7d8b5a", water: 0.42, waterColor: "#1e4a6e", ice: 0.1, clouds: 0.5, atmo: "#8fd0ff", atmoStrength: 0.8 }),
    jungle: t("Jungle world", "Steaming rainforest and choked rivers.", { low: "#10391a", mid: "#1f6b2a", high: "#4f8f3a", water: 0.32, waterColor: "#1a4a4a", clouds: 0.75, atmo: "#9fe6c0", atmoStrength: 0.9 }),
    savanna: t("Savanna world", "Golden grasslands and shallow seas.", { low: "#8a7a3a", mid: "#b8a055", high: "#6b5a30", water: 0.3, waterColor: "#2a5a7a", ice: 0.06, clouds: 0.35, atmo: "#ffd9a0", atmoStrength: 0.6 }),
    ice: t("Ice world", "Frozen plains, glaciers and dark ice-locked seas.", { low: "#8fa5bb", mid: "#cfdcea", high: "#ffffff", water: 0.22, waterColor: "#3a6a90", ice: 0.45, clouds: 0.2, atmo: "#bfe3ff", atmoStrength: 0.6 }),
    volcanic: t("Volcanic world", "Black basalt veined with rivers of lava.", { low: "#1a1210", mid: "#3a2620", high: "#5a4036", lava: true, lavaColor: "#ff5a1a", clouds: 0.18, cloudColor: "#5a4a44", atmo: "#ff7a3a", atmoStrength: 0.5 }),
    barren: t("Barren rock", "Airless, cratered, lifeless.", { low: "#4a4744", mid: "#7a7570", high: "#a8a39b", craters: true, atmoStrength: 0, detail: 2.4 }),
    toxic: t("Toxic world", "Acid seas under a sickly yellow sky.", { low: "#4a5a1a", mid: "#8a9a2a", high: "#c8d05a", water: 0.4, waterColor: "#6a7a10", clouds: 0.6, cloudColor: "#d6e070", atmo: "#c8ff5a", atmoStrength: 0.9 }),
    industrial: t("Industrial world", "Smog, slag plains and the glow of endless factories. Giedi Prime.", { low: "#2a2a2a", mid: "#4a463f", high: "#6a6458", water: 0.25, waterColor: "#2a3530", lights: true, clouds: 0.45, cloudColor: "#8a8478", atmo: "#c8a070", atmoStrength: 0.7 }),
    storm: t("Storm world", "Perpetual hurricanes hide the surface.", { low: "#3a4a5a", mid: "#5a6a6a", high: "#8a9a8a", water: 0.55, waterColor: "#22384f", clouds: 0.92, cloudColor: "#e8eef5", atmo: "#b0c8e8", atmoStrength: 1 }),
    gas: t("Gas giant", "Banded clouds, storms the size of worlds, many moons.", { low: "#a8743f", mid: "#d8b27a", high: "#f2e2c0", bands: true, spot: true, atmo: "#f0c890", atmoStrength: 0.6, size: 2.6, moons: 3, spin: 0.4, detail: 1.2 }),
    icegiant: t("Ice giant", "Pale blue-green bands and faint rings.", { low: "#3a6fa8", mid: "#6fa8d8", high: "#bfe6f2", bands: true, rings: true, ringColor: "#a8c8d8", atmo: "#9fdcff", atmoStrength: 0.8, size: 2.2, moons: 2, tilt: 40, detail: 0.8 }),
  };

  // Map free text (e.g. the Worlds planet generator's "World" line) to a type.
  function typeFromText(s) {
    s = (s || "").toLowerCase();
    const rules = [["gas giant", "gas"], ["arid", "desert"], ["desert", "desert"], ["ocean", "ocean"], ["frozen", "ice"], ["ice", "ice"], ["jungle", "jungle"], ["forest", "forest"], ["savanna", "savanna"], ["volcanic", "volcanic"], ["forge", "volcanic"], ["toxic", "toxic"], ["storm", "storm"], ["rain", "storm"], ["garden", "garden"], ["earth", "garden"], ["mountain", "garden"], ["industrial", "industrial"], ["barren", "barren"], ["mined", "barren"], ["asteroid", "barren"], ["twilight", "barren"]];
    const hit = rules.find(([k]) => s.includes(k));
    return hit ? hit[1] : "garden";
  }

  // ---------- seeded noise ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function makeNoise(seed) {
    const r = rng(seed);
    const p = new Uint8Array(512), v = new Float32Array(256);
    for (let i = 0; i < 256; i++) { p[i] = i; v[i] = r() * 2 - 1; }
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 256; i++) p[i + 256] = p[i];
    const s = (t) => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;
    function noise(x, y, z) {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const xf = x - xi, yf = y - yi, zf = z - zi;
      const X = xi & 255, Y = yi & 255, Z = zi & 255;
      const u = s(xf), w = s(yf), q = s(zf);
      const h = (a, b, c) => v[p[p[p[a] + b] + c]];
      return lerp(
        lerp(lerp(h(X, Y, Z), h(X + 1, Y, Z), u), lerp(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), u), w),
        lerp(lerp(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), u), lerp(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), u), w), q);
    }
    function fbm(x, y, z, oct) {
      let sum = 0, amp = 0.5, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) { sum += amp * noise(x * f, y * f, z * f); norm += amp; amp *= 0.5; f *= 2.03; }
      return sum / norm; // roughly −1..1, mostly −0.6..0.6
    }
    return { noise, fbm, r };
  }

  // ---------- colour helpers ----------
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  function pal3(lo, mi, hi, t) { return t < 0.5 ? mix(lo, mi, t * 2) : mix(mi, hi, (t - 0.5) * 2); }

  // ---------- painter ----------
  // Returns { map, emissive|null, clouds|null } canvases, w×h equirectangular.
  function paint(look, seed, w, h) {
    const L = Object.assign({}, BASE, look);
    const N = makeNoise(seed || 1);
    const lo = hex(L.low), mi = hex(L.mid), hi = hex(L.high), wc = hex(L.waterColor);
    const deep = shade(wc, 0.55), shallow = mix(wc, [255, 255, 255], 0.18);
    const lavaC = hex(L.lavaColor), cloudC = hex(L.cloudColor);
    const mk = () => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
    const map = mk(), mctx = map.getContext("2d"), md = mctx.createImageData(w, h);
    const needE = L.lava || L.lights;
    const em = needE ? mk() : null, ed = needE ? em.getContext("2d").createImageData(w, h) : null;
    const cl = L.clouds > 0 && !L.bands ? mk() : null, cd = cl ? cl.getContext("2d").createImageData(w, h) : null;
    const det = Math.max(0.3, L.detail);
    // craters: random points on the sphere
    const craters = [];
    if (L.craters) for (let i = 0; i < 40; i++) { const u = N.r() * 2 - 1, th = N.r() * Math.PI * 2, s = Math.sqrt(1 - u * u); craters.push([s * Math.cos(th), u, s * Math.sin(th), 0.04 + Math.pow(N.r(), 3) * 0.25]); }
    const spot = [Math.cos(-0.35) * Math.cos(0.8), Math.sin(-0.35), Math.cos(-0.35) * Math.sin(0.8)];
    const duneDir = [0.6, 0.2, 0.77];

    for (let y = 0; y < h; y++) {
      const lat = Math.PI / 2 - ((y + 0.5) / h) * Math.PI;
      const cy = Math.sin(lat), cr = Math.cos(lat);
      for (let x = 0; x < w; x++) {
        const lon = ((x + 0.5) / w) * Math.PI * 2 - Math.PI;
        const px = cr * Math.cos(lon), py = cy, pz = cr * Math.sin(lon);
        const i = (y * w + x) * 4;
        let c;
        if (L.bands) {
          const turb = N.fbm(px * 2.2 * det, py * 6, pz * 2.2 * det, 4);
          const b = Math.sin((py * (6 + det * 4) + turb * 1.6) * Math.PI) * 0.5 + 0.5;
          const fine = N.fbm(px * 8, py * 30, pz * 8, 3) * 0.12;
          c = pal3(lo, mi, hi, clamp01(b + fine));
          if (L.spot) {
            const dx = px - spot[0], dy = (py - spot[1]) * 1.8, dz = pz - spot[2];
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d < 0.22) { const k = smooth(0.22, 0.08, d); c = mix(c, mix(lo, [190, 80, 50], 0.6), k * (0.75 + 0.25 * Math.sin(d * 60))); }
          }
        } else {
          const n = N.fbm(px * det, py * det, pz * det, 6);
          const e = clamp01(0.5 + n * 1.1);
          if (L.water > 0 && e < L.water) {
            c = mix(deep, shallow, smooth(0, L.water, e));
          } else {
            const tt = L.water > 0 ? (e - L.water) / Math.max(0.0001, 1 - L.water) : e;
            c = pal3(lo, mi, hi, clamp01(tt));
            if (L.dunes) { const sea = 0.5 + 0.5 * N.noise(px * 4 + 5, py * 4, pz * 4); const rip = Math.sin((px * duneDir[0] + py * duneDir[1] + pz * duneDir[2]) * 260 + N.noise(px * 5, py * 5, pz * 5) * 3.5); c = shade(c, 1 + rip * 0.035 * sea); }
            if (L.craters) {
              for (const k of craters) {
                const dot = px * k[0] + py * k[1] + pz * k[2];
                const ang = Math.acos(Math.max(-1, Math.min(1, dot)));
                if (ang < k[3]) { const rr = ang / k[3]; c = shade(c, rr > 0.82 ? 1.18 : 0.72 + rr * 0.2); }
              }
            }
          }
          // ice caps
          if (L.ice > 0) {
            const edge = 1 - L.ice * 1.6 + N.noise(px * 6, py * 6, pz * 6) * 0.12;
            if (Math.abs(py) > edge) c = mix(c, [242, 248, 255], smooth(edge, edge + 0.04, Math.abs(py)));
          }
          // emissive features
          if (needE) {
            let er = 0, eg = 0, eb = 0;
            if (L.lava) {
              const ridge = 1 - Math.abs(N.fbm(px * 3.1, py * 3.1, pz * 3.1, 4));
              if (ridge > 0.9) { const k = smooth(0.9, 0.98, ridge); er = lavaC[0] * k; eg = lavaC[1] * k; eb = lavaC[2] * k; c = mix(c, lavaC, k * 0.6); }
            }
            if (L.lights && (L.water === 0 || e >= L.water)) {
              const dens = N.noise(px * 40, py * 40, pz * 40);
              if (dens > 0.45) { const k = smooth(0.45, 0.8, dens) * 0.8; er = Math.max(er, 255 * k); eg = Math.max(eg, 190 * k); eb = Math.max(eb, 110 * k); }
            }
            ed.data[i] = er; ed.data[i + 1] = eg; ed.data[i + 2] = eb; ed.data[i + 3] = 255;
          }
          // clouds
          if (cl) {
            const cn = N.fbm(px * 2.6 + 11.3, py * 4 + 3.1, pz * 2.6 - 7.7, 5) * 0.5 + 0.5;
            const a = smooth(1 - L.clouds * 0.75, 1.05 - L.clouds * 0.35, cn);
            cd.data[i] = cloudC[0]; cd.data[i + 1] = cloudC[1]; cd.data[i + 2] = cloudC[2]; cd.data[i + 3] = a * 255;
          }
        }
        md.data[i] = c[0]; md.data[i + 1] = c[1]; md.data[i + 2] = c[2]; md.data[i + 3] = 255;
      }
    }
    mctx.putImageData(md, 0, 0);
    if (em) em.getContext("2d").putImageData(ed, 0, 0);
    if (cl) cl.getContext("2d").putImageData(cd, 0, 0);
    return { map, emissive: em, clouds: cl };
  }

  // Ring gradient: 256×1 strip, sampled radially.
  function paintRing(look, seed) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 1;
    const ctx = c.getContext("2d"), d = ctx.createImageData(256, 1);
    const N = makeNoise((seed || 1) + 99), col = hex(look.ringColor || BASE.ringColor);
    for (let x = 0; x < 256; x++) {
      const t = x / 255;
      const band = 0.5 + 0.5 * N.fbm(t * 18, 0.5, 0.5, 4);
      const gap = Math.abs(t - 0.62) < 0.025 ? 0.1 : 1;
      const edge = smooth(0, 0.08, t) * smooth(1, 0.9, t);
      const k = 0.7 + band * 0.5;
      d.data[x * 4] = col[0] * k; d.data[x * 4 + 1] = col[1] * k; d.data[x * 4 + 2] = col[2] * k; d.data[x * 4 + 3] = 255 * clamp01(band * 1.2) * gap * edge * 0.85;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  // Small flat preview (data URL) for the type list.
  const thumbCache = {};
  function thumb(look, seed) {
    const key = JSON.stringify(look) + seed;
    if (!thumbCache[key]) thumbCache[key] = paint(look, seed, 96, 48).map.toDataURL();
    return thumbCache[key];
  }

  return { BASE, TYPES, typeFromText, paint, paintRing, thumb };
})();
