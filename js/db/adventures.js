// The published adventures: Agents of Dune (the starter set, with its cards and character folios), the Masters of
// Dune campaign and the Gamemaster's Toolkit. Stat blocks, keywords and page numbers follow the books; every
// description is a short summary written for this tool. Where a card and the book disagree, the entry says so.
(function () {
  const DB = window.DUNE_DB;
  const SK = ["Battle", "Communicate", "Discipline", "Move", "Understand"];
  const DR = ["Duty", "Faith", "Justice", "Power", "Truth"];
  const nums = (s, keys) => Object.fromEntries(keys.map((k, i) => [k, +s[i]]));
  const list = (s) => (s ? s.split(/,\s*(?![^()]*\))/) : []);

  // ---------------- NPCs and pregenerated characters ----------------
  // npc(name, title, kind, faction, skills "BCDMU", drives "DFJPT", focuses {skill: "a, b"}, talents "a; b", traits, assets, src, text)
  const N = [];
  function npc(name, title, kind, faction, skills, drives, focuses, talents, traits, assets, src, text) {
    const f = {};
    Object.entries(focuses || {}).forEach(([k, v]) => (f[k] = list(v)));
    N.push({ name, title, kind, faction, skills: nums(skills, SK), drives: nums(drives, DR), focuses: f,
      talents: talents ? talents.split(/;\s*/) : [], traits: list(traits), assets: list(assets), text, src });
  }
  const P = "Player character", NM = "Named", A = "Archetype";
  const AOD = (p) => "Agents of Dune p." + p, CARD = (p) => "Agents of Dune Cards p." + p, FOLIO = (p) => "Agents of Dune Folios p." + p;
  const MOD = (p) => "Masters of Dune p." + p, GMT = (p) => "GM Toolkit p." + p;

  // Agents of Dune: the five player characters (character folios; the cards repeat them)
  npc("Shizu Nagara", "Martial Noble", P, "House Nagara", "65476", "74685", { Battle: "Dueling", Communicate: "Charm", Discipline: "Observe", Move: "Pilot (Ornithopter), Stealth", Understand: "Danger Sense" },
    "Cool Under Pressure (Battle); Subtle Step; The Slow Blade", "Noble, Leader", "", FOLIO(7) + "; " + CARD(1), "One of the Countess's heirs: a bold duelist and pilot who means to see her House respected, and her enemies repaid.");
  npc("Jiro Nagara", "Charismatic Noble", P, "House Nagara", "57646", "86745", { Communicate: "Deceit, Persuasion", Discipline: "Observe", Understand: "Etiquette" },
    "Bold (Communicate); Hidden Motives; Masterful Innuendo", "Noble, Stylish", "", FOLIO(11) + "; " + CARD(3), "The Countess's other heir, a smooth and stylish talker more at home at court than in a duel.");
  npc("Zafir Callas", "Swordmaster", P, "House Nagara", "75664", "64857", { Battle: "Dueling, Short Blades", Discipline: "Command", Move: "Grace" },
    "Decisive Action; Dedication; Find Trouble", "Swordmaster, Honorable", "", FOLIO(15) + "; " + CARD(5), "House Nagara's Swordmaster, sworn to the heirs. Skills follow the folio (Battle 7, Communicate 5, Discipline 6, Move 6, Understand 4); the card prints 4, 7, 5, 4, 5.");
  npc("Natalia Khan", "Mentat Advisor", P, "House Nagara", "46657", "67458", { Communicate: "Diplomacy", Discipline: "Self-Control", Understand: "Advanced Technology, Data Analysis" },
    "Advisor (Understand); Bolster; Mentat Discipline", "Mentat, Careful", "", FOLIO(19) + "; " + CARD(7), "The House's Mentat, careful and exact, who serves at the pleasure of the House.");
  npc("Alice Dominica", "Bene Gesserit Spymaster", P, "Bene Gesserit", "64765", "48576", { Battle: "Unarmed Combat", Discipline: "Composure, Espionage", Move: "Swift" },
    "Hyperawareness; Mask of Power; Prana-bindu Conditioning", "Bene Gesserit, Spymaster, Cunning", "", FOLIO(23) + "; " + CARD(9), "A Bene Gesserit Sister who runs House Nagara's spies, loyal to her leaders and to the Sisterhood.");

  // Agents of Dune: allies, rivals and villains
  npc("Niran Rani", "Harkonnen Battle Advisor", NM, "House Harkonnen", "74654", "68754", { Battle: "Short Blades, Strategy", Discipline: "Command" },
    "Advisor (Battle)", "Soldier, Abrasive", "Knife, Sword, Personal Shield", AOD(21), "A blunt, scarred Harkonnen commander who trains the heirs hard and accepts no half measures.");
  npc("Turo Imshel", "Harkonnen Behavioral Advisor", NM, "House Harkonnen", "47545", "47586", { Communicate: "Charm", Discipline: "Observe", Understand: "Psychiatry" },
    "Hidden Motives", "Teacher, Socialite", "Training Notes, Knife, Personal Shield", AOD(22), "A tall, cultured trainer whose charm hides a cutting wit; the gentle counterweight to Niran Rani.");
  npc("Korbus Zaan", "Harkonnen Mentat", NM, "House Harkonnen", "46657", "76584", { Communicate: "Deceit", Discipline: "Self-Control", Understand: "Data Analysis" },
    "Calculated Prediction; Mentat Discipline", "Mentat, Harkonnen, Duplicitous", "", AOD(22), "An aloof Mentat attached to the trainees, secretly working for the Baron to bring House Nagara down. The book also spells him Kornus or Kobus.");
  npc("Qu'shan", "Low Market Contact", NM, "Underworld", "45446", "36574", { Communicate: "Deceit", Discipline: "Observe", Move: "Unobtrusive" },
    "Constantly Watching", "Broker, Scum", "", CARD(17), "A broker of the Low Market on Giedi Prime who finds outsiders before they find him.");
  npc("Dr. Erika Ganio", "Nagara Chief Scientist", NM, "House Nagara", "45647", "74465", { Discipline: "Composure", Understand: "Advanced Technology, Data Analysis" },
    "Cautious (Understand); Intense Study", "Scientist, Loyal, Dedicated", "", CARD(21), "House Nagara's loyal chief scientist.");
  npc("Sabrya Zayr", "CHOAM Negotiator", NM, "CHOAM", "47556", "76584", { Communicate: "Negotiation" },
    "Dedication", "Diplomat, Arrogant", "", AOD(45), "A seasoned CHOAM trader who tests the heirs' bargaining over House Nagara's wares.");
  npc("Xav Camran", "Factory Worker", NM, "Commoner", "45644", "44444", { Discipline: "Observe" }, "", "Worker", "", CARD(25), "A tall, timid Harkonnen factory hand the heirs interview on their tour.");
  npc("Colrin Bentlix", "Factory Worker", NM, "Commoner", "44654", "44444", { Discipline: "Resolve" }, "", "Worker", "", CARD(27), "A Harkonnen factory hand worn down by the work, interviewed alongside Xav Camran.");
  npc("Callum Ruta", "Revolt Leader", NM, "Commoner", "46556", "46755", { Communicate: "Inspiration, Persuasion", Understand: "Danger Sense" },
    "Bold (Communicate); Driven", "Desperate, Worker, Leader", "", CARD(29), "The desperate leader of the workers' gangs, who has a warning for House Nagara.");
  npc("Kira Jaro", "Lab Technician", NM, "House Nagara", "55646", "76485", { Battle: "Short Blades", Understand: "Advanced Technology" },
    "", "Technician, Arrogant", "Kindjal, Poison Needle", AOD(59), "A Nagara lab technician who turns out to be a saboteur, and demands a duel when she is caught.");
  npc("Countess Sakura Nagara", "Ruler of House Nagara", NM, "House Nagara", "56657", "74685", { Communicate: "Empathy", Discipline: "Command", Understand: "Advanced Technology, House Politics" },
    "Dedication; Improved Resources; Passive Scrutiny", "Countess, Dedicated, Ambitious", "", AOD(62), "Mother of the heirs and ruler of House Nagara, assassinated as the House takes Arrakis.");
  npc("Major Roj Varis", "Nagara Military Officer", NM, "House Nagara", "74655", "75645", { Battle: "Long Blades, Tactics", Discipline: "Command" },
    "Decisive Action (Battle)", "Diplomat, Arrogant", "", AOD(84), "The Countess's most trusted officer, commanding the Nagara household guard on Arrakis.");
  npc("Captain Taras Nikula", "Harkonnen Captain", NM, "House Harkonnen", "47556", "74465", { Battle: "Rifle", Communicate: "Interrogation" },
    "Decisive Action (Battle); Driven; The Slow Blade", "Diplomat, Arrogant", "", AOD(84), "A Harkonnen officer overseeing the handover on Arrakis, still loyal to his old masters.");
  npc("Ashem Perro", "The Judge of the Change", NM, "Spacing Guild", "48657", "84567", { Battle: "Unarmed Combat", Communicate: "Deceit", Discipline: "Self-Control", Understand: "Data Analysis" },
    "Cautious (Understand); Cool Under Pressure (Discipline); Subtle Words (Communicate)", "Spacing Guild, Judge of the Change, Astute and Honorable", "", AOD(77),
    "A former Guild envoy appointed by the Emperor to oversee the change of rule on Arrakis. The book also spells him Asham.");
  npc("Vadim Saarela", "Harkonnen Spymaster", NM, "House Harkonnen", "57656", "74565", { Communicate: "Interrogation", Discipline: "Resolve", Understand: "Deductive Reasoning" },
    "Direct; Passive Scrutiny; Subtle Words (Communicate)", "Spy, Mastermind", "", AOD(87), "The Harkonnen spymaster on Arrakis, a mastermind who holds his own truth absolute. Also spelled Sareela.");
  npc("Ustad Turan", "CHOAM Spice Auditor", NM, "CHOAM", "46646", "75654", { Communicate: "Charm", Discipline: "Self-Control", Understand: "Data Analysis" },
    "Intense Study", "CHOAM Auditor, Inquisitive", "", AOD(87), "CHOAM's spice auditor on Arrakis, for whom CHOAM is balance. Also spelled Turnan.");
  npc("Cenric", "Spacing Guild Envoy", NM, "Spacing Guild", "46746", "76574", { Communicate: "Diplomacy", Discipline: "Command", Understand: "Imperial Politics" },
    "Driven; Subtle Words (Communicate)", "Envoy, Spacing Guild, Authoritarian and Intellectual", "", AOD(89) + "; " + MOD(135), "The Guild's envoy to Arrakis, who returns as House Nagara's liaison in Masters of Dune.");
  npc("Qadira Lariel Narilan", "Bene Gesserit Reverend Mother", NM, "Bene Gesserit", "65756", "76548", { Communicate: "Empathy", Discipline: "Observe", Move: "Grace" },
    "Hyperawareness; Other Memory; Prana-bindu Conditioning; Voice", "Bene Gesserit Reverend Mother, Reticent, Shrewd and Incisive", "", AOD(88) + "; " + MOD(119), "A reticent Reverend Mother on Arrakis who watches the politics of the change closely.");
  npc("Harun", "Fremen Warrior", NM, "Fremen", "76665", "67655", { Battle: "Short Blades", Communicate: "Deceit", Discipline: "Self-Control", Move: "Stealth" },
    "The Slow Blade", "Fedaykin Warrior, Sietch Jurf'ahmar, Taciturn and Stoic", "", AOD(97), "A stoic Fedaykin of Sietch Jurf'ahmar, captured by the House's men; how he is treated shapes the Fremen's view of House Nagara.");
  npc("Musa", "Fremen Naib", NM, "Fremen", "76655", "87665", { Battle: "Short Blades, Pistols", Communicate: "Charm", Discipline: "Self-Control", Move: "Stealth" },
    "Advisor (Communicate); Bold (Battle); Cool Under Pressure (Discipline)", "Naib of Sietch Jurf'ahmar, Fedaykin Warrior, Intense, Intelligent, and Proud", "", AOD(104), "The proud Naib of Sietch Jurf'ahmar, who negotiates with the heirs for his people.");
  npc("Spice Smuggler", "", A, "Underworld", "55464", "44444", { Battle: "Short Blades", Understand: "Smuggling" }, "", "Smuggler", "", CARD(53), "Generic smuggler from the Agents of Dune cards.");
  npc("House Nagara Soldiers", "", A, "House Nagara", "65554", "44444", { Battle: "Pistols" }, "Cautious (Battle)", "Soldier", "", CARD(61), "House Nagara's rank-and-file soldiers.");
  npc("Harkonnen Soldiers", "", A, "House Harkonnen", "54454", "55555", { Battle: "Rifle" }, "Bold (Battle)", "Soldier", "", CARD(63), "Harkonnen rank-and-file soldiers from the Agents of Dune cards.");

  // Masters of Dune
  npc("Geeta Nagara", "Young House Nagara Noble", NM, "House Nagara", "65686", "54876", { Communicate: "Listening", Discipline: "Espionage", Move: "Stealth" },
    "Find Trouble; Nimble", "Scout for House Nagara, Daring and Proud", "Knife, Stillsuit", MOD(22), "A restless young Nagara scout, recently in Harkonnen hands. What they did to her is left to the gamemaster.");
  npc("Ulako Hibb", "One-Eye, Fake Fremen Mercenary", NM, "Underworld", "76765", "47685", { Battle: "Short Blades", Communicate: "Bartering", Discipline: "Command" },
    "Collaboration (Battle); Improvised Weapon", "Mercenary, Ruthless, Missing an Eye", "Maula Pistol, Knife, Stillsuit", MOD(26), "A veteran mercenary called One-Eye, whose band poses as Fremen raiders for the Harkonnens.");
  npc("Fake Fremen Mercenaries", "", A, "Underworld", "64554", "66666", { Battle: "Short Blades" }, "", "Mercenary", "Knife", MOD(26), "One-Eye's band, disguised as Fremen.");
  npc("Tamara Pilru", "Envoy of House Vernius", NM, "House Vernius", "47556", "85746", { Communicate: "Negotiation", Understand: "Imperial Politics" },
    "Masterful Innuendo", "Diplomat, Arrogant", "Diplomatic Envoy", MOD(32), "A loyal, truthful Vernius diplomat, kept in the dark about her own House's plans.");
  npc("Jain and Lela", "Imperial Court Servants", NM, "Imperial Court", "36545", "75436", { Communicate: "Listening", Discipline: "Observe", Understand: "Court Etiquette" },
    "Constantly Watching; Nimble", "Servant, Dedicated", "Emergency Transmitter, Skeleton Key", MOD(48), "Two servants assigned to House Nagara on Kaitain, whose goodwill is tracked on a scale of 1 to 5.");
  npc("Princess Josifa Corrino", "Imperial Princess", NM, "House Corrino", "36547", "47658", { Communicate: "Empathy", Understand: "Etiquette, Imperial Politics" },
    "Intense Study; Prana-bindu Conditioning", "Princess, Academic, Bene Gesserit", "Court Influence, Emergency Transmitter", MOD(51), "A scholarly daughter of the Emperor, trained by the Bene Gesserit.");
  npc("Reverend Mother Montemagni", "Bene Gesserit Reverend Mother", NM, "Bene Gesserit", "36757", "87564", { Communicate: "Secret Language (Bene Gesserit), Teaching", Discipline: "Observe" },
    "Hyperawareness; Prana-bindu Conditioning; Voice", "Bene Gesserit, Reverend Mother", "Bene Gesserit Students, Gom Jabbar, Robes of a Reverend Mother", MOD(51), "Josifa's teacher at court, for whom the Sisterhood comes before all things.");
  npc("Rikalian Nolm", "Harkonnen Spy", NM, "House Harkonnen", "55667", "65487", { Battle: "Short Blades", Understand: "Explosives, Hidden Paths" },
    "Cautious (Move)", "Desperate, Spy Master", "Blade, Cibus Hood, Lockpicks", MOD(63), "The Harkonnen agent who reconnoiters and sabotages House Nagara before the attack.");
  npc("Aratan Tulan", "Harkonnen General Officer", NM, "House Harkonnen", "55644", "85476", { Discipline: "Leadership" },
    "Bolster; Tactician; Unquestionable Loyalty", "Officer, Cunning", "Blade, House Harkonnen Commandos, Shield Belt", MOD(71), "The Harkonnen officer who leads the assault on Arrakeen.");
  npc("Harkonnen Commandos", "", A, "House Harkonnen", "65544", "55555", { Battle: "Small Arms" }, "", "Brutal, Commando", "Lasgun, Shield Belt, Sword", MOD(71), "Elite Harkonnen killers; Quality 3 as a Warfare asset.");
  npc("Harkonnen Troopers", "", A, "House Harkonnen", "54444", "44444", { Battle: "Small Arms" }, "", "Soldier", "Lasgun, Shield Belt, Sword", MOD(71), "Rank-and-file Harkonnen soldiers in the attack on Arrakeen (the book calls them Harkonnen Soldiers).");
  npc("Tyra", "Fremen Tribeswoman", NM, "Fremen", "57645", "76845", { Communicate: "Charm, Teaching", Discipline: "Survival (Desert)" },
    "Collaboration (Communicate)", "Fremen Diplomat, Staunch Ally", "Crysknife, Fremkit, Maker Hooks", MOD(80), "A young, open-minded Fremen who believes her people must learn from off-worlders, and champions House Nagara.");
  npc("Antrin", "Naib of Sietch Korba", NM, "Fremen", "68755", "76845", { Battle: "Tactics", Communicate: "Diplomacy, Interrogation", Discipline: "Survival (Desert)" },
    "Binding Promise; Cautious (Discipline)", "Fremen Elder, Naib of Sietch Korba", "Band of Fremen Warriors, Crysknife, Maker Hooks, Stillsuit", MOD(84), "The Naib of Sietch Korba, who weighs the well-being of his sietch above all.");
  npc("Nulan", "Fremen Warrior", NM, "Fremen", "84765", "85764", { Battle: "Dueling, Short Blades", Discipline: "Survival (Desert)" },
    "Nimble; Resilience (Battle)", "Fremen Warrior, Isolationist", "Crysknife, Fremkit, Stillsuit", MOD(84), "A fierce isolationist warrior of Sietch Korba, eager to duel the outsiders.");
  npc("Jarood", "Arrakeen Native, Imposter", NM, "Arrakis", "45657", "64758", { Discipline: "Composure", Understand: "Ecology, Deductive Reasoning" },
    "Hidden Motives", "Arrakeen Native, Deceitful", "Poison Tooth, Scout Ornithopter, Stillsuit", MOD(90), "The man in the dunes: a deceitful native who believes Arrakis must remain a desert.");
  npc("Zetan Ben Zeev", "House Nagara Ambassador", NM, "House Nagara", "47646", "86574", { Communicate: "Diplomacy", Discipline: "Self-Control", Understand: "Etiquette" },
    "Deep Knowledge", "Ambassador of House Nagara, Cautious", "Communinet Receiver, Ixian Damper, Mansion in the Landsraad District", MOD(98), "House Nagara's cautious ambassador on Kaitain, who guides the House through the vote of no confidence.");
  npc("Prince Kole Alexin", "Prince of House Alexin, Musical Prodigy", NM, "House Alexin", "46745", "67458", { Communicate: "Composition", Discipline: "Performance", Understand: "Imperial Politics" },
    "Intense Study", "Noble, Philosophical", "Elite Troops, Palace Fortress", MOD(102), "The philosophical young ruler of House Alexin, more devoted to art than to running his House.");
  npc("Godwyn Alexin", "Noble, Warmaster Mentat", NM, "House Alexin", "77655", "84675", { Battle: "Strategy", Communicate: "Logistics", Discipline: "Command" },
    "Advisor (Battle); Verify", "Noble, Logistical Genius", "Elite Troops, House Assassins, Palace Fortress", MOD(102), "Kole's uncle, a Mentat and the real power behind House Alexin.");
  npc("Lady Caranda Ecaz", "Ruler of House Ecaz", NM, "House Ecaz", "65525", "74865", { Battle: "Command" },
    "Direct", "Noble, Vengeful", "Concealable Knife, Personal Shield", MOD(105), "The vengeful ruler of House Ecaz, who reads House Nagara's fortune in her cards before she will ally with them.");
  npc("Djau Ibe", "Swordmaster, Duelist", NM, "Underworld", "74565", "67584", { Battle: "Dueling", Move: "Combat" },
    "Bold (Battle)", "Duelist, Confident", "Knife, Personal Shield, Dueling Sword", MOD(110), "A duelist of the Obsidian Legion, a clandestine mercenary company in Corrinth City.");
  npc("Alexzander Harkonnen", "Noble, Political Mastermind", NM, "House Harkonnen", "47647", "74685", { Communicate: "Espionage", Discipline: "Resolve", Understand: "House Politics" },
    "Binding Promise; Hidden Motives; Mask of Power", "Noble, Cunning", "Communinet Transceiver, Emergency Transmitter, Ixian Damper", MOD(112), "A scheming Harkonnen nephew who wants the family name to mean more than brutality, with himself in charge.");
  npc("Vassily Harkonnen", "Noble, Duelist", NM, "House Harkonnen", "84565", "86475", { Battle: "Dueling", Move: "Combat" },
    "Duelist", "Noble, Violent", "Dueling Saber, Kindjal, Personal Dueling Shield", MOD(112), "A Harkonnen nephew trained as a gladiator, who kills as the Baron commands.");
  npc("Ayeana", "Bene Gesserit Agent", NM, "Bene Gesserit", "47575", "65784", { Communicate: "Deceit", Move: "Stealth, Unobtrusive" },
    "Prana-bindu Conditioning", "Bene Gesserit Acolyte, Member of House Nagara Staff", "Bodkin, Palm Lock, Bene Gesserit Coded Dots", MOD(120), "A Bene Gesserit acolyte placed on House Nagara's staff, ambitious to be recognized.");
  npc("Javal Bryce", "Criminal Gang Boss", NM, "Underworld", "56755", "47586", { Communicate: "Charm", Discipline: "Command, Composure" },
    "Driven", "Arrakeen Native, Successful, Underworld Boss", "Gang Members, Maula Pistol", MOD(120), "A charming Arrakeen gang boss who takes what he wants, and the lover of a Bene Gesserit acolyte.");
  npc("Ryssa", "Bene Gesserit Acolyte, Minor Heir of House Alexin", NM, "House Alexin", "46557", "67548", { Communicate: "Persuasion", Discipline: "Observe", Move: "Grace", Understand: "Etiquette, House Politics" },
    "Find Trouble", "Bene Gesserit Acolyte, Distant Heir to House Alexin", "Concealed Knife", MOD(123), "A teenage acolyte torn between the Sisterhood, her family and her affair with Javal Bryce.");
  npc("Lady Ottavia", "Consort of Lord Tevnor Alexin", NM, "House Alexin", "56547", "84567", { Communicate: "Diplomacy", Understand: "House Politics, Physical Empathy" },
    "Putting Theory into Practice; Voice", "Bene Gesserit Acolyte, Consort of Lord Tevnor of House Alexin", "Friends in High Places, House Staff", MOD(125), "A Bene Gesserit consort in House Alexin, faithful first to the Sisterhood.");
  npc("Mother Superior Harishka", "Bene Gesserit Mother Superior", NM, "Bene Gesserit", "68758", "87465", { Battle: "Unarmed Combat", Communicate: "Persuasion, Secret Language (Bene Gesserit)", Discipline: "Command, Composure, Observe, Self-Control", Move: "Grace", Understand: "Cultural Studies, House Politics, Physical Empathy, Religion" },
    "Hidden Motives; Hyperawareness; Other Memory; Prana-bindu Conditioning; Voice", "Bene Gesserit, Reverend Mother, Mother Superior", "", MOD(129), "The head of the Sisterhood, who directs its plans and takes an interest in House Nagara.");

  // Gamemaster's Toolkit: the people of its three locations
  npc("Wyr Jadrel", "Smuggler Leader", NM, "Underworld", "47565", "74556", { Communicate: "Charm", Move: "Swift" }, "Direct", "Smuggler, Administrator", "Maula Pistol, Shigawire Reel Records", GMT(29), "Runs the warehouse at the Sand Boulder smuggler base and keeps its records.");
  npc("Brae Oroys", "Persuasive Fence", NM, "Underworld", "56745", "55674", { Communicate: "Persuasion", Discipline: "Resolve" }, "Driven", "Smuggler, Salesperson", "Liquor, Flip-dart Wrist Bracer, Outstanding Debts", GMT(30), "Runs the Sand Boulder's trading post and bar, and prides himself on stocking everything a smuggler needs.");
  npc("Yari Elenne", "Maintenance Engineer", NM, "Underworld", "55467", "54567", { Move: "Grace", Understand: "Advanced Technology" }, "Intense Study", "Smuggler, Scientist, Engineer", "Flip-dart Ring, Handheld Chemical Analyzer", GMT(30), "Manages the Sand Boulder's spice laboratories.");
  npc("Brewen Ayd", "Ornithopter Pilot", NM, "Underworld", "65475", "46575", { Battle: "Strategy", Move: "Pilot (Ornithopter)" }, "Bold (Battle)", "Smuggler, Pilot", "Ornithopter, Debt to Brae, Maula Pistol", GMT(31), "A reckless, fearless smuggler pilot, always in debt to Brae.");
  npc("Tirenna Kraic", "Ruthless Businessperson", NM, "Underworld", "47655", "74565", { Communicate: "Charm, Innuendo", Discipline: "Observe, Self-Control" }, "Subtle Words", "Businessperson, Ruthless", "Security and Surveillance Systems, Poisoned Needle", GMT(33), "The coldly charming owner of the House of Amaranth, whose staff remember everything their guests say.");
  npc("Rodikar", "Taciturn Bodyguard", NM, "Underworld", "74655", "56475", { Battle: "Dirty Fighting, Unarmed Combat", Discipline: "Composure, Resolve" }, "Constantly Watching", "Bouncer, Deadly", "Concealed Body Armor, Maula Pistol, Kindjal", GMT(33), "The House of Amaranth's soft-spoken, deadly bouncer.");
  npc("Gabin Doresh", "House Wayku Head Steward", NM, "House Wayku", "47556", "75556", { Communicate: "Charm, Empathy", Understand: "Etiquette" }, "Hidden Motives", "Steward, Polite", "Passenger Lists, Concealed Knife", GMT(35), "A head steward of the Star Princess whose real job is making sure no one upsets the Guild.");
  npc("Maoina", "Trader", NM, "Commerce", "45567", "55576", { Move: "Unobtrusive", Understand: "Etiquette, Imperial Politics" }, "Masterful Innuendo", "Trader, Greedy", "Useful Pieces of Gossip, Snacks and Treats", GMT(35), "A greedy trader aboard the Star Princess who sells truth to the highest bidder.");
  DB.add("npcs", N);

  // NPC talents these books introduce
  DB.add("abilities", [
    { name: "Tactician", text: "At the start of a Warfare conflict, spend 1 Threat to raise the Quality of one unit under this character's command by 1.", src: MOD(71) },
    { name: "Deep Knowledge", text: "Once per adventure, provide knowledge about a political event, House or person on the political scene of Kaitain.", src: MOD(98) },
    { name: "Duelist", text: "Once per duel, re-roll any failed d20.", src: MOD(112) },
  ]);

  // ---------------- Assets ----------------
  // [name, category, group, keywords, quality, src, summary, special, tangible]
  const AS = [
    ["The Nagara Maula Rifle", "Personal", "House Signature Devices", "", 0, CARD(65), "A spring-loaded projectile rifle with more power and range than standard maula weapons.", "Choosing it makes House Nagara a Military House (Agents of Dune p.3)."],
    ["The Alithiascope", "Personal", "House Signature Devices", "", 0, CARD(67), "A device that separates and identifies chemicals with great speed and accuracy.", "Choosing it makes House Nagara a Scientific House."],
    ["The Blight Scanner", "Personal", "House Signature Devices", "", 0, CARD(69), "Detects the first signs of blight and pests over a wide area.", "Choosing it makes House Nagara a Farming House."],
    ["The Nightshade", "Personal", "House Signature Devices", "", 0, CARD(71), "An oil lens that shows fine detail, even facial expressions, in pitch darkness; for targeting or surveillance.", "Choosing it makes House Nagara an Espionage House."],
    ["Omnigenerator Mark VII", "Personal", "House Signature Devices", "", 0, CARD(73), "A compact power cell that delivers enough energy to run whole factories.", "Choosing it makes House Nagara an Industrial House (the card misprints Espionage)."],
    ["Electronics Kit", "Personal", "Tools and Equipment", "Compact, Electrical, Lockpick", 0, CARD(107), "Tools and meters for electrical repairs, and for bypassing electronic locks and security."],
    ["Harkonnen Secrets", "Intrigue", "Blackmail", "Intrigue, Secrets, Status", 0, CARD(121), "Dirty secrets of Vadim Saarela and House Harkonnen: leverage against both.", "", false],
    ["Stories of Harkonnen Violence", "Intrigue", "Information", "Rumor, Status", 0, CARD(123), "Tales of Harkonnen brutality that could damage their standing among their peers.", "", false],
    ["CHOAM Influence", "Intrigue", "Favors and Debts", "Favors, Power, Trade", 0, CARD(125), "Contacts and bribes that make CHOAM see your House's business more favorably.", "", false],
    // Masters of Dune: spaceborne assets (p.142)
    ["Shuttle", "Warfare", "Spaceships", "Cargo, Fast, Passenger Compartment, Size: Small, Spaceship, Trans-atmospheric", 1, MOD(142), "A small craft that carries people and cargo from orbit to the ground.", "Quality 1–4, depending on size and purpose."],
    ["Reconnaissance Ship", "Warfare", "Spaceships", "Fast, Guns, Improved Sensors, Size: Small, Small Crew, Stealthy, Weak Armor", 1, MOD(142), "A fast, stealthy scout with good sensors and little armor.", "Quality 1–4, depending on size and purpose."],
    ["Troop Transport Ship", "Warfare", "Spaceships", "Point Defense Weapons, Size: Squad, Spaceship", 1, MOD(142), "Carries troops for boarding actions or landings, with point-defense weapons.", "Quality 1–4, depending on size and purpose."],
    ["Cargo Transport", "Warfare", "Spaceships", "Civilian, Large Cargo Compartment, Size: Medium, Spaceship", 1, MOD(142), "A civilian freighter; usually unarmed, perhaps with light weapons against pirates.", "Quality 1–4, depending on size and purpose."],
    ["Frigate", "Warfare", "Spaceships", "Fast, Guns, Shielded, Size: Medium, Spaceship, Warship", 2, MOD(142), "A fast, shielded warship for patrols and inspections.", "Quality 1–4, depending on size and purpose."],
    ["Cruiser", "Warfare", "Spaceships", "Armored Warship, Guns, Missiles, Shielded, Size: Medium, Spaceship", 3, MOD(142), "An armored warship with guns and missiles.", "Quality 1–4, depending on size and purpose."],
    ["Battlecruiser", "Warfare", "Spaceships", "Guns, Heavily Armored Warship, Missiles, Shielded, Size: Large, Spaceship", 4, MOD(142), "A heavily armored capital ship, often carrying troops for boarding actions.", "Quality 1–4, depending on size and purpose."],
    ["Market Station", "Warfare", "Stations", "Bustling Market, Neutral Ground, Ship Docks, Size: Large", 0, MOD(142), "An orbital trade station: neutral ground for meetings and business."],
    ["Mining Site", "Warfare", "Stations", "Industrial Facility, Raw Materials, Size: Large", 0, MOD(142), "An orbital mining facility, a source of wealth and materials."],
    ["Monitoring Outpost", "Warfare", "Stations", "Defensive, Sensor Array, Size: Medium, Strategic", 0, MOD(142), "A military post that watches a system and supports local defenses."],
    ["Space Fortress", "Warfare", "Stations", "Orbital Defense, Shielded, Size: Huge, Strategic", 0, MOD(142), "A heavily armed orbital fortress for space warfare."],
    ["Recon Satellite", "Warfare", "Stations", "Orbital, Sensory Array, Size: Small, Stealth", 0, MOD(142), "A small, hidden orbital spy satellite."],
  ];
  DB.add("assets", AS.map(([name, cat, group, kw, q, src, text, special, tangible]) => ({ name, cat, group, kw: kw ? kw.split(/,\s*/) : [], q, text, special: special || "", tangible: tangible !== false, src })));

  // ---------------- House Nagara and its worlds ----------------
  DB.add("houses", [
    { name: "House Nagara", rank: "Major", liege: "", homeworld: "Vallabhi", crest: "", colors: "", motto: "", traits: [], primary: [], secondary: [],
      family: [{ name: "Countess Sakura Nagara", role: "Ruler" }, { name: "Shizu Nagara", role: "Heir" }, { name: "Jiro Nagara", role: "Heir" }, { name: "Geeta Nagara", role: "Scout" },
        { name: "Zafir Callas", role: "Swordmaster" }, { name: "Natalia Khan", role: "Mentat" }, { name: "Alice Dominica", role: "Spymaster" }, { name: "Major Roj Varis", role: "Military officer" },
        { name: "Dr. Erika Ganio", role: "Chief scientist" }, { name: "Zetan Ben Zeev", role: "Ambassador" }],
      text: "The player characters' House in Agents of Dune and Masters of Dune: a House Major given Arrakis in place of the Harkonnens. Its kind of House depends on the signature device the players choose.",
      src: AOD(3) + "; " + MOD(3) },
    { name: "House Arcuri", rank: "Minor", liege: "House Nagara", homeworld: "", crest: "", colors: "", motto: "", traits: [], primary: [], secondary: [], family: [], text: "Helps House Nagara mine the mineral wealth of Vallabhi.", src: "Great Game p.83" },
    { name: "House Molay", rank: "Minor", liege: "House Nagara", homeworld: "", crest: "", colors: "", motto: "", traits: [], primary: [], secondary: [], family: [], text: "Keeps the training halls on Vallabhi that draw poets; Kara Molay, the Core Rules' example character, is of this House.", src: "Great Game p.83" },
  ]);

  DB.add("planets", [
    { name: "Vallabhi", system: "Beta Tucanae", designation: "", moons: "Three (Aditi, Gayatri, Meera)", habitable: "", house: "House Nagara", vassal: "", ruler: "", note: "Agents of Dune leaves House Nagara's homeworld unnamed",
      exports: "House Nagara's signature device; minerals and gems", population: "Mid-sized cities and villages across the planet", languages: "Galach",
      places: ["Kaler", "Kyotashi", "Rinumian Ridge", "Vallasa"],
      text: "A cool, rugged, mineral-rich world of deep valleys, vast lakes and dangerous tidal islands, under a blue giant in a six-star system. The Nagara city of Kyotashi sits on the mined terraces of the Rinumian Ridge.",
      src: MOD(158) + "; Great Game p.83" },
    { name: "Ala", system: "Odinani", designation: "Ringed gas giant", moons: "Dozens of moonlets; the largest are Amadioha, Ikenga and Ekwensu", habitable: "", house: "", vassal: "", ruler: "", note: "The Odinani system has no habitable planets; trade runs through a Guild station staffed by CHOAM",
      exports: "Ores and fabricated parts, including spice-harvesting machinery", population: "Miners and traders on stations", languages: "",
      places: ["Arusi Asteroid Belt", "Guild Exchange Station", "Heighliner Arrival Point", "Ikenga Station"],
      text: "A vast blue gas giant at the heart of a mining system, its moonlets worked by industrial stations and its trailing asteroid belt a haven for pirates and free traders.",
      src: MOD(140) },
  ]);

  // ---------------- Adventure traits and complications (the Agents of Dune cards) ----------------
  const tr = (name, kind, text, p) => ({ name, kind, text, usedBy: [], src: CARD(p) });
  DB.add("traits", [
    tr("Shaken", "Condition", "The next test you make is 1 Difficulty harder; then hand the card back.", 131),
    tr("Injured", "Complication", "Physical actions are harder until the injury is dealt with; describe how it affects you.", 153),
    tr("Eases Up on Good Students", "Adventure", "Niran Rani's assessments get easier once you have proved yourselves.", 141),
    tr("Drive Students Harder", "Complication", "Niran Rani's assessments get harder until you prove yourselves.", 142),
    tr("Proud Teacher", "Adventure", "Communicate tests with Turo Imshel are easier.", 143),
    tr("Impatient Teacher", "Complication", "Communicate tests with Turo Imshel are harder.", 144),
    tr("Blending In", "Adventure", "Moving around the Low Market and talking to its people is 1 Difficulty easier.", 145),
    tr("Outsiders", "Complication", "Moving around the Low Market and talking to its people is 1 Difficulty harder.", 146),
    tr("Failed to Locate the Problems", "Complication", "Your first test in the shuttle's engine room is 1 Difficulty harder.", 147),
    tr("Impressed by Nagaran Compassion", "Adventure", "Negotiating with Harkonnen workers is 1 Difficulty easier, but Harkonnen leaders and guards think you weak (1 Difficulty harder).", 149),
    tr("Impressed with House Nagara", "Adventure", "Tests dealing with Ashem Perro are easier.", 151),
    tr("Disappointed in House Nagara", "Complication", "Tests dealing with Ashem Perro are harder.", 152),
    tr("Fremen Allies", "Adventure", "Dealing with the Fremen is easier, and spice harvesting goes better.", 163),
    tr("Fremen Enemy", "Complication", "Dealing with the Fremen is harder, and spice harvesting suffers.", 164),
    tr("Failed Negotiators", "Complication", "A group complication: others take advantage, and negotiation tests are 1 Difficulty harder.", 187),
    tr("Naive Diplomats", "Complication", "A group complication: tests involving Imperial politics are 1 Difficulty harder.", 189),
    tr("Badly Trained", "Complication", "A group complication: the first try at any new kind of action is 1 Difficulty harder.", 191),
  ]);

  // ---------------- Adventures, chapters, intrigues and locations ----------------
  // ad(name, kind, part of, page ref, npcs, summary)
  const ad = (name, kind, part, src, npcs, text) => ({ name, kind, part, npcs, text, src });
  DB.add("adventures", [
    ad("Agents of Dune", "Adventure", "", AOD(2), [], "The starter set. The heirs and retainers of House Nagara train on Giedi Prime under the Harkonnens, then take over the spice operation on Arrakis, and learn who their enemies are. Comes with cards, character folios, handouts, trackers and zone maps."),
    ad("Allies and Enemies", "Act", "Agents of Dune", AOD(7), ["Niran Rani", "Turo Imshel", "Korbus Zaan", "Qu'shan"], "Act I: a shuttle-disaster simulation, ground training exercises and a first real task in the Low Market of Giedi Prime."),
    ad("Games and Schemes", "Act", "Agents of Dune", AOD(37), ["Sabrya Zayr", "Xav Camran", "Colrin Bentlix", "Callum Ruta", "Kira Jaro", "Countess Sakura Nagara"], "Act II: a CHOAM negotiation, a factory tour and workers' revolt, sabotage and a duel, and the assassination of the Countess."),
    ad("Desert Planet", "Act", "Agents of Dune", AOD(73), ["Ashem Perro", "Major Roj Varis", "Captain Taras Nikula", "Vadim Saarela", "Ustad Turan", "Cenric", "Qadira Lariel Narilan", "Harun", "Musa"], "Act III: arriving on Arrakis, a death in Arrakeen, the politics of profit, taking command of the spice harvest, and first dealings with the Fremen."),
    ad("Masters of Dune", "Campaign", "", MOD(2), [], "The sequel campaign. House Nagara holds Arrakis while the Harkonnens scheme to take it back. After an opening chapter, seven chapters can be played in any order before a final climax."),
    ad("Influence Indices", "Campaign rule", "Masters of Dune", MOD(6), [], "The House's standing is tracked from −5 to +5 in Honor, Imperial Support (starts at +2), Landsraad Support, Military Power, Ruthlessness, Spice Production and Wealth, plus favor with the Guild and the Bene Gesserit. Low ratings trigger events such as the Harkonnen attack."),
    ad("Spending Wealth", "Campaign rule", "Masters of Dune", MOD(9), [], "Wealth sets what the House can buy without denting its rating: from noble-quality everyday items at 0 to large ornithopters and spacecraft at +5. Bigger purchases lower the Wealth index by half or a full point, and at −5 the House is bankrupt."),
    ad("Spice Harvesting Sessions", "Campaign rule", "Masters of Dune", MOD(10), [], "Each chapter begins with a spice session (played on the Agents of Dune maps, or as a single Spice Analysis test) whose result (Exceeding Targets, Meeting Targets or worse) feeds the House's Spice Production and Wealth."),
    ad("The Shifting Sands", "Chapter", "Masters of Dune", MOD(15), ["Geeta Nagara", "Ulako Hibb", "Fake Fremen Mercenaries"], "Chapter 1: 'Fremen' raids that are not what they seem, a dinner with Piter de Vries, and the return of Geeta from Harkonnen hands."),
    ad("Giedi Prime", "Chapter", "Masters of Dune", MOD(31), ["Tamara Pilru"], "Chapter 2: a parley on the Harkonnen homeworld, an envoy from House Vernius, dinner and detonations, and a trap to turn."),
    ad("The Emperor", "Chapter", "Masters of Dune", MOD(46), ["Jain and Lela", "Princess Josifa Corrino", "Reverend Mother Montemagni"], "Chapter 3: the season on Kaitain, opera, archives and a royal ball, and finally a summons from the Emperor."),
    ad("The Attack", "Chapter", "Masters of Dune", MOD(62), ["Rikalian Nolm", "Aratan Tulan", "Harkonnen Commandos", "Harkonnen Troopers"], "Chapter 4: Harkonnen spies and saboteurs, then open war in the streets of Arrakeen and a fight for survival."),
    ad("The Fremen", "Chapter", "Masters of Dune", MOD(78), ["Tyra", "Antrin", "Nulan", "Jarood"], "Chapter 5: life in Sietch Korba, the spice agony, the test of the worm, and the man in the dunes; Sietch Korba trust is tracked in points."),
    ad("The Great Houses", "Chapter", "Masters of Dune", MOD(97), ["Zetan Ben Zeev", "Prince Kole Alexin", "Godwyn Alexin", "Lady Caranda Ecaz", "Djau Ibe", "Alexzander Harkonnen", "Vassily Harkonnen"], "Chapter 6: a vote of no confidence in the Landsraad, deals with Houses Alexin and Ecaz, a secret ally and a duel."),
    ad("The Bene Gesserit", "Chapter", "Masters of Dune", MOD(117), ["Qadira Lariel Narilan", "Ayeana", "Javal Bryce", "Ryssa", "Lady Ottavia", "Mother Superior Harishka"], "Chapter 7: a test set by the Sisterhood, an acolyte's affair with a gang boss, and a party to rescue."),
    ad("The Spacing Guild", "Chapter", "Masters of Dune", MOD(135), ["Cenric"], "Chapter 8: a Navigator's request, a hunt for pirates in the Odinani system, and a battle at the mercenary base."),
    ad("The Crucible", "Chapter", "Masters of Dune", MOD(153), [], "Chapter 9: the finale, which weighs the House's influence indices, perhaps on Vallabhi, as its schemes unravel."),
    ad("Adventure Generator", "Toolkit", "GM Toolkit", GMT(11), [], "d20 tables for titles, openings, antagonists, obstacles and hidden hands, with a worked example."),
    ad("Supporting Character Generator", "Toolkit", "GM Toolkit", GMT(22), [], "d20 tables for a supporting character's allegiance, role and peculiarities."),
    ad("Influence", "Intrigue", "GM Toolkit", GMT(25), [], "The Missionaria Protectiva try to plant a new superstition among the Fremen: that demons walk among humans."),
    ad("False Face, False Heart", "Intrigue", "GM Toolkit", GMT(26), [], "The Bene Tleilax target the breeding program of the Bene Gesserit through one of its youngest members."),
    ad("Spice Operation", "Intrigue", "GM Toolkit", GMT(27), [], "Falling spice yields from harvester cleaning crews hint at a scheme inside the harvesting operations."),
    ad("Children of the Jihad", "Intrigue", "GM Toolkit", GMT(28), [], "Ixians hunt the wreck of an ancient ship that may have carried a thinking machine."),
    ad("Sand Boulder", "Location", "GM Toolkit", GMT(29), ["Wyr Jadrel", "Brae Oroys", "Yari Elenne", "Brewen Ayd"], "A smuggler base hidden among the rocks of the deep desert: warehouse, trading post, spice stores and labs."),
    ad("House of Amaranth", "Location", "GM Toolkit", GMT(32), ["Tirenna Kraic", "Rodikar"], "A discreet house of pleasure in the cities of Arrakis, where the staff are trained to remember everything."),
    ad("The Star Princess", "Location", "GM Toolkit", GMT(34), ["Gabin Doresh", "Maoina"], "A House Wayku passenger ship carried aboard Guild Heighliners."),
  ]);
})();
