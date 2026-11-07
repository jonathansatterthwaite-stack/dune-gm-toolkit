// Non-player characters from the Core Rules: named characters (p.241–262) and archetypes (p.269–295).
// Skills, drives, focuses, talent names, traits and assets are the book's stat blocks; summaries are paraphrased.
(function () {
  const SK = ["Battle", "Communicate", "Discipline", "Move", "Understand"];
  const DR = ["Duty", "Faith", "Justice", "Power", "Truth"];
  // skills/drives as 5-digit strings in the order above, e.g. "67756"
  const nums = (s, keys) => Object.fromEntries(keys.map((k, i) => [k, +s[i]]));
  const R = [];
  function npc(name, kind, faction, skills, drives, focuses, talents, traits, assets, page, text, title) {
    const f = {};
    Object.entries(focuses || {}).forEach(([k, v]) => (f[k] = v.split(/,\s*/)));
    R.push({ name, title: title || "", kind, faction, skills: nums(skills, SK), drives: nums(drives, DR), focuses: f,
      talents: talents ? talents.split(/;\s*/) : [], traits: traits ? traits.split(/,\s*|\s+and\s+/) : [], assets: assets ? assets.split(/,\s*/) : [],
      text, src: "Core p." + page });
  }
  const N = "Named", A = "Archetype";
  // ---- House Atreides
  npc("Duke Leto Atreides", N, "House Atreides", "67756", "85746", { Communicate: "Charm, Diplomacy, Empathy", Discipline: "Composure", Understand: "House Politics, Imperial Politics" },
    "Bolster; Direct; Stirring Rhetoric", "Noble, Fair, Honorable", "", 242, "The just, pragmatic Duke whose popularity made the Emperor fear him; walks into the Arrakis trap knowing it for what it is.", "Honorable Noble");
  npc("Lady Jessica", N, "House Atreides", "66776", "78645", { Battle: "Short Blades", Communicate: "Persuasion", Discipline: "Self-control", Move: "Body Control", Understand: "Etiquette, Faction Lore (Bene Gesserit)" },
    "", "Consort, Bene Gesserit, Dedicated, Devoted", "", 243, "Leto's Bene Gesserit concubine, torn between love and the Sisterhood after bearing him a son.", "Noble Consort");
  npc("Paul Atreides", N, "House Atreides", "65656", "67458", { Battle: "Shield Fighting, Short Blades", Communicate: "Charm", Discipline: "Precision, Self-control", Move: "Body Control", Understand: "Imperial Politics" },
    "Cool Under Pressure (Battle); Direct; Prana-bindu Conditioning; The Slow Blade; Voice", "Noble Scion, Wise Beyond His Years, Destined for Greatness", "", 244, "The Atreides heir, trained as noble, warrior, Mentat and in Bene Gesserit ways — and perhaps much more.");
  npc("Gurney Halleck", N, "House Atreides", "86765", "84756", { Battle: "Short Blades, Tactics", Communicate: "Music (Baliset)", Discipline: "Resolve" },
    "Bolster; The Reason I Fight (Duty); The Slow Blade; Unquestionable Loyalty (House Atreides)", "Warrior, Jongleur", "", 246, "Warrior-troubadour with a baliset and an inkvine scar from Harkonnen slave pits; hates Rabban.", "Warrior Troubadour");
  npc("Thufir Hawat", N, "House Atreides", "65758", "84657", { Battle: "Assassination, Strategy", Discipline: "Observe", Understand: "Data Analysis, Deductive Reasoning, Imperial Politics, Kanly" },
    "Advisor (Understand); Cautious (Understand); Mentat Discipline; Mind Palace", "Mentat, Insightful, Resourceful, Spymaster", "", 247, "Old Mentat Master of Assassins who has served three generations of Atreides.", "Spymaster Mentat");
  npc("Duncan Idaho", N, "House Atreides", "86865", "87645", { Battle: "Long Blades", Communicate: "Charm", Discipline: "Resolve", Move: "Distance Running" },
    "Bold (Battle); Driven; Make Haste; Master-at-Arms", "Charismatic Survivor, Ginaz Swordmaster", "", 248, "Ginaz swordmaster who escaped Harkonnen hunts as a boy; fiercely loyal, goes ahead to win over the Fremen.", "Loyal Swordmaster");
  npc("Dr. Wellington Yueh", N, "House Atreides", "47548", "47856", { Communicate: "Deceit, Teaching", Understand: "Genetics, Surgery" },
    "Advisor (Understand); Imperial Conditioning; Intense Study", "Suk Doctor, Despises the Harkonnens", "", 249, "Suk doctor whose conditioning was broken by the Harkonnens holding his wife hostage; the traitor within.", "Reluctant Traitor");
  // ---- House Harkonnen
  npc("Baron Vladimir Harkonnen", N, "House Harkonnen", "46648", "76485", { Battle: "Strategy", Communicate: "Deceit", Discipline: "Espionage", Understand: "House Politics, Imperial Politics" },
    "Binding Promise; Constantly Watching; Direct; Subtle Words", "Noble, Cunning, Cruel", "", 251, "Grotesque, brilliant schemer held aloft by suspensors; patient, paranoid and utterly ruthless.", "Devious Noble");
  npc("Piter de Vries", N, "House Harkonnen", "55758", "75486", { Battle: "Assassination", Understand: "Data Analysis, House Politics, Imperial Politics" },
    "Advisor (Understand); Driven; Mentat Discipline; Twisted Mentat", "Twisted Mentat, Killer", "", 252, "Tleilaxu-trained Mentat who delights in cruelty; the Baron's chief planner.", "Twisted Mentat");
  npc("Feyd-Rautha Harkonnen", N, "House Harkonnen", "76576", "67485", { Battle: "Short Blades", Communicate: "Intimidation, Listening", Move: "Swift" },
    "Bold (Battle); Decisive Action; Rapid Maneuver; The Reason I Fight (Power)", "Duelist, Arrogant, Ruthless", "", 253, "The Baron's handsome, vicious nephew and chosen heir; a gladiator in the Harkonnen arena.", "Elegant Knife Fighter");
  npc("Glossu 'The Beast' Rabban", N, "House Harkonnen", "75564", "67485", { Battle: "Lasgun", Communicate: "Intimidation", Move: "Stealth" },
    "Bold (Battle); Make Haste; Master-at-Arms", "Thuggish Tyrant, Brutal, Vicious", "", 254, "The Baron's brutish nephew, used to squeeze Arrakis until it bleeds.", "Brutal Warrior");
  // ---- House Corrino
  npc("Padishah Emperor Shaddam IV", N, "House Corrino", "56757", "74685", { Discipline: "Command, Composure", Understand: "House Politics, Imperial Politics" },
    "Cautious (Communicate); Collaboration (Understand); Constantly Watching; Rigorous Control", "Emperor of the Known Universe, Paranoid Schemer", "", 256, "The Emperor, red-haired and calculating, who fears the Atreides' popularity enough to destroy them.", "Padishah Emperor");
  npc("Princess Irulan", N, "House Corrino", "46567", "84657", { Communicate: "Charm", Discipline: "Observe", Move: "Dance", Understand: "Imperial Politics" },
    "Intense Study; Masterful Innuendo; Prana-bindu Conditioning", "Princess, Academic, Bene Gesserit", "", 257, "Shaddam's eldest daughter, Bene Gesserit trained, a historian and political pawn.", "Heir to the Imperium");
  npc("Reverend Mother Gaius Helen Mohiam", N, "Bene Gesserit", "57757", "87654", { Communicate: "Deceit", Discipline: "Observe", Understand: "Imperial Politics" },
    "Advisor (Communicate); Cool Under Pressure (Understand); Hyperawareness; Other Memory; Passive Scrutiny; Prana-bindu Conditioning; Voice", "Bene Gesserit, Reverend Mother, Truthsayer", "", 258, "The Emperor's Truthsayer, who tests Paul with the box and the gom jabbar.", "Imperial Truthsayer");
  npc("Count Hasimir Fenring", N, "House Corrino", "76686", "74685", { Battle: "Assassination", Discipline: "Command", Move: "Stealth", Understand: "Poison" },
    "Advisor (Battle); Hidden Motives; Passive Scrutiny; Subtle Step; Subtle Words", "Noble Courtier, Assassin, Psychopath", "", 259, "The Emperor's oldest friend and deadliest tool, a genetic dead-end who hides lethal skill behind a stammer.", "Courtier Assassin");
  // ---- Fremen
  npc("Stilgar", N, "Fremen", "75765", "78645", { Battle: "Short Blades", Communicate: "Intimidation", Discipline: "Command", Move: "Worm Rider" },
    "Cautious (Battle); Cool Under Pressure (Move); Deliberate Motion; Rigorous Control; To Fight Someone Is to Know Them (Battle)", "Fremen Leader, Fierce, Dedicated", "", 260, "Naib of Sietch Tabr: practical, honorable and devoted to his people.", "Fremen Naib");
  npc("Chani Kynes", N, "Fremen", "65765", "68745", { Battle: "Short Blades", Move: "Stealth", Understand: "Religion (Fremen)" },
    "Bold (Move); Deliberate Motion; Subtle Step; The Reason I Fight (Faith)", "Fremen, Warrior", "", 261, "Fremen warrior, daughter of Liet-Kynes, the woman of Paul's visions.", "Fremen Warrior");
  npc("Liet Kynes", N, "Fremen", "56747", "68547", { Discipline: "Survival (Desert)", Understand: "Botany, Ecology" },
    "Cautious (Understand); Collaboration (Understand); Unquestionable Loyalty", "Fremen, Planetologist", "", 262, "The Imperial Planetologist, secretly leader of the Fremen dream of a green Arrakis.", "Imperial Planetologist");

  // ---- Archetypes (p.269–295)
  npc("Arrakeen Native", A, "Commoner", "34645", "65444", { Discipline: "Composure, Precision", Understand: "Advanced Technology" }, "Cool Under Pressure (Discipline)", "Commoner", "Tools of Trade, Workshop", 271, "An ordinary townsperson of Arrakeen — a plumber, cobbler or tradesperson who knows more than they let on.");
  npc("Assassin", A, "Any", "74564", "64474", { Battle: "Assassination, Sneak Attacks", Move: "Stealth" }, "Master-at-Arms", "Assassin, Advisor to a Great House", "Dartgun, Hunter-seeker, Poison", 272, "A professional killer working within the Assassins' Handbook.");
  npc("Bene Gesserit Agent", A, "Bene Gesserit", "54765", "76555", { Discipline: "Composure, Espionage", Move: "Body Control" }, "Prana-Bindu Conditioning; Hyperawareness", "Bene Gesserit", "Concealable Dagger, Dot Coder, Minimic Film (blank)", 273, "An acolyte or Sister quietly working the Sisterhood's agenda inside a House.");
  npc("Bene Gesserit Reverend Mother", A, "Bene Gesserit", "56758", "67556", { Discipline: "Command, Composure", Understand: "Faction Lore (Bene Gesserit)" }, "Hyperawareness; Other Memory; Prana-Bindu Conditioning; Voice", "Bene Gesserit, Reverend Mother", "Dangerous Secret, Group of Bene Gesserit Acolytes, Robes of a Reverend Mother", 274, "A survivor of the spice agony carrying the memories of her predecessors.");
  npc("Criminal", A, "Underworld", "64464", "44474", { Battle: "Dirty Fighting, Evasive Action", Move: "Stealth" }, "Make Haste", "Commoner, Lawless", "Krimskel Fiber Rope, Maula Pistol, Small Gang", 275, "Thief, racketeer or arsonist who takes what they need.");
  npc("Courtier", A, "Nobility", "47645", "56575", { Communicate: "Charm, Gossip", Discipline: "Espionage" }, "Mask of Power", "Courtier, Aristocrat", "Bodkin, Groundcar, Manor House", 276, "A social climber at banquets and games, trading rumors for advancement.");
  npc("Envoy", A, "Any House", "37556", "64447", { Communicate: "Charm, Diplomacy", Understand: "Etiquette" }, "Binding Promise", "Diplomat, Traveler", "Cypher Key, Elegant Clothing, Local Agents of their House", 277, "A messenger and negotiator; for an envoy, failure is often fatal.");
  npc("Face Dancer", A, "Bene Tleilax", "57565", "67554", { Communicate: "Acting, Disguise", Move: "Body Control" }, "Prana-bindu Conditioning; Facedance", "Imposter", "Takes on the assets of whoever it impersonates", 278, "A Tleilaxu shapeshifter who copies a victim's appearance — and often kills them to avoid discovery.");
  npc("Fremen Elder", A, "Fremen", "74865", "57655", { Battle: "Tactics, Short Blades", Discipline: "Survival (Desert)", Move: "Worm Rider" }, "Binding Promise; Cautious (Discipline); Resilience (Battle)", "Fremen", "Crysknife, Maker Hooks, Small Band of Fremen Warriors, Stillsuit", 279, "A respected sietch elder whose word carries the weight of tradition.");
  npc("Fremen Warrior", A, "Fremen", "84775", "78655", { Battle: "Dueling, Short Blades, Unarmed Combat", Discipline: "Survival (Desert), Resolve", Move: "Worm Rider" }, "Decisive Action; Nimble; Resilience (Battle)", "Fremen", "Crysknife, Fremkit, Stillsuit", 280, "A desert fighter more than a match for most off-world soldiers.");
  npc("Guild Agent", A, "Spacing Guild", "46755", "75456", { Communicate: "Diplomacy", Discipline: "Composure, Self-control" }, "Priority Boarding", "Guild Agent, Diplomat", "Guild Contacts, Shield Belt, Supply Contracts", 281, "A Guild representative smoothing passage and contracts — for the Guild's benefit.");
  npc("Healer", A, "Any", "45667", "55657", { Discipline: "Composure", Understand: "Emergency Medicine, Surgery" }, "Intense Study", "Healer", "Glowglobe, Medical Records, Medkit", 282, "A doctor or medic, often privy to more secrets than they want.");
  npc("House Soldier/Guard", A, "Any House", "64554", "65444", { Battle: "Lasgun, Tactics", Discipline: "Composure" }, "Unquestionable Loyalty", "Military", "Conscripts, Lasgun, Security Clearance, Shield Belt", 283, "A loyal trooper who never deserts their post — unless someone threatens their family.");
  npc("Mentat", A, "Any House", "56457", "65557", { Communicate: "Diplomacy", Understand: "Data Analysis, Deductive Reasoning" }, "Mentat Discipline", "Mentat, Political Advisor", "Access to Employer Data, Informant Network, Sapho Juice", 284, "A human computer advising a House on politics and probabilities.");
  npc("Merchant", A, "Commerce", "46445", "55675", { Communicate: "Bartering, Persuasion", Understand: "Data Analysis" }, "Driven", "Broker, Wealthy", "Information Network, Ornithopter, Warehouse", 285, "A broker who always knows the price of everything.");
  npc("Noble (Young Heir)", A, "Nobility", "56745", "75655", { Communicate: "Diplomacy", Discipline: "Command, Composure" }, "Bold (Communicate)", "Noble, House Minor", "Influence, Kindjal, Ornithopter", 286, "A wary young heir raised in the shadow of the War of Assassins.");
  npc("Noble (Veteran)", A, "Nobility", "56657", "55576", { Communicate: "Diplomacy" }, "Putting Theory into Practice", "Noble", "Bodyguards, Kindjal Engraved with House Crest, Shield Belt", 287, "A seasoned noble who survived the deadly years and now travels only on serious business.");
  npc("Sardaukar (Elite Soldier)", A, "House Corrino", "85774", "85565", { Battle: "Lasgun, Long Blades, Short Blades, Tactics", Discipline: "Self-control", Move: "Swift" }, "Bolster; Decisive Action; Master-at-Arms", "Sardaukar, Soldier", "Lasgun, Shigawire Garrote, Shield, Kindjal, Flip-dart", 288, "The Emperor's terror troops; equipped for each mission, always with hidden weapons.");
  npc("Scientist", A, "Any", "34647", "55547", { Discipline: "Observe", Understand: "Deductive Reasoning, Physics" }, "Intense Study", "Researcher", "Shigawire Reels, Laboratory, Data About Arrakis", 289, "A researcher pushing knowledge as far as the edicts allow.");
  npc("Servant", A, "Any House", "35664", "44456", { Communicate: "Listening", Move: "Unobtrusive", Understand: "Etiquette" }, "Nimble", "Servant", "Illicit Recordings, Old Friendship, Trusted Access", 290, "The overlooked household servant who sees and hears everything.");
  npc("Smuggler", A, "Underworld", "54365", "55765", { Battle: "Dirty Fighting", Move: "Drive, Stealth" }, "Constantly Watching", "Smuggler", "Hidden Base, Maula Pistol, Ornithopter", 291, "Spice and contraband runner with a hidden base and a quick 'thopter.");
  npc("Spy/Infiltrator", A, "Any", "56557", "65557", { Communicate: "Deceit", Understand: "Danger Sense, Traps" }, "", "Imposter, Spy", "Cibus Hood, Lockpicks, Memocorder", 292, "An agent planted at the heart of an enemy household.");
  npc("Technician", A, "Any", "34646", "56445", { Discipline: "Precision", Understand: "Advanced Technology, Deductive Reasoning" }, "Rigorous Control", "Technician", "Technical Access, Tools, Vision Enhancement Goggles", 293, "The engineer who keeps the machines — and the secrets inside them — running.");
  npc("Tleilaxu Master", A, "Bene Tleilax", "36657", "56357", { Communicate: "Neurolinguistics", Understand: "Genetics, Faction Lore (Tleilaxu)" }, "Masterful Innuendo", "Tleilaxu, Biologist", "Face Dancer, Illicit Recordings, Ixian Damper", 294, "A Tleilaxu Master trading gholas, Face Dancers and twisted Mentats.");
  npc("Water Seller", A, "Commoner", "26445", "44564", { Communicate: "Bartering, Gossip" }, "Subtle Words", "Water Seller, Merchant", "Small Group of Thugs, Water, Wealth", 295, "A water merchant of Arrakis — rich, guarded and well informed.");

  DUNE_DB.add("npcs", R);
})();
