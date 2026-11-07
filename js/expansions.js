// Expansion data: The Great Game (GG), Power and Pawns (PP), Sand and Dust (SD).
// Numbers and costs are the books' rules (page refs given). Descriptions and random-table entries are
// written for this tool rather than copied from the books.
window.DUNE_X = (function () {
  // ---------------- The Great Game: House management (GG p.87-115) ----------------
  const HOUSE_TYPES = {
    nascent: { name: "Nascent House", status: 15, roles: 2, spaces: 10, npcSkills: [6, 5, 5, 4, 4], col: "minor" },
    minor: { name: "House Minor", status: 25, roles: 4, spaces: 35, npcSkills: [7, 6, 6, 5, 4], col: "minor" },
    major: { name: "House Major", status: 45, roles: 6, spaces: 60, npcSkills: [8, 7, 6, 5, 4], col: "major" },
    great: { name: "Great House", status: 65, roles: 8, spaces: 100, npcSkills: [9, 8, 7, 6, 5], col: "great" },
  };

  // Status bands (GG p.90). Upper bound of each level by column; Dangerous is anything above Problematic.
  const STATUS_LEVELS = [
    { id: "feeble", name: "Feeble", max: { minor: 10, major: 20, great: 40 }, effect: "+2 Difficulty to gain allies or act aggressively. Rivals smell blood." },
    { id: "weak", name: "Weak", max: { minor: 20, major: 40, great: 60 }, effect: "+1 Difficulty to aggressive actions and to gaining allies or favor." },
    { id: "respected", name: "Respected", max: { minor: 40, major: 60, great: 70 }, effect: "No modifiers — exactly where peers expect." },
    { id: "strong", name: "Strong", max: { minor: 50, major: 70, great: 80 }, effect: "−1 Difficulty to House actions." },
    { id: "problematic", name: "Problematic", max: { minor: 70, major: 80, great: 90 }, effect: "−2 Difficulty to aggressive actions, +1 to gaining favor/alliances. Each House action or venture gives the GM 1 Threat." },
    { id: "dangerous", name: "Dangerous", max: { minor: 999, major: 999, great: 999 }, effect: "−2 Difficulty to aggressive actions, +2 to diplomatic ones. Each House action or venture gives the GM 2 Threat." },
  ];
  // Event chance by status level (GG p.99): opportunity on d20 ≤ opp, crisis on ≥ crisis.
  const EVENT_CHANCE = { feeble: { opp: 4, crisis: 17 }, weak: { opp: 4, crisis: 17 }, respected: { opp: 5, crisis: 16 }, strong: { opp: 6, crisis: 15 }, problematic: { opp: 7, crisis: 14 }, dangerous: { opp: 8, crisis: 13 } };

  const OPPORTUNITIES = [
    { name: "Archaeological Find", text: "A relic of a lost age surfaces on House land — prestige, scholars, and unwelcome visitors follow." },
    { name: "Diplomatic Overture", text: "A neighboring House sends an envoy proposing a treaty. What do they really want?" },
    { name: "Discovery", text: "Rich ore, a new route, or a breakthrough in a House laboratory — if it can be secured." },
    { name: "Economic Boom", text: "Markets surge. Whoever moves fastest profits before the inevitable crash." },
    { name: "Festive Invitation", text: "Another House invites yours to a grand celebration. Ally or rival, the guest list is a battlefield." },
    { name: "Justice Prevails", text: "A criminal or spy ring is exposed in House territory. How far up does it go?" },
    { name: "Land Rush", text: "Nearby land becomes claimable. Other claimants are already moving." },
    { name: "New Subjects", text: "A wave of settlers arrives seeking a home. Workers, or a Trojan horse?" },
    { name: "Political Calm", text: "Rivals go quiet. A chance to press ahead — or the calm before their move." },
    { name: "Convenient Misfortune", text: "Roll a crisis — it strikes a rival House instead.", rival: "crisis" },
  ];
  const CRISES = [
    { name: "Assassination Attempt", text: "A blade, a needle, a hunter-seeker — one of the player characters is targeted." },
    { name: "Bandit Activity", text: "Raiders harry the frontier. Outlaws, rebels, or a rival's proxies?" },
    { name: "Kanly", text: "A feud boils over into formal vendetta under the Great Convention." },
    { name: "Food Shortage", text: "Harvests and imports fall short. Hunger breeds unrest." },
    { name: "Espionage", text: "Decisions leak to rivals. There is a traitor inside the House." },
    { name: "Disaster", text: "Fire, storm, quake or flood wrecks infrastructure. Repairs will be costly." },
    { name: "Plague", text: "Sickness spreads through the population. Act fast or count the dead." },
    { name: "Public Scandal", text: "A House leader is implicated in scandal. Rumor fills every gap." },
    { name: "Smugglers", text: "Goods vanish onto the black market, undercutting House trade." },
    { name: "Inconvenient Fortune", text: "Roll an opportunity — it falls to a rival House instead.", rival: "opp" },
  ];

  const DOMAIN_CATEGORIES = ["Artistic", "Espionage", "Farming", "Industrial", "Kanly", "Military", "Political", "Religious", "Scientific"];
  const WEALTHY_CATS = ["Artistic", "Espionage", "Political", "Religious"];
  const RESOURCE_CATS = ["Farming", "Industrial", "Kanly", "Military", "Scientific"];
  const DOMAIN_KINDS = ["Machinery", "Produce", "Expertise", "Workers", "Understanding"];
  // Income per domain (GG p.97): [Resources, Wealth]
  const DOMAIN_INCOME = {
    primary: { Machinery: [12, 32], Produce: [10, 30], Expertise: [6, 44], Workers: [8, 40], Understanding: [6, 42] },
    secondary: { Machinery: [6, 16], Produce: [5, 18], Expertise: [3, 22], Workers: [4, 20], Understanding: [3, 22] },
  };

  const MILITARY = [
    { name: "None", diff: 0, cost: 0, text: "Militia and ceremonial guards only." },
    { name: "Militia", diff: 1, cost: 5, text: "Can resist and evacuate the family, not hold the planet." },
    { name: "Ground Defense", diff: 2, cost: 10, text: "Planet-wide ground army." },
    { name: "Planetary Defense", diff: 3, cost: 20, text: "Army plus a fleet that can hold orbit." },
    { name: "Assault Force", diff: 4, cost: 30, text: "Can strike another world and still defend home." },
    { name: "Invasion Fleet", diff: 5, cost: 50, text: "Multi-world protection and large-scale invasion." },
  ];
  const LOYALTY = [
    { name: "Hatred", cost: 0, mod: "±2", text: "Military counts one step lower; +2 Difficulty to ask the people, −2 for enemy spies." },
    { name: "Loathing", cost: 5, mod: "±1", text: "+1 Difficulty to ask the people, −1 for enemy spies." },
    { name: "Acceptance", cost: 10, mod: "0", text: "No modifier." },
    { name: "Appreciation", cost: 20, mod: "±1", text: "−1 Difficulty to ask the people, +1 for enemy spies." },
    { name: "Love", cost: 40, mod: "±2", text: "−2 Difficulty to ask the people, +2 for enemy spies." },
  ];
  const LIFESTYLE = [
    { name: "Of the People", cost: 0, trait: "Commoners", text: "No personal equipment for agents." },
    { name: "Poor", cost: 5, trait: "Poor", text: "Small weapons and items, no advanced tech." },
    { name: "Noble", cost: 10, trait: "", text: "Most personal items on request." },
    { name: "Wealthy", cost: 30, trait: "Impressive", text: "Agents get anything up to vehicles; some Quality 1." },
    { name: "Imperial", cost: 60, trait: "Envied", text: "Rivals the Emperor's splendour." },
  ];
  const SKILL_UPKEEP = (v) => (v <= 4 ? 0 : v <= 6 ? 2 : v === 7 ? 4 : v === 8 ? 8 : v === 9 ? 12 : 24);

  const ROLES = ["Ruler", "Heir", "Consort", "Advisor", "Chief Physician", "Councilor", "Envoy", "Marshal", "Scholar", "Spymaster", "Swordmaster", "Treasurer", "Warmaster"];
  const ROLE_BENEFIT = {
    Ruler: "Without one, all House tests are +1 Difficulty.",
    Heir: "Takes over instantly if the Ruler falls.",
    Consort: "+2 Momentum for House tests in House management.",
    Advisor: "+1d20 on House tests with their skill; their focus may apply.",
    "Chief Physician": "House members find them Trusted; troops +1 Quality when defending.",
    Councilor: "House Discipline tests count as having a focus.",
    Envoy: "−1 Difficulty on one Communicate test with another House per session.",
    Marshal: "+1 Resource per session each.",
    Scholar: "−1 Difficulty to research projects; +1d20 on academic Understand tests.",
    Spymaster: "+1 Difficulty to espionage against the House.",
    Swordmaster: "Troops gain focus in two weapons; bodyguard to Ruler/Heir.",
    Treasurer: "+10 Wealth per session each (max 5).",
    Warmaster: "Warfare conflicts start with 4 Momentum.",
  };
  // Upkeep for roles beyond the House's quota (GG p.103). `already` = treasurers before this one.
  function roleUpkeep(role, flag, already) {
    let c;
    if (role === "Advisor" || role === "Scholar" || role === "Spymaster" || role === "Warmaster") c = 5;
    else if (role === "Chief Physician") c = flag === "suk" ? 15 : 5;
    else if (role === "Swordmaster") c = flag === "ginaz" ? 15 : 5;
    else if (role === "Treasurer") c = 5 + (already || 0);
    else c = 2;
    if (flag === "bg") c += 5;
    return c;
  }

  // Improve Skills venture (GG p.112): current skill → [Wealth, successes]
  const IMPROVE_SKILL = { 4: [20, 2], 5: [30, 3], 6: [40, 4], 7: [50, 5], 8: [60, 5], 9: [80, 5] };

  // Ventures (GG p.106-113). res = Resources cost, wealth = Wealth cost, succ = successes needed.
  // effect keys are applied automatically on success by the House tab.
  const VENTURES = [
    { id: "trade", group: "Trade", name: "Trade Wealth ↔ Resources", skill: "", succ: 0, note: "3 Wealth → 1 Resource, or 1 Resource → 3 Wealth. Max ⅓ of current stock (½ with a spaceport). No roll." },
    { id: "claim2", group: "Construction", name: "Claim Domain (secondary)", res: 12, skill: "Communicate", succ: 5, note: "Needs 10 dedicated domain facilities. +5 status.", status: 5 },
    { id: "claim1", group: "Construction", name: "Claim Domain (primary)", res: 24, skill: "Understand", succ: 5, note: "Upgrade a secondary; needs 25 facilities. +10 status.", status: 10 },
    { id: "facility", group: "Construction", name: "Domain Facility", res: 5, skill: "?", succ: 1, note: "Farm/Factory/Training Camp (Discipline), University/Laboratory (Understand). Six of one kind: +2 Wealth or +1 Resource.", effect: "spaceUsed" },
    { id: "stylish", group: "Construction", name: "Estate: Stylish Appointment", res: 12, skill: "Understand", succ: 2, note: "Fit to entertain nobles." },
    { id: "luxurious", group: "Construction", name: "Estate: Luxurious Appointment", res: 16, skill: "Understand", succ: 3, note: "Needs Stylish. −1 Difficulty to hosts' diplomatic tests." },
    { id: "palatial", group: "Construction", name: "Estate: Palatial Appointment", res: 20, skill: "Understand", succ: 4, note: "Needs Luxurious. −2 Difficulty to hosts' diplomatic tests." },
    { id: "escape", group: "Construction", name: "Estate: Escape System", res: 20, skill: "Understand", succ: 4, note: "−2 Difficulty to escape in a siege or invasion." },
    { id: "land", group: "Construction", name: "Expand Land", res: 6, skill: "Discipline", succ: 1, note: "+1 space (up to the planet's maximum), or clear a holding.", effect: "spaceTotal" },
    { id: "festival", group: "Construction", name: "Festival", res: 2, skill: "Communicate", succ: 0, note: "Ask the GM one question about the people or enemy espionage." },
    { id: "fort1", group: "Construction", name: "Standard Fortifications", res: 4, skill: "Discipline", succ: 1, note: "Area gains one fortifications asset." },
    { id: "fort2", group: "Construction", name: "Enhanced Fortifications", res: 8, skill: "Discipline", succ: 1, note: "Needs Standard. Two fortifications assets." },
    { id: "monument", group: "Construction", name: "Great Monument", res: 8, skill: "Discipline", succ: 3, note: "Carries the Impressive trait." },
    { id: "hidden", group: "Construction", name: "Hidden Area", res: 10, skill: "Understand", succ: 4, note: "Hidden trait; can store 20 Resources. Not on fortified areas." },
    { id: "industrialize", group: "Construction", name: "Industrialize", res: 2, skill: "Discipline", succ: 2, note: "Two holdings on one space; loyalty there one level lower." },
    { id: "base", group: "Construction", name: "Military Base", res: 2, skill: "Battle", succ: 0, note: "Platform for Military Developments." },
    { id: "bunker", group: "Construction", name: "Military: Command Bunker", res: 6, skill: "Battle", succ: 2, note: "Command Bunker asset in Warfare." },
    { id: "garrison", group: "Construction", name: "Military: Garrison", res: 8, skill: "Battle", succ: 1, note: "Infantry asset (max 4 per facility)." },
    { id: "pad", group: "Construction", name: "Military: Landing Pad", res: 8, skill: "Battle", succ: 1, note: "Two ornithopters (max 4 per facility)." },
    { id: "sentry", group: "Construction", name: "Military: Sentry Posts", res: 6, skill: "Battle", succ: 2, note: "+1 Difficulty to move covertly here." },
    { id: "shield", group: "Construction", name: "Military: Shield", res: 10, skill: "Battle", succ: 3, note: "Shield asset in Warfare." },
    { id: "shuttle", group: "Construction", name: "Military: Shuttle Platform", res: 4, skill: "Battle", succ: 3, note: "A shuttle can land here (none provided)." },
    { id: "vehicle", group: "Construction", name: "Military: Vehicle Bay", res: 10, skill: "Battle", succ: 1, note: "Tank Unit asset (max 4 per facility)." },
    { id: "mine", group: "Construction", name: "Mine", res: 10, skill: "Discipline", succ: 2, note: "+2 Resources per session until it taps out.", effect: "mine" },
    { id: "orbital", group: "Construction", name: "Orbital Facility", res: 10, skill: "Understand", succ: 3, note: "+1 space in orbit.", effect: "spaceTotal" },
    { id: "feature", group: "Construction", name: "Planetary Feature", res: 4, skill: "Discipline", succ: 1, note: "Flavour landmark — retreat, statue, racetrack." },
    { id: "pleasure", group: "Construction", name: "Pleasure District", res: 10, skill: "Understand", succ: 2, note: "Population Loyalty costs 1 less Wealth.", effect: "pleasure" },
    { id: "spaceport", group: "Construction", name: "Spaceport", res: 10, skill: "Understand", succ: 3, note: "Trade up to ½ of stock instead of ⅓.", effect: "spaceport" },
    { id: "transit", group: "Construction", name: "Transit System", res: 4, skill: "Move", succ: 1, note: "Link four spaces for movement." },
    { id: "storage", group: "Construction", name: "Storage Facility", res: 2, skill: "Discipline", succ: 0, note: "Stockpile 10 more Resources at year end.", effect: "storage" },
    { id: "balk", group: "Boon", name: "Balk Enemy", wealth: 5, skill: "Battle", succ: 1, note: "Until next session, bringing an enemy House into a scene costs the GM 3 Threat." },
    { id: "bga", group: "Boon", name: "Bene Gesserit Alliance", wealth: 10, skill: "Discipline", succ: 4, note: "−1 Difficulty to tests against Bene Gesserit agents until next session." },
    { id: "choamA", group: "Boon", name: "CHOAM Agreement", wealth: 5, skill: "Communicate", succ: 2, note: "One domain earns +10 Wealth next session." },
    { id: "choamI", group: "Boon", name: "CHOAM Influence", wealth: 10, skill: "Communicate", succ: 3, note: "+1 success on one trade negotiation." },
    { id: "initiative", group: "Boon", name: "Cultivate Initiative", wealth: 10, skill: "Understand", succ: 2, note: "Next adventure's minor supporting characters get Bold." },
    { id: "obedience", group: "Boon", name: "Cultivate Obedience", wealth: 10, skill: "Understand", succ: 2, note: "Next adventure's minor supporting characters get Cautious." },
    { id: "unity", group: "Boon", name: "Cultivate Unity", wealth: 10, skill: "Understand", succ: 3, note: "Next adventure starts with at least 3 Momentum." },
    { id: "ally", group: "Boon", name: "Enlist Ally", wealth: 20, skill: "Communicate", succ: 3, note: "Players may spend 1 Momentum to bring an allied House into a scene." },
    { id: "estrep", group: "Boon", name: "Establish Reputation", wealth: 20, skill: "Communicate", succ: 3, note: "Make a reputation trait held 3 sessions running permanent." },
    { id: "favBG", group: "Boon", name: "Favor of the Bene Gesserit", wealth: 10, skill: "Discipline", succ: 1, note: "+1 success once when dealing with the Sisterhood." },
    { id: "favGuild", group: "Boon", name: "Favor of the Spacing Guild", wealth: 15, skill: "Discipline", succ: 1, note: "+1 success once with any Guild agent." },
    { id: "role", group: "Boon", name: "Fill a House Role", wealth: 25, skill: "Understand", succ: 1, note: "Hire an expert for an empty role (+10 Wealth for a Mentat)." },
    { id: "discovery", group: "Boon", name: "Fund Discovery", wealth: 30, skill: "Move", succ: 4, note: "Bribe the Guild to reveal a new world first." },
    { id: "gainrep", group: "Boon", name: "Gain Reputation", wealth: 20, skill: "Communicate", succ: 4, note: "Temporary House trait until next session." },
    { id: "territory", group: "Boon", name: "Gain Territory", wealth: 50, skill: "Communicate", succ: 5, note: "Petition the Emperor for a newly discovered world." },
    { id: "guildA", group: "Boon", name: "Guild Alliance", wealth: 10, skill: "Move", succ: 4, note: "−1 Difficulty to tests against Guild agents until next session." },
    { id: "charter", group: "Boon", name: "Heighliner Charter", wealth: 40, skill: "Move", succ: 2, note: "Move non-military assets anywhere before the next adventure." },
    { id: "aid", group: "Boon", name: "Humanitarian Aid", wealth: 20, skill: "Move", succ: 3, note: "+2 status and the Charitable trait. Needs a farming domain.", status: 2 },
    { id: "improve", group: "Boon", name: "Improve Skills", wealth: 0, skill: "?", succ: 0, note: "Raise one House skill by 1 (max 10). Cost and successes scale with the skill.", effect: "improve" },
    { id: "invasion", group: "Boon", name: "Mount Invasion", wealth: 0, skill: "Battle", succ: 1, note: "10 Wealth per unit sent (see GG p.116).", effect: "invasion" },
    { id: "war", group: "Boon", name: "Prepare for War", wealth: 30, skill: "Battle", succ: 2, note: "Next warfare conflict starts with 6 Momentum (−1 per session without war)." },
    { id: "reduce", group: "Boon", name: "Reduce Status", wealth: 20, skill: "Discipline", succ: 3, note: "−1 status per success (max −5). Failure: +3 status, +1 per complication.", effect: "reduce" },
    { id: "saber", group: "Boon", name: "Saber Rattling", wealth: 10, skill: "Battle", succ: 3, note: "+2 status and the Aggressive trait. Needs a military domain.", status: 2 },
    { id: "secret", group: "Boon", name: "Secret Store", wealth: 10, skill: "Discipline", succ: 4, note: "Hide something for another House: +10 Wealth or +5 Resources next session." },
  ];

  // Stored-wealth risk at the start of a session if Wealth ≥ 20 (GG p.114).
  const THEFT = [{ max: 7, lose: 0 }, { max: 12, lose: 5 }, { max: 17, lose: 10 }, { max: 19, lose: 15 }, { max: 20, lose: 20 }];

  const PERSONAL_VENTURES = [
    { name: "Affirm Allegiance", skill: "Communicate", diff: "2", text: "Gain the trait ‘Friend of X’ until next session." },
    { name: "Combat Training", skill: "Battle", diff: "2", text: "One weapon counts as +1 Quality until next session." },
    { name: "Craft Item", skill: "Understand", diff: "2–4", text: "2 successes: new machine asset; 4: Quality 1." },
    { name: "Create Composition", skill: "Communicate", diff: "varies", text: "A work of art asset; +1 Quality per extra success." },
    { name: "Develop Contact", skill: "Communicate", diff: "2", text: "A named contact asset." },
    { name: "Gain Reputation (PP)", skill: "Discipline", diff: "3", text: "A personal reputation trait, true or fake." },
    { name: "Heal Complication", skill: "Move", diff: "1", text: "Remove a lingering complication." },
    { name: "Monitor Enemies", skill: "Move", diff: "3", text: "+1d20 against them once, or one question about their plans." },
    { name: "Romantic Connection", skill: "Communicate", diff: "3", text: "A partner who is both contact and ally." },
    { name: "Seek Consort", skill: "Communicate/Discipline", diff: "4", text: "Formalize a romance held for 3 sessions." },
    { name: "Seek House Favor", skill: "Discipline", diff: "3", text: "−1 Difficulty with House superiors until next session." },
    { name: "Skill Training", skill: "Any", diff: "1–3", text: "+1d20 once next adventure (twice on 3+ successes)." },
    { name: "Train Subordinates", skill: "Understand", diff: "2", text: "A human asset gains +1 Quality (max +2 this way)." },
  ];

  // Hatred → drive for NPC Houses acting without a specific character (GG p.89).
  const HATRED = [
    { name: "Ambivalent", drive: 4 }, { name: "Dislike", drive: 5 }, { name: "Loathing", drive: 6 }, { name: "Rival", drive: 7 }, { name: "Kanly", drive: 8 },
  ];
  const HOUSE_TRAITS = ["Artistic", "Brutal", "Cunning", "Honorable", "Pious", "Secretive", "Wealthy", "Militaristic", "Scholarly", "Decadent", "Ruthless", "Diplomatic", "Paranoid", "Traditional", "Innovative", "Proud", "Generous", "Treacherous"];

  // ---------------- Planet generator (structure after GG p.80-82; original entries) ----------------
  const PLANET = {
    type: ["Gas giant with habitable moons", "Tidally locked twilight world", "Barren rock with domed cities", "Volcanic forge world", "Habitable frozen world", "Habitable ocean world", "Habitable arid world", "Habitable forest world", "Habitable jungle world", "Habitable savanna world", "Mountainous world of deep valleys", "Mined-out husk of a world", "Storm-wracked world of endless rain", "Asteroid belt colony", "Garden world, nearly Earth-like", "Toxic world under heavy terraforming"],
    politics: ["Core world under the Imperial House", "Core world held by a Great House", "Core world held by a House Major", "Core world shared by squabbling Minor Houses", "Industrial world under Imperial governorship", "Agricultural fief of a House Major", "Mining concession of a Great House", "Military training world", "Guild-administered transit world", "CHOAM-managed trade hub", "Contested world claimed by two Houses", "Independent outlier with no allegiance", "Bene Gesserit-influenced retreat world", "Penal world under Imperial warders"],
    military: ["Heavy fleet, large army, and orbital defenses", "Strong army, modest fleet, medium defenses", "Ground forces and medium planetary defenses", "Police forces and a small patrol fleet", "Garrison of a single elite regiment", "Fleet only — a naval waystation", "Large training garrison, little else", "House guard and local militia", "Mercenary companies on contract", "Effectively undefended"],
    population: ["Teeming core population, bureaucratic economy", "Dense cities built on heavy industry", "Average population, mixed economy", "Average population famed for academies and training", "Shipyards and spacecraft refitting", "Agriculture and fisheries", "Entertainment and luxury exports", "Low population: hunting reserves and wild preserves", "Low population: pleasure resorts and casinos", "Low population: religious retreats", "Refineries for ore or gas", "Smugglers' havens on the frontier", "Scattered subsistence villages", "Research stations and little else"],
    feature: ["a sea that freezes solid each winter", "ruins older than the Imperium", "a moon that eclipses the sun daily", "storms visible from orbit", "floating cities above a toxic surface", "a single continent ringed by reefs", "forests of crystal-barked trees", "an ancient Butlerian battlefield", "aurora skies at every latitude", "a capital carved into a cliff face", "seasons that last a decade", "rivers of mineral-stained color"],
    prefix: ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Kappa", "Lambda", "Sigma", "Tau"],
    star: ["Pavonis", "Draconis", "Ceti", "Eridani", "Tucanae", "Lyrae", "Orionis", "Piscium", "Aquilae", "Centauri", "Carinae", "Hydri"],
    syl1: ["Kal", "Ver", "Ish", "Mor", "Tal", "Ses", "Ar", "Bel", "Cor", "Dun", "El", "Gar", "Hel", "Ix", "Lor", "Nar", "Or", "Ruv", "Syl", "Tor"],
    syl2: ["adan", "enth", "ira", "ova", "ussa", "akar", "eon", "is", "oth", "ane", "ix", "ura", "emar", "ien", "ost", "alis"],
  };

  // ---------------- Sand and Dust ----------------
  // Sietch size → influence modifier (SD p.60-62); descriptions paraphrased.
  const SIETCH_SIZE = [
    { max: 3, name: "Small", mod: -2, text: "Under a hundred Fremen; mobile, guarding an outpost or watching a city." },
    { max: 8, name: "Moderate", mod: -1, text: "One to two hundred; their own sietch but little water stored." },
    { max: 14, name: "Average", mod: 0, text: "Up to five hundred, with their own water store." },
    { max: 18, name: "Large", mod: 1, text: "Nearly a thousand; a center of stillsuit making and craft." },
    { max: 20, name: "Huge", mod: 3, text: "Two thousand or more — a leading tribe of its region." },
  ];
  const SIETCH_INFLUENCE = [
    { max: 2, name: "Disgraced", diff: "+2", enemies: 3, text: "Not yet outcast, but few answer their call." },
    { max: 7, name: "Disliked", diff: "+1", enemies: 2, text: "A poor reputation, but others will still work with them." },
    { max: 15, name: "Known", diff: "0", enemies: 1, text: "As respected as any other tribe." },
    { max: 19, name: "Trusted", diff: "−1", enemies: 0, text: "Looked to as the voice of reason." },
    { max: 99, name: "Admired", diff: "−2", enemies: 1, text: "Held up as the best of Fremen ways — and envied for it." },
  ];
  const SIETCH_REP = ["Crafters", "Learned", "Infiltrators", "Worm Riders", "Fierce Warriors", "Water-Rich", "Devout", "Traders", "Hunters", "Ecologists", "Storytellers", "Death Commandos"];
  const SIETCH_GRUDGE = ["a stolen water debt", "a raid that went too far", "a broken marriage pact", "a disputed spice field", "a slain naib, never avenged", "an insult at a gathering of tribes", "sheltering an outcast", "dealing with smugglers", "trading with the Harkonnens", "a disputed prophecy", "a crysknife lost and never returned", "a feud whose cause no one remembers"];
  const SIETCH_NAMES = ["Qanat Rock", "Broken Hand", "Dawn Ridge", "Cave of Whispers", "Ashen Gap", "Hidden Cistern", "Seven Stones", "Eagle's Perch", "Bitter Well", "Long Shadow", "Thirsting Cliff", "Sandfall", "Cave of Lamps", "Dry Spring", "Wind Teeth", "Crescent Hollow", "Salt Ridge", "Night Basin"];

  // Desert environs and hazards (summarised from SD p.24-26 & p.75-76; GM notes are suggestions).
  const DESERT_TERRAIN = [
    { name: "Polar sink", text: "Behind the Shield Wall: the least deadly land, where the cities huddle. Still brutally hot." },
    { name: "Open bled (erg)", text: "Dune seas hundreds of metres high. No shade but the lee of dunes; worms roam freely." },
    { name: "Rock outcrops", text: "Islands of stone in the sand sea — the only refuge for the stranded. Worms can't follow." },
    { name: "Salt pan", text: "Baked, blinding flats. Worms avoid them, but there is no shade, no water, and mirages lure travelers deeper." },
    { name: "Sink / basin", text: "Cliff-ringed depressions sheltered from storms and worms. Often secretly claimed by smugglers or Fremen." },
    { name: "Shield Wall", text: "The vast mountain barrier. Passes, caves, and ambush points." },
  ];
  const DESERT_HAZARDS = [
    { name: "Drum sand", text: "Packed sand that booms when stepped on — and calls worms.", gm: "Spot it: Understand or Discipline (Survival). Failure: advance the worm clock 2." },
    { name: "Tidal dust basin", text: "Moon-pulled dust that swallows the careless.", gm: "Trait ‘Treacherous Footing’. A failed Move test may be a defeat-level danger." },
    { name: "Spice blow", text: "A buried pre-spice mass erupts. A whiff of cinnamon gives minutes of warning.", gm: "Danger Sense to notice; escape is a Move test. Afterwards, a spice field — and worms coming." },
    { name: "Sandstorm", text: "Scouring winds cut visibility to nothing and strip skin.", gm: "Trait ‘Sandstorm 2’. Flying is Dire; ground travel slows by half." },
    { name: "Coriolis storm", text: "A planet-scale storm with winds that strip flesh from bone.", gm: "Not a test — a deadline. Start a peril clock for shelter." },
    { name: "Heat and thirst", text: "Without a working stillsuit, the desert drinks you in a day.", gm: "Complications like ‘Parched’, ‘Exhausted’. Each day without water is a Discipline test." },
    { name: "Wormsign", text: "A ripple in the dunes, a smell of flint and cinnamon. Shai-Hulud is coming.", gm: "A worm is force majeure: flee, don't fight. Players choose what to sacrifice (SD p.76)." },
    { name: "Mirage", text: "Shimmering illusions of water and cities on the horizon.", gm: "Discipline to resist; failure costs time or adds ‘Lost’." },
  ];

  // ---------------- Power and Pawns ----------------
  // New drives (PP p.81-83); statements written for this tool.
  const COURT_DRIVES = {
    Challenge: { use: "Out of your depth or facing something new that tests you.", statements: ["No one has done this before.", "I learn only by risking failure.", "An easy victory is worthless.", "I must test my limits."] },
    Glory: { use: "Seeking recognition or a chance to impress.", statements: ["The whole court will know my name.", "A deed unseen is a deed undone.", "Fear and awe are both tribute.", "I was born to be remembered."] },
    Indulgence: { use: "Serving your own pleasures or vices.", statements: ["Life is for savouring.", "If I want it, I deserve it.", "Rules are for those who can't afford to break them.", "Nothing is too fine for me."] },
    Hate: { use: "Any chance to strike at the object of your loathing (GM approval needed; never at a PC).", statements: ["My enemy will suffer as I have.", "No price is too high for revenge.", "I will see their House in ashes.", "Every day is a new chance to hurt them."] },
    Honor: { use: "Following your personal code.", statements: ["I never strike an unarmed foe.", "My word, once given, is iron.", "I face my enemies openly.", "The innocent are under my protection."] },
    Love: { use: "Protecting or helping someone you care about.", statements: ["My children are everything.", "I would burn the Imperium for my beloved.", "My mentor's wish is my command.", "My sibling will never stand alone."] },
  };

  // Outsider roles (PP ch.2) for the NPC generator.
  const EXTRA_ROLES = [
    { role: "Face Dancer", trait: "Face Dancer", primary: "Communicate", secondary: "Discipline", focus: ["Acting", "Disguise", "Deceit", "Infiltration"], drive: "Truth" },
    { role: "Ginaz Swordmaster", trait: "Swordmaster of Ginaz", primary: "Battle", secondary: "Discipline", focus: ["Dueling", "Long Blades", "Short Blades", "Resolve"], drive: "Duty" },
    { role: "Tleilaxu Master", trait: "Bene Tleilax", primary: "Understand", secondary: "Discipline", focus: ["Genetics", "Deceit", "Religion", "Poison"], drive: "Faith" },
    { role: "Ixian Engineer", trait: "Ixian", primary: "Understand", secondary: "Move", focus: ["Advanced Technology", "Physics", "Data Analysis"], drive: "Truth" },
    { role: "Imperial Courtier", trait: "Imperial Court", primary: "Communicate", secondary: "Understand", focus: ["Etiquette", "Innuendo", "Imperial Politics", "Gossip"], drive: "Power" },
    { role: "Imperial Bodyguard", trait: "Bodyguard", primary: "Battle", secondary: "Discipline", focus: ["Observe", "Short Blades", "Evasive Action"], drive: "Duty" },
    { role: "CHOAM Director", trait: "CHOAM", primary: "Communicate", secondary: "Understand", focus: ["Bartering", "CHOAM Bureaucracy", "Persuasion", "House Politics"], drive: "Power" },
  ];

  return {
    HOUSE_TYPES, STATUS_LEVELS, EVENT_CHANCE, OPPORTUNITIES, CRISES, DOMAIN_CATEGORIES, WEALTHY_CATS, RESOURCE_CATS, DOMAIN_KINDS, DOMAIN_INCOME,
    MILITARY, LOYALTY, LIFESTYLE, SKILL_UPKEEP, ROLES, ROLE_BENEFIT, roleUpkeep, IMPROVE_SKILL, VENTURES, THEFT, PERSONAL_VENTURES, HATRED, HOUSE_TRAITS,
    PLANET, SIETCH_SIZE, SIETCH_INFLUENCE, SIETCH_REP, SIETCH_GRUDGE, SIETCH_NAMES, DESERT_TERRAIN, DESERT_HAZARDS, COURT_DRIVES, EXTRA_ROLES,
  };
})();
