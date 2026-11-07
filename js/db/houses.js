// Noble Houses: The Great Game's Houses of the Landsraad (p.30–65), plus Core and other books' Houses.
// Traits, domains, homeworlds and household members follow the books; summaries are paraphrased.
// rank: Great, Major, Minor, Imperial (Corrino) or Unranked (Wayku). The Great Game gives no rank for some Houses:
// Novebruns and Thorvald are Great Houses (Power and Pawns p.128), Wydras too (Great Game p.65), Richese has fallen
// to House Minor without a liege (Great Game p.4), and Kenola, Mikarrol, Mutelli, Spinnette and Taligari are listed
// as Major because each rules a planet with Minor Houses under it (Core p.86).
(function () {
  const H = [];
  // name, rank, homeworld, crest, colors, motto, traits, primary[], secondary[], family [[name, role]], summary, src, minors [[name, summary]]
  function house(o) {
    const { minors = [], ...h } = o;
    H.push(Object.assign({ rank: "", liege: "", homeworld: "", crest: "", colors: "", motto: "", traits: [], primary: [], secondary: [], family: [], text: "" }, h));
    minors.forEach(([n, t]) => H.push({ name: "House " + n, rank: "Minor", liege: h.name, homeworld: "", crest: "", colors: "", motto: "", traits: [], primary: [], secondary: [], family: [], text: t, src: h.src }));
  }
  const fam = (s) => s.split(";").map((x) => { const m = x.trim().match(/^(.*?)\s*\((.*)\)$/); return m ? { name: m[1], role: m[2] } : { name: x.trim(), role: "" }; });

  house({ name: "House Alexin", rank: "Major", homeworld: "Keres", crest: "Wheat sheaf", colors: "Harvest yellow", motto: "Reap as you sow", traits: ["Industrious", "Pragmatic"],
    primary: ["Farming (Produce): wheat, long-lasting gourds and staple foods"], secondary: ["Farming (Machinery): automated farm equipment", "Logistics (Machinery): bulk food transport"],
    family: fam("Prince Kole Alexin (Ruler); Godwyn Alexin (Mentat Advisor)"),
    text: "Upstart breadbasket House whose gene-tailored, near-imperishable crops feed much of the Imperium; the Mentat uncle Godwyn really runs it and eyes spice-harvesting technology. Food embargoes are its weapon. In tension with House Zerides.",
    src: "Great Game p.30", minors: [["Talos", "Agricultural research and development for Alexin."], ["Barca", "Runs the hauler fleet that ships Alexin produce off-world."], ["Tetram", "New House with vague 'special projects' duties."]] });
  house({ name: "House Atreides", rank: "Great", homeworld: "Caladan", crest: "Hawk", colors: "Green and black", motto: "No call we do not answer", traits: ["Honorable", "Popular"],
    primary: ["Farming (Produce): pundi rice"], secondary: ["Farming (Produce): fishing, Caladan moonfish", "Artistic (Understanding): diplomacy and negotiation", "Military (Expertise)"],
    family: fam("Duke Leto Atreides (Ruler); Lady Jessica (Noble Consort); Paul Atreides (Heir)"),
    text: "Respected for twenty-plus generations of honor and fairness; Duke Leto's popularity in the Landsraad and his trained army alarm the Emperor. Caladan is an ocean world of fishing and rice. Sworn enemies of the Harkonnens.",
    src: "Great Game p.32; Core p.41", minors: [["Stewart", "Loyal, fortified-moon House that keeps out of Imperial affairs."], ["Berreth", "Small House of jurists whose Viziers advise the Atreides on law."], ["Fluxspear", "Processes Atreides pundi rice into shelf-stable food."]] });
  house({ name: "House Ecaz", rank: "Great", homeworld: "Ecaz", crest: "Tree (Yggdrasil)", motto: "The forest endures", traits: ["Just", "Determined"],
    primary: ["Farming (Produce): forestry — elacca wood, fogwood, tent silk"], secondary: ["Science (Produce): pharmaceuticals — elacca, semuta, verite, sapho", "Political (Understanding): Landsraad politics"],
    family: fam("Archduke Armand Ecaz (Ruler, retired); Lady Caranda Ecaz (Ruler); Rivvy Dinari (Swordmaster of Ginaz); Whitmore Bludd (Swordmaster of Ginaz)"),
    text: "Jungle world of thought-shaped fogwood and the drugs that flow from its trees. Ruined by war and blight from House Moritani, it is close to sliding to Minor status; a cadet-branch noble now leads it.",
    src: "Great Game p.34", minors: [["Idy", "Plants and harvests the elacca bloodwood forests, hit hard by Moritani blight."], ["Hori", "Sculpts fogwood into luxury furniture and art."], ["Bak", "Runs Ecaz's pharmaceutical business."]] });
  house({ name: "House Hagal", rank: "Great", homeworld: "Hagal", crest: "Fan", motto: "The brightest jewel", traits: ["Ambitious", "Wealthy"],
    primary: ["Industrial (Produce): gem and ore mining"], secondary: ["Industrial (Machinery): mining machinery, built on the moon Selos", "Artistic (Produce): miners' chant music"],
    family: fam("Earl Philip Hagal (Ruler); Lady Roxana Hagal (Consort, Envoy); Tiresias (Advisor)"),
    text: "Cold mountain world with unmatched mineral wealth, including the quartz of the Golden Lion Throne. Staunchly loyal to House Corrino and bound to it by marriage.",
    src: "Great Game p.36", minors: [["Ptolemy", "Ancient ally that raises and trains Hagal's soldiers."], ["Seleukos", "The 'engineering cadre' designing Hagal's mining equipment."], ["Cassander", "Raised after the Great Slave Revolt of 9050 to prevent another uprising."]] });
  house({ name: "House Harkonnen", rank: "Great", homeworld: "Giedi Prime", crest: "Sigil", motto: "We take what is ours", traits: ["Brutal", "Cunning"],
    primary: ["Farming (Produce): spice (governors of Arrakis)", "Industrial (Produce): refined alloys"], secondary: ["Industrial (Produce): cheap mass-produced goods", "Farming (Produce): Lankiveil whale fur"],
    family: fam("Baron Vladimir Harkonnen (Ruler); Feyd-Rautha Harkonnen (Heir-in-waiting)"),
    text: "Rose from the meanest of Minor Houses on spice profits and cruelty. Giedi Prime is a polluted factory world; Arrakis is the jewel the Baron grips. Wants power at any cost, above all the Atreides' ruin.",
    src: "Great Game p.38; Core p.41", minors: [["Rabban", "Harkonnen cadet branch ruling the whaling world Lankiveil; launders spice profits."], ["Gauger", "Inbred fringe House in the gray market of the slave trade."], ["Zerides", "Runs the breadbasket world Kittiak that feeds the Harkonnen machine; ambitious and chafing."]] });
  house({ name: "House Kenola", rank: "Major", homeworld: "Allgrave", crest: "Open book", motto: "In faith is strength", traits: ["Dogmatic", "Faithful"],
    primary: ["Religion (Machinery): religious paraphernalia"], secondary: ["Religion (Understanding): the retreat on Caliburn", "Artistic (Produce): religious art and poetry"],
    family: fam("Baron Father Darius Kenola (Ruler); Baroness Margaret Kenola (Consort)"),
    text: "Pious Orange Catholic House on a bleak scrubland world that sells the trappings of faith; its devotion has waxed and waned with each ruler. Caliburn (Andala VIII) hosts its monastic retreat.",
    src: "Great Game p.40", minors: [["Norell", "Manages Andala's scant farms and mines."], ["Darvin", "Sells cheaper Kenola wares through less reputable channels, including black markets."], ["Vishala", "Flagellants who claim visions through self-punishment; seen as holy."]] });
  house({ name: "House Lindaren", rank: "Major", homeworld: "Wrasni", crest: "Scythe or sickle", motto: "Nothing built without foundation", traits: ["Passionate", "Righteous"],
    primary: ["Industrial (Produce): lichen-based fabrics"], secondary: ["Military (Produce): small arms and ammunition for self-defense", "Industrial (Understanding): logistics"],
    family: fam("Shishaku Dalryu Lindaren (Ruler); Shishaku Ishino Lindaren (Ruler); Ina Lindaren (Consort); Erka Udo (Advisor)"),
    text: "Frozen world whose people live underground on core heat; ruled by two brothers by tradition. Trade passes through the orbital station Osmynea. Wants more holdings to become self-sufficient.",
    src: "Great Game p.42", minors: [["Gikoas", "Recruits and trains Lindaren's large military."], ["Arrdast", "Mass-produces lichen-fabric weapons and armor."], ["Dradlen", "Mechanics who keep Wrasni's cities from freezing."]] });
  house({ name: "House Maros", rank: "Major", homeworld: "Grenbelle", crest: "Bull", motto: "Ours is the hunt", traits: ["Just", "Respectful"],
    primary: ["Farming (Produce): Marosdeer venison"], secondary: ["Industrial (Machinery): factories hidden on its moons", "Artistic (Expertise): landscape design"],
    family: fam("Cacica Silinth Aegrivi Maros (Ruler); Cacica Willowwind Cawrnet Maros (Consort); Meadow Aegrivi Maros (Heir); Shrixe Ghi (Spymaster)"),
    text: "Idyllic pastoral world famed for fashionable venison, kept pretty by exiling its industry — and the slaughterhouse world Qardhyr — out of sight.",
    src: "Great Game p.44", minors: [["Xekma", "Runs Qardhyr, the grim factory-farm 'Slaughterhouse' world."], ["Coel", "Packages and ships Maros delicacies and Xekma bulk meat."], ["Talolia", "Tans Marosdeer hides on Grenbelle's smallest moon."]] });
  house({ name: "House Mikarrol", rank: "Major", homeworld: "Tengrid", crest: "Mailed fist", motto: "We hold the chains", traits: ["Cruel", "Amoral"],
    primary: ["Farming and Industrial (Workers): slaves"], secondary: ["Farming (Produce): herd animals", "Science (Understanding): alien flora and fauna"],
    family: fam("Marquis Bartholomew Mikarrol (Ruler); Lesser Prince Gordian Mikarrol (Advisor); Guinevere Minsk (Swordmaster)"),
    text: "Slaver House whose grassland world hides vast slave pens under its megacities. It profits from chaos and sows it deliberately.",
    src: "Great Game p.46", minors: [["Reyder", "Pirates and slavers wearing a House's colors; no home planet."]] });
  house({ name: "House Moritani", rank: "Major", homeworld: "Grumman", crest: "Horse", motto: "Might is power", traits: ["Independent", "Vengeful"],
    primary: ["Military (Machinery): atomics and munitions stockpile"], secondary: ["Industrial (Produce): raw materials, chiefly salt", "Kanly (Expertise): mercenaries and assassins"],
    family: fam("Viscount Hundro Moritani (Ruler); Cilla Moritani (Consort, deceased); Wolfram Moritani (Heir); Trin Kronos (Swordmaster); Hiih Resser (Swordmaster)"),
    text: "Volatile, vengeful House on a dying world, at open kanly with Ecaz and Ginaz and plotting against the Atreides. Also owns the pleasure world Gamont. Its fall makes it best suited to earlier eras.",
    src: "Great Game p.48", minors: [["Dusara", "Remote House supplying soldiers to the Moritani military."], ["Elacca", "Secretly a Moritani ally inside Ecaz's own vassals."], ["Zhelov", "Rising House with fine schools; makes cheap vat-grown military rations."]] });
  house({ name: "House Mutelli", rank: "Major", homeworld: "Katinov", crest: "Tudor rose", motto: "We know", traits: ["Respected"],
    primary: ["Political (Expertise): diplomacy and mediation"], secondary: ["Political (Produce): information, secrets and favors", "Kanly (Expertise): assassination consultancy"],
    family: fam("Count Zoltan Bernd Flambert (Ruler); Countess Evadne Flambert (Consort); Aburne Fanell (Advisor); Sarth and Yarna Flambert (Heirs); Mediator Iba Savris (Advisor)"),
    text: "Professional mediators who meet clients on neutral space stations — and quietly refer some to assassins. They seek every inter-faction conflict to advise on.",
    src: "Great Game p.50", minors: [["Maspon", "Assassins who get Mutelli's kanly referrals."], ["Kasilda", "Builds Mutelli's diplomatic space stations."], ["Rukoni", "Supplies surveillance devices to spy on Mutelli's clients."]] });
  house({ name: "House Novebruns", rank: "Great", homeworld: "Novebruns", crest: "Cut gemstone", motto: "Prosperity from darkness", traits: ["Cutthroat", "Expansionist"],
    primary: ["Industrial (Produce): refined ores"], secondary: ["Industrial (Machinery): mining tools and vehicles", "Science (Understanding): planetology"],
    family: fam("Lady Eulaia Novebruns (Ruler); Lady Silta Defonsa (Consort); Nevel Defonsa Novebruns (Heir)"),
    text: "Mining House on a rust-red world under a red giant, overextended by mining out its home and grabbing poorly defended claims far away. The palace moved to the moon Clione.",
    src: "Great Game p.52", minors: [["Lanell", "Provides defensive troops when Novebruns assets are threatened."], ["Tuma", "Builds ore haulers and mining-vehicle controls."], ["Nemisto", "Makes lowbrow entertainment to keep the miners pacified."]] });
  house({ name: "House Richese", rank: "Minor", homeworld: "Richese", crest: "Lamp", motto: "Technology under faith", traits: ["Innovative", "Resourceful"],
    primary: ["Industrial (Produce): miniaturization"], secondary: ["Industrial (Machinery): Heighliners"],
    family: fam("Countess Ilbana Richese (Ruler); Reverend Mother Cora Arlana (Advisor); Penelope Jax (Spymaster); Edwyn Richese (Envoy)"),
    text: "Technocratic rival of Ix, still recovering from economic war with Vernius and the Emperor's destruction of its research moon Korona.",
    src: "Great Game p.54", minors: [["Vandor", "Runs the strained Heighliner shipyards."], ["Tasini", "Commands the Richesian navy, disgraced after Korona."], ["Rund", "Distant Richese branch devoted to research and development."]] });
  house({ name: "House Spinnette", rank: "Major", homeworld: "Draemh", crest: "Knife", motto: "The two-sided blade", traits: ["Cunning", "Discreet"],
    primary: ["Kanly (Workers): assassins"], secondary: ["Artistic (Expertise): poison cuisine", "Science (Produce): drugs, poisons and flavour extracts"],
    family: fam("Choudhry Baizuk Spinnette (Ruler); Zamindar Rannin Spinnette (Heir); Mihglen Okkenak (Warmaster)"),
    text: "Assassin-training House on a world of deadly wilderness that wants kanly to replace wider war at every level of society.",
    src: "Great Game p.56", minors: [["Sossuon", "Costumes for performers and disguises for assassins."], ["Ezraxin", "Ruffians for hire."], ["Ningale", "Buys and sells secrets and scandal."]] });
  house({ name: "House Taligari", rank: "Major", homeworld: "Artisia", crest: "Scales", motto: "Nobility is all", traits: ["Artistic", "Deceptive"],
    primary: ["Artistic (Expertise)"], secondary: ["Artistic (Machinery): stagecraft technology", "Political (Workers): actors and stage technicians"],
    family: [],
    text: "House of performers whose holiday world rivals Kaitain for beauty; holds nine fief planets. Favors peace, because people at war don't buy art.",
    src: "Great Game p.58", minors: [["Jongleur", "Troubadours whose emotion-stirring technique rivals the Voice (see Power and Pawns)."], ["Petroni", "Handles food and essentials for the Taligari holdings."], ["Xibala", "Supplies Taligari's docents — some say Xibala truly runs Taligari."]] });
  house({ name: "House Thorvald", rank: "Great", homeworld: "Ipyr", crest: "Hammer", colors: "Indigo and yellow", motto: "The hammer of wealth", traits: ["Diligent", "Competitive"],
    primary: [], secondary: [],
    family: fam("Earl Memnon Thorvald (Ruler); Fabrizi Thorvald (Heir); Vercing Koji (Warmaster); Loura Dae (Advisor)"),
    text: "Smelting House of a mountainous world ringed by the Ipyrian asteroid belt, scarred by a civil war thirty years ago. The Earl's sister married Emperor Shaddam IV.",
    src: "Great Game p.60", minors: [["Duva", "Leading rare-element miners of the asteroid belt."], ["Sang", "Traders who hold the Heighforge; take large bribes."], ["Ein", "Military House famous for brilliant squad leaders."]] });
  house({ name: "House Vernius", rank: "Major", homeworld: "Ix", crest: "Double helix", colors: "Purple and copper", motto: "Truth from science", traits: ["Cunning", "Creative"],
    primary: ["Industrial (Machinery): Heighliners and other advanced technology"], secondary: ["Espionage (Machinery): spy equipment"],
    family: fam("Earl Bronso Vernius (Ruler); Jon Tur (President/Councilor); Doris Silvian (Spymaster); Darius (Warrior)"),
    text: "Ixian House whose earl is now a figurehead for the Technocrat Council; its underground factories build Heighliners and edict-skirting devices.",
    src: "Great Game p.62; Core p.42", minors: [["Aldrick", "Builds surveillance gear and hunter-seekers on an artificial moon."], ["VaVar", "Runs the Ixian shipyards."], ["Randal", "Starship circuitry from Petra II."]] });
  house({ name: "House Wydras", rank: "Great", homeworld: "Meuse", crest: "Laza tiger", motto: "The shadows are listening", traits: ["Subtle", "Impartial"],
    primary: ["Espionage (Understanding)"], secondary: ["Espionage (Produce): the data banks of Meuse", "Religion (Expertise): independent thought"],
    family: fam("Lady Cordelia L'Hiver (Ruler); Griffith L'Hiver (Consort); Madame Hyacinth (Master of Assassins)"),
    text: "Spymasters for hire who guard their clients' secrets and their own impartiality above all; Meuse is a city-planet of archives.",
    src: "Great Game p.64", minors: [["Villon", "Thieves who handle the 'déclassé' extractions."], ["Apollinaire", "Experimental spycraft on the jungle world Fournier."]] });

  // ---- Houses outside The Great Game's chapter
  house({ name: "House Corrino", rank: "Imperial", homeworld: "Kaitain", crest: "Golden lion", traits: ["Imperial", "Military"],
    family: fam("Padishah Emperor Shaddam IV (Ruler); Princess Irulan (Heir)"),
    text: "The Imperial House since the Battle of Corrin ten thousand years ago, ruling first from Salusa Secundus and now from Kaitain; its power rests on the Sardaukar and on balancing the Landsraad, the Guild and CHOAM.",
    src: "Core p.41; Power and Pawns p.16" });
  house({ name: "House Wayku", rank: "Unranked", homeworld: "", traits: ["Discreet"],
    text: "Disgraced House that serves the Guild as stewards and attendants aboard Heighliners; playable as a House (see The Great Game).",
    src: "Great Game p.78" });

  DUNE_DB.add("houses", H);
})();
