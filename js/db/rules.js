// Reference tables (House creation, roles, enmity, factions, traits, focuses, drives) and views over
// data the other tools already define. Numbers follow the books; descriptions are written for this tool.
(function () {
  const DB = window.DUNE_DB;

  // ---------------- Views over existing tool data (resolved when first used) ----------------
  const ARCH_SRC = { Core: "Core p.113", "Sand and Dust": "Sand and Dust p.58", "Great Game": "Great Game p.72" };
  DB.view("talents", () => DUNE_CH.TALENTS.map((t) => ({ name: t.name, text: t.text, faction: t.faction || "", param: t.param || "", src: t.book })));
  DB.view("archetypes", () => DUNE_CH.ARCHETYPES.map((a) => ({ name: a.name, primary: a.primary, secondary: a.secondary, focuses: a.focuses, talents: a.talents, src: ARCH_SRC[a.book] || a.book })));
  DB.view("factions", () => DUNE_CH.FACTIONS.map((f) => ({ name: f.name, trait: f.trait, mandatory: f.mandatory, rule: f.group ? f.group.rule : f.anyOf ? "Take at least one of the listed talents" : "Must take all listed talents", archetypes: f.suggest.split(/,\s*/), src: /p\./.test(f.book) ? f.book : f.book + "" })));
  DB.view("abilities", () => DUNE.SPECIAL_ABILITIES.map((a) => ({ name: a.name, text: a.text.replace("{skill}", "a chosen skill"), src: "Core p.327" })));
  DB.view("ventures", () => DUNE_X.VENTURES.map((v) => ({ name: v.name, group: v.group, skill: v.skill === "?" ? "varies" : v.skill || "—", cost: [v.wealth ? v.wealth + " Wealth" : "", v.res ? v.res + " Resources" : ""].filter(Boolean).join(", ") || "—", successes: v.succ || 0, text: v.note, src: "Great Game p.104" })));
  // One row per focus. Focuses the books mark * need a specialty ("Music (Baliset)"): they get a single row under the
  // base name, with the specialties seen in the books as examples. Focuses that archetypes and stat blocks use but no
  // list prints (Combat Awareness, Surgery as an NPC focus …) are added too, so every focus in the books resolves here.
  const SPECIALTY = { Music: "an instrument", "Secret Language": "whose secret language", Survival: "an environment", Pilot: "a type of craft", "Faction Lore": "a faction", Art: "an art form", Craft: "a craft" };
  DB.view("focuses", (tbl) => {
    const out = [], by = {};
    const put = (name, skill, src, set, who) => {
      // "X (detail)" folds into X when X needs a specialty or is already a focus ("Religion (Fremen)" → Religion)
      const m = name.trim().match(/^(.*?)\s*\((.*)\)$/), folds = m && (SPECIALTY[m[1]] || by[m[1].toLowerCase()]);
      const base = folds ? m[1] : name.trim();
      let f = by[base.toLowerCase()];
      if (!f) { f = by[base.toLowerCase()] = { name: base, skill, set, specify: SPECIALTY[base] ? "Choose " + SPECIALTY[base] : "", examples: [], usedBy: [], src }; out.push(f); }
      if (folds) (SPECIALTY[base] ? m[2].split(/,\s*(?:etc\.?)?/) : [m[2]]).filter(Boolean).forEach((x) => { if (!f.examples.includes(x)) f.examples.push(x); });
      if (who && !f.usedBy.includes(who)) f.usedBy.push(who);
    };
    Object.entries(DUNE.FOCUSES).forEach(([skill, list]) => list.forEach((name) => put(name, skill, "Core p.103", "Core")));
    [["Communicate", "Music"], ["Communicate", "Secret Language"], ["Understand", "Faction Lore"]].forEach(([skill, name]) => put(name, skill, "Core p.103", "Core"));
    const x = (book, rows) => rows.split(";").forEach((s) => { const [name, skill] = s.split("|"); put(name, skill, book, book.replace(/ p\..*/, "")); });
    x("Sand and Dust p.58","Desert Navigation|Understand;Forging|Discipline;Fremen Crafting|Discipline;Fremen Culture|Understand;Fremen Technology|Understand;Interpretation|Discipline;Leadership|Communicate;Metalwork|Discipline;Pistol|Battle;Pottery|Discipline;Rifle|Battle;Speechmaking|Communicate;Stillness|Discipline;Stonemason|Discipline;Weather Lore|Understand;Woodcarving|Discipline");
    x("Great Game p.74", "Bribery|Communicate;Finance|Understand;Foldspace Navigation|Understand;Guild Bureaucracy|Understand;Low-Gravity Operation|Move;Mathematics|Understand;Pilot (Spaceship)|Move;Secret Language (Guild Navigator)|Communicate;Secret Language (Spacing Guild)|Communicate;Space Navigation|Understand;Space Tactics|Battle;Spaceship Technology|Understand;Spaceship Weapons|Battle;Stunner|Battle");
    // archetypes don't say which skill a focus belongs to: an unlisted one goes under the primary skill
    tbl("archetypes").forEach((a) => a.focuses.forEach((f) => put(f, a.primary, a.src, "From stat blocks", a.name)));
    tbl("npcs").forEach((n) => Object.entries(n.focuses).forEach(([skill, list]) => list.forEach((f) => put(f, skill, n.src, "From stat blocks", n.name))));
    return out.map((f) => Object.assign(f, { set: f.set === "Great Game" ? "The Great Game" : f.set }));
  });
  DB.view("drives", () => {
    const core = [
      ["Duty", "Obligation to others: your House, family, people or oath."],
      ["Faith", "Belief in something greater — a religion, a cause, a prophecy, or yourself."],
      ["Justice", "Fairness, law and setting wrongs right."],
      ["Power", "Gaining and using influence, wealth and control."],
      ["Truth", "Finding out what is real, and refusing to be deceived."],
    ].map(([name, text]) => ({ name, set: "Core", text, src: "Core p.105" }));
    const pp = Object.entries(DUNE_X.COURT_DRIVES).map(([name, d]) => ({ name, set: "Power and Pawns", text: d.use, examples: d.statements, src: "Power and Pawns p.81" }));
    return core.concat(pp);
  });

  // ---------------- House creation (Core p.86–99; The Great Game p.88–95) ----------------
  DB.add("houseTypes", [
    { name: "Nascent House", threat: 0, domains: "1 secondary", enemies: "None", text: "Freshly raised to Minor status: a noble family with a small retinue and much to prove.", gg: "Status 15 · 2 roles · 10 spaces", src: "Core p.86" },
    { name: "House Minor", threat: 1, domains: "1 primary, 1 secondary", enemies: "One Minor House", text: "An established vassal of a House Major, known mostly on its home planet.", gg: "Status 25 · 4 roles · 35 spaces", src: "Core p.86" },
    { name: "House Major", threat: 2, domains: "1 primary, 2 secondary", enemies: "One Major House and a Minor House that serves it", text: "Rules a whole planet with Minor Houses under it; a serious player in Imperial politics.", gg: "Status 45 · 6 roles · 60 spaces", src: "Core p.86" },
    { name: "Great House", threat: 3, domains: "2 primary, 3 secondary", enemies: "A Great House or two Major Houses (or a faction), plus their vassals", text: "Controls several worlds through loyal Minor Houses; coveted and feared in equal measure.", gg: "Status 65 · 8 roles · 100 spaces", src: "Core p.86" },
  ].map((r) => Object.assign(r, { threatNote: `${r.threat} Threat per player at the start of each session` })));

  const dom = (name, text, m, p, e, w, u) => ({ name, text, machinery: m, produce: p, expertise: e, workers: w, understanding: u, trait: name === "Religion" ? "Religious" : name === "Science" ? "Scientific" : name, src: "Core p.88" });
  DB.add("domains", [
    dom("Artistic", "Fame and respect more than raw power — and touring troupes make good cover for spies.", "Stage effects, scenery, lighting and sound", "Plays, poems, novels, comedy, music", "Playwrights, poets, composers, directors", "Actors, stage crews, musicians, touring companies", "Philosophy, criticism, performance styles"),
    dom("Espionage", "Selling the tools and fruits of the spy trade.", "Surveillance devices, sensors, jammers", "Secrets from other Houses, often of one kind (military, blackmail)", "Spymasters and agent handlers", "Agents, spies, infiltrators", "Espionage and counter-intelligence techniques"),
    dom("Farming", "Pastoral Houses whose basic produce others rely on more than they admit.", "Tractors, harvesters, large farm machines", "Crops and animal products", "Stewards, land managers", "Farm hands, shepherds, herders", "New farming methods"),
    dom("Industrial", "Factory worlds making anything from filmbook readers to Heighliners — within the edicts.", "Factory machines, spacecraft, large vehicles", "Mass-produced goods, refined alloys, toys", "Supervisors, business managers", "Factory workers, crafters, mechanics", "Business and factory techniques"),
    dom("Kanly", "Assassination under the rules of kanly.", "Hunter-seekers, mines, bombs and traps", "Poisons that kill, stun or weaken undetected", "Assassin masters, planners, trainers", "Assassins, thugs, infiltrators", "Assassination and infiltration methods"),
    dom("Military", "War is rare and costly, but no House can look weak.", "Battlefield weapons, artillery, large shields, tanks", "Ammunition, personal weapons, small arms", "Tacticians, officers, strategists", "Soldiers, engineers, pilots, logistics staff", "Strategy and new tactics"),
    dom("Political", "Social gadflies who turn the games of the Landsraad into a business.", "Couture, expensive trinkets, message services", "Information, secrets and favors", "Analysts, mediators, diplomats, social planners", "Courtiers, spies, administrators, servants", "Diplomacy and etiquette"),
    dom("Religion", "Faith as leverage — and as a service that can be sold.", "Churches, statues, prayer beads, holy books", "Prayers, hymns, inspirational writing", "Philosophers, clergy", "Choristers, altar servants, community managers", "New philosophies and forms of faith"),
    dom("Science", "Research and development within the Butlerian edicts.", "Lab equipment, quarantine areas, whole facilities", "Chemical compounds, drugs, adapted humans and animals", "Scientists and researchers", "Lab assistants and managers", "New research of every kind"),
  ]);

  const role = (name, text, rights, gg) => ({ name, text, rights, gg: gg || "", src: "Core p.92" });
  const RB = (window.DUNE_X && DUNE_X.ROLE_BENEFIT) || {};
  DB.view("houseRoles", () => [
    role("Ruler", "Head of the House, bearing its name and a title such as Baron, Count or Duke; a spouse may share the role.", "Absolute command — but running the House consumes all their time."),
    role("Consort", "The Ruler's spouse, concubine or companion who does not rule.", "Always has the Ruler's ear, which makes them a target for manipulation."),
    role("Advisor", "Expert counsel in one field, such as politics, CHOAM, finance, etiquette or history.", "Must stay current in their field and answer when asked."),
    role("Chief Physician", "Head of the House's medical staff and personal doctor to the family.", "Commands every medical unit and holds enormous trust."),
    role("Councilor", "Links the Ruler and the common people, passing petitions up and decisions down.", "Knows what the people need, and can warn of unrest."),
    role("Envoy", "The House's diplomat, handling rivals, CHOAM, the Landsraad and third parties.", "Must read the shifting moods of Imperial politics."),
    role("Heir", "Usually the Ruler's eldest child, though a sharper sibling or adoptee may be chosen.", "Stay alive and ready to lead — a prime target for assassins."),
    role("Marshal", "Enforces the House's laws and keeps its territories orderly.", "From lone sheriff to chief of police; a corrupt one lets crime bleed the House."),
    role("Scholar", "Handles science and academia for the Ruler.", "Left to their studies until their knowledge is needed."),
    role("Spymaster", "Runs the House's spies, informants and counter-espionage; a Master of Assassins if they favor killers.", "Should never be surprised by the enemy."),
    role("Swordmaster", "Martial expert, tactician and the Ruler's bodyguard; often trains the heirs.", "Anticipates every strategy an enemy might use."),
    role("Treasurer", "Chief financial officer: funds, taxes and investments.", "Discrepancies in the accounts reveal corruption."),
    role("Warmaster", "The House general, highest-ranking officer of its military.", "Must defend the House at a moment's notice."),
  ].map((r) => Object.assign(r, { gg: RB[r.name] ? RB[r.name] + " (Great Game p.95)" : "" })));

  const tmpl = (name, text, minor, major, great, p) => ({ name, text, minor, major, great, src: "Core p." + p });
  DB.add("houseTemplates", [
    tmpl("Military House", "Renowned for its armies and battle-hardened generals; easy to see coming, hard to stop.",
      "Primary: Military Machinery (armored vehicles). Secondary: Military Produce (ammunition or engineers).",
      "Primary: Military Workers (soldiers). Secondary: Military Produce (small arms); Farming Produce (military rations).",
      "Primary: Military Workers (pilots); Military Machinery (armored vehicles). Secondary: Military Produce (shields); Farming Produce (rations); Military Understanding (special tactics).", 297),
    tmpl("Espionage House", "Strikes from the shadows; professes friendship while planning your fall. Poor allies, dangerous enemies.",
      "Primary: Kanly Workers (assassins). Secondary: Artistic Workers (traveling performers).",
      "Primary: Espionage Understanding (counter-intelligence). Secondary: Espionage Machinery (surveillance); Espionage Workers (infiltrators).",
      "Primary: Kanly Produce (poisons); Kanly Workers (infiltrators). Secondary: Industrial Workers (servants); Science Expertise (pharmacists); Espionage Produce (blackmail).", 298),
    tmpl("Technological/Industrial House", "Masters of innovation and production; they pay others to do their fighting.",
      "Primary: Industrial Produce (rare refined alloys). Secondary: Industrial Produce (mined ores).",
      "Primary: Science Understanding (technological research). Secondary: Science Expertise (scientists); Industrial Expertise (engineers).",
      "Primary: Industrial Machinery (spacecraft); Science Understanding (spacecraft drives). Secondary: Industrial Workers (shipbuilders); Industrial Expertise (foremen); Science Workers (lab assistants).", 300),
    tmpl("Artistic/Religious House", "Befriends everyone; cross it and whisper campaigns close every door.",
      "Primary: Artistic Understanding (advertising). Secondary: Artistic Workers (actors).",
      "Primary: Artistic Understanding (fashion). Secondary: Industrial Produce (textiles); Industrial Workers (tailors).",
      "Primary: Artistic Produce (broadcast entertainment); Religion Understanding (philosophies). Secondary: Artistic Machinery (studios); Religion Expertise (clergy); Religion Produce (texts).", 302),
    tmpl("Agricultural House", "Feeds the Imperium; dismissed as parochial until the food stops.",
      "Primary: Farming Understanding (advanced methods). Secondary: Science Expertise (agricultural biologists).",
      "Primary: Farming Produce (gourmet cheeses). Secondary: Industrial Machinery (cheese machinery); Farming Workers (cheesemakers).",
      "Primary: Farming Produce (beef); Farming Produce (sweets). Secondary: Farming Expertise (land managers); Farming Produce (cattle); Industrial Machinery (confectionery).", 304),
  ]);

  // Enemies (Core p.96–97): hatred and reason tables, paraphrased
  const E = (kind, roll, name, text) => ({ kind, roll, name, text, src: kind === "Hatred" ? "Core p.96" : "Core p.97" });
  DB.add("enmity", [
    E("Hatred", "1–5", "Dislike", "Distrust colors every dealing: +1 Difficulty to any interaction with this House."),
    E("Hatred", "6–10", "Rival", "Works to bring you down with gossip and lies at court; avoids open conflict unless it sees a gain."),
    E("Hatred", "11–15", "Loathing", "Always has a plan to destroy you, but won't risk its own resources unless the damage would be serious."),
    E("Hatred", "16–20", "Kanly", "Has committed everything to wiping your House out, and will take any risk to do it."),
    E("Reason", "1–2", "Competition", "Both want the same resource, market or holding."),
    E("Reason", "3–4", "Slight", "An embarrassment at court that no apology can mend."),
    E("Reason", "5–6", "Debt", "One side reneged on a deal — by accident, misfortune or choice."),
    E("Reason", "7–8", "Ancient Feud", "An enmity thousands of years old; each House tells its own version."),
    E("Reason", "9–10", "Morality", "Something about your House disgusts them — cruelty, laxity, or even excessive virtue."),
    E("Reason", "11–12", "Servitude", "One once served the other: a master wanting them back, or a vassal wanting revenge."),
    E("Reason", "13–14", "Family Ties", "A tradition of intermarriage broken off, each side blaming the other."),
    E("Reason", "15–16", "Theft", "One holds something the other insists was stolen."),
    E("Reason", "17–18", "Jealousy", "They idolize you until it curdled into envy."),
    E("Reason", "19–20", "No Reason", "No one remembers why; the hatred simply is."),
    E("Rule", "—", "Enemy appears", "The GM may spend 1 Threat to bring an enemy House into an adventure, in person or as rumor.", "Core p.96"),
  ]);

  // ---------------- Factions and powers ----------------
  const O = (name, kind, text, src) => ({ name, kind, text, src });
  DB.add("organizations", [
    O("House Corrino and the Imperial Court", "Great power", "The Padishah Emperor's House and court on Kaitain, ruling through the Sardaukar and a careful balance of rivals.", "Core p.28; Power and Pawns p.8"),
    O("Landsraad", "Great power", "Assembly of the noble Houses; its High Council and votes check the Emperor.", "Core p.37; Great Game p.9"),
    O("CHOAM", "Great power", "The Combine Honnete Ober Advancer Mercantiles: the trade corporation in which Emperor, Houses, Guild and Bene Gesserit hold shares.", "Core p.43; Great Game p.14; Power and Pawns p.120"),
    O("Spacing Guild", "Great power", "Monopoly on space travel through its spice-mutated Navigators; neutral, secretive, and never governing.", "Core p.47; Power and Pawns p.107; Great Game p.68"),
    O("Guild Bank", "Great power", "The Guild's financial arm, lending and holding the wealth of the Imperium.", "Great Game p.68"),
    O("Bene Gesserit", "Great School", "Sisterhood of trained women — Truthsayers, consorts and advisors — pursuing a breeding program across millennia.", "Core p.55"),
    O("Order of Mentats", "Great School", "Human computers trained to replace forbidden thinking machines.", "Core p.51"),
    O("Suk School", "Great School", "Physicians whose Imperial Conditioning supposedly makes them incapable of harm.", "Core p.59; Power and Pawns p.57"),
    O("Swordmasters of Ginaz", "Great School", "The finest fighting school in the Imperium, training swordmasters for the Houses.", "Core p.62; Power and Pawns p.49"),
    O("Bene Tleilax", "Faction", "Reviled genetic engineers selling gholas, Face Dancers and twisted Mentats.", "Core p.61; Power and Pawns p.43"),
    O("Ix", "Faction", "The machine world of House Vernius, skirting the Butlerian edicts with its technology.", "Core p.42; Power and Pawns p.36"),
    O("Sardaukar", "Faction", "The Emperor's terror troops, raised on the prison planet Salusa Secundus.", "Power and Pawns p.27"),
    O("Orange Catholic Church", "Faith", "The ecumenical faith of the Imperium, built on the Orange Catholic Bible.", "Core p.35"),
    O("Fremen", "Faction", "Desert people of Arrakis living in hidden sietches, masters of water discipline and the worm.", "Sand and Dust p.33"),
    O("Smugglers and Mercenaries", "Arrakis", "Spice smugglers and hired guns who trade with Fremen and dodge the governing House.", "Sand and Dust p.50"),
    O("Bankers", "Arrakis", "Money-lenders and financiers of the Arrakeen and Carthag trade.", "Sand and Dust p.118"),
    O("Courtesans", "Arrakis", "Companions to the powerful, rich in secrets.", "Sand and Dust p.118"),
    O("Criminals", "Arrakis", "Gangs, thieves and black marketeers of the cities.", "Sand and Dust p.119"),
    O("Importers", "Arrakis", "Merchants bringing off-world goods to a planet that produces little but spice.", "Sand and Dust p.119"),
    O("Manufacturers", "Arrakis", "Makers of the tools and equipment Arrakis needs to survive.", "Sand and Dust p.120"),
    O("Water Sellers", "Arrakis", "Guilds of water merchants, wealthy and powerful on a waterless world.", "Core p.295"),
  ]);

  // ---------------- Traits ----------------
  const tr = (name, kind, text, src) => ({ name, kind, text, src });
  const CURATED = [
    tr("Spice Addicted", "Condition", "Taken by anyone using spice regularly; without their ration they suffer withdrawal and lose spice talents. Can be used as a complication.", "Sand and Dust p.71"),
    tr("Exhausted", "Condition", "Imposed by Voice of the Inner Dark for a day.", "Sand and Dust p.72"),
    tr("Wounded", "Condition", "Example injury trait (used by the Sardaukar Sacrifice talent).", "Power and Pawns p.32"),
    tr("Reported to CHOAM", "Condition", "Complication from Report Malfeasance: the target faces a CHOAM investigation.", "Great Game p.18"),
    tr("Trusted", "Condition", "From Dangerous Seduction: lasts until you reveal where your allegiance truly lies.", "Power and Pawns p.90"),
    tr("Embarrassed", "Social", "A negative social trait, e.g. from Slip of the Tongue.", "Power and Pawns p.91"),
    tr("Disgraced", "Social", "A negative social trait, e.g. from Slip of the Tongue.", "Power and Pawns p.91"),
    tr("Guild Peace", "Scene", "Reminds everyone of the Guild's power; usually penalizes violence.", "Great Game p.74"),
    tr("Convivial", "Scene", "Example scene trait from the Core rules' party scene.", "Core p.143"),
    tr("Distrustful", "Character", "Example ranked trait (Distrustful 2) on a wary merchant.", "Core p.143"),
    tr("Well-Known", "Fame", "Fame traits help you make an entrance and be noticed (Communicate test by importance of the gathering).", "Power and Pawns p.80"),
    tr("Impressive", "Fame", "Fame trait.", "Power and Pawns p.80"),
    tr("Celebrity", "Fame", "Fame trait.", "Power and Pawns p.80"),
    tr("Famous", "Fame", "Fame trait.", "Power and Pawns p.80"),
    tr("Kind", "Reputation", "Example reputation trait.", "Power and Pawns p.79"),
    tr("Cruel", "Reputation", "Example reputation trait.", "Power and Pawns p.79"),
    tr("Charming", "Reputation", "Example reputation trait.", "Power and Pawns p.79"),
    tr("Honorable", "Reputation", "House Atreides' reputation trait; Kara Molay's in the Core examples.", "Core p.91"),
    tr("Brutal", "Reputation", "House Harkonnen's reputation trait.", "Core p.91"),
  ];
  DB.view("traits", (tbl) => {
    const out = CURATED.map((t) => Object.assign({ usedBy: [] }, t));
    const addUse = (name, kind, who, src) => {
      name = name.trim(); if (!name || name.length > 40) return;
      let t = out.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!t) { t = { name, kind, text: "", usedBy: [], src }; out.push(t); }
      if (!t.usedBy.includes(who)) t.usedBy.push(who);
    };
    tbl("domains").forEach((d) => addUse(d.trait, "House", "Any House with a primary " + d.name + " domain", "Core p.91"));
    tbl("houses").forEach((h) => h.traits.forEach((t) => addUse(t, "House", h.name, h.src)));
    tbl("factions").forEach((f) => addUse(f.trait, "Faction", f.name + " template", f.src));
    tbl("npcs").forEach((n) => n.traits.forEach((t) => addUse(t, "Character", n.name, n.src)));
    return out;
  });

  // ---------------- Other names ----------------
  // NPC stat blocks name common gear loosely; these point those names at the asset entry they mean.
  DB.alias("assets", {
    "Shield, Personal": ["Shield", "Shield Belt", "Defensive Shield"],
    "Damper, Ixian": ["Ixian Damper"],
    "Blade": ["Knife", "Concealable Dagger"],
    "Kindjal": ["Kindjal Engraved with House Crest"],
    "Medic Kit": ["Medkit"],
    "Shigawire": ["Shigawire Reels"],
    "Dew Collector": ["Dew Collectors"],
    "Water Rings": ["String of Water Rings"],
    "Ornithopter": ["Personal Ornithopter"],
    "Illicit Recording": ["Illicit Recordings"],
  });
})();
