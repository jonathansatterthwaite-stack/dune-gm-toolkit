// Lore notes: background from the Dune novels, gathered from the Dune Wiki (dune.fandom.com) and written in our own
// words. They sit beside the RPG books' data and never replace it. Where a note disagrees with the RPG, it is marked
// as a conflict so you can pick which version your table uses.
//   Original     = Frank Herbert's novels and the glossary "Terminology of the Imperium"
//   Expanded     = the Brian Herbert & Kevin J. Anderson novels (Prelude to Dune, Heroes of Dune, Legends of Dune …)
//   Encyclopedia = The Dune Encyclopedia (1984), not canon
(function () {
  const DB = window.DUNE_DB;
  const W = (page) => "https://dune.fandom.com/wiki/" + page;
  const O = (text, page, conflict) => ({ text, canon: "Original", url: W(page), conflict: !!conflict });
  const X = (text, page, conflict) => ({ text, canon: "Expanded", url: W(page), conflict: !!conflict });
  const E = (text, page, conflict) => ({ text, canon: "Encyclopedia", url: W(page), conflict: !!conflict });

  DB.lore("planets", {
    Arrakis: [
      O("Third planet of the Canopus system. After the fall of Leto II it is renamed Rakis.", "Arrakis"),
    ],
    Caladan: [
      O("Besides fish and pundi rice, the wiki lists orchards, wine, pongi rice, paradan and whale fur among its products.", "Caladan"),
      O("Zen Hekiganshu and the Muadh Quran, kept alive by the rice farmers, were both popular there. Caladan's clocks run twenty-one minutes behind Arrakeen's.", "Caladan"),
    ],
    "Giedi Prime": [
      O("Orbits Ophiuchi B. A day lasts about 31 standard hours and a year about 2.6 standard years; little grows there. Much later it is renamed Gammu.", "Giedi_Prime"),
    ],
    Ix: [
      O("Named for being the ninth planet of its system (the Roman numeral IX misread as a name). With Richese, it escaped the worst of the Butlerian Jihad.", "Ix"),
    ],
    Junction: [
      O("The Guild's headquarters and the seat of its bank, with the only Navigator school. Its surface is almost all landing fields and Heighliner repair bays. The name is also used for other Guild worlds.", "Junction"),
    ],
    Kaitain: [
      O("The second capital of the Corrino Empire, after the court left Salusa Secundus. Above Shaddam IV's door is written: Law is the ultimate science.", "Kaitain"),
    ],
    Poritrin: [
      O("Third planet of Epsilon Alangue. The Core book puts it in Epsilon Ophiuchi instead.", "Poritrin", true),
      O("A quiet farming world. The Zensunni believed it was their homeworld, and Fremen songs remember it as their place of origin.", "Poritrin"),
    ],
    Richese: [
      O("Fourth planet of Eridani A. Ranked with Ix as supreme in machine culture, and known for miniaturization.", "Richese"),
    ],
    "Salusa Secundus": [
      O("Third planet of Gamma Waiping: the first Corrino homeworld, then a prison planet once the court moved to Kaitain. One of only two worlds where shigawire grows.", "Salusa_Secundus"),
    ],
    Tleilax: [
      O("The only planet of the Thalim system: an Earth-like world of manicured land, with the holy city of Bandalong and a renegade school that produces twisted Mentats.", "Tleilax"),
    ],
    "Wallach IX": [
      O("Ninth planet of the Laoujin system, home of the Mother School. Gaius Helen Mohiam ran the school there in 10191 AG.", "Wallach_IX"),
    ],
    Ecaz: [
      O("Fourth planet of Alpha Centauri B, nicknamed the sculptor's paradise for its thought-shaped fogwood. Also the source of elacca, semuta, verite, sapho and the hufuf vine that gives krimskel fiber.", "Ecaz"),
    ],
    Hagal: [
      O("The Jewel Planet is the second planet of Theta Shaowei. The Great Game calls it Hagal I, in its own Hagal system.", "Hagal", true),
      O("Famous for soostones and fire opals, and mined out by the time of Shaddam I; later emperors sat on a throne cut from a single piece of Hagal quartz.", "Hagal"),
    ],
    Grumman: [
      O("Second planet of the Niushe system and the ancestral home of House Moritani. Duncan Idaho says his sword was first blooded on Grumman, in the war against House Ginaz.", "Grumman"),
    ],
    Gamont: [
      O("Third planet of Niushe, famous for its hedonistic culture; Baron Harkonnen bought a slave there.", "Gamont"),
    ],
    Lankiveil: [
      O("A cold ocean world whose whale fur is prized by the very rich; a sect of Buddislam dominates. Abulurd Harkonnen governed it and took his wife's name, Rabban. His son Glossu was Count of Lankiveil until 10193 AG.", "Lankiveil"),
    ],
    Novebruns: [
      O("In Children of Dune, half of Novebruns is bought from the Metulli family for 321 liters of spice. The RPG gives the planet to House Novebruns.", "Novebruns", true),
    ],
    Ginaz: [
      X("Over nine-tenths ocean, with scattered sandy archipelagos; much like Old Earth in size and air. Ancestral home of House Ginaz, beaten by House Moritani in a War of Assassins.", "Ginaz"),
    ],
    Ipyr: [
      X("A lush, green world, the seat of Earl Memnon Thorvald. After he plotted to strike Caladan during the first rebellion against Paul (10194–10198 AG), Stilgar's Fremen sterilized the planet.", "Ipyr"),
    ],
    Artisia: [
      X("Taligari's capital, home of its Senate and the Ingravid Opera.", "Artisia"),
    ],
  });

  DB.lore("houses", {
    "House Atreides": [
      O("The wiki gives green, black and red as its colors and a red hawk as its symbol; its rulers are Dukes.", "House_Atreides"),
    ],
    "House Harkonnen": [
      O("The wiki gives blue and orange as its colors and a griffin as its crest; the films use a different design. The RPG uses red and black.", "House_Harkonnen", true),
    ],
    "House Corrino": [
      O("The wiki gives black, gray, bronze and gold as its colors, with the golden lion. The RPG uses gold and scarlet.", "House_Corrino", true),
      O("Named for the Battle of Corrin, which gave the family rule of the new Imperium; Salusa Secundus remained its personal fief.", "House_Corrino"),
    ],
    "House Ecaz": [
      X("Ruled by an Archduke. In Paul of Dune, House Plana and later House Xitan administer Ecaz.", "House_Ecaz"),
    ],
    "House Hagal": [
      E("The wiki gives a clamshell as its symbol. The Great Game uses a fan.", "House_Hagal", true),
      X("Allied itself with House Corrino: Emperor Elrood IX married Yvette Hagal in 10036 AG, and the House's influence waned after his death.", "House_Hagal"),
    ],
    "House Moritani": [
      O("A House Major of Grumman, with a long feud with House Ginaz that ended in Ginaz's defeat in a War of Assassins. Shaddam IV backed Moritani; the Atreides backed Ginaz.", "House_Moritani"),
    ],
    "House Richese": [
      X("Ruled by a Count; its symbol is the Lamp of Knowledge. Its colors may be green and gold, though the wiki isn't sure.", "House_Richese"),
    ],
    "House Vernius": [
      X("Colors purple, copper, silver and white, with a helix symbol; ruled by an Earl, who wears a fire-red Hagal ruby ring as his sign. Won the right to build the Guild's Heighliners after an economic war with House Richese.", "House_Vernius"),
    ],
    "House Wayku": [
      X("Once a House Major. All its planets were destroyed in the Third Coalsack War, and instead of exile on Tupile it found work with the Spacing Guild. Colors gray and black, with black uniforms.", "House_Wayku"),
    ],
    "House Alexin": [
      E("A Great House whose homeworld Pelouzen was made uninhabitable by atomics; the Landsraad granted it Poritrin in 4492 AG. The RPG makes it a House Major on Keres.", "House_Alexin", true),
      E("Fought a War of Assassins with House Maros that ended with both sides surrendering, the only one known to end in a tie.", "House_Alexin"),
    ],
    "House Maros": [
      E("Once held Poritrin.", "House_Maros"),
    ],
    "House Mutelli": [
      X("A House Major ruled by a Duke; Count Flambert Mutelli appears in Prelude to Dune. The original novels have a similar family, the Metulli, who sell half of Novebruns.", "House_Mutelli"),
    ],
    "House Taligari": [
      X("A House Major whose rulers are called Docents. Emperor Hyek Corrino II granted it nine fief planets, including Artisia and Zanovar.", "House_Taligari"),
    ],
    "House Thorvald": [
      X("A Great House of Ipyr ruled by an Earl, with indigo and yellow colors. Earl Memnon Thorvald's sister Firenza married Shaddam IV in 10187 AG, but bore him no heir and fell from favor.", "House_Thorvald"),
    ],
    "House Jongleur": [
      X("A House Minor aligned with House Fenring that trained the Imperium's troubadours. It fell into disgrace when some of its storytellers proved to be double agents.", "House_Jongleur"),
    ],
  });

  DB.lore("organizations", {
    "Swordmasters of Ginaz": [
      O("House Ginaz used crossed swords as its symbol and white and khaki as its colors. It was an ally of Duke Leto until House Moritani destroyed it in a War of Assassins.", "House_Ginaz"),
    ],
  });
})();
