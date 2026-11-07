// Static game data for the Dune GM Toolkit.
// Rules values come from Dune: Adventures in the Imperium (Core Rules). Page refs are to that book.
// Name, role, statement and hook tables are original to this tool.
window.DUNE = (function () {
  const SKILLS = ["Battle", "Communicate", "Discipline", "Move", "Understand"];
  const DRIVES = ["Duty", "Faith", "Justice", "Power", "Truth"];

  const DIFFICULTY = [
    { n: 0, name: "Simple", eg: "Nudge open a stuck door; ask a simple favor; common knowledge" },
    { n: 1, name: "Average", eg: "Simple lock; follow an unaware subject in the dark; private knowledge" },
    { n: 2, name: "Challenging", eg: "Complex lock; follow a suspicious subject in the dark; hidden knowledge" },
    { n: 3, name: "Daunting", eg: "Complex lock in a hurry; deceive a deeply suspicious subject" },
    { n: 4, name: "Dire", eg: "Complex lock, hurried, wrong tools; deceive an enemy" },
    { n: 5, name: "Epic", eg: "All of the above, during a battle; deceive your worst enemy" },
  ];

  const COMP_RANGE = [
    { r: 1, name: "Normal", on: "20" },
    { r: 2, name: "Risky", on: "19–20" },
    { r: 3, name: "Perilous", on: "18–20" },
    { r: 4, name: "Precarious", on: "17–20" },
    { r: 5, name: "Treacherous", on: "16–20" },
  ];

  const HOUSE_THREAT = [
    { id: "nascent", name: "Nascent House", perPlayer: 0 },
    { id: "minor", name: "House Minor", perPlayer: 1 },
    { id: "major", name: "House Major", perPlayer: 2 },
    { id: "great", name: "Great House", perPlayer: 3 },
  ];

  const FOCUSES = {
    Battle: ["Assassination", "Atomics", "Dirty Fighting", "Dueling", "Evasive Action", "Lasgun", "Long Blades", "Pistols", "Rifle", "Shield Fighting", "Short Blades", "Sneak Attacks", "Strategy", "Tactics", "Unarmed Combat"],
    Communicate: ["Acting", "Bartering", "Charm", "Deceit", "Diplomacy", "Disguise", "Empathy", "Gossip", "Innuendo", "Inspiration", "Interrogation", "Intimidation", "Linguistics", "Listening", "Neurolinguistics", "Persuasion", "Teaching"],
    Discipline: ["Command", "Composure", "Espionage", "Infiltration", "Observe", "Precision", "Resolve", "Self-Control", "Survival (Desert)"],
    Move: ["Acrobatics", "Body Control", "Climb", "Dance", "Distance Running", "Drive", "Escaping", "Grace", "Pilot (Ornithopter)", "Stealth", "Swift", "Swim", "Unobtrusive", "Worm Rider"],
    Understand: ["Advanced Technology", "Botany", "CHOAM Bureaucracy", "Cultural Studies", "Danger Sense", "Data Analysis", "Deductive Reasoning", "Ecology", "Emergency Medicine", "Etiquette", "Genetics", "Geology", "House Politics", "Imperial Politics", "Infectious Diseases", "Kanly", "Philosophy", "Physical Empathy", "Physics", "Poison", "Psychiatry", "Religion", "Smuggling", "Surgery", "Traps", "Virology"],
  };

  // Example complications by skill (Core p.153).
  const COMPLICATIONS = {
    Battle: ["Bruised", "Exhausted", "Flanked", "Injured", "Stunned", "Unarmed"],
    Communicate: ["Disconnected", "Gauche", "Inferior", "Outsider", "Rude", "Tongue-tied"],
    Discipline: ["Angry", "Conflicted", "Distracted", "Frightened", "Intoxicated", "Unfocused"],
    Move: ["Awkward", "Constricted", "Hurt", "Slow", "Tired", "Uncoordinated"],
    Understand: ["Complicated", "Confused", "Misinformed", "Overthinking", "Uninformed", "Vague"],
  };

  // NPC roles: primary skill, secondary skill, suggested focuses, role trait.
  const ROLES = [
    { role: "House Trooper", trait: "House Trooper", primary: "Battle", secondary: "Discipline", focus: ["Long Blades", "Shield Fighting", "Rifle", "Tactics"], drive: "Duty" },
    { role: "Elite Imperial Soldier", trait: "Imperial Elite", primary: "Battle", secondary: "Discipline", focus: ["Dueling", "Unarmed Combat", "Tactics", "Resolve"], drive: "Duty" },
    { role: "Fremen Warrior", trait: "Fremen", primary: "Battle", secondary: "Move", focus: ["Short Blades", "Survival (Desert)", "Stealth", "Worm Rider"], drive: "Faith" },
    { role: "Swordmaster", trait: "Swordmaster", primary: "Battle", secondary: "Move", focus: ["Dueling", "Long Blades", "Shield Fighting", "Teaching"], drive: "Duty" },
    { role: "Assassin", trait: "Assassin", primary: "Battle", secondary: "Move", focus: ["Assassination", "Poison", "Sneak Attacks", "Stealth"], drive: "Power" },
    { role: "Military Officer", trait: "Military Officer", primary: "Battle", secondary: "Communicate", focus: ["Strategy", "Tactics", "Command", "Inspiration"], drive: "Duty" },
    { role: "Street Tough", trait: "Hired Muscle", primary: "Battle", secondary: "Move", focus: ["Dirty Fighting", "Unarmed Combat", "Intimidation"], drive: "Power" },
    { role: "Courtier", trait: "Courtier", primary: "Communicate", secondary: "Understand", focus: ["Etiquette", "Gossip", "Innuendo", "Charm"], drive: "Power" },
    { role: "Merchant", trait: "Merchant", primary: "Communicate", secondary: "Understand", focus: ["Bartering", "Persuasion", "CHOAM Bureaucracy"], drive: "Power" },
    { role: "Water Seller", trait: "Water Seller", primary: "Communicate", secondary: "Discipline", focus: ["Bartering", "Gossip", "Observe"], drive: "Justice" },
    { role: "Diplomat", trait: "Envoy", primary: "Communicate", secondary: "Understand", focus: ["Diplomacy", "Etiquette", "Linguistics", "Imperial Politics"], drive: "Duty" },
    { role: "Interrogator", trait: "Interrogator", primary: "Communicate", secondary: "Discipline", focus: ["Interrogation", "Intimidation", "Empathy"], drive: "Truth" },
    { role: "Truthsayer", trait: "Truthsayer", primary: "Communicate", secondary: "Discipline", focus: ["Empathy", "Listening", "Composure", "Religion"], drive: "Truth" },
    { role: "Spy", trait: "Spy", primary: "Discipline", secondary: "Communicate", focus: ["Espionage", "Infiltration", "Deceit", "Disguise"], drive: "Truth" },
    { role: "Steward", trait: "Steward", primary: "Discipline", secondary: "Understand", focus: ["Command", "Composure", "CHOAM Bureaucracy", "House Politics"], drive: "Duty" },
    { role: "Bene Gesserit Acolyte", trait: "Bene Gesserit", primary: "Discipline", secondary: "Communicate", focus: ["Self-Control", "Body Control", "Neurolinguistics", "Observe"], drive: "Faith" },
    { role: "House Guard", trait: "Guard", primary: "Discipline", secondary: "Battle", focus: ["Observe", "Resolve", "Long Blades"], drive: "Duty" },
    { role: "Smuggler", trait: "Smuggler", primary: "Move", secondary: "Communicate", focus: ["Pilot (Ornithopter)", "Escaping", "Bartering", "Unobtrusive"], drive: "Power" },
    { role: "Ornithopter Pilot", trait: "Pilot", primary: "Move", secondary: "Understand", focus: ["Pilot (Ornithopter)", "Evasive Action", "Danger Sense"], drive: "Duty" },
    { role: "Desert Guide", trait: "Desert Guide", primary: "Move", secondary: "Discipline", focus: ["Survival (Desert)", "Distance Running", "Stealth", "Ecology"], drive: "Faith" },
    { role: "Thief", trait: "Thief", primary: "Move", secondary: "Discipline", focus: ["Stealth", "Climb", "Infiltration", "Unobtrusive"], drive: "Justice" },
    { role: "Servant", trait: "Servant", primary: "Move", secondary: "Communicate", focus: ["Unobtrusive", "Listening", "Gossip"], drive: "Duty" },
    { role: "Mentat", trait: "Mentat", primary: "Understand", secondary: "Discipline", focus: ["Data Analysis", "Deductive Reasoning", "Strategy", "House Politics"], drive: "Truth" },
    { role: "Suk Doctor", trait: "Suk Doctor", primary: "Understand", secondary: "Discipline", focus: ["Emergency Medicine", "Poison", "Psychiatry", "Genetics"], drive: "Duty" },
    { role: "Planetologist", trait: "Scholar", primary: "Understand", secondary: "Move", focus: ["Ecology", "Botany", "Geology", "Survival (Desert)"], drive: "Truth" },
    { role: "Guild Factor", trait: "Spacing Guild", primary: "Understand", secondary: "Communicate", focus: ["CHOAM Bureaucracy", "Bartering", "Imperial Politics"], drive: "Power" },
    { role: "Spice Harvester Crew", trait: "Spice Worker", primary: "Understand", secondary: "Move", focus: ["Advanced Technology", "Danger Sense", "Drive"], drive: "Justice" },
    { role: "Priest / Preacher", trait: "Religious Leader", primary: "Communicate", secondary: "Understand", focus: ["Inspiration", "Religion", "Persuasion", "Philosophy"], drive: "Faith" },
  ];

  const REPUTATION = ["Ruthless", "Honorable", "Feared", "Beloved of the People", "Disgraced", "Ambitious", "Incorruptible", "Cunning", "Paranoid", "Generous", "Vengeful", "Overconfident", "Patient", "Secretive", "Well-Connected"];
  const FACTIONS = ["Landsraad House", "CHOAM", "Spacing Guild", "Bene Gesserit", "Imperial Court", "Fremen Sietch", "Smuggler Band", "Bene Tleilax", "Ixian Interests", "Mentat School"];

  const STATEMENTS = {
    Duty: ["My House comes before my life.", "I keep every oath I swear.", "Orders exist to be followed.", "I protect those in my charge.", "My family's name must never be shamed."],
    Faith: ["The desert provides for the patient.", "I trust my comrades with my life.", "There is a plan greater than us all.", "Prophecy is a tool—and a truth.", "My order knows best."],
    Justice: ["Every debt is repaid, in coin or blood.", "The weak deserve protection.", "Laws bind the powerful too.", "Treachery must be punished.", "I settle my own scores."],
    Power: ["I take what I want.", "Fear is the surest leash.", "Every alliance is temporary.", "Wealth is the only true armor.", "I will rise above my station."],
    Truth: ["Every secret has a price.", "Lies are blades—wield them carefully.", "I must know what lies beneath.", "Information is worth more than spice.", "Nothing is as it seems."],
  };

  // NPC special abilities (Core p.328 quick ref) — templates; {skill} filled at generation.
  const SPECIAL_ABILITIES = [
    { name: "Proficiency", text: "When using {skill} in a certain way, the first bonus d20 costs 0." },
    { name: "Threatening", text: "When using {skill} and buying bonus d20s with Threat, re-roll a single d20." },
    { name: "Guidance", text: "Whenever assisting an ally with {skill}, re-roll your d20." },
    { name: "Substitution", text: "May use {skill} for a specific kind of test regardless of the skill normally required." },
    { name: "Familiarity", text: "When attempting a specific {skill} test, reduce the Difficulty by 1 (min 0)." },
    { name: "Additional Threat Option", text: "Spend 1+ Threat for a specific, signature benefit tied to {skill}." },
  ];

  const NAMES = {
    imperial: {
      given: ["Aurelio", "Cassia", "Dmitri", "Ilesa", "Lucan", "Mirela", "Orsino", "Serena", "Teodor", "Valeria", "Hadrian", "Ysolde", "Jessamyn", "Corvin", "Ottavia", "Severin", "Marisol", "Bastien", "Livia", "Anselm", "Rhiannon", "Casimir", "Thessaly", "Evander", "Iolanthe", "Darius", "Philippa", "Tiberio", "Nerissa", "Gideon"],
      family: ["Varota", "Castellan", "Morvain", "Delacroix", "Ostrava", "Kessarin", "Halloran", "Veyne", "Szandor", "Aldmere", "Corrigan", "Faraday", "Itrelle", "Montrose", "Quell", "Rasmund", "Tavarian", "Ulvenhart", "Belisandre", "Dravek"],
    },
    fremen: {
      given: ["Farah", "Idris", "Jamil", "Laleh", "Nasim", "Rashid", "Samir", "Tariq", "Zahra", "Kadin", "Shadia", "Hamid", "Yara", "Ibrahim", "Rima", "Khalil", "Nour", "Basim", "Leyla", "Omar", "Safiya", "Zayd", "Amira", "Haroun"],
      epithet: ["of the Dawn Ridge", "Who-Walks-Softly", "of the Broken Rock", "the Patient", "of Sietch Tanir", "Sand-Born", "the Silent", "of the Deep Desert", "Twice-Tested", "of the Red Wall"],
    },
    commoner: {
      given: ["Brann", "Tilly", "Oskar", "Mara", "Jory", "Pell", "Wren", "Dace", "Hesk", "Ruu", "Sabe", "Lomm", "Yeva", "Grisk", "Tam", "Neda", "Koll", "Vash", "Ilya", "Bex"],
      family: ["Dunner", "Haskett", "Mollo", "Pryce", "Stavik", "Rook", "Tull", "Venn", "Orrin", "Saltmarsh", "Crane", "Lusk"],
    },
  };

  // Original story hook tables.
  const HOOKS = {
    plot: [
      "Steal or smuggle away the…",
      "Uncover the truth behind the…",
      "Investigate the sabotage of the…",
      "Discredit or destroy the…",
      "Rescue or recover the…",
      "Protect, at any cost, the…",
      "Broker a secret deal for the…",
      "Expose the traitor tied to the…",
    ],
    target: ["heir of a House Minor", "cargo of unregistered spice", "forbidden Ixian device", "missing CHOAM ledger", "Fremen water-bond", "defecting Mentat", "Guild Navigator's secret", "ancestral crysknife", "betrothal contract", "shipment of shield generators", "Bene Gesserit breeding record", "Imperial auditor", "ornithopter fleet", "prisoner held for ransom", "harvester crew lost in the deep desert"],
    location: ["a crumbling manor in the old city", "a hidden sietch", "a smugglers' base in the Shield Wall", "a Guild Heighliner's passenger deck", "a spice harvester mid-storm", "a CHOAM trade hall", "a water merchant's vault", "the Residency's banquet hall", "an abandoned botanical testing station", "the open desert at worm-sign", "a pyon village at the city's edge", "a dueling salle beneath the palace"],
    opposition: ["Imperial elite soldiers", "a rival House's spymaster", "Guild-sanctioned smugglers", "a cell of disgruntled Fremen", "security systems and hunter-seekers", "a corrupt Imperial official", "a sandstorm closing in", "a Bene Gesserit with her own agenda", "mercenary swordmasters", "a Face Dancer posing as an ally"],
    twist: ["the patron who hired them is the true villain", "the target wants to be taken", "two Houses have each sent agents for the same prize", "a Truthsayer is watching every word", "the deadline is moved up by a day", "a beloved NPC has been bought", "the prize is a forgery—the real one is elsewhere", "success will start a war of assassins (kanly)", "the Guild will refuse transport if things go loud", "someone in the PCs' House leaked the plan"],
    complication: ["a public dinner must be attended first", "the only guide demands a blood-debt be honored", "spice prices crash mid-mission", "a shield-and-lasgun accident nearly happens", "an old rival arrives at the worst moment", "the water ration is cut", "a Fremen prophecy is invoked about one of the PCs", "the Emperor's representative takes an interest"],
  };

  return { SKILLS, DRIVES, DIFFICULTY, COMP_RANGE, HOUSE_THREAT, FOCUSES, COMPLICATIONS, ROLES, REPUTATION, FACTIONS, STATEMENTS, SPECIAL_ABILITIES, NAMES, HOOKS };
})();
