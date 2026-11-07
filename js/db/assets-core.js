// Assets from the Core Rules asset listing (p.193–223). Keywords and Quality are the book's;
// the one-line descriptions are short paraphrases written for this tool — see the page cited.
(function () {
  // [name, category, group, keywords, quality, page, summary, special?, tangible?]
  const R = [
    // ---- Personal: ranged weapons
    ["Lasgun", "Personal", "Ranged Weapon", "Laser, Ranged Weapon", 0, 194, "Continuous-wave laser pistol or rifle; 30 narrow-beam shots per cell. Good for destroying obstacles.", "Lasgun fire striking a shield causes an atomic-scale explosion (p.23)."],
    ["Maula Pistol", "Personal", "Ranged Weapon", "Concealable, Quiet, Ranged Weapon", 0, 194, "Spring-loaded pistol firing poison darts up to about 40 m; silent, an assassin's favorite. The needle gun is a variant."],
    // ---- Personal: melee weapons
    ["Blade", "Personal", "Melee Weapon", "Melee Weapon", 0, 194, "Daggers, swords and rapiers of plasteel or damasteel; shields made them the standard weapon again.", "Different sizes and forms of blade may add keywords."],
    ["Bodkin", "Personal", "Melee Weapon", "Concealable, Melee Weapon, Quiet", 0, 194, "Tiny stabbing blade carried in a wrist sheath; easy to hide and to dispose of."],
    ["Crysknife", "Personal", "Melee Weapon", "Melee Weapon, Sacred", 1, 194, "Sacred Fremen blade made from a sandworm tooth. Unfixed blades decay away from their owner's body field. Carrying one marks an outsider as a friend of the Fremen.", "Even the least crysknife is Quality 1; poison can raise it."],
    ["Kindjal", "Personal", "Melee Weapon", "Long Blade, Melee Weapon, Traditional", 0, 194, "Curved 18–22 cm noble's knife, slow enough in skilled hands to pass a shield; hilts often bear House emblems."],
    ["Pulse-sword", "Personal", "Melee Weapon", "Disruptive, Melee Weapon, Vibro-blade", 0, 195, "Vibrating blade that adds force to each blow and scrambles machine gelcircuitry; avoided on Arrakis because it calls worms."],
    // ---- Personal: armor and dress
    ["Jubba Cloak", "Personal", "Armor and Dress", "Adaptable, Fashion, Survival", 0, 195, "Temperature-regulating cloak that converts into a hammock or tent; can also be a fine status garment."],
    ["Shield (emplaced)", "Personal", "Armor and Dress", "Atomic, Impervious, Static Defense", 0, 195, "Holtzman field protecting a fixed area such as a building; cheap for the wealthy, maddening to worms.", "No high-velocity attack gets through; overwhelming one takes colossal firepower. Lasguns are as risky against it as against a personal shield."],
    ["Shield, Personal", "Personal", "Armor and Dress", "Atomic, Defense, Protection", 0, 196, "Body-wide Holtzman field that stops anything fast but lets slow objects through. Common among nobles and their retainers.", "Ranged attacks cannot harm the wearer. A lasgun hit makes the shield or the lasgun (random) explode atomically."],
    ["Shield, Semi-", "Personal", "Armor and Dress", "Atomic, Defense, Protection", 0, 196, "Half-shield covering part of the body, used in gladiatorial games and sparring.", "Ranged attacks against the wearer are +1 Difficulty. It can be moved to any of the user's personal zones. Lasgun hits explode as with a full shield."],
    ["Stillsuit", "Personal", "Armor and Dress", "Arrakis, Fremen, Survival", 0, 196, "Body-sealing suit that reclaims sweat, breath and waste as drinkable water, letting the wearer survive for weeks in the desert. Better suits lose less water."],
    // ---- Personal: communication and information
    ["Communinet", "Personal", "Communication and Information", "Communication, Information, Universal", 0, 196, "The planetary communications network; vital for relaying news, and hackable as a weapon against rival Houses.", "", false],
    ["Damper, Ixian", "Personal", "Communication and Information", "Countermeasure, Privacy, Technology", 0, 196, "Ixian device that blankets about 10 m against eavesdropping; defends conversations or cuts an opponent off from distant allies."],
    ["Emergency Transmitter", "Personal", "Communication and Information", "Communication, Concealable, Tiny", 0, 196, "Coin-sized distress beacon carried by nobles in the field, linked to a relay held by a response team.", "A good justification for creating assets that represent extra troops."],
    ["Filmbook", "Personal", "Communication and Information", "Mnemonic, Shigawire, Training", 0, 197, "Shigawire imprint that teaches through mnemonic pulses; used to train young nobles and Guild members."],
    ["Memocorder", "Personal", "Communication and Information", "Infiltration, Secrecy, Technology", 0, 197, "Ixian black square that stores a stylus-written message and replays it through the reader's nerves; very hard to crack."],
    ["Ridulian Crystal", "Personal", "Communication and Information", "Crystal, Knowledge, Skills", 0, 197, "Book of molecule-thin crystal sheets — thousands of pages in about a centimetre. Easy to carry, easy to destroy.", "Quality depends on the contents and how useful they are."],
    // ---- Personal: tools and equipment
    ["Baradye Pistol", "Personal", "Tools and Equipment", "Arrakis, Fremen, Signaling", 0, 197, "Fremen static-charge pistol that dyes a 20 m patch of sand a vivid color for hours; signals, marks and distracts."],
    ["Cibus Hood", "Personal", "Tools and Equipment", "Disguise, Infiltration, Technology", 0, 197, "Ixian mask that hides the wearer's features and gives off no energy; the face seems different each time someone looks."],
    ["Dew Collector", "Personal", "Tools and Equipment", "Arrakis, Survival, Water", 0, 197, "Small egg-shaped device that gathers morning dew on Arrakis."],
    ["Fremkit", "Personal", "Tools and Equipment", "Desert, Fremen, Survival", 0, 197, "Fremen desert-survival kit (stilltent, paracompass, maker hooks, thumper, suit patches) good for about a month; patches fix a stillsuit tear for a day."],
    ["Glowglobe", "Personal", "Tools and Equipment", "Hovering, Light", 0, 197, "Suspensor-floated light; also usable as a distraction or a hidden bomb casing."],
    ["Krimskel Fiber Rope", "Personal", "Tools and Equipment", "Capture, Prisoners, Utility", 0, 197, "Ecazi hufuf-vine rope that claws tighter when pulled; binds prisoners or bars doors."],
    ["Maker Hooks", "Personal", "Tools and Equipment", "Fremen, Sandworm, Transportation", 0, 198, "Metal hooks that pry open a worm's ring segments so it can be mounted and steered."],
    ["Palm Lock", "Personal", "Tools and Equipment", "Encoded, Security, Tool", 0, 198, "Lock keyed to one person's palm or a genetic type; higher Quality locks are harder to pick."],
    ["Paracompass", "Personal", "Tools and Equipment", "Navigation, Survival", 0, 198, "Hand compass reading local magnetic anomalies; essential in the wilds."],
    ["Poison Snooper", "Personal", "Tools and Equipment", "Detection, Security, Technology", 0, 198, "Handheld or ceiling-mounted scanner that checks food and drink for poison; Ixian and Richesian models compete.", "The GM may rule it detects any poison asset of equal or lower Quality automatically."],
    ["Probe, Ixian", "Personal", "Tools and Equipment", "Ixian, Knowledge, Secret Information, Technology", 0, 199, "Copies a living or recently dead mind into a questionable simulacrum; seen as skirting the Butlerian edicts. Shere blocks it; the later T-Probe does not."],
    ["Sapho", "Personal", "Tools and Equipment", "Addictive, Mentat, Stimulant", 0, 199, "Ecazi root juice that sharpens the mind; favored by Mentats, addictive, and stains the lips ruby."],
    ["Stilltent", "Personal", "Tools and Equipment", "Fremen, Sealed, Survival", 0, 199, "Airtight tent that reclaims moisture, usually buried under sand with snorkel air tubes."],
    ["Suspensor, Personal", "Personal", "Tools and Equipment", "Anti-gravity, Holtzman, Mobility", 0, 199, "Low-drain Holtzman lift in belts and chairs; carries heavy loads but cannot fly or stop a long fall."],
    ["Thumper", "Personal", "Tools and Equipment", "Arrakis, Sandworm", 0, 199, "Spring-loaded stake that pounds the sand to summon a worm; candle-timed versions delay it."],

    // ---- Warfare: defenses and soldiers
    ["Strategic/House Shield", "Warfare", "Defenses", "Atomic, Impenetrable, Strategic", 0, 201, "Huge Holtzman shield over a city or fortress; on Arrakis usable only inside the worm-free Imperial Basin."],
    ["Fortress", "Warfare", "Defenses", "Defensive, Heavy Cover, Strategic", 0, 201, "Castle or fortified seat; holding it often decides who rules a planet in the eyes of the Landsraad."],
    ["Bunker", "Warfare", "Defenses", "Defensive, Heavy Cover, Tactical", 0, 201, "Smaller fortified position guarding a critical point such as a bridge or newly won ground."],
    ["Conscripts", "Warfare", "Troops", "", 0, 201, "Barely trained, poorly equipped levies; good for slowing an enemy or overrunning undefended places.", "Quality 0; larger units may be higher."],
    ["Shield Infantry", "Warfare", "Troops", "Formation, Melee Weapons, Shielded", 1, 201, "Standard shielded line infantry with melee weapons, from squad to brigade.", "Quality 1; larger units may be higher."],
    ["Specialist Troops", "Warfare", "Troops", "Shielded, Special Equipment: ____, Specialty: ____, Well-armed", 2, 202, "Engineers, sappers, security, medics and other non-line units; name the specialty when acquired.", "Quality 2; larger numbers may raise it."],
    ["Elite Troops", "Warfare", "Troops", "Elite Morale, Formation, Melee Weapons, Shielded", 3, 202, "A Great House's sworn household guard, with the best training and gear.", "Quality 3–4."],
    ["Elite Troops: Fedaykin", "Warfare", "Troops", "Crysknives, Death Commandos, Desert Power, Guerillas", 4, 202, "Fremen death commandos sworn to fight to the last."],
    ["Elite Troops: Sardaukar", "Warfare", "Troops", "Brutal, Elite Morale, Elite Training, Feared, Formation, Melee Weapons, Shielded", 4, 202, "The Emperor's terror troops, forged on Salusa Secundus."],
    // ---- Warfare: vehicles
    ["Personnel Carrier", "Warfare", "Vehicles", "All-terrain, Shielded, Troop Transport", 0, 203, "Shielded ground transports a House keeps to move troops around its territory.", "Larger carriers carry more troops."],
    ["Anti-grav Platform", "Warfare", "Vehicles", "Anti-gravity, Flatbed, Shielded", 0, 203, "Shielded suspensor flatbed for short-range troop and supply moves."],
    ["Naval Transport", "Warfare", "Vehicles", "Naval, Shielded", 0, 203, "Ships carrying troops and supplies across seas and rivers when flying is unwise."],
    ["Ornithopter", "Warfare", "Vehicles", "Fast, Flying, Glide, Quiet, Size: Small", 0, 203, "Wing-beating VTOL aircraft for scouting, transport and attack; a quiet way in and out.", "Variants: Scout (Fast, Flying, Glide, Quiet, Size: Small); Troop Transport (… Size: Squad); Supply Carrier (Jet-assisted, Size: Company); Attack/Arrakis (Guns, Missiles, Rockets, Size: Small)."],
    ["Carryall", "Warfare", "Vehicles", "Cargo Space, Flying, Shielded, Size: Large to Gargantuan", 0, 204, "Heavy-lift air transport, best known for lifting harvesters away from worms; smugglers use them for quick raids."],
    ["Artillery", "Warfare", "Heavy Weapons", "Crew-served, Long-ranged, Shell Varieties", 0, 204, "Crewed long-range guns firing anything from air-burst to bunker-busting shells."],
    ["Rocket/Missile Launcher", "Warfare", "Heavy Weapons", "Armor-piercing, Explosive", 0, 204, "From single-use RPGs to vehicle launchers; Fremen raiders and Harkonnen forces both rely on them.", "Variants: RPG (Portable, Single-use, Unguided); MPAD (Anti-aircraft, Guided, Portable, Single-use); Mortar (Anti-personnel, Arcing Fire, Two-person Crew); Rocket Launcher (Arcing, Ground Vehicle, Mass Fire, Unguided); Missile Launcher (Anti-aircraft, Ground Vehicle, Guided, Mass Fire)."],
    ["Spice Harvester", "Warfare", "Strategic Targets", "Designed for Carryall Transport, Factory, Integral Scout Vehicles, Massive, Spice-infused, Wormcall", 0, 205, "Mobile spice-mining factory; the prize in the shadow war between rulers, smugglers and Fremen."],
    ["Orbital Transport", "Warfare", "Strategic Targets", "Cargo, Guild/House Design, Shielded, Spacecraft, Staterooms", 0, 205, "Frigates and lighters that shuttle between a planet and the Heighliner; a strategic target that can be turned into a weapon."],
    ["Heighliner", "Warfare", "Strategic Targets", "Carrier, FTL Travel, Immense, Navigator Pilot Required, Spacecraft", 0, 205, "The Guild's fold-space carrier. Seizing one would be among the gravest crimes in the Imperium."],

    // ---- Espionage: weapons
    ["Dartgun", "Espionage", "Weapons", "Quiet, Ranged Weapon, Small", 0, 206, "Palm-sized gun firing drug- or poison-coated darts."],
    ["Flip-dart", "Espionage", "Weapons", "Melee Weapon, Quiet, Tiny", 0, 206, "Tiny barb hidden under a flip cover, often carried by Sardaukar; coated with poison or drugs."],
    ["Hunter-seeker", "Espionage", "Weapons", "Remote-operated, Short-ranged, Stealthy", 0, 206, "Floating poison needle steered by a nearby operator; needs a traitor or infiltrator to guide it."],
    ["Poisoned Tooth", "Espionage", "Weapons", "Last Resort, Stealthy, Toxic", 0, 206, "False tooth full of poison that fools snoopers; for suicide to avoid interrogation, or a last-gasp assassination."],
    ["Shigawire Garrote", "Espionage", "Weapons", "Common, Melee Weapon, Subtle", 0, 207, "Strangling wire made from the ubiquitous shigawire."],
    ["Slip-tip", "Espionage", "Weapons", "Archaic, Melee Weapon, Small", 0, 207, "Poisoned blade that disables with a mere scratch."],
    // ---- Espionage: drugs and poisons
    ["Chaumas and Chaumurky", "Espionage", "Drugs and Poisons", "Expensive, Ingestible, Stealthy", 0, 207, "Poison in food (chaumas) and drink (chaumurky); the poisoner's main challenge is beating snoopers.", "", false],
    ["Elacca", "Espionage", "Drugs and Poisons", "Bloodlust, Drug, Inexpensive, Orange-tinged Skin", 0, 208, "Ecazi narcotic from burnt elacca wood that drives users into a fearless rage; some commanders dose their troops."],
    ["Residual Poison", "Espionage", "Drugs and Poisons", "Drug, Expensive, Unobtrusive", 0, 208, "Lingering poison that kills unless regular antidotes are given — a leash or a failsafe."],
    ["Semuta", "Espionage", "Drugs and Poisons", "Addictive, Euphoric, Expensive, Ingestible", 0, 208, "Euphoric, highly addictive Ecazi narcotic; useful for blackmail and control."],
    ["Shere", "Espionage", "Drugs and Poisons", "Expensive, Ingestible, Obscuring, Uncommon", 0, 208, "Drug that protects the mind from an Ixian probe, alive or dead (not the T-Probe)."],
    ["Truthsayer Drug", "Espionage", "Drugs and Poisons", "Expensive, Ingestible, Poisonous, Spice-derived", 0, 208, "Awareness-spectrum narcotic used for truthtrance; a currency, a poison, or a test."],
    ["Verite", "Espionage", "Drugs and Poisons", "Expensive, Ingestible, Narcotic", 0, 208, "Ecazi will-breaking drug that makes lying almost impossible."],
    // ---- Espionage: information
    ["Bene Gesserit Coded Dots", "Espionage", "Information", "Bene Gesserit, Stealthy, Uncommon", 0, 208, "Secret raised-dot messages Sisters leave for each other; readable by the trained — and forgeable.", "", false],
    ["Distrans", "Espionage", "Information", "Animal, Courier, Stealth", 0, 209, "Message implanted in an animal's nervous system and carried hidden in its cries."],
    ["Intelligence", "Espionage", "Information", "Secret Information", 0, 209, "Illicit information of any kind — minimic films, coded dots, decoded files. Gathering it can leak your own secrets.", "", false],
    ["Interrogation", "Espionage", "Information", "Secret Information", 0, 209, "Torture, drugs and pressure to extract secrets; using or resisting it is gruelling.", "", false],
    ["Map", "Espionage", "Information", "Secret Information", 0, 209, "A reliable map reveals what Houses hide on a planet; the Guild and others profit from bad ones."],
    ["Shigawire", "Espionage", "Information", "Common, Inexpensive, Physical Item", 0, 209, "Vine-grown wire used for recording; minimic films and encrypted reels smuggle messages."],
    // ---- Espionage: agents
    ["Assassin", "Espionage", "Agents", "Cunning, Dangerous, Elusive", 0, 209, "Professional bound by the Assassins' Handbook, with contacts from the underworld to the nobility.", "", false],
    ["Corporate Spy", "Espionage", "Agents", "Elusive, Knowledgeable", 0, 209, "Agent inside a House's industrial operation with access to schematics and formulas.", "", false],
    ["Face Dancer", "Espionage", "Agents", "Elusive, Genetically Programmed, Indistinguishable", 0, 209, "Tleilaxu shapeshifter who can infiltrate almost anywhere; loyal to the Tleilaxu by design.", "", false],
    ["Mentat Master of Assassins", "Espionage", "Agents", "Human Computer, Intelligent, Tricky", 0, 210, "Mentat who plans a House's assassinations and defenses against them.", "", false],
    ["Political Spy", "Espionage", "Agents", "Elusive, Knowledgeable, Tricky", 0, 210, "Informant on Landsraad politics, kanly plans and blackmail; catching one reveals an enemy.", "", false],

    // ---- Intrigue: favors and debts
    ["Debtor", "Intrigue", "Favors and Debts", "Desperate, Frightened, Paranoid", 0, 211, "Someone who owes you; call it in for money, shelter or a sudden resource.", "", false],
    ["Old Friendship", "Intrigue", "Favors and Debts", "Faithful, Reliable, Wily", 0, 211, "A long-cultivated friend who passes information, spies, or hides you.", "", false],
    ["Service", "Intrigue", "Favors and Debts", "Reliable, Valuable", 0, 211, "An organization in your pocket that can supply other assets within reason.", "", false],
    // ---- Intrigue: trade
    ["Land Rights", "Intrigue", "Trade", "Land, Production", 0, 211, "Rights to land where goods are produced; leasing them binds others to you but costs you output.", "Add keywords for the material, such as Scarce or Abundant.", false],
    ["Manufactured Goods", "Intrigue", "Trade", "Manufactured, Trade Goods", 0, 212, "Valuable finished goods that open doors, at the price of depending on your suppliers.", "Add keywords for the goods, such as Scarce or Abundant."],
    ["Raw Materials", "Intrigue", "Trade", "Raw Materials, Trade Goods", 0, 212, "A stockpile of minerals, materials or produce that others need.", "Add keywords for the material, such as Scarce or Abundant."],
    ["Supply Contract", "Intrigue", "Trade", "Long-term, Production, Trade", 0, 212, "Long-term supply deal that ties two parties' interests together — hard to attack a partner.", "Add keywords for the goods, such as Scarce or Abundant.", false],
    ["Valuable Item", "Intrigue", "Trade", "Fragile, Portable, Precious", 0, 213, "A small, precious object — an easy way to move value discreetly."],
    // ---- Intrigue: blackmail
    ["Hostage", "Intrigue", "Blackmail", "Frightened, Trapped, Valuable", 0, 213, "A captive loved one: powerful leverage that is costly to keep and guard."],
    ["Illicit Recording", "Intrigue", "Blackmail", "Damaging, Embarrassing", 0, 213, "Record of a target's illegal or shameful habits."],
    ["Stolen File", "Intrigue", "Blackmail", "Damaging, Illicit, Subtle", 0, 213, "Proof of a target's schemes against their own employer.", "", false],
    // ---- Intrigue: contacts and courtiers
    ["Black Market Trader", "Intrigue", "Contacts", "Experienced, Resourceful, Well-known", 0, 214, "Fixer between commerce and the underworld; gets anything if the price is right.", "", false],
    ["Courtesan", "Intrigue", "Contacts", "Attractive, Cunning, Resourceful", 0, 214, "Trained companion with access to the bedchambers of the powerful.", "", false],
    ["Ex-agent", "Intrigue", "Contacts", "Experienced, Intelligent, Wily", 0, 214, "A former operative you trust, good for a hiding place or word of enemy moves.", "", false],
    ["Ambitious Newcomer", "Intrigue", "Courtiers", "Ambitious, Eager, Pushy", 0, 214, "A young arrival at court eager to rise — and to be useful.", "", false],
    ["Confidant of the Emperor", "Intrigue", "Courtiers", "Cunning, Paranoid, Ruthless", 0, 215, "One of the Emperor's favorites; opens doors, but their fall could drag you down.", "", false],
    ["House Retainer", "Intrigue", "Courtiers", "Familiar, Loyal", 0, 215, "One of your House's loyal staff; see Creating Your House for building retainers.", "", false],
    ["Indebted Landowner", "Intrigue", "Courtiers", "Fallen, Indebted, Loyal or Disloyal", 0, 215, "A titled but impoverished noble — fiercely loyal or bitterly resentful.", "Pick Loyal or Disloyal.", false],
    ["Politician", "Intrigue", "Courtiers", "Cunning, Intelligent, Wily", 0, 215, "Veteran courtier who knows who is rising and falling, and how to dodge the fallout.", "", false],
  ];
  DUNE_DB.add("assets", R.map(([name, cat, group, kw, q, p, text, special, tangible]) => ({
    name, cat, group, kw: kw ? kw.split(/,\s*/) : [], q, text, special: special || "",
    tangible: tangible !== false, src: "Core p." + p,
  })));
})();
