// Known Universe: canon star systems for the galaxy map.
// Where Dune lore ties a world to a real star (mostly from the novel's Terminology appendix), the system sits at
// that star's real sky position and distance. Fictional stars get estimated positions inside the Imperial region.
// Positions are light-years from Sol on galactic axes: x toward the galactic core, y galactic north, z spinward.
window.DUNE_GALAXY = (function () {
  const D2R = Math.PI / 180;
  // Equatorial (J2000: RA hours, Dec degrees, distance ly) → local galactic Cartesian.
  function fromRaDec(raH, decD, dist) {
    const a = raH * 15 * D2R, d = decD * D2R, aG = 192.85948 * D2R, dG = 27.12825 * D2R, lN = 122.93192 * D2R;
    const b = Math.asin(Math.sin(d) * Math.sin(dG) + Math.cos(d) * Math.cos(dG) * Math.cos(a - aG));
    const l = lN - Math.atan2(Math.cos(d) * Math.sin(a - aG), Math.sin(d) * Math.cos(dG) - Math.cos(d) * Math.sin(dG) * Math.cos(a - aG));
    const r = (n) => Math.round(n * 10) / 10;
    return [r(dist * Math.cos(b) * Math.cos(l)), r(dist * Math.sin(b)), r(dist * Math.cos(b) * Math.sin(l))];
  }

  // planets: [name, orbit, type, allegiance, notes]
  const SYSTEMS = [
    { star: "Sol", spec: "G2 V", ra: 0, dec: 0, dist: 0, lore: "Humanity's cradle. By the age of the Imperium, Old Terra is little more than a legend, its location half-forgotten.",
      planets: [["Old Terra", "III", "garden", "None — lost to legend", "The legendary birthworld of humanity."]] },
    { star: "Canopus", spec: "F0 II", ra: 6.3992, dec: -52.6956, dist: 310, lore: "Arrakis is the third planet of Canopus, one of the brightest stars in Terran skies.",
      planets: [["Arrakis", "III", "desert", "Imperial fief — spice", "Dune. The only source of the spice melange, which makes space travel possible."]] },
    { star: "Delta Pavonis", spec: "G8 IV", ra: 20.1456, dec: -66.1819, dist: 19.9, lore: "Home to Caladan, the Atreides homeworld, and Harmonthep, a stop on the Zensunni wanderers' migration.",
      planets: [["Caladan", "III", "ocean", "House Atreides", "Ocean world of fishermen, pundi rice and stormy seas."], ["Harmonthep", "VI", "savanna", "Unknown", "Sixth world of Delta Pavonis; once a stop for the Zensunni wanderers."]] },
    { star: "36 Ophiuchi B", spec: "K1 V", ra: 17.2558, dec: -26.6028, dist: 19.5, lore: "Giedi Prime orbits 36 Ophiuchi B — barely a dozen light-years from Caladan, its bitter rival.",
      planets: [["Giedi Prime", "", "industrial", "House Harkonnen", "Industrial homeworld of House Harkonnen: slag plains, smog and black cities."]] },
    { star: "70 Ophiuchi A", spec: "K0 V", ra: 18.0908, dec: 2.5, dist: 16.6, lore: "Sikun, source of the akarso plant, circles 70 Ophiuchi A.",
      planets: [["Sikun", "", "forest", "Unknown", "Forested world where the akarso plant grows."]] },
    { star: "Alpha Centauri B", spec: "K1 V", ra: 14.66, dec: -60.8339, dist: 4.37, lore: "Ecaz, fourth planet of Alpha Centauri B, is the nearest Dune world to Sol.",
      planets: [["Ecaz", "IV", "forest", "House Ecaz", "Forest world of fogwood and prized sculpting woods."]] },
    { star: "Alpha Piscium", spec: "A0p", ra: 2.0342, dec: 2.7636, dist: 151, lore: "Kaitain, seat of the Golden Lion Throne, orbits Alpha Piscium.",
      planets: [["Kaitain", "", "garden", "House Corrino — Imperial capital", "Gardened capital of the Padishah Emperors."]] },
    { star: "Alkalurops", spec: "F0 IV", ra: 15.4081, dec: 37.3772, dist: 113, lore: "Ix, the ninth planet of Alkalurops (Mu Boötis), hides its machine cities underground.",
      planets: [["Ix", "IX", "forest", "House Vernius", "A wild, cold surface over vast underground factory-cities.", { ice: 0.25, clouds: 0.55 }]] },
    { star: "40 Eridani A", spec: "K0 V", ra: 4.2544, dec: -7.6528, dist: 16.3, lore: "Lore names Richese's star only as Eridani A; this map assumes 40 Eridani A.",
      planets: [["Richese", "IV", "garden", "House Richese", "Technocratic rival of Ix, famed for miniaturization.", { lights: true }]] },
    // ---- fictional stars: estimated positions ----
    { star: "Gamma Waiping", spec: "G5 V", pos: [-160, -95, 110], lore: "Fictional star. Placed near Kaitain, since Salusa Secundus was the Imperial capital before the move to Kaitain.",
      planets: [["Salusa Secundus", "III", "barren", "House Corrino — prison planet", "Once the capital, ravaged in ancient wars; now the Emperor's prison world and the forge of his elite troops.", { atmoStrength: 0.5, atmo: "#d08a50", craters: false }]] },
    { star: "Thalim", spec: "K3 V", pos: [-610, 140, 520], lore: "Fictional star. Placed on the far fringe, reflecting how the Bene Tleilax keep outsiders away.",
      planets: [["Tleilax", "", "savanna", "Bene Tleilax", "Lone planet of Thalim and closed homeworld of the Tleilaxu."]] },
    { star: "Niushe", spec: "G9 V", pos: [210, -40, -260], lore: "Fictional star with two named worlds: Grumman and Gamont.",
      planets: [["Grumman", "II", "savanna", "House Moritani", "Homeworld of the volatile House Moritani."], ["Gamont", "III", "garden", "Unknown", "A world notorious for its hedonism."]] },
    { star: "Kuentsing", spec: "M1 V", pos: [-300, 25, -380], lore: "Fictional star. A dim red sun suits Bela Tegeuse's cheerless reputation.",
      planets: [["Bela Tegeuse", "V", "ice", "Unknown", "A gloomy stop on the Zensunni migration."]] },
    { star: "Laoujin", spec: "G0 V", pos: [95, 55, 340], lore: "Fictional star. Wallach IX hosts the Bene Gesserit Mother School.",
      planets: [["Wallach IX", "IX", "barren", "Bene Gesserit", "Austere world of the Bene Gesserit Mother School.", { atmoStrength: 0.7, atmo: "#b8c8e8", craters: false, clouds: 0.3 }]] },
    { star: "Theta Shalish", spec: "F8 V", pos: [-170, -60, 230], lore: "Fictional star. Chusuk is the fourth planet.",
      planets: [["Chusuk", "IV", "forest", "Unknown", "Renowned for finely made musical instruments, such as the baliset."]] },
    { star: "Theta Shaowei", spec: "K2 V", pos: [330, 20, 140], lore: "Fictional star. Hagal is the second planet.",
      planets: [["Hagal", "II", "barren", "Unknown", "Mined for quartz and jewels; once a Zensunni stopover."]] },
    { star: "Epsilon Alangue", spec: "G4 V", pos: [-400, -25, -110], lore: "Fictional star. Poritrin is the third planet.",
      planets: [["Poritrin", "III", "savanna", "Unknown", "River-plains world remembered in Zensunni history."]] },
    { star: "Beta Tygri", spec: "F5 V", pos: [260, 75, -450], lore: "Fictional star. Ishia is the second planet.",
      planets: [["Ishia", "II", "storm", "Unknown", "A world on the long road of the Zensunni migration."]] },
    { star: "Ginaz", spec: "G1 V", pos: [-70, 30, -300], lore: "Lore names no star for Ginaz; the system takes the planet's name here.",
      planets: [["Ginaz", "", "ocean", "Swordmasters of Ginaz", "Archipelago world of the legendary swordmasters' school."]] },
    { star: "Junction", spec: "K0 IV", pos: [450, -45, -200], lore: "Lore names no star for Junction; position is a guess.",
      planets: [["Junction", "", "industrial", "Spacing Guild", "Guild world where Navigators and Guildsmen are trained.", { lights: true, clouds: 0.3 }]] },
    { star: "Lankiveil", spec: "K5 V", pos: [27, -4, 9], lore: "No star is named; placed near Giedi Prime because Lankiveil is a Harkonnen holding.",
      planets: [["Lankiveil", "", "ice", "House Harkonnen", "Cold Harkonnen fief of grey seas and whaling villages.", { water: 0.5 }]] },
    { star: "Tupile", spec: "G3 V", pos: [-760, 160, -700], lore: "The Guild keeps Tupile's location secret. This position is pure invention.",
      planets: [["Tupile", "", "garden", "Spacing Guild sanctuary", "Sanctuary planets for defeated Great Houses, hidden by the Guild."]] },
  ];

  const SPECTRAL = { O: "#9bb0ff", B: "#aabfff", A: "#cad7ff", F: "#f8f7ff", G: "#fff1d8", K: "#ffcf96", M: "#ffad66" };
  const specColor = (s) => SPECTRAL[(s || "G")[0].toUpperCase()] || SPECTRAL.G;

  return { SYSTEMS, fromRaDec, specColor };
})();
