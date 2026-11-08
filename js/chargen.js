// Guided character creation — walks a player through Core planned creation (p.108–125), or creation in
// play (p.132), one screen at a time. Rules, checks and auto-fill come from the Characters tab (G.chars).
(function () {
  const G = window.GM, D = window.DUNE, C = window.DUNE_CH, X = window.DUNE_X;
  const { esc, uid } = G;
  const H = () => G.chars;
  const SK = D.SKILLS;
  const CS = () => G.S.chars;
  const W = () => CS().wiz;
  const ch = () => CS().list.find((c) => c.id === W().id);
  const R = () => { G.save(); G.render(); };

  // ---------- reference text (written for this tool) ----------
  const SKILL_INFO = {
    Battle: "Fighting of every kind — blades, guns and bare hands — plus tactics and strategy, from a duel to a war.",
    Communicate: "Talking people round: persuasion, deceit, charm, intimidation and reading the room.",
    Discipline: "Willpower and self-control: keeping composure, resisting pressure, enduring hardship, precise work.",
    Move: "Physical action: agility, speed, stealth, climbing, driving and piloting.",
    Understand: "Knowledge and reasoning: lore, science, medicine, politics, and noticing what others miss.",
  };
  const DRIVE_INFO = {
    Duty: "Obligation to others — your House, family, people or oath.",
    Faith: "Belief in something greater: a religion, a cause, a prophecy, or yourself.",
    Justice: "Fairness, law, and setting wrongs right.",
    Power: "Gaining and using influence, wealth and control.",
    Truth: "Finding out what is real and refusing to be deceived.",
  };
  const GROUPS = [
    { key: "Battle", over: "Battle archetypes", title: "Warmasters", intro: "Fighters, soldiers and strategists. Some live for the blade, some never lift one, but all of them are lethal in their way.", src: "Core p.114" },
    { key: "Communicate", over: "Communicate archetypes", title: "Socialites", intro: "Leaders, diplomats and courtiers whose weapons are words, favors and reputation.", src: "Core p.115" },
    { key: "Discipline", over: "Discipline archetypes", title: "Disciples", intro: "Those who master themselves first: analysts, heralds, infiltrators and protectors.", src: "Core p.116" },
    { key: "Move", over: "Move archetypes", title: "Adepts", intro: "Athletes, messengers, scouts and smugglers who live by speed and skill of body.", src: "Core p.117" },
    { key: "Understand", over: "Understand archetypes", title: "Academics", intro: "Empaths, scholars, spies and strategists, for whom knowledge is the deadliest weapon.", src: "Core p.118" },
    { key: "Sand and Dust", over: "Sand and Dust", title: "Fremen of the Sietch", intro: "Templates for the free people of the deep desert: war-leaders, death commandos, priestesses and worm-riders.", src: "Sand and Dust p.58" },
    { key: "Great Game", over: "The Great Game", title: "Agents of the Guild", intro: "Spacing Guild specialists who serve the Guild before any House.", src: "Great Game p.72" },
  ];
  // [one-line description, drives that tend to suit them]
  const ARCH = {
    Duelist: ["A master of the blade — champion, bodyguard, gladiator or tutor to a House's young nobles.", "Justice won by the blade, or Faith in their own skill."],
    Sergeant: ["A hardened veteran who leads soldiers or mercenaries by example and earns their loyalty.", "Duty to the troops who follow them, or Justice."],
    Tactician: ["The officer who directs the fighting on the ground: cunning, resourceful and quick to see an opening.", "Power used properly, or Justice when the cause is right."],
    Warrior: ["The soldier, guard or mercenary who is the real force behind a House's might.", "Power in their own prowess, or Justice when they fight for a reason."],
    Commander: ["A leader of troops or agents, trusted to make the hard decisions and inspire others.", "Duty to those under them, or Power."],
    Envoy: ["The House's voice abroad, carrying messages and making deals far from home.", "Duty to the mission, or Truth."],
    Courtier: ["At home in the halls of the powerful, trading gossip and charm for influence.", "Power, or Truth about who really holds it."],
    Steward: ["Runs the estates, staff and affairs that keep a House working.", "Duty to the House, or Justice for those in their care."],
    Analyst: ["A patient, observant mind who sifts information for the patterns others miss.", "Truth above all, or Duty."],
    Herald: ["A proclaimer and representative whose word carries the House's authority.", "Duty, or Faith in what they announce."],
    Infiltrator: ["Gets in where they shouldn't — and out again unseen.", "Duty, or Power."],
    Protector: ["Stands between their charge and every danger, whatever the cost.", "Duty, or Faith in the one they guard."],
    Athlete: ["Strong, fast and enduring; at home where the body is tested.", "Faith in themselves, or Power."],
    Messenger: ["Carries word swiftly and surely, whatever lies in the way.", "Duty to deliver, or Truth."],
    Scout: ["Goes ahead into unknown ground and comes back with what lies there.", "Truth about the land, or Duty."],
    Smuggler: ["Moves what others want hidden past those who'd stop it.", "Power, or a Justice all their own."],
    Empath: ["Reads people deeply — their feelings, motives and lies.", "Truth, or Justice."],
    Scholar: ["A learned mind whose knowledge serves the House.", "Truth, or Faith."],
    Spy: ["Gathers the secrets a House needs, and hides its own.", "Truth, or Duty."],
    Strategist: ["Sees the whole board and plans many moves ahead.", "Power, or Justice."],
    Naib: ["The war-leader and protector of a sietch, toughest of all who dwell there.", "Duty to the sietch above all."],
    Fedaykin: ["One of the most dedicated Fremen fighters — a death commando.", "Justice for wrongs done to the Fremen, rooted in Faith."],
    Sayyadina: ["A Fremen priestess and wise woman, keeper of the tribe's lore and prophecy.", "Truth about the Fremen past."],
    "Sand Runner": ["A gifted worm-rider who carries word swiftly between the tribes.", "Duty to the tribes, or Faith."],
    Wali: ["A young, untested Fremen waiting for the chance to make their name.", "Faith in the Fremen way, or Power and recognition."],
    Ecologist: ["Works in secret on the dream of a green Arrakis.", "Faith that it can be done."],
    "Guild Engineer": ["Keeps the Guild's ships and foldspace machinery running.", "Duty to the Guild, or Truth."],
    "Guild Financier": ["Manages the Guild Bank's money and the debts of Houses.", "Power, or Duty."],
    "Guild Inspector": ["Checks cargo and manifests — and finds what's hidden.", "Truth, or Justice."],
    "Guild Scientist": ["Studies the mathematics and physics behind the Guild's monopoly.", "Truth."],
    "Guild Scout": ["Pilots ahead of the Heighliners into the unknown.", "Duty, or Truth."],
    "Guild Spy": ["Gathers intelligence wherever the Guild needs eyes.", "Duty to the Guild, or Power."],
  };
  // The book's own wording, when the full text has been built locally (tools/build-fulltext.js).
  function bookArch(name) {
    const ft = window.DUNE_FULLTEXT && window.DUNE_FULLTEXT.entries[`archetypes:${window.DUNE_DB ? DUNE_DB.slug(name) : ""}`];
    if (!ft || ft.how !== "section") return null;
    const paras = ft.text.split(/\n{2,}/).slice(1);
    const firstBullet = paras.findIndex((p) => p.startsWith("•"));
    const desc = (firstBullet < 0 ? paras : paras.slice(0, firstBullet)).join(" ");
    // the Drives bullet often wraps onto un-bulleted paragraphs: keep them together
    const di = paras.findIndex((p) => /^•\s*Drives:/.test(p));
    let drv = "";
    if (di >= 0) { const tail = []; for (let i = di + 1; i < paras.length && !paras[i].startsWith("•"); i++) tail.push(paras[i]); drv = [paras[di].replace(/^•\s*Drives:\s*/, "")].concat(tail).join(" "); }
    return desc ? { desc, drives: drv } : null;
  }

  // ---------- steps ----------
  const STEPS = [
    { key: "start", n: "One", title: "Concept", lead: "Who is your character, and what part do they play in your House?" },
    { key: "archetype", n: "Two", title: "Archetype", lead: "Pick the archetype that fits your concept. It sets your trait, your two best skills and suggests focuses and a talent." },
    { key: "skills", n: "Three", title: "Skills", lead: "Your archetype sets your starting skills. Now spend points to make the character yours." },
    { key: "focuses", n: "Four", title: "Focuses", lead: "Focuses are the specialities where your character really shines." },
    { key: "talents", n: "Five", title: "Talents", lead: "Talents are special tricks and training that bend the rules in your favor." },
    { key: "drives", n: "Six", title: "Drives", lead: "Drives are what your character believes in. Every test adds a drive's rating to a skill, so your beliefs shape how you succeed." },
    { key: "assets", n: "Seven", title: "Assets", lead: "Assets are the tools, contacts and leverage your character brings to the game." },
    { key: "finish", n: "Eight", title: "Finishing touches", lead: "A personal trait, an ambition, and the details that bring your character to life." },
    { key: "review", n: "Nine", title: "Review", lead: "Check everything over. You can jump back to any step." },
  ];
  function stepIssues(c) {
    const { v } = H().validate(c);
    const name = c.name.trim() ? [] : ["Give them a name."];
    const map = { start: name.concat(v.concept), archetype: v.archetype, skills: v.skills, focuses: v.focuses, talents: v.talents, drives: v.drives, assets: v.assets, finish: v.finish.filter((m) => m !== "Give them a name.") };
    map.review = Object.values(map).flat();
    return map;
  }

  // ---------- screen bodies ----------
  const quota = (c) => ({ focuses: c.kind === "quick" ? 2 : 4, talents: c.kind === "quick" ? 1 : 3 });
  const counter = (have, want, noun) => `<span class="cg-count ${have === want ? "ok" : have > want ? "over" : ""}">${have} of ${want} ${noun}</span>`;

  function screenStart(c) {
    const base = `chars.list.#${c.id}`;
    const facs = [{ name: "", trait: "", mandatory: [], book: "Core p.109", suggest: "", none: true }].concat(C.FACTIONS);
    return `<div class="cg-kinds">
        <button class="cg-kind ${c.kind === "pc" ? "on" : ""}" data-act="cgKind" data-k="pc"><b>Planned character</b><span>Build the full character now: archetype, skills, four focuses, three talents, drives and three assets.</span><i>Core p.108</i></button>
        <button class="cg-kind ${c.kind === "quick" ? "on" : ""}" data-act="cgKind" data-k="quick"><b>Create in play</b><span>Start with the essentials — two skills, two focuses, one talent, one drive — and fill in the rest as you play.</span><i>Core p.132</i></button>
      </div>
      <div class="cg-two">
        <label class="field">Name<input type="text" data-bind="${base}.name" value="${esc(c.name)}" placeholder="e.g. Kara Molay"/></label>
        <label class="field">Concept<input type="text" data-bind="${base}.concept" value="${esc(c.concept)}" placeholder="One line: who are they and what do they do for the House?"/></label>
      </div>
      <div class="cg-fitblock">
      <div class="cg-archbar">
        <h3 class="cg-sub">Faction template <span class="muted small">(optional)</span></h3>
        <div class="cg-arrows"><button class="btn small" data-act="cgScroll" data-strip="cgFacStrip" data-d="-1" aria-label="Scroll left">◀</button><button class="btn small" data-act="cgScroll" data-strip="cgFacStrip" data-d="1" aria-label="Scroll right">▶</button></div>
      </div>
      <p class="hint">Most characters are agents of their House. If yours trained with one of the great schools or factions, pick it here: you gain its trait and must take its talents.</p>
      <div class="cg-strip" id="cgFacStrip"><section class="cg-group">
        <div class="cg-banner"><div class="over">Step one</div><div class="title">Factions</div><p>Templates for characters shaped by the great schools and powers of the Imperium. Each adds a trait and required talents on top of your archetype.</p><span class="pg">Core p.109</span></div>
        ${facs.map((f) => facCard(f, c)).join("")}
      </section></div>
      </div>`;
  }
  const FAC_INFO = {
    "": "Most characters are agents of their House, trained in its service rather than by an outside school.",
    "Bene Gesserit": "Trained by the Sisterhood in prana-bindu control of body and mind, keen observation and the Voice.",
    Fremen: "Raised in the deep desert, hardened by water discipline and the ways of the sietch.",
    Mentat: "A human computer, trained to remember, calculate and reason beyond any forbidden machine.",
    "Spacing Guild": "An agent of the Guild that holds the monopoly on travel between the stars.",
    "Suk Doctor": "A physician of the Suk School, conditioned so deeply that they cannot do harm.",
    Sardaukar: "One of the Emperor's terror troops, forged on Salusa Secundus. Serves House Corrino alone.",
    "Tleilaxu Face Dancer": "A shapeshifter grown by the Bene Tleilax to infiltrate and impersonate.",
    "Ginaz Cadet": "A student of the Swordmasters of Ginaz, still on the path to mastery.",
    "Ginaz Swordmaster": "A full Swordmaster of Ginaz — among the finest blades in the Imperium.",
    "CHOAM Agent": "Serves two masters: the House, and the great trade combine that enriches it.",
  };
  // Tall entries like the book's faction pages: text above, the character standing below.
  // The art is extracted locally from your PDFs (tools/extract-art.py); elsewhere a drawn emblem stands in.
  function facCard(f, c) {
    const on = c.faction === f.name, title = f.none ? "House Agent" : f.name;
    const art = window.DUNE_ART && window.DUNE_ART.factions[f.name];
    const initials = title.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");
    return `<article class="cg-arch cg-facard ${on ? "on" : ""}" data-act="cgFaction" data-f="${esc(f.name)}" tabindex="0" role="button" aria-pressed="${on}">
      ${on ? `<span class="cg-stamp">Chosen</span>` : ""}
      <div class="cg-fac-text">
        <h4>${esc(title)}</h4>
        <p>${esc(FAC_INFO[f.name] || "")}</p>
        <ul class="cg-diamonds">
          <li><b>Additional Trait:</b> ${f.none ? "None" : esc(f.trait)}</li>
          <li><b>Suggested Archetypes:</b> ${f.none ? "Any" : esc(f.suggest)}</li>
          <li><b>Mandatory Talents:</b> ${f.none ? "None" : `${f.anyOf ? "One of " : ""}${esc(f.mandatory.join(", "))}${f.group ? `; ${esc(f.group.rule.replace(/^Master of Battle plus /, "plus "))}` : ""}`}</li>
        </ul>
      </div>
      <figure class="cg-fac-art">${art
        ? `<img src="${esc(art.src)}" width="${art.w}" height="${art.h}" alt="${esc(title)}" decoding="async" draggable="false"/>`
        : `<div class="cg-emblem" aria-hidden="true"><span>${esc(initials)}</span></div>`}</figure>
      <span class="pg">${esc(f.book)}${art ? ` · art: ${esc(art.caption)}` : ""}</span>
    </article>`;
  }

  // the local-only art manifest (window.DUNE_ART) is loaded by js/compendium.js, which re-renders this tab when it arrives

  function archCard(a, c, f) {
    const info = ARCH[a.name] || ["", ""], book = bookArch(a.name), on = c.archetype === a.name;
    const suits = f && f.suggest.split(/,\s*/).includes(a.name);
    return `<article class="cg-arch ${on ? "on" : ""}" data-act="cgArch" data-a="${esc(a.name)}" tabindex="0" role="button" aria-pressed="${on}">
      ${on ? `<span class="cg-stamp">Chosen</span>` : suits ? `<span class="cg-suits">Suits ${esc(f.name)}</span>` : ""}
      <h4>${esc(a.name)}</h4>
      <p>${esc(book ? book.desc : info[0])}</p>
      <ul class="cg-diamonds">
        <li><b>Trait:</b> ${esc(a.name)}</li>
        <li><b>Primary Skill:</b> ${a.primary}</li>
        <li><b>Secondary Skill:</b> ${a.secondary}</li>
        <li><b>Focuses:</b> ${esc(a.focuses.join(", "))}</li>
        <li><b>Talents:</b> ${esc(a.talents.join(", "))}</li>
        <li><b>Drives:</b> ${esc(book && book.drives ? book.drives : info[1])}</li>
      </ul>
    </article>`;
  }
  function screenArchetype(c) {
    const w = W(), f = H().fac(c.faction);
    const members = (g) => C.ARCHETYPES.filter((a) => (GROUPS.slice(0, 5).some((x) => x.key === g.key) ? a.book === "Core" && a.primary === g.key : a.book === g.key));
    const glance = `<table class="cg-glance"><thead><tr><th>Archetype</th><th>Primary skill</th><th>Secondary skill</th></tr></thead><tbody>
      ${C.ARCHETYPES.slice().sort((a, b) => a.name.localeCompare(b.name)).map((a) => `<tr class="${c.archetype === a.name ? "on" : ""}" data-act="cgArch" data-a="${esc(a.name)}"><td><b>${esc(a.name)}</b>${a.book !== "Core" ? ` <span class="muted small">${a.book === "Great Game" ? "GG" : "S&D"}</span>` : ""}</td><td>${a.primary}</td><td>${a.secondary}</td></tr>`).join("")}</tbody></table>`;
    return `<div class="cg-fitblock"><div class="cg-archbar">
        <div class="cg-jump">${GROUPS.map((g) => `<button class="chip" data-act="cgJump" data-g="${esc(g.key)}">${esc(g.title)}</button>`).join("")}</div>
        <div class="cg-arrows"><button class="btn small" data-act="cgGlance">${w.glance ? "Show the archetypes" : "Archetypes at a glance"}</button><button class="btn small" data-act="cgScroll" data-d="-1" aria-label="Scroll left">◀</button><button class="btn small" data-act="cgScroll" data-d="1" aria-label="Scroll right">▶</button></div>
      </div>
      ${w.glance ? glance : `<div class="cg-strip" id="cgStrip">${GROUPS.map((g) => `<section class="cg-group" data-g="${esc(g.key)}">
          <div class="cg-banner"><div class="over">${esc(g.over)}</div><div class="title">${esc(g.title)}</div><p>${esc(g.intro)}</p><span class="pg">${esc(g.src)}</span></div>
          ${members(g).map((a) => archCard(a, c, f)).join("")}
        </section>`).join("")}</div>`}</div>
        ${w.glance ? "" : `<p class="hint cg-strip-hint">Scroll sideways through the archetypes${window.DUNE_FULLTEXT ? " (descriptions from your copy of the books)" : ""}. Click one to choose it. Any archetype can be reflavoured to fit your concept — check with your gamemaster.</p>`}`;
  }

  function screenSkills(c) {
    const a = H().arch(c.archetype);
    if (!a) return `<p class="cg-need">Choose an archetype first — it sets your starting skills. <button class="btn small" data-act="cgGo" data-s="1">Go to Archetype</button></p>`;
    const base = (s) => (c.kind === "quick" ? (s === a.primary ? 7 : s === a.secondary ? 6 : 0) : s === a.primary ? 6 : s === a.secondary ? 5 : 4);
    const left = c.kind === "pc" ? 5 - (SK.reduce((n, s) => n + c.skills[s], 0) - 23) : 0;
    return `${c.kind === "pc" ? `<p class="cg-points"><b>${left}</b> point${left === 1 ? "" : "s"} left to spend <span class="muted small">· 5 in total, no skill above 8</span></p>` : `<p class="cg-points">Creating in play: <b>${a.primary} 7</b> and <b>${a.secondary} 6</b>. Your other skills are set the first time you need them.</p>`}
      <div class="cg-skills">${SK.map((s) => {
        const role = s === a.primary ? "Primary" : s === a.secondary ? "Secondary" : "";
        return `<div class="cg-skill ${role ? "key" : ""}">
          <div class="cg-skill-head"><b>${s}</b>${role ? `<span class="badge">${role}</span>` : ""}</div>
          <div class="cg-skill-v">${c.kind === "quick" && !c.skills[s] ? "—" : c.skills[s]}</div>
          ${c.kind === "pc" ? `<div class="stepper"><button data-act="cgSkill" data-s="${s}" data-d="-1" ${c.skills[s] <= base(s) ? "disabled" : ""} aria-label="Lower ${s}">−</button><button data-act="cgSkill" data-s="${s}" data-d="1" ${c.skills[s] >= 8 || left <= 0 ? "disabled" : ""} aria-label="Raise ${s}">+</button></div>` : ""}
          <p class="small">${esc(SKILL_INFO[s])}</p>
          <span class="muted small">Starts at ${base(s) || "—"}</span>
        </div>`;
      }).join("")}</div>`;
  }

  const allFocuses = (skill) => {
    const set = new Set(D.FOCUSES[skill] || []);
    // focuses that need a specialty are offered with the ones the books use ("Survival (Desert)"), never bare
    if (window.DUNE_DB) DUNE_DB.rows("focuses").forEach((f) => { if (f.skill !== skill) return; if (f.specify) f.examples.forEach((x) => set.add(`${f.name} (${x})`)); else set.add(f.name); });
    return Array.from(set).sort();
  };
  function screenFocuses(c) {
    const a = H().arch(c.archetype), w = W(), q = quota(c).focuses;
    const has = (n) => c.focuses.some((f) => f.name.toLowerCase() === n.toLowerCase());
    const sug = a ? a.focuses.map((n, i) => ({ s: i === 0 ? a.primary : a.secondary, n })) : [];
    if (!w.fskill) w.fskill = a ? a.primary : "Battle";
    return `<p>${counter(c.focuses.length, q, "focuses")}${a && c.kind === "pc" ? ` <span class="muted small">· at least one for ${a.primary}, your primary skill</span>` : ""}</p>
      <div class="chips cg-chosen">${c.focuses.map((f) => `<span class="chip on"><b>${esc(f.name)}</b>&nbsp;<span class="muted">${esc(f.skill)}</span><button data-act="chRm" data-list="focuses" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">×</button></span>`).join("") || `<span class="empty small">None chosen yet.</span>`}</div>
      ${sug.length ? `<h3 class="cg-sub">Suggested by your archetype</h3><div class="chips">${sug.map((x) => `<button class="chip cg-pick ${has(x.n) ? "on" : ""}" data-act="cgFocus" data-s="${esc(x.s)}" data-n="${esc(x.n)}">${has(x.n) ? "✓ " : "+ "}${esc(x.n)} <span class="muted">${esc(x.s)}</span></button>`).join("")}</div>` : ""}
      <h3 class="cg-sub">All focuses</h3>
      ${G.seg("chars.wiz.fskill", SK.map((s) => ({ v: s, l: s })))}
      <div class="chips cg-focus-list">${allFocuses(w.fskill).map((n) => `<button class="chip cg-pick ${has(n) ? "on" : ""}" data-act="cgFocus" data-s="${esc(w.fskill)}" data-n="${esc(n)}">${has(n) ? "✓ " : ""}${esc(n)}</button>`).join("")}</div>
      <div class="mini">${G.select("chars.nf.skill", SK)}<input type="text" placeholder="Or type your own, e.g. Music (Baliset)" data-bind="chars.nf.name" value="${esc(CS().nf.name)}"/><button class="btn small" data-act="chAddFocus">Add</button></div>
      <p class="hint">A focus helps on any test where it fits; the skill is just where it usually applies. Rolling at or under your skill with a focus scores two successes on that die.</p>`;
  }

  function talentCard(t, c, f) {
    const on = c.talents.some((x) => x.name === t.name), mand = f && f.mandatory.includes(t.name);
    return `<button class="cg-talent ${on ? "on" : ""}" data-act="cgTalent" data-n="${esc(t.name)}">
      <b>${on ? "✓ " : ""}${esc(t.name)}</b>${mand ? `<span class="badge npc">Required</span>` : ""}
      <span>${esc(t.text)}</span><i>${esc(t.book)}</i></button>`;
  }
  function screenTalents(c) {
    const a = H().arch(c.archetype), f = H().fac(c.faction), w = W(), q = quota(c).talents;
    const def = H().talentDef;
    const req = f ? f.mandatory.map(def).filter(Boolean) : [];
    const sug = (a ? a.talents : []).map((n) => def(n.replace(/\s*\(.*\)$/, ""))).filter((t) => t && !req.includes(t));
    const pool = C.TALENTS.filter((t) => (!t.faction || (f && t.faction === f.name)) && !req.includes(t) && !sug.includes(t));
    const qtext = (w.tq || "").toLowerCase();
    const list = pool.filter((t) => (w.tg === "core" ? t.book.startsWith("Core") : w.tg === "x" ? !t.book.startsWith("Core") : true) && (!qtext || (t.name + " " + t.text).toLowerCase().includes(qtext)));
    const chosen = c.talents.map((t) => { const d = def(t.name) || {}; return `<div class="ch-talent"><div><b>${esc(t.name)}</b>${d.param === "skill" ? ` ${G.select(`chars.list.#${c.id}.talents.#${t.id}.param`, [""].concat(SK).map((x) => ({ v: x, l: x || "choose a skill…" })))}` : d.param === "drive" ? ` ${G.select(`chars.list.#${c.id}.talents.#${t.id}.param`, [""].concat(c.driveNames).map((x) => ({ v: x, l: x || "choose a drive…" })))}` : d.param === "asset" ? ` ${G.select(`chars.list.#${c.id}.talents.#${t.id}.param`, ["dueling", "warfare", "espionage", "intrigue"])}` : ""}</div><button class="btn small ghost danger" data-act="chRm" data-list="talents" data-id="${t.id}" aria-label="Remove ${esc(t.name)}">×</button></div>`; }).join("");
    return `<p>${counter(c.talents.length, q, "talents")}${c.kind === "quick" ? ` <span class="muted small">· the other two are chosen in play</span>` : ""}</p>
      ${chosen ? `<div class="ch-talents">${chosen}</div>` : ""}
      ${req.length ? `<h3 class="cg-sub">Required by ${esc(f.name)}${f.anyOf ? " (take at least one)" : ""}</h3><div class="cg-talents">${req.map((t) => talentCard(t, c, f)).join("")}</div>` : ""}
      ${f && f.group ? `<p class="hint">${esc(f.group.rule)}.</p>` : ""}
      ${sug.length ? `<h3 class="cg-sub">Suggested by your archetype</h3><div class="cg-talents">${sug.map((t) => talentCard(t, c, f)).join("")}</div>` : ""}
      <h3 class="cg-sub">All talents you can take</h3>
      <div class="mini">${G.seg("chars.wiz.tg", [{ v: "all", l: "All" }, { v: "core", l: "Core" }, { v: "x", l: "Expansions" }])}<input type="search" placeholder="Search talents…" data-bind="chars.wiz.tq" data-live="1" value="${esc(w.tq || "")}" aria-label="Search talents"/></div>
      <div class="cg-talents">${list.map((t) => talentCard(t, c, f)).join("") || `<span class="empty small">No talents match.</span>`}</div>`;
  }

  function screenDrives(c) {
    const dv = H().drives(c), base = `chars.list.#${c.id}`;
    const ex = (n) => (D.STATEMENTS[n] || (X.COURT_DRIVES[n] || {}).statements || ["What do you believe?"]);
    const info = (n) => DRIVE_INFO[n] || (X.COURT_DRIVES[n] || {}).use || "";
    const ratings = c.kind === "quick" ? [8] : [8, 7, 6, 5, 4];
    return `<p class="hint">${c.kind === "quick" ? "Pick the one drive that matters most and rate it 8; write a statement for it. The rest are set in play." : "Give each drive a different rating from 8 down to 4. Click a rating — if another drive has it, the two swap. Drives at 6 or more need a statement: a short sentence about what your character believes."}</p>
      <div class="cg-drives">${c.driveNames.map((n, i) => `<div class="cg-drive ${dv[n] >= 6 ? "key" : ""}">
          <div class="cg-drive-head"><select data-bind="${base}.driveNames.${i}" aria-label="Drive">${H().ALL_DRIVES.map((x) => `<option ${n === x ? "selected" : ""}>${x}</option>`).join("")}</select>
            <div class="seg">${ratings.map((r) => `<button class="${dv[n] === r ? "on" : ""}" data-act="cgDrive" data-n="${esc(n)}" data-r="${r}">${r}</button>`).join("")}</div></div>
          <p class="small muted">${esc(info(n))}</p>
          ${dv[n] >= (c.kind === "quick" ? 8 : 6) ? `<input type="text" data-bind="${base}.statements.${n}" value="${esc(c.statements[n] || "")}" placeholder="${esc(ex(n)[0])}" aria-label="${esc(n)} statement"/>
            <div class="chips">${ex(n).slice(0, 3).map((s) => `<button class="chip cg-pick" data-act="cgStatement" data-n="${esc(n)}" data-t="${esc(s)}">${esc(s)}</button>`).join("")}</div>` : ""}
        </div>`).join("")}</div>
      <p class="hint">Power and Pawns adds Challenge, Glory, Hate, Honor, Indulgence and Love — swap one in with the drop-down if it suits your character better.</p>`;
  }

  function screenAssets(c) {
    const a = H().arch(c.archetype), qa = H().assetQuota(c), base = `chars.list.#${c.id}`;
    const ideas = a ? (C.ASSETS[a.primary] || []).concat(C.ASSETS[a.secondary] || []) : [];
    const book = window.DUNE_DB ? DUNE_DB.rows("assets").filter((x) => x.cat === "Personal") : [];
    const has = (n) => c.assets.some((x) => x.name === n);
    return `<p>${counter(c.assets.length, qa, "assets")}${c.kind === "pc" ? ` <span class="muted small">· at least one tangible — something you can hold or command</span>` : ""}</p>
      <div class="ch-talents">${c.assets.map((x) => `<div class="ch-talent"><div><input type="text" data-bind="${base}.assets.#${x.id}.name" value="${esc(x.name)}" style="min-width:160px" aria-label="Asset name"/>
        <label class="check small" style="display:inline-flex;margin:0 0 0 0.4rem"><input type="checkbox" data-bind="${base}.assets.#${x.id}.tangible" data-type="bool" ${x.tangible ? "checked" : ""}/> Tangible</label></div>
        <button class="btn small ghost danger" data-act="chRm" data-list="assets" data-id="${x.id}" aria-label="Remove ${esc(x.name)}">×</button></div>`).join("") || `<span class="empty small">None chosen yet.</span>`}</div>
      ${ideas.length ? `<h3 class="cg-sub">Ideas for a ${esc(a.name)}</h3><div class="chips">${ideas.map(([n, t]) => `<button class="chip cg-pick ${has(n) ? "on" : ""}" data-act="cgAsset" data-n="${esc(n)}" data-t="${t ? 1 : 0}">${has(n) ? "✓ " : "+ "}${esc(n)} <span class="muted">${t ? "tangible" : "intangible"}</span></button>`).join("")}</div>` : ""}
      ${book.length ? `<h3 class="cg-sub">Personal gear from the books</h3><div class="chips">${book.map((x) => `<button class="chip cg-pick ${has(x.name) ? "on" : ""}" data-act="cgAsset" data-n="${esc(x.name)}" data-t="1" title="${esc(x.text)}">${has(x.name) ? "✓ " : "+ "}${esc(x.name)}</button>`).join("")}</div>` : ""}
      <div class="mini"><input type="text" placeholder="Or name your own: a favor, a contact, a ship…" data-bind="chars.na.name" value="${esc(CS().na.name)}"/><label class="check small" style="margin:0"><input type="checkbox" data-bind="chars.na.tangible" data-type="bool" ${CS().na.tangible ? "checked" : ""}/> Tangible</label><button class="btn small" data-act="chAddAsset">Add</button></div>
      <p class="hint">Improved Resources gives one more asset and Specialist two more.</p>`;
  }

  function screenFinish(c) {
    const base = `chars.list.#${c.id}`, best = H().bestDrive(c);
    const amb = C.AMBITIONS[best] || C.AMBITIONS.Duty || [];
    return `<div class="cg-two">
        <div><label class="field">Personal trait<input type="text" data-bind="${base}.traits.personal" value="${esc(c.traits.personal)}" placeholder="A reputation or personality: Ruthless, Kind, Ambitious…"/></label>
          <div class="chips">${D.REPUTATION.slice(0, 10).map((t) => `<button class="chip cg-pick" data-act="cgSet" data-k="traits.personal" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>
        <div><label class="field">Ambition <span class="muted small">(tied to your highest drive, ${esc(best)})</span><input type="text" data-bind="${base}.ambition" value="${esc(c.ambition)}" placeholder="${esc(amb[0] || "What does your character want most?")}"/></label>
          <div class="chips">${amb.slice(0, 4).map((t) => `<button class="chip cg-pick" data-act="cgSet" data-k="ambition" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div></div>
      </div>
      <div class="cg-two">
        <label class="field">Appearance<textarea data-bind="${base}.details.appearance" rows="3">${esc(c.details.appearance)}</textarea></label>
        <label class="field">Personality<textarea data-bind="${base}.details.personality" rows="3">${esc(c.details.personality)}</textarea></label>
        <label class="field">Relationships<textarea data-bind="${base}.details.relationships" rows="3" placeholder="Who in the House do they trust, owe, or resent?">${esc(c.details.relationships)}</textarea></label>
        <label class="field">Notes<textarea data-bind="${base}.details.notes" rows="3">${esc(c.details.notes)}</textarea></label>
      </div>`;
  }

  function screenReview(c, iss) {
    const todo = STEPS.slice(0, -1).filter((s) => iss[s.key].length);
    return `<div class="cg-review">
        <div>${todo.length ? `<div class="cg-todo"><b>Still to do</b>${todo.map((s) => `<div class="cg-todo-row"><button class="db-link" data-act="cgGo" data-s="${STEPS.indexOf(s)}">${STEPS.indexOf(s) + 1}. ${esc(s.title)}</button><ul class="ch-issues">${iss[s.key].map((m) => `<li>${esc(m)}</li>`).join("")}</ul></div>`).join("")}</div>`
          : `<p class="ch-ready cg-ready">Ready to play — every creation rule checks out.</p>`}
          <div class="c-actions"><button class="btn primary" data-act="cgDone">Finish</button><button class="btn" data-act="chPrint">Print sheet</button>${todo.length ? `<button class="btn" data-act="cgAuto">Fill in the rest for me</button>` : ""}</div></div>
        <div class="card ch-side">${H().sheetHTML(c)}</div>
      </div>`;
  }

  // ---------- the view ----------
  const BODY = { start: screenStart, archetype: screenArchetype, skills: screenSkills, focuses: screenFocuses, talents: screenTalents, drives: screenDrives, assets: screenAssets, finish: screenFinish, review: screenReview };
  function view() {
    const c = ch(), w = W(), iss = stepIssues(c), step = STEPS[w.step] || STEPS[0];
    CS().sel = c.id;
    const bar = `<nav class="cg-steps" aria-label="Creation steps">${STEPS.map((s, i) => `<button class="${i === w.step ? "on" : ""} ${s.key !== "review" && !iss[s.key].length ? "done" : ""}" data-act="cgGo" data-s="${i}" aria-current="${i === w.step ? "step" : "false"}"><span class="n">${s.key !== "review" && !iss[s.key].length && i !== w.step ? "✓" : i + 1}</span><span class="t">${esc(s.title)}</span></button>`).join("")}</nav>`;
    const msgs = step.key === "review" ? [] : iss[step.key];
    const prev = STEPS[w.step - 1], next = STEPS[w.step + 1];
    return `<div class="cg-wrap">
      <div class="cg-top"><div><span class="muted small">Guided creation · ${c.kind === "quick" ? "creating in play" : "planned character"}</span><h2>${esc(c.name || "New character")}${c.archetype ? ` <span class="muted">· ${esc(c.archetype)}</span>` : ""}</h2></div>
        <div class="c-actions"><button class="btn small" data-act="cgExit" title="Keep the character and open it in the full editor">Open in the full editor</button></div></div>
      ${bar}
      <section class="card cg-screen">
        <header class="cg-h"><div class="over">Step ${step.n}</div><h2>${esc(step.title)}</h2><p>${esc(step.lead)}</p></header>
        ${msgs.length ? `<ul class="ch-issues">${msgs.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>` : ""}
        ${BODY[step.key](c, iss)}
      </section>
      <div class="cg-nav">
        ${prev ? `<button class="btn" data-act="cgGo" data-s="${w.step - 1}">← ${esc(prev.title)}</button>` : `<button class="btn ghost" data-act="cgCancel">Cancel</button>`}
        ${next ? `<button class="btn primary" data-act="cgGo" data-s="${w.step + 1}">Next: ${esc(next.title)} →</button>` : `<button class="btn primary" data-act="cgDone">Finish</button>`}
      </div>
    </div>`;
  }
  G.chargen = { view };
  document.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".cg-arch[data-act]")) { e.preventDefault(); e.target.click(); }
  });

  // keep the archetype strip where it was across re-renders, and bring the chosen card into view
  let stripLeft = {}, scrollToChosen = false, scrollTop = false;
  G.afterRender.push((tab) => {
    if (tab !== "characters" || !CS().wiz) return;
    fitStrips();   // size the strips first, so card positions are final before scrolling to one
    document.querySelectorAll(".cg-strip").forEach((strip) => {
      if (stripLeft[strip.id] != null) strip.scrollLeft = stripLeft[strip.id];
      else if (scrollToChosen) { const on = strip.querySelector(".cg-arch.on"); if (on && on.offsetLeft - strip.offsetLeft + on.offsetWidth > strip.clientWidth) strip.scrollLeft = on.offsetLeft - strip.offsetLeft - 16; }
    });
    if (scrollTop) {
      // on a fitted screen, open the Archetype step with its strip filling the view
      const block = STEPS[W().step].key === "archetype" && document.documentElement.classList.contains("cg-fit") && document.querySelector(".cg-fitblock");
      const box = areaBox();
      if (block) block.scrollIntoView({ block: "start" }); else if (box) box.scrollTop = 0; else window.scrollTo(0, 0);
    }
    stripLeft = {}; scrollToChosen = false; scrollTop = false;
  });
  // Leaving the wizard (or the tab) drops the wide, fitted layout.
  G.afterRender.push((tab) => { if (tab !== "characters" || !CS().wiz) fitStrips(); });

  // ---------- fit the strips to the screen ----------
  // Each strip and its controls (.cg-fitblock) fill the window under the sticky header, with Back/Next
  // pinned at the bottom; cards grow with the height. Only on screens big enough to make that worthwhile.
  const root = document.documentElement;
  // in the toolkit the creator fills its area (js/areas.js), so "the screen" is that area
  const areaBox = () => document.querySelector('.area[data-ed="characters"] .area-body');
  const headerH = () => { if (areaBox()) return areaBox().getBoundingClientRect().top; const h = document.querySelector(".topbar"); return h ? h.getBoundingClientRect().height : 0; };
  const viewW = () => (areaBox() ? areaBox().clientWidth : innerWidth);
  const viewH = () => (areaBox() ? areaBox().clientHeight : innerHeight);
  const viewBottom = () => (areaBox() ? areaBox().getBoundingClientRect().bottom : innerHeight);
  function fitStrips() {
    const on = G.visible("characters") && !!CS().wiz && !!document.querySelector(".cg-wrap");
    const fit = on && viewW() >= 900 && viewH() >= 600;
    root.classList.toggle("cg-on", on);
    root.classList.toggle("cg-fit", fit);
    const hh = areaBox() ? 0 : headerH();
    root.style.setProperty("--cg-header", hh + "px");
    const nav = document.querySelector(".cg-nav"), navH = nav ? nav.offsetHeight : 0;
    document.querySelectorAll(".cg-fitblock").forEach((b) => {
      const strip = b.querySelector(".cg-strip"); if (!strip) return;
      const cards = strip.querySelectorAll(".cg-arch:not(.cg-facard)");
      cards.forEach((card) => (card.style.flexBasis = ""));
      if (!fit) { strip.style.removeProperty("--h"); strip.style.removeProperty("--hn"); return; }
      const other = b.offsetHeight - strip.offsetHeight;   // the heading, buttons and hint above the strip
      const h = Math.max(440, Math.floor(viewH() - hh - navH - other - 20));
      strip.style.setProperty("--h", h + "px"); strip.style.setProperty("--hn", (h / 720).toFixed(3));
      // widen any archetype card whose text doesn't fit the height (long book descriptions), up to a limit
      cards.forEach((card) => {
        let w = card.offsetWidth, guard = 0;
        while (card.scrollHeight > card.clientHeight + 1 && w < 620 && guard++ < 14) { w += 30; card.style.flexBasis = w + "px"; }
      });
    });
  }
  let resizeT = 0;
  window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(fitStrips, 120); });

  // ---------- the mouse wheel scrolls a fitted strip sideways ----------
  // Only once the whole strip is on screen; at either end the wheel goes back to scrolling the page.
  function glide(strip, target) {
    strip._cgTarget = target;
    const finish = () => { cancelAnimationFrame(strip._cgAnim); if (strip._cgTarget != null) strip.scrollLeft = strip._cgTarget; strip._cgAnim = 0; strip._cgTarget = null; };
    // if the page isn't getting animation frames (a hidden window), jump straight there
    clearTimeout(strip._cgSafety);
    strip._cgSafety = setTimeout(() => { if (strip._cgAnim && performance.now() - (strip._cgLast || 0) > 90) finish(); }, 120);
    if (strip._cgAnim) return;
    strip._cgLast = performance.now();
    const step = () => {
      strip._cgLast = performance.now();
      const d = strip._cgTarget - strip.scrollLeft;
      if (Math.abs(d) < 0.6) return finish();
      strip.scrollLeft += d * 0.22;
      strip._cgAnim = requestAnimationFrame(step);
    };
    strip._cgAnim = requestAnimationFrame(step);
  }
  document.addEventListener("wheel", (e) => {
    if (!root.classList.contains("cg-fit") || e.ctrlKey) return;
    const strip = e.target.closest && e.target.closest(".cg-strip"); if (!strip) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;            // a trackpad's own sideways swipe
    const card = e.target.closest(".cg-arch");                      // let an overflowing card scroll its text first
    if (card && card.scrollHeight > card.clientHeight + 1 && ((e.deltaY < 0 && card.scrollTop > 0) || (e.deltaY > 0 && card.scrollTop + card.clientHeight < card.scrollHeight - 1))) return;
    const r = strip.getBoundingClientRect(), nav = document.querySelector(".cg-nav");
    if (r.top < headerH() - 2 || r.bottom > viewBottom() - (nav ? nav.offsetHeight : 0) + 2) return;   // not all on screen yet
    const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * strip.clientWidth : e.deltaY;
    const max = strip.scrollWidth - strip.clientWidth, from = strip._cgTarget != null ? strip._cgTarget : strip.scrollLeft;
    if ((dy < 0 && from <= 0) || (dy > 0 && from >= max - 1)) return;   // at an end: hand back to the page
    e.preventDefault();
    glide(strip, Math.max(0, Math.min(max, from + dy * 1.4)));
  }, { passive: false });
  const keepStrip = () => { stripLeft = {}; document.querySelectorAll(".cg-strip").forEach((s) => (stripLeft[s.id] = s.scrollLeft)); };

  // ---------- actions ----------
  const A = G.actions;
  A.cgStart = () => {
    const c = H().blank("pc"); CS().list.unshift(c); CS().sel = c.id;
    CS().wiz = { id: c.id, step: 0, fskill: "", tq: "", tg: "all", glance: false };
    G.S.tab = "characters"; scrollTop = true; R();
  };
  A.cgGo = (el) => { const w = W(); w.step = Math.max(0, Math.min(STEPS.length - 1, +el.dataset.s)); scrollTop = true; scrollToChosen = true; R(); };
  A.cgExit = () => { const id = W().id; CS().wiz = null; CS().sel = id; R(); };
  A.cgDone = () => { const c = ch(); CS().wiz = null; CS().sel = c.id; G.toast(`${c.name || "Your character"} is saved in the Characters list`); scrollTop = true; R(); };
  A.cgCancel = () => {
    const c = ch();
    const blankish = !c.name && !c.archetype && !c.focuses.length && !c.talents.length;
    if (!blankish && !confirm("Discard this character?")) return;
    CS().list = CS().list.filter((x) => x.id !== c.id); CS().wiz = null; CS().sel = ""; R();
  };
  A.cgKind = (el) => {
    const c = ch(), k = el.dataset.k; if (c.kind === k) return;
    c.kind = k; c.skills = H().blank(k).skills; if (c.archetype) H().applyArchetype(c);
    if (k === "quick") { c.drives = {}; } R();
  };
  A.cgFaction = (el) => { keepStrip(); const c = ch(), f = H().fac(el.dataset.f); c.faction = f ? f.name : ""; c.traits.faction = f ? f.trait : ""; R(); };
  A.cgArch = (el) => {
    const c = ch(); keepStrip();
    if (c.archetype === el.dataset.a) return R();
    const old = H().arch(c.archetype);
    c.archetype = el.dataset.a; H().applyArchetype(c);
    // swap the old archetype's suggestions for the new one's, keeping anything the player picked themselves
    if (old) { c.focuses = c.focuses.filter((f) => !old.focuses.includes(f.name)); c.talents = c.talents.filter((t) => !old.talents.includes(t.name)); }
    R();
  };
  A.cgJump = (el) => { const g = document.querySelector(`.cg-group[data-g="${CSS.escape(el.dataset.g)}"]`), s = document.getElementById("cgStrip"); if (g && s) s.scrollTo({ left: g.offsetLeft - s.offsetLeft, behavior: "smooth" }); };
  A.cgScroll = (el) => { const s = document.getElementById(el.dataset.strip || "cgStrip"); if (s) s.scrollBy({ left: +el.dataset.d * s.clientWidth * 0.85, behavior: "smooth" }); };
  A.cgGlance = () => { scrollToChosen = true; W().glance = !W().glance; R(); };
  A.cgSkill = (el) => {
    const c = ch(), a = H().arch(c.archetype), s = el.dataset.s, d = +el.dataset.d; if (!a) return;
    const base = s === a.primary ? 6 : s === a.secondary ? 5 : 4, left = 5 - (SK.reduce((n, x) => n + c.skills[x], 0) - 23);
    const v = c.skills[s] + d;
    if (v < base || v > 8 || (d > 0 && left <= 0)) return;
    c.skills[s] = v; R();
  };
  A.cgFocus = (el) => {
    const c = ch(), n = el.dataset.n, i = c.focuses.findIndex((f) => f.name.toLowerCase() === n.toLowerCase());
    if (i >= 0) c.focuses.splice(i, 1);
    else if (c.focuses.length >= quota(c).focuses) { G.toast(`You have ${quota(c).focuses} focuses already — remove one first`); return; }
    else c.focuses.push({ id: uid(), skill: el.dataset.s, name: n });
    R();
  };
  A.cgTalent = (el) => {
    const c = ch(), n = el.dataset.n, i = c.talents.findIndex((t) => t.name === n);
    if (i >= 0) { c.talents.splice(i, 1); return R(); }
    if (c.talents.length >= quota(c).talents) { G.toast(`You have ${quota(c).talents} talent${quota(c).talents > 1 ? "s" : ""} already — remove one first`); return; }
    const d = H().talentDef(n), a = H().arch(c.archetype);
    const m = a && a.talents.find((x) => x.startsWith(n + " ("));
    c.talents.push({ id: uid(), name: n, param: m ? m.match(/\((.*)\)/)[1] : d && d.param === "skill" ? (a ? a.primary : "") : d && d.param === "drive" ? H().bestDrive(c) : d && d.param === "asset" ? "dueling" : "" });
    R();
  };
  A.cgDrive = (el) => {
    const c = ch(), n = el.dataset.n, r = +el.dataset.r;
    if (c.kind === "quick") { c.driveNames.forEach((x) => { if (c.drives[x] === 8) c.drives[x] = 0; }); c.drives[n] = 8; return R(); }
    const other = c.driveNames.find((x) => x !== n && c.drives[x] === r);
    if (other) c.drives[other] = c.drives[n] || 0;
    c.drives[n] = r; R();
  };
  A.cgStatement = (el) => { ch().statements[el.dataset.n] = el.dataset.t; R(); };
  A.cgAsset = (el) => {
    const c = ch(), n = el.dataset.n, i = c.assets.findIndex((x) => x.name === n);
    if (i >= 0) c.assets.splice(i, 1); else c.assets.push({ id: uid(), name: n, tangible: el.dataset.t === "1", q: 0 });
    R();
  };
  A.cgSet = (el) => { G.setPath(`chars.list.#${ch().id}.${el.dataset.k}`, el.dataset.v); R(); };
  A.cgAuto = () => { const c = ch(); H().autofill(c); const { issues } = H().validate(c); G.toast(issues ? `Filled what I could — ${issues} item(s) still need you` : "Character complete"); R(); };
})();
