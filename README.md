# Dune GM Toolkit

A browser-based GM screen for **Dune: Adventures in the Imperium** (Modiphius, 2d20). There's nothing to install and no build step, and it works offline.

**To run it:** double-click `index.html`. Everything you do is saved in the browser's local storage, so it's still there after a refresh.

## What's in it

| Tab | What it does |
|---|---|
| **Header** | Shows the Threat and Momentum pools. Momentum is capped at 6, and anything over the cap is lost with a warning. It also has Undo, End scene (−1 Momentum, and Resist Defeat refreshes) and New session (sets starting Threat from the House type × number of players). |
| **Dice** | Rolls a full skill test: Skill + Drive, focus crits, Difficulty 0–5+, complication range 1–5, and up to 3 bonus d20 (paid with Momentum, Threat, or a mix). It covers the Determination auto-1 and re-roll, and assistants who add 1d20 each. It shows live odds of passing, then lets you bank or spend Momentum, buy off complications, and chain a contest. NPC mode pays from Threat. Press **R** to roll. |
| **Conflict** | Tracks each side's combatants, defeat tracks (skill + Quality of defensive assets), hits (2 + asset Quality, boosted with Momentum), and Resist Defeat (1 + Quality). It also handles Keep the Initiative, rounds, assets, complications, zones, and +3 minor NPCs at once. |
| **NPCs** | Generates Minor, Notable and Major NPCs by the Core rules (p.137, p.240) from 35 roles, including the Power and Pawns outsiders (Face Dancer, Ginaz swordmaster, Tleilaxu, Ixian, courtier, CHOAM). It can optionally swap in one of the six Power and Pawns drives. Save NPCs to a roster, roll for them, or drop them into a conflict. |
| **Characters** | A guided character creator for player characters (planned or quick-start), supporting characters (minor and notable, with their Momentum costs) and NPCs (minor, notable, major). It walks through concept, faction template, archetype, skills, focuses, talents, drives and statements, assets and finishing touches, and checks every creation rule live, telling you exactly what's left. It covers 32 archetypes (Core, *Sand and Dust* Fremen, *The Great Game* Guild), 10 faction templates with their mandatory talents, around 80 talents with short summaries, *Power and Pawns* drives, and NPC special abilities. "Auto-fill the rest" completes any character with valid picks. The live sheet lets you click a skill to roll it on the Dice tab, add the character to a conflict, or print it. Generated NPCs open in the creator with one click. |
| **Scene** | Holds the scene's traits (with ranks), example complications, notes, and extended tasks and peril clocks. |
| **House** | Runs *The Great Game*'s House management. The House sheet covers status level and its effects, Wealth, Resources, House skills, domains, spaces, roles, upkeep levels, holdings, traits and boons. A yearly session walks through news, income, events by status level, upkeep, ventures and end of year. Ventures roll House skill + the leader's drive, pay the cost, adjust status, and carry partial successes into next year. Every step is recorded in a House chronicle. |
| **Worlds** | Generators for planets and rival Houses (*The Great Game*), Fremen sietches (*Sand and Dust*), and desert terrain and hazards. A rival's skills can be rolled as House actions, hazards can be added to the scene, and a worm clock can be started on the Scene tab. |
| **Galaxy map** | A full-screen 3D map of the Known Universe, built with three.js. It shows a procedural spiral galaxy, and you zoom from the whole galaxy into the Imperium around Sol. About 20 canon systems are placed from Dune lore. Where a world orbits a real star (Arrakis/Canopus, Caladan/Delta Pavonis, Giedi Prime/36 Ophiuchi B, Kaitain/Alpha Piscium, Ix/Alkalurops, Ecaz/Alpha Centauri B and more), it sits at that star's real position. Worlds around invented stars get estimated positions, and each system is labelled "Real star" or "Estimated position". Click a star or search to fly there: the planet renders in a panel on the left and its details open on the right. Hovering shows distances from Sol and from the selected system. Each planet's look is editable, with 14 planet types, colours, sea level, ice, clouds, atmosphere, tilt, spin, moons, dunes, craters, gas bands, storms, city lights, lava and rings. You can save any look as your own type, and add systems and worlds. **Solar systems:** press "View solar system" (or double-click a star) to open the system. Its star sits at the centre, sized and coloured by spectral class, and lights its worlds as they move on animated orbits. Lore orbit numerals place each world (Arrakis III, Wallach IX), roughly following the Titius–Bode pattern (III ≈ 1 AU). Year lengths come from Kepler's law, using the star's mass. Empty orbits get stable, generated uncharted worlds (hot rocks inside, gas giants outside, sometimes an asteroid belt), and any of them can be charted with one click. Click a world to follow it; double-click empty space for the whole system. Time controls let you pause or run orbits at ×¼ to ×16. Orbit spacing is compressed for display. Press Esc to back out one level. |
| **Hooks** | Generates adventure seeds. Click any part of a seed to re-roll just that part. |
| **Reference** | Searchable rules summaries with book and page numbers: Core, *The Great Game*, *Power and Pawns* and *Sand and Dust*. |

Rules numbers (costs, bands, dice) follow the books. Descriptions and the planet, sietch, hazard, name and hook tables are written for this tool, so check the books for the official tables.

## Files

- `index.html` is the page itself. When you change a CSS or JS file, bump the `?v=` number so browsers load the new copy.
- `css/styles.css` handles the look, with a light and a dark theme that follow your OS setting.
- `js/data.js` holds the Core rules tables, NPC roles, names and hook tables.
- `js/expansions.js` holds the expansion data: House management costs and tables, planet, sietch and desert tables, court drives and outsider roles.
- `js/dice.js` is the dice engine and odds calculator. It doesn't touch the page.
- `js/app.js` is the core app and draws the main tabs. It exposes `window.GM` so other modules can add tabs.
- `js/house.js` is the House tab.
- `js/characters-data.js` holds archetypes, faction templates, talents and creation rules by character kind.
- `js/characters.js` is the Characters tab: the guided creator, rule checks, auto-fill, sheet and printing.
- `js/worlds.js` is the Worlds tab.
- `js/planets.js` holds the planet types, the procedural texture painter and the reusable 3D planet model.
- `js/galaxy-data.js` holds the canon star systems: real-star coordinates, estimated positions and lore notes.
- `js/galaxy.js` is the galaxy map: the galaxy scene, camera, panels, search and planet viewer.
- `js/vendor/three.min.js` is three.js r187, bundled so it loads without a server. `js/vendor/README.md` explains how to rebuild it.
- `[rulebooks]/` contains your PDFs, which the rules were checked against.
