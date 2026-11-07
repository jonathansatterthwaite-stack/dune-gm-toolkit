// Planets: the Core Rules gazetteer (p.64–83) and the homeworlds of The Great Game's Houses (p.30–65).
// Habitability classes (Core p.65): I cannot sustain human life · II survivable with extreme precautions ·
// III survivable with precautions · IV no protection needed · V easily sustains life.
(function () {
  const P = [];
  // house = the House holding the fief (always "House X"); vassal = a Minor House running it for them;
  // ruler = a power that is not a House (Guild, Bene Gesserit …); designation = the planet's place in its system.
  const add = (o) => P.push(Object.assign({ system: "", designation: "", moons: "", habitable: "", house: "", vassal: "", ruler: "", note: "", exports: "", population: "", languages: "", places: [], text: "" }, o));
  const places = (s) => s.split(/,\s*(?:and\s+)?|\s+and\s+/).filter(Boolean);

  add({ name: "Arrakis", system: "Canopus", moons: "Two", habitable: "Class III", house: "House Harkonnen", note: "Granted to House Atreides as the saga begins", exports: "Spice melange", languages: "Galach, Chakobsa",
    places: places("Arrakeen, Carthag, Polar Sink, Sentinel Rock, Sietch Jacurutu, Sietch Tabr, Windsack"),
    text: "Dune: a rainless world of sand, storms and sandworms, the only source of the spice. Its people are the Fremen of the deep desert and the townsfolk of the Shield Wall cities.", src: "Core p.65" });
  add({ name: "Caladan", system: "Delta Pavonis", designation: "Delta Pavonis III", moons: "One", habitable: "Class V", house: "House Atreides", exports: "Agricultural (produce, tourism, wines)", population: "Numerous, all over the planet", languages: "Galach, Caladanian",
    places: places("Atreides Landing, Cala City, Castle Caladan, Mount Syubi, Underwater Park"), text: "Ocean world of fishermen and pundi rice, home of House Atreides for twenty-six generations.", src: "Core p.74" });
  add({ name: "Giedi Prime", system: "36 Ophiuchi B", moons: "None", habitable: "Class IV", house: "House Harkonnen", exports: "Industry (slaves, minerals, weapons)", population: "Tightly controlled city dwellers; escaped slaves in the outskirts", languages: "Galach",
    places: places("Barony, Eastern Wasteland, Giedi City"), text: "The Harkonnen homeworld, stripped and polluted, ruled through fear.", src: "Core p.76" });
  add({ name: "Ix", system: "Alkalurops", designation: "Alkalurops IX", moons: "Six artificial", habitable: "Class IV", house: "House Vernius", exports: "Technology (machines, hunter-seekers, ships, weather control)", population: "Underground collectives", languages: "Galach, Ixian",
    places: places("Grand Palais, Ixian Majorius, Ixian Shipyards, Vernii"), text: "A cold, wild surface over vast underground factory-cities that build Heighliners and edict-skirting devices.", src: "Core p.77" });
  add({ name: "Junction", system: "Classified", moons: "Two orbital space stations", habitable: "Class IV", ruler: "Spacing Guild", exports: "Transportation", population: "Dense underground complexes", languages: "Galach",
    places: places("Navigator School, Navigator's Field, Space Port, Spacing Guild Headquarters"), text: "The Guild's headquarters world, where Navigators are trained.", src: "Core p.78" });
  add({ name: "Kaitain", system: "Alpha Waiping", moons: "Four", habitable: "Class IV", house: "House Corrino", note: "Power and Pawns p.16 places it at Alpha Piscium 6 instead", exports: "Imperial government", population: "Mostly in large cities", languages: "Galach",
    places: places("Contemplation Tea House, Corrinth, Golden Rivers, Suk School of Medicine"), text: "The gardened Imperial capital and seat of the Golden Lion Throne.", src: "Core p.78" });
  add({ name: "Poritrin", system: "Epsilon Ophiuchi", moons: "One", habitable: "Class IV", house: "House Maros", note: "Shared with House Alexin and the Lords Council", exports: "Agricultural", population: "Small scattered settlements", languages: "Galach",
    places: places("Isana River, Municipal Museum, Poritrin City, Starda Spaceport"), text: "River-plains farming world, remembered by the Fremen as a stop on the Zensunni wanderings.", src: "Core p.80" });
  add({ name: "Richese", system: "Epsilon Eridani", moons: "One (artificial)", habitable: "Class IV", house: "House Richese", exports: "Technology (starships, miniaturization, machines)", population: "Moderate-sized cities", languages: "Galach",
    places: places("Castle Richese, Lugdynym, Richese City"), text: "Technocratic rival of Ix. Its research moon Korona was destroyed, ending its illegal spice dealings.", src: "Core p.81" });
  add({ name: "Salusa Secundus", system: "Gamma Waiping", moons: "Six", habitable: "Class II", house: "House Corrino", exports: "Sardaukar", population: "Prisoners under life sentences", languages: "Galach",
    text: "The old capital, ruined in ancient wars; now the Emperor's prison planet and the forge of the Sardaukar.", src: "Core p.82" });
  add({ name: "Tleilax", system: "Thalim", moons: "None", habitable: "Class V", ruler: "Bene Tleilax", exports: "Biotechnology", population: "Large working collectives", languages: "Galach, Tleilaxu, whistling language",
    places: places("Bandalong, Factories, Mentat Training Center, Thalidei"), text: "The closed homeworld of the Tleilaxu, makers of gholas, Face Dancers and twisted Mentats.", src: "Core p.82" });
  add({ name: "Wallach IX", system: "Laoujin", moons: "Three", habitable: "Class IV", ruler: "Bene Gesserit", exports: "Bene Gesserit training and knowledge", population: "Dense cities, no one outside them", languages: "Galach and secret Bene Gesserit codes",
    places: places("Cliff Walls, the Mother School"), text: "Austere world of the Bene Gesserit Mother School.", src: "Core p.83" });

  // ---- Homeworlds and holdings of The Great Game's Houses
  // [name, star system, designation, House, vassal House, summary, page]
  const gg = [
    ["Keres", "Kora", "Kora II", "House Alexin", "", "Lush farming world covering 95% of its surface, with orbital mirrors and power stations.", 30],
    ["Kobold", "Kora", "Kora III", "House Alexin", "", "Secondary Alexin farming planet ringed with orbital infrastructure.", 30],
    ["Ecaz", "Alpha Centauri B", "Alpha Centauri B IV", "House Ecaz", "", "Jungle world of elacca bloodwood and thought-shaped fogwood.", 34],
    ["Hagal", "Hagal", "Hagal I", "House Hagal", "", "'The Jewel Planet': cold mountains with unmatched gem and mineral wealth.", 36],
    ["Selos", "Hagal", "Moon of Hagal I", "House Hagal", "", "Hagal's only habitable moon, given over to manufacturing.", 36],
    ["Perdiccas", "Hagal", "Hagal V", "House Hagal", "House Ptolemy", "Backwater training world for Hagal's army.", 36],
    ["Lankiveil", "", "", "House Harkonnen", "House Rabban", "Ocean world of fur-whale hunting.", 38],
    ["Kittiak", "", "", "House Harkonnen", "House Zerides", "Breadbasket world feeding the Harkonnen machine.", 39],
    ["Allgrave", "Andala", "Andala IV", "House Kenola", "", "Bleak, cold scrubland world of religious workshops.", 40],
    ["Caliburn", "Andala", "Andala VIII", "House Kenola", "", "Barely breathable rock housing a monastic retreat.", 40],
    ["Wrasni", "Uuokia", "Uuokia IV", "House Lindaren", "", "Frozen surface over a society living underground on core heat; trade goes through the station Osmynea.", 42],
    ["Grenbelle", "Mycopterra", "Mycopterra XIV", "House Maros", "", "Serene pastoral world of meadows and Marosdeer.", 44],
    ["Qardhyr", "Mycopterra", "Mycopterra XVIII", "House Maros", "House Xekma", "'The Slaughterhouse': a nightmarish factory-farm planet.", 44],
    ["Tengrid", "Kublai", "Kublai XII", "House Mikarrol", "", "Grassland world of megacities built over slave pens.", 46],
    ["Grumman", "Niushe", "Niushe II", "House Moritani", "", "Dying tropical world, the Moritani seat.", 48],
    ["Gamont", "Niushe", "Niushe III", "House Moritani", "", "Pleasure planet famed for hedonism.", 48],
    ["Katinov", "Alderamin", "Alderamin IV", "House Mutelli", "", "Cold world with a temperate equator; a favored neutral meeting place.", 50],
    ["Novebruns", "Menkar", "Menkar II", "House Novebruns", "", "Rust-colored, mined-out world under a red giant.", 52],
    ["Clione", "Menkar", "Moon of Novebruns (Menkar II)", "House Novebruns", "", "Moon holding the relocated royal palace.", 52],
    ["Draemh", "Enthi", "Enthi VII", "House Spinnette", "", "World of extreme, deadly wilderness; trains assassins.", 56],
    ["Artisia", "", "", "House Taligari", "", "Beautiful holiday world, almost a rival to Kaitain.", 58],
    ["Ipyr", "", "", "House Thorvald", "", "Hilly smelting world inside the Ipyrian asteroid belt.", 60],
    ["Meuse", "", "", "House Wydras", "", "City-planet of steel, glass and data archives.", 64],
    ["Fournier", "Meuse", "", "House Wydras", "House Apollinaire", "Jungle world used for espionage research.", 64],
  ];
  gg.forEach(([name, system, designation, house, vassal, text, p]) => add({ name, system, designation, house, vassal, text, src: "Great Game p." + p }));

  DUNE_DB.add("planets", P);
})();
