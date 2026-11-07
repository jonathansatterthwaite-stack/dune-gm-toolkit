// Assets from the expansions. Keywords and Quality are the books'; descriptions are short paraphrases.
(function () {
  const R = [];
  // [name, category, group, keywords, quality, src, summary, special?, tangible?]
  const add = (rows) => rows.forEach(([name, cat, group, kw, q, src, text, special, tangible]) =>
    R.push({ name, cat, group, kw: kw ? kw.split(/,\s*/) : [], q, text, special: special || "", tangible: tangible !== false, src }));

  add([
    // Power and Pawns: new Ixian equipment (p.40–42)
    ["Advanced Hunter-seeker", "Espionage", "Weapons", "Remote-operated, Self-correcting, Stealthy", 0, "Power and Pawns p.41", "Ixian upgrade that can find targets who stand still or hide from its sensors; still needs an operator."],
    ["Advanced Heighliner, Ixian", "Warfare", "Strategic Targets", "Advanced Spacecraft, Efficient Carrier, FTL Travel, Immense, Navigator Pilot Required", 0, "Power and Pawns p.41", "House Vernius's newer Heighliner design; owning one brings the same Guild wrath as any Heighliner."],
    ["Mockbird Field", "Espionage", "Information", "Disguise, Privacy, Technological", 0, "Power and Pawns p.41", "Experimental damper variant that feeds eavesdroppers a faked conversation; skilled listeners may hear its subsonic distortion."],
    ["Shiv, Ixian", "Espionage", "Weapons", "Concealable, Disposable, Melee Weapon", 0, "Power and Pawns p.41", "Organic-crystal assassin's blade; a defeat with it is fatal or permanently crippling without expert care, and hard to trace."],
    ["Suboid Myrmidons", "Warfare", "Troops", "Melee Weapons, Shielded, Shock Troops, Subliminal Conditioning", 2, "Power and Pawns p.42", "Theoretical conditioned Ixian shock troops: obedient and fearless, but lost without orders.", "Quality 2 (3 with technological enhancement)."],
    ["Face Masque", "Espionage", "Agents", "Disguise, Infiltration, Technological", 0, "Power and Pawns p.42", "Sheath of Tleilaxu-derived pseudo-flesh that copies another face (not body) for as long as it is maintained."],
    // Power and Pawns: medical assets and cybernetics (p.61–62)
    ["Medic Kit", "Personal", "Medical", "First Aid, Survival", 0, "Power and Pawns p.61", "Sutures, bandages and drugs for field medicine and light surgery."],
    ["Laboratory", "Personal", "Medical", "Equipment, Research", 0, "Power and Pawns p.61", "A secure lab for research, experiments and small batches of medicine, poison or gadgets."],
    ["Handheld Medical Scanner", "Personal", "Medical", "Detection, Medical, Technology", 0, "Power and Pawns p.61", "Costly Suk diagnostic scanner for readings and chemical analysis; can double as a poison snooper."],
    ["Pharmaceutical Factory", "Intrigue", "Trade", "Manufactured, Medicine, Trade Goods", 0, "Power and Pawns p.61", "Full-scale plant making medicines and spice derivatives; a source of House wealth."],
    ["Hospital Ship", "Warfare", "Vehicles", "Medical, Shielded, Transport", 0, "Power and Pawns p.61", "Orbit-capable mobile hospital with labs, theaters and staff; its medical status opens doors."],
    ["Cybernetic Implant", "Personal", "Cybernetics", "Hidden, Implant", 0, "Power and Pawns p.62", "Add the Implant keyword to a personal weapon, shield or tool to make it a cybernetic part; Hidden ones are concealed in the body.", "Exotic implants (suspensors, jet packs) need GM approval."],
    // Power and Pawns: new intrigue assets (p.77–78)
    ["Cast-iron Alibi", "Intrigue", "Defense", "Distraction, Lies, Location", 0, "Power and Pawns p.77", "Proof you couldn't have been there; mainly defensive.", "", false],
    ["Fall Guy", "Intrigue", "Defense", "Accusation, Bystander, Rival", 0, "Power and Pawns p.77", "Someone else to take the blame — defensive, or an attack if pinned on a rival.", "", false],
    ["Favored Thing", "Intrigue", "Leverage", "Bonds, Connection, Knowledge, Loyalty", 0, "Power and Pawns p.78", "Knowing a person's passion, used to build friendship and trust quickly.", "", false],
    ["Innocent Reputation", "Intrigue", "Defense", "Innocence, Kindness, Reputation", 0, "Power and Pawns p.78", "A name for gentleness that makes accusations of scheming hard to stick.", "", false],
    ["Planned Treachery", "Intrigue", "Leverage", "Cunning, Knowledge, Treachery", 0, "Power and Pawns p.78", "Inside knowledge of a plot against a powerful figure — to sell, thwart or join.", "", false],
    ["Secret Past", "Intrigue", "Blackmail", "Deceit, Revelation, Subterfuge", 0, "Power and Pawns p.78", "A hidden failing in someone's past, to control or predict them.", "", false],
    // The Great Game: speculative Heighliner variants (p.79) — no keywords of their own; use the Heighliner's (Core p.205)
    ["Armed Heighliner", "Warfare", "Strategic Targets", "Carrier, FTL Travel, Immense, Navigator Pilot Required, Spacecraft", 0, "Great Game p.79", "Speculative: a Heighliner refitted with weapons, perhaps under a rogue Navigator. The Guild has never needed one.", "No keywords listed for the variant."],
    ["Colony Heighliner", "Warfare", "Strategic Targets", "Carrier, FTL Travel, Immense, Navigator Pilot Required, Spacecraft", 0, "Great Game p.79", "Speculative: a Heighliner built for exploring and settling worlds beyond the Known Universe.", "No keywords listed for the variant."],
    ["Courier Heighliner", "Warfare", "Strategic Targets", "FTL Travel, Navigator Pilot Required, Spacecraft", 0, "Great Game p.79", "Small foldspace vessels the Guild keeps for secret 'off book' trips — carrying agents or collecting spice bribes.", "No keywords listed for the variant."],
    // Sand and Dust: Fremen assets (p.45–47)
    ["Fremen Stillsuit", "Personal", "Armor and Dress", "Arrakis, Fremen, Survival", 0, "Sand and Dust p.45", "Fremen-made stillsuit, far better than city suits: up to two months in the deep desert, given food."],
    ["Fremkit (Fremen cache)", "Personal", "Tools and Equipment", "Desert, Fremen, Survival", 0, "Sand and Dust p.45", "Survival kit kept in desert caches for emergencies."],
    ["Crysknife (Fremen)", "Personal", "Melee Weapon", "Fremen, Melee Weapon, Sacred", 1, "Sand and Dust p.45", "The sacred worm-tooth blade; a mark of friendship for an outsider and deadly against shields.", "At least Quality 1; most are 2 or 3, and poison can raise it further."],
    ["Distrans Bat", "Espionage", "Information", "Animal, Courier, Stealth", 0, "Sand and Dust p.45", "Desert bat carrying a hidden message in its cries."],
    ["Deathstill", "Personal", "Tools and Equipment", "Fremen, Infrastructure, Raw Materials, Ritual", 0, "Sand and Dust p.46", "Device that reclaims a corpse's water for the tribe."],
    ["Water (sietch store)", "Intrigue", "Trade", "Fremen, Life, Survival", 0, "Sand and Dust p.46", "A large stash of water — survival, status and belonging on Dune."],
    ["Water of Life (unchanged)", "Espionage", "Drugs and Poisons", "Change, Fremen, Poison, Prophesy, Sayyadina", 0, "Sand and Dust p.46", "The deadly bile of a drowned young worm, made for a purpose and rarely leaving the sietch."],
    ["Water of Life (changed)", "Personal", "Drugs and Poisons", "Abandon, Narcotic, Spice", 0, "Sand and Dust p.47", "Made safe by a Reverend Mother; shared at the orgy of the tau. Sacred and never simply sold."],
    ["Water Rings", "Intrigue", "Trade", "Fremen, Sacred, Small, Valuable", 0, "Sand and Dust p.47", "Metal rings measuring water won from a defeated rival; a ritual currency among Fremen."],
    ["Will of the Ichwan Bedwine", "Intrigue", "Favors and Debts", "Courier, Fremen, Knowledge", 0, "Sand and Dust p.47", "The Fremen's full support — camps, weapons and water at your disposal. Almost unheard of for an outsider.", "", false],
    // Sand and Dust: spice (p.71)
    ["Spice", "Personal", "Drugs and Poisons", "Drug, Geriatric, Knowledge, Prophesy", 0, "Sand and Dust p.71", "One adult dose of melange as essence, capsules or gas; a bargaining chip and the fuel for spice talents."],
  ]);
  DUNE_DB.add("assets", R);
})();
