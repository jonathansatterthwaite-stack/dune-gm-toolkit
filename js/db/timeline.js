// Timelines: the eras of play, the built-in timelines and their dated events. Events are database rows
// (table "events"), so they can be searched and linked like anything else; an event can also change other
// entries from its date on (Arrakis's ruling House, a character's status), which the Compendium applies when
// you view it "as of" a year. Your own timelines and events live in app state (see js/timeline.js).
//
// Years: positive = AG (After Guild), negative = BG. seq orders events within a year (default 50).
// Branches: a timeline forks from its parent at { year, seq } and inherits only the parent's events up to then.
// Event summaries are written for this tool. The years of the novels' events come from the Dune Wiki's timeline
// of Frank Herbert's novels; where the RPG books give another year, the event says so.
(function () {
  const DB = window.DUNE_DB;
  const WIKI = "https://dune.fandom.com/wiki/Timeline_(Original_Dune)";

  window.DUNE_TIMELINE = {
    // the seven eras of play (Core p.10-11); the years are approximate edges taken from the novels' timeline
    eras: [
      { id: "jihad", name: "Butlerian Jihad", from: -201, to: -108, src: "Core p.10", text: "Humanity's war against the thinking machines, before the Houses and the Great Schools." },
      { id: "reconstruction", name: "Reconstruction", from: -108, to: 0, src: "Core p.10", text: "The new Imperium, the Great Houses and the Great Schools take shape after the Jihad." },
      { id: "imperium", name: "The Imperium", from: 0, to: 10191, src: "Core p.10", text: "Ten thousand years of Corrino rule, ending just before the events of Dune. The RPG is set at the end of this era." },
      { id: "muaddib", name: "The Ascension of Muad'Dib", from: 10191, to: 10219, src: "Core p.11", text: "Paul Atreides takes the throne and the Fremen jihad sweeps the Imperium." },
      { id: "godemperor", name: "Era of the God Emperor", from: 10219, to: 13728, src: "Core p.11", text: "Leto II rules for thousands of years as he becomes a sandworm." },
      { id: "scattering", name: "The Scattering", from: 13728, to: 15100, src: "Core p.11", text: "Leto II's death breaks the Imperium apart and humanity flees into the unknown." },
      { id: "enemy", name: "The Age of the Enemy", from: 15100, to: 15250, src: "Core p.11", text: "The Honored Matres return from the Scattering, fleeing an enemy of their own." },
    ],
    branches: [
      { id: "novels", name: "Dune (the novels)", parent: "", fork: null, text: "The history of Frank Herbert's novels. The RPG's own setting is the end of the Imperium era, just before Dune begins." },
      { id: "aod", name: "Agents of Dune", parent: "novels", fork: { year: 10190, seq: 99 }, text: "The starter set's history: the Emperor gives Arrakis to House Nagara, not House Atreides. Masters of Dune continues it. The books give no year; it is placed just before the Atreides would have arrived." },
    ],
  };

  // ev(year, name, text, { seq, circa, branch, refs, changes, src, canon })
  const R = [];
  const ev = (year, name, text, o = {}) => R.push(Object.assign({ name, year, seq: 50, circa: false, branch: "novels", refs: [], changes: [], text, src: "", url: "", canon: "" }, o,
    o.src ? { url: "", canon: "" } : { url: o.url || WIKI, canon: o.canon || "Original" }));
  const set = (ref, field, value) => ({ ref, field, value });
  const dead = (who) => set("npcs:" + who, "status", "Dead");

  // ---- the novels (Frank Herbert), with the RPG's own dates noted where they differ
  ev(-201, "The Butlerian Jihad begins", "The crusade against computers, thinking machines and conscious robots begins.");
  ev(-108, "The Butlerian Jihad ends", "Machine culture is wiped out almost everywhere; only Ix and Richese keep their machine traditions. 'Man may not be replaced.'", { refs: ["planets:Ix", "planets:Richese"] });
  ev(-98, "The Bene Gesserit are founded", "The Sisterhood is established.", { circa: true, refs: ["organizations:Bene Gesserit"] });
  ev(-88, "The Battle of Corrin", "House Corrino takes its name from the battle and rules the Imperium from Salusa Secundus; the Golden Lion Throne is raised. An Atreides banishes Abulurd Harkonnen for cowardice, and the feud between the two Houses begins.",
    { refs: ["houses:House Corrino", "houses:House Atreides", "houses:House Harkonnen", "planets:Salusa Secundus"] });
  ev(-80, "The Order of Mentats is founded", "Gilbertus Albans founds the Order of Mentats.", { circa: true, refs: ["organizations:Order of Mentats"] });
  ev(0, "The Guild's calendar begins", "The Spacing Guild's monopoly on space travel begins, and with it the AG (After Guild) reckoning of years.", { refs: ["organizations:Spacing Guild"] });
  ev(10154, "Jessica is born", "The Baron's secret daughter by a Bene Gesserit, born into the Sisterhood's breeding program.", { refs: ["npcs:Lady Jessica"] });
  ev(10156, "Shaddam IV becomes Emperor", "Elrood IX dies, rumored to be poisoned by Hasimir Fenring, and his son Shaddam IV takes the throne.", { refs: ["npcs:Padishah Emperor Shaddam IV", "npcs:Count Hasimir Fenring"] });
  ev(10174, "Feyd-Rautha is born", "The Baron's younger nephew and chosen heir is born.", { refs: ["npcs:Feyd-Rautha Harkonnen"] });
  ev(10175, "Shaddam's spice scheme", "Shaddam secretly works to drain the Great Houses' spice reserves and choke production on Arrakis while trying to make a synthetic substitute, amal. It fails. (The RPG puts Paul's birth in this year.)",
    { src: "Sand and Dust p.124", url: "", canon: "", refs: ["npcs:Padishah Emperor Shaddam IV", "organizations:Landsraad", "planets:Arrakis"] });
  ev(10176, "Paul Atreides is born", "Born to Duke Leto and Lady Jessica, who defied the Sisterhood's order to bear a daughter. Sand and Dust (p.124) puts his birth in 10175.", { refs: ["npcs:Paul Atreides", "npcs:Duke Leto Atreides", "npcs:Lady Jessica"] });
  ev(10176, "Princess Irulan is born", "Shaddam's eldest daughter; her mother Anirul dies soon after.", { seq: 60, refs: ["npcs:Princess Irulan"] });
  ev(10191, "Arrakis is given to House Atreides", "The Emperor takes the fief of Arrakis from the Harkonnens and grants it to House Atreides, who leave Caladan in the care of Count Fenring.",
    { seq: 10, refs: ["houses:House Atreides", "houses:House Harkonnen", "planets:Caladan"], changes: [set("planets:Arrakis", "house", "House Atreides")] });
  ev(10191, "The Harkonnen attack on Arrakeen", "House Harkonnen, aided by Sardaukar, attacks the Atreides. Duke Leto, Dr. Yueh and Piter de Vries die, and Rabban is handed the fief of Arrakis.",
    { seq: 20, refs: ["houses:House Harkonnen", "houses:House Atreides", "organizations:Sardaukar"],
      changes: [dead("Duke Leto Atreides"), dead("Dr. Wellington Yueh"), dead("Piter de Vries"), set("planets:Arrakis", "house", "House Harkonnen")] });
  ev(10191, "Paul and Jessica flee to the Fremen", "Duncan Idaho dies covering their escape. Paul becomes Muad'Dib among the Fremen, and Liet Kynes is killed.",
    { seq: 30, refs: ["npcs:Paul Atreides", "npcs:Lady Jessica", "organizations:Fremen"], changes: [dead("Duncan Idaho"), dead("Liet Kynes"), set("npcs:Paul Atreides", "status", "In hiding with the Fremen")] });
  ev(10193, "The Battle of Arrakeen", "Paul's Fremen defeat the Emperor's Sardaukar. Thufir Hawat, Rabban and the Baron die, and Paul kills Feyd-Rautha in single combat. Paul retakes Arrakis and claims the throne through marriage to Irulan; Stilgar becomes governor of Arrakis.",
    { refs: ["npcs:Paul Atreides", "npcs:Stilgar", "npcs:Princess Irulan"],
      changes: [dead("Thufir Hawat"), dead("Glossu 'The Beast' Rabban"), dead("Baron Vladimir Harkonnen"), dead("Feyd-Rautha Harkonnen"), set("planets:Arrakis", "house", "House Atreides"),
        set("npcs:Paul Atreides", "status", "Emperor-to-be"), set("npcs:Stilgar", "status", "Governor of Arrakis")] });
  ev(10196, "Paul becomes Emperor", "Shaddam IV abdicates and is exiled to Salusa Secundus with Count Fenring. Paul becomes the 82nd Padishah Emperor and the Fremen jihad begins.",
    { refs: ["npcs:Padishah Emperor Shaddam IV", "npcs:Count Hasimir Fenring", "planets:Salusa Secundus"],
      changes: [set("npcs:Padishah Emperor Shaddam IV", "status", "Abdicated; exiled on Salusa Secundus"), set("npcs:Count Hasimir Fenring", "status", "Exiled on Salusa Secundus"), set("npcs:Paul Atreides", "status", "Padishah Emperor")] });
  ev(10208, "Muad'Dib's Jihad ends", "After twelve years the jihad ends, with a dozen rebellious worlds brought under Paul's rule.");
  ev(10210, "Paul walks into the desert", "Chani dies giving birth to the twins Leto II and Ghanima. Blinded, Paul walks into the deep desert and Alia becomes regent.",
    { changes: [dead("Chani Kynes"), set("npcs:Paul Atreides", "status", "Vanished into the desert")] });
  ev(10219, "Leto II takes the throne", "Paul returns as the Preacher and is killed; Alia takes her own life. Leto II ascends the throne and sets humanity on the Golden Path.", { changes: [dead("Paul Atreides")] });
  ev(13728, "Leto II is killed", "Siona Atreides and a Duncan Idaho ghola kill the God Emperor; his empire falls apart.");
  ev(13750, "The first navigation machines", "Ixian machines break the Spacing Guild's monopoly on space travel.", { refs: ["planets:Ix", "organizations:Spacing Guild"] });
  ev(14000, "The Scattering begins", "Famine and unrest drive countless people out into unknown space in no-ships.", { circa: true });
  ev(15100, "The Honored Matres return", "The Lost Ones begin returning from the Scattering, among them the Honored Matres.", { circa: true });
  ev(15229, "Rakis is destroyed", "The Honored Matres destroy all life on Rakis (Arrakis), and its sandworms die out; the Bene Gesserit save one worm.",
    { refs: ["organizations:Bene Gesserit"], changes: [set("planets:Arrakis", "house", ""), set("planets:Arrakis", "note", "Destroyed by the Honored Matres")] });
  ev(15230, "The Honored Matres conquer Junction and Ecaz", "The Honored Matres take Junction and Ecaz, and begin destroying Bene Gesserit worlds.",
    { changes: [set("planets:Junction", "note", "Conquered by the Honored Matres"), set("planets:Ecaz", "note", "Conquered by the Honored Matres")] });

  // ---- Agents of Dune and Masters of Dune (an alternate history: House Nagara, not House Atreides, takes Arrakis)
  const A = { branch: "aod", circa: true };
  ev(10191, "Arrakis is given to House Nagara", "The Emperor takes Arrakis from the Harkonnens and gives it to House Nagara, small enough, he thinks, to control. The Harkonnens are compensated with CHOAM shares.",
    Object.assign({}, A, { seq: 10, src: "Masters of Dune p.3", refs: ["houses:House Nagara", "houses:House Harkonnen"], changes: [set("planets:Arrakis", "house", "House Nagara")] }));
  ev(10191, "The heirs train on Giedi Prime", "The heirs and retainers of House Nagara train under Harkonnen instructors before taking over the spice operation.",
    Object.assign({}, A, { seq: 20, src: "Agents of Dune p.7", refs: ["npcs:Shizu Nagara", "npcs:Jiro Nagara", "npcs:Niran Rani", "npcs:Turo Imshel", "npcs:Korbus Zaan", "planets:Giedi Prime"] }));
  ev(10191, "Countess Sakura Nagara is assassinated", "The Harkonnens have the ruler of House Nagara killed, hoping the Emperor will return Arrakis to them. Her heirs take up the reins instead.",
    Object.assign({}, A, { seq: 30, src: "Agents of Dune p.62", refs: ["houses:House Nagara"], changes: [dead("Countess Sakura Nagara")] }));
  ev(10191, "House Nagara takes command on Arrakis", "The heirs arrive on Arrakis, meet the Judge of the Change and take charge of the spice harvest.",
    Object.assign({}, A, { seq: 40, src: "Agents of Dune p.73", refs: ["npcs:Ashem Perro", "npcs:Vadim Saarela", "npcs:Musa"] }));
  ev(10192, "Masters of Dune: the Harkonnens strike back", "House Nagara holds Arrakis as the Harkonnens scheme to take it back; its alliances are decided in seven chapters played in any order.",
    Object.assign({}, A, { src: "Masters of Dune p.5", refs: ["houses:House Nagara", "houses:House Harkonnen"] }));

  // what kind of event each one is: the timeline draws each kind with its own symbol (see KINDS in js/timeline.js)
  const KIND = {
    "The Butlerian Jihad begins": "battle", "The Butlerian Jihad ends": "galactic", "The Bene Gesserit are founded": "founding",
    "The Battle of Corrin": "battle", "The Order of Mentats is founded": "founding", "The Guild's calendar begins": "galactic",
    "Jessica is born": "birth", "Shaddam IV becomes Emperor": "rule", "Feyd-Rautha is born": "birth", "Shaddam's spice scheme": "intrigue",
    "Paul Atreides is born": "birth", "Princess Irulan is born": "birth", "Arrakis is given to House Atreides": "house",
    "The Harkonnen attack on Arrakeen": "battle", "Paul and Jessica flee to the Fremen": "character", "The Battle of Arrakeen": "battle",
    "Paul becomes Emperor": "rule", "Muad'Dib's Jihad ends": "battle", "Paul walks into the desert": "character",
    "Leto II takes the throne": "rule", "Leto II is killed": "death", "The first navigation machines": "discovery",
    "The Scattering begins": "galactic", "The Honored Matres return": "galactic", "Rakis is destroyed": "planet",
    "The Honored Matres conquer Junction and Ecaz": "battle",
    "Arrakis is given to House Nagara": "house", "The heirs train on Giedi Prime": "house", "Countess Sakura Nagara is assassinated": "death",
    "House Nagara takes command on Arrakis": "house", "Masters of Dune: the Harkonnens strike back": "intrigue",
  };
  R.forEach((e) => { e.kind = KIND[e.name] || ""; });

  DB.add("events", R);
})();
