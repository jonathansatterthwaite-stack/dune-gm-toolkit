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
  ev(10176, "Paul Atreides is born", "Born to Duke Leto and Lady Jessica, who defied the Sisterhood's order to bear a daughter. Sand and Dust (p.124) and the Core rulebook's timeline (p.27) put his birth in 10175.", { refs: ["npcs:Paul Atreides", "npcs:Duke Leto Atreides", "npcs:Lady Jessica"] });
  ev(10176, "Princess Irulan is born", "Shaddam's eldest daughter; her mother Anirul dies soon after. The Core rulebook's timeline (p.27) and the prequel novels put her birth in 10162.", { seq: 60, refs: ["npcs:Princess Irulan"] });
  ev(10191, "Arrakis is given to House Atreides", "The Emperor takes the fief of Arrakis from the Harkonnens and grants it to House Atreides, who leave Caladan in the care of Count Fenring.",
    { seq: 10, refs: ["houses:House Atreides", "houses:House Harkonnen", "planets:Caladan"], changes: [set("planets:Arrakis", "house", "House Atreides")] });
  ev(10191, "The Harkonnen attack on Arrakeen", "House Harkonnen, aided by Sardaukar disguised in Harkonnen colors, attacks the Atreides after Dr. Yueh brings down the house's shields. Rabban is handed the fief of Arrakis.",
    { seq: 20, refs: ["houses:House Harkonnen", "houses:House Atreides", "organizations:Sardaukar", "npcs:Dr. Wellington Yueh"],
      changes: [set("planets:Arrakis", "house", "House Harkonnen")] });
  ev(10191, "Paul and Jessica flee to the Fremen", "Paul and Jessica escape into the deep desert and are taken in by Stilgar's sietch, where Paul becomes Muad'Dib.",
    { seq: 30, refs: ["npcs:Paul Atreides", "npcs:Lady Jessica", "npcs:Stilgar", "organizations:Fremen"], changes: [set("npcs:Paul Atreides", "status", "In hiding with the Fremen")] });
  ev(10193, "The Battle of Arrakeen", "Paul's Fremen ride the sandworms through the Shield Wall and defeat the Emperor's Sardaukar. Paul retakes Arrakis and claims the throne through marriage to Irulan; Stilgar becomes governor of Arrakis.",
    { refs: ["npcs:Paul Atreides", "npcs:Stilgar", "npcs:Princess Irulan"],
      changes: [set("planets:Arrakis", "house", "House Atreides"),
        set("npcs:Paul Atreides", "status", "Emperor-to-be"), set("npcs:Stilgar", "status", "Governor of Arrakis")] });
  ev(10196, "Paul becomes Emperor", "Shaddam IV abdicates and is exiled to Salusa Secundus with Count Fenring. Paul becomes the 82nd Padishah Emperor and the Fremen jihad begins.",
    { refs: ["npcs:Padishah Emperor Shaddam IV", "npcs:Count Hasimir Fenring", "planets:Salusa Secundus"],
      changes: [set("npcs:Padishah Emperor Shaddam IV", "status", "Abdicated; exiled on Salusa Secundus"), set("npcs:Count Hasimir Fenring", "status", "Exiled on Salusa Secundus"), set("npcs:Paul Atreides", "status", "Padishah Emperor")] });
  ev(10208, "Muad'Dib's Jihad ends", "After twelve years the jihad ends, with a dozen rebellious worlds brought under Paul's rule.");
  ev(10210, "Paul walks into the desert", "Blinded, and with Chani dead, Paul walks into the deep desert as the Fremen law for the blind demands. Alia becomes regent for the twins.",
    { refs: ["npcs:Paul Atreides"], changes: [set("npcs:Paul Atreides", "status", "Vanished into the desert")] });
  ev(10219, "Leto II takes the throne", "Leto II, merged with the sandtrout skin that will turn him into a sandworm, ascends the throne and sets humanity on the Golden Path. Ghanima is betrothed to Farad'n Corrino.", { seq: 60 });
  ev(13728, "Leto II is killed", "Siona Atreides and a Duncan Idaho ghola kill the God Emperor; his empire falls apart.");
  ev(13750, "The first navigation machines", "Ixian machines break the Spacing Guild's monopoly on space travel.", { refs: ["planets:Ix", "organizations:Spacing Guild"] });
  ev(14000, "The Scattering begins", "Famine and unrest drive countless people out into unknown space in no-ships.", { circa: true });
  ev(15100, "The Honored Matres return", "The Lost Ones begin returning from the Scattering, among them the Honored Matres.", { circa: true });
  ev(15229, "Rakis is destroyed", "The Honored Matres destroy all life on Rakis (Arrakis), and its sandworms die out; the Bene Gesserit save one worm.",
    { refs: ["organizations:Bene Gesserit"], changes: [set("planets:Arrakis", "house", ""), set("planets:Arrakis", "note", "Destroyed by the Honored Matres")] });
  ev(15230, "The Honored Matres conquer Junction and Ecaz", "The Honored Matres take Junction and Ecaz, and begin destroying Bene Gesserit worlds.",
    { changes: [set("planets:Junction", "note", "Conquered by the Honored Matres"), set("planets:Ecaz", "note", "Conquered by the Honored Matres")] });

  // ---- lives: births, deaths and gholas. Years from Dune's Appendix IV (the Almanak en-Ashraf, as Wikipedia quotes it),
  // the Core rulebook's timeline (p.27), older versions of Wikipedia's character articles, and the novels themselves.
  // Where the sources disagree, the event keeps the novels' year and its text gives the other.
  // cite lists every source checked; an RPG page goes in src, otherwise the event links to the Wikipedia article
  const WPA = { "Baron Vladimir Harkonnen": "Vladimir_Harkonnen", "Count Hasimir Fenring": "Count_Fenring", "Duncan Idaho": "Duncan_Idaho", "Paul Atreides": "Paul_Atreides",
    "Lady Jessica": "Lady_Jessica", "Chani Kynes": "Chani_(character)", "Princess Irulan": "Princess_Irulan", "Reverend Mother Gaius Helen Mohiam": "Gaius_Helen_Mohiam", "Feyd-Rautha Harkonnen": "Feyd-Rautha" };
  const article = (name, refs) => /Alia/.test(name) ? "Alia_Atreides" : /Leto II/.test(name) ? "Leto_II_Atreides"
    : (refs || []).map((r) => WPA[r.slice(r.indexOf(":") + 1)]).find(Boolean) || "List_of_Dune_characters";
  const life = (year, name, text, kind, cite, o = {}) => ev(year, name, text, Object.assign({ kind, cite },
    /Core p\.27/.test(cite) ? { src: "Core p.27" } : { url: "https://en.wikipedia.org/wiki/" + article(name, o.refs), canon: "Wikipedia" }, o));
  const AP = "Dune, Appendix IV (via Wikipedia)", CORE = "Core p.27", OLDWP = "Wikipedia (2005–2007 character articles)";
  const ghola = (who, value) => set("npcs:" + who, "status", value);
  // births
  life(10110, "Baron Vladimir Harkonnen is born", "The future Siridar-Baron of Giedi Prime.", "birth", `${AP} · ${CORE}`, { refs: ["npcs:Baron Vladimir Harkonnen"] });
  life(10133, "Hasimir Fenring is born", "Shaddam's boyhood friend, a genetic near-Kwisatz Haderach. The Core rulebook (p.27) puts his birth in 10118, following the prequel novels.", "birth", `${AP} · ${OLDWP}`, { refs: ["npcs:Count Hasimir Fenring"] });
  life(10134, "Shaddam IV is born", "Son of Emperor Elrood IX. The Core rulebook (p.27) puts his birth in 10119, following the prequel novels, which call the appendix's year a misprint.", "birth", `${AP} · ${OLDWP}`, { refs: ["npcs:Padishah Emperor Shaddam IV"] });
  life(10140, "Leto Atreides is born", "Son of Duke Paulus Atreides; he becomes Duke when Paulus is killed in the bullring.", "birth", `${CORE} · ${OLDWP}`, { refs: ["npcs:Duke Leto Atreides"] });
  life(10141, "Stilgar is born", "Born in the deep desert; he rises to be naib of Sietch Tabr.", "birth", `${OLDWP} (from The Dune Encyclopedia)`, { refs: ["npcs:Stilgar"] });
  life(10191, "Alia Atreides is born", "Jessica's daughter, born eight months after her father's death. Exposed to the Water of Life in the womb, she is born fully aware, with the memories of her ancestors.", "birth", `${AP} · ${OLDWP}`, { seq: 90 });
  life(10192, "Paul's first son is born", "Chani bears Paul a son, named Leto after the dead Duke.", "birth", "Dune (Frank Herbert)", { circa: true, refs: ["npcs:Chani Kynes", "npcs:Paul Atreides"] });
  life(10210, "Leto II and Ghanima are born", "Chani gives birth to twins. Like Alia, they wake in the womb with their ancestors' memories. Sources put the birth anywhere from 10208 to 10210; this timeline keeps it with Chani's death.", "birth", "Dune Messiah (Frank Herbert) · Wikipedia", { seq: 40, refs: ["npcs:Chani Kynes", "npcs:Paul Atreides"] });
  // deaths
  life(10191, "Dr. Yueh is killed", "Having betrayed the Duke to free his wife, Yueh is killed on the Baron's orders by Piter de Vries.", "death", "Dune (Frank Herbert)", { seq: 21, refs: ["npcs:Piter de Vries"], changes: [dead("Dr. Wellington Yueh")] });
  life(10191, "Duke Leto Atreides dies", "A captive of the Baron, Leto bites down on the poison-gas tooth Yueh gave him. He misses the Baron but kills Piter de Vries with him.", "death", `Dune (Frank Herbert) · ${OLDWP}`, { seq: 22, refs: ["npcs:Baron Vladimir Harkonnen"], changes: [dead("Duke Leto Atreides")] });
  life(10191, "Piter de Vries dies", "The Baron's Mentat dies in the cloud of poison from Duke Leto's false tooth.", "death", "Dune (Frank Herbert) · Wikipedia", { seq: 23, refs: ["npcs:Piter de Vries", "npcs:Duke Leto Atreides"], changes: [dead("Piter de Vries")] });
  life(10191, "Duncan Idaho dies", "Duncan holds off the Sardaukar so Paul and Jessica can escape, and dies fighting.", "death", "Dune (Frank Herbert)", { seq: 32, refs: ["npcs:Duncan Idaho"], changes: [dead("Duncan Idaho")] });
  life(10191, "Jamis is killed by Paul", "Jamis challenges Paul to the death; Paul kills him, his first kill, and takes his place in the sietch.", "death", "Dune (Frank Herbert)", { seq: 33, refs: ["npcs:Paul Atreides", "npcs:Stilgar"] });
  life(10191, "Liet Kynes dies", "Left in the open desert by the Harkonnens, the Imperial planetologist dies when a spice blow erupts beneath him.", "death", "Dune (Frank Herbert)", { seq: 34, refs: ["npcs:Liet Kynes"], changes: [dead("Liet Kynes")] });
  life(10193, "Paul's first son is killed", "Sardaukar raid Sietch Tabr and kill the infant Leto.", "death", "Dune (Frank Herbert)", { seq: 10, refs: ["npcs:Chani Kynes", "organizations:Sardaukar"] });
  life(10193, "Thufir Hawat dies", "Ordered by the Emperor to kill Paul, the old Mentat takes poison rather than obey.", "death", "Dune (Frank Herbert) · Wikipedia", { seq: 51, refs: ["npcs:Thufir Hawat", "npcs:Paul Atreides"], changes: [dead("Thufir Hawat")] });
  life(10193, "Rabban is killed", "The Beast dies as the Fremen take Arrakeen.", "death", "Dune (Frank Herbert)", { seq: 52, changes: [dead("Glossu 'The Beast' Rabban")] });
  life(10193, "Alia kills the Baron", "Brought before the Emperor, the child Alia stabs her grandfather with a gom jabbar.", "death", `${AP} · Dune (Frank Herbert)`, { seq: 53, refs: ["npcs:Baron Vladimir Harkonnen"], changes: [dead("Baron Vladimir Harkonnen")] });
  life(10193, "Paul kills Feyd-Rautha", "Feyd-Rautha fights Paul in single combat as the Emperor's champion and dies.", "death", "Dune (Frank Herbert)", { seq: 60, refs: ["npcs:Feyd-Rautha Harkonnen", "npcs:Paul Atreides"], changes: [dead("Feyd-Rautha Harkonnen")] });
  life(10202, "Shaddam IV dies", "The deposed Emperor dies in exile on Salusa Secundus.", "death", `${AP} · ${OLDWP}`, { refs: ["npcs:Padishah Emperor Shaddam IV", "planets:Salusa Secundus"], changes: [dead("Padishah Emperor Shaddam IV")] });
  life(10210, "Chani dies in childbirth", "Poisoned by Irulan's contraceptives, Chani dies giving birth to the twins.", "death", "Dune Messiah (Frank Herbert) · Wikipedia", { seq: 41, refs: ["npcs:Chani Kynes", "npcs:Princess Irulan"], changes: [dead("Chani Kynes")] });
  life(10210, "The conspirators die", "Paul kills the Face Dancer Scytale. Reverend Mother Mohiam and the Guild Navigator Edric are executed on Alia's orders. An older version of Wikipedia dates the executions to 10207.", "death", `Dune Messiah (Frank Herbert) · ${OLDWP}`, { seq: 60, refs: ["npcs:Reverend Mother Gaius Helen Mohiam"], changes: [dead("Reverend Mother Gaius Helen Mohiam")] });
  life(10219, "Duncan Idaho dies again", "The ghola Duncan goads Stilgar into killing him, breaking Stilgar's tie to Alia.", "death", "Children of Dune (Frank Herbert)", { seq: 30, refs: ["npcs:Duncan Idaho", "npcs:Stilgar"], changes: [dead("Duncan Idaho")] });
  life(10219, "Paul is killed as the Preacher", "Paul has returned from the desert as a blind preacher who speaks against his own religion. He is killed on the steps of the temple in Arrakeen.", "death", "Children of Dune (Frank Herbert)", { seq: 40, refs: ["npcs:Paul Atreides"], changes: [dead("Paul Atreides")] });
  life(10219, "Alia takes her own life", "Possessed by the memory of the Baron, Alia throws herself from a window rather than live as Abomination.", "death", `Children of Dune (Frank Herbert) · ${OLDWP}`, { seq: 45, refs: ["npcs:Baron Vladimir Harkonnen"] });
  life(10225, "Count Fenring dies", "", "death", `${AP} · ${OLDWP}`, { refs: ["npcs:Count Hasimir Fenring"], changes: [dead("Count Hasimir Fenring")] });
  life(10228, "Stilgar dies", "", "death", `${OLDWP} (from The Dune Encyclopedia)`, { refs: ["npcs:Stilgar"], changes: [dead("Stilgar")] });
  life(10248, "Princess Irulan dies", "", "death", OLDWP, { refs: ["npcs:Princess Irulan"], changes: [dead("Princess Irulan")] });
  life(10256, "Lady Jessica dies", "She dies at 102.", "death", AP, { refs: ["npcs:Lady Jessica"], changes: [dead("Lady Jessica")] });
  life(13728, "Moneo dies with the God Emperor", "Leto II's majordomo falls with him from the bridge into the Idaho River.", "death", "God Emperor of Dune (Frank Herbert)", { seq: 60 });
  life(15229, "Miles Teg dies on Rakis", "The Bashar dies in the Honored Matres' attack on Rakis.", "death", "Heretics of Dune (Frank Herbert) · Wikipedia", { seq: 60 });
  // gholas: the dead, grown again from their cells in Tleilaxu axlotl tanks
  life(10208, "Hayt, a ghola of Duncan Idaho, is given to Paul", "The Tleilaxu grow Duncan from his cells and give him to Paul as a gift, a weapon meant to destroy him. Hayt has none of Duncan's memories.", "ghola", "Dune Messiah (Frank Herbert) · Wikipedia",
    { circa: true, refs: ["npcs:Duncan Idaho", "npcs:Paul Atreides"], changes: [ghola("Duncan Idaho", "Alive again as the ghola Hayt, without his memories")] });
  life(10210, "Hayt remembers he is Duncan Idaho", "Ordered to kill Paul, the ghola breaks his conditioning and wakes as Duncan, with all his memories. He later marries Alia.", "ghola", "Dune Messiah (Frank Herbert) · Wikipedia",
    { seq: 55, refs: ["npcs:Duncan Idaho"], changes: [ghola("Duncan Idaho", "Alive again as a ghola, with his memories")] });
  life(10220, "Leto II's Duncan Idaho gholas", "For his whole 3,500-year reign the Tleilaxu supply Leto II with ghola after ghola of Duncan Idaho, each commanding the Fish Speakers until it dies. Many die trying to kill him.", "ghola", "God Emperor of Dune (Frank Herbert) · Wikipedia",
    { circa: true, refs: ["npcs:Duncan Idaho"], changes: [ghola("Duncan Idaho", "Alive again as one of Leto II's gholas")] });
  life(15229, "The last Duncan Idaho ghola wakes", "Raised on Gammu by Miles Teg for the Bene Gesserit, a new Duncan ghola is woken to his memories, every one of them back to the first Duncan.", "ghola", "Heretics of Dune (Frank Herbert) · Wikipedia",
    { seq: 40, circa: true, refs: ["npcs:Duncan Idaho", "organizations:Bene Gesserit"] });
  life(15231, "Miles Teg is reborn as a ghola", "The Bene Gesserit grow Teg again from his cells and wake his memories so he can lead them against the Honored Matres.", "ghola", "Chapterhouse: Dune (Frank Herbert) · Wikipedia",
    { circa: true, refs: ["organizations:Bene Gesserit"] });
  life(15248, "The Baron returns as a ghola", "Face Dancers grow a ghola of Baron Harkonnen, 5,029 years after Alia's death. From Brian Herbert and Kevin J. Anderson's sequels, not Frank Herbert's novels.", "ghola", "Hunters of Dune (Brian Herbert & Kevin J. Anderson) · Wikipedia",
    { circa: true, refs: ["npcs:Baron Vladimir Harkonnen"], changes: [ghola("Baron Vladimir Harkonnen", "Alive again as a ghola")] });
  life(15248, "Gholas of the Atreides are grown on the Ithaca", "Aboard the no-ship Ithaca, gholas are grown of Paul, Jessica, Alia, Leto II, Thufir Hawat, Stilgar, Dr. Yueh and others, to fight the final war. From Brian Herbert and Kevin J. Anderson's sequels, not Frank Herbert's novels.", "ghola", "Hunters of Dune and Sandworms of Dune (Brian Herbert & Kevin J. Anderson) · Wikipedia",
    { seq: 60, circa: true, refs: ["npcs:Paul Atreides", "npcs:Lady Jessica", "npcs:Thufir Hawat", "npcs:Stilgar", "npcs:Dr. Wellington Yueh"],
      changes: ["Paul Atreides", "Lady Jessica", "Thufir Hawat", "Stilgar", "Dr. Wellington Yueh"].map((w) => ghola(w, "Alive again as a ghola on the Ithaca")) });
  // the Core rulebook's timeline (p.27): the years before Dune
  life(10153, "House Harkonnen is granted Arrakis", "House Richese loses control of Arrakis and the Harkonnens receive it as a fief. The same year, the Imperial Planetologist Pardot Kynes is sent to Arrakis.", "house", CORE,
    { refs: ["houses:House Harkonnen", "planets:Arrakis"], changes: [set("planets:Arrakis", "house", "House Harkonnen")] });
  life(10166, "War between Ecaz and Moritani", "Sabotage of Ecaz's ecology is blamed on House Moritani, and the feud becomes open war until the Emperor steps in.", "battle", CORE, { refs: ["houses:House Ecaz", "houses:House Moritani"] });
  life(10174, "Gurney Halleck enters Atreides service", "", "character", CORE, { refs: ["npcs:Gurney Halleck", "houses:House Atreides"] });
  life(10175, "Ix is freed", "House Atreides frees Ix from the Tleilaxu, and House Vernius regains it under Rhombur.", "house", CORE, { seq: 60, refs: ["npcs:Earl Rhombur Vernius", "houses:House Vernius", "houses:House Atreides", "planets:Ix"] });

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
  R.forEach((e) => { e.kind = e.kind || KIND[e.name] || ""; });

  DB.add("events", R);
})();
