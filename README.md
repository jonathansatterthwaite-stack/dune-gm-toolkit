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
| **Scene** | Holds the scene's traits (with ranks), example complications, notes, and extended tasks and peril clocks. |
| **House** | Runs *The Great Game*'s House management. The House sheet covers status level and its effects, Wealth, Resources, House skills, domains, spaces, roles, upkeep levels, holdings, traits and boons. A yearly session walks through news, income, events by status level, upkeep, ventures and end of year. Ventures roll House skill + the leader's drive, pay the cost, adjust status, and carry partial successes into next year. Every step is recorded in a House chronicle. |
| **Worlds** | Generators for planets and rival Houses (*The Great Game*), Fremen sietches (*Sand and Dust*), and desert terrain and hazards. A rival's skills can be rolled as House actions, hazards can be added to the scene, and a worm clock can be started on the Scene tab. |
| **Starmap** | A 3D map of your worlds, built with three.js. Drag to orbit, right-drag to pan, scroll to zoom, and click a world to fly to it. Each planet is painted procedurally with clouds, atmosphere glow, rings and moons. Pick from 14 planet types (desert, ocean, garden, forest, jungle, savanna, ice, volcanic, barren, toxic, industrial, storm, gas giant, ice giant). You can then tweak colours, sea level, ice caps, clouds, terrain scale, size, tilt, spin and moons, and toggle features: dunes, craters, gas bands, a great storm, city lights, lava and rings. Save any look as your own planet type. Worlds from the planet generator can be added straight to the map. |
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
- `js/worlds.js` is the Worlds tab.
- `js/planets.js` holds the planet types and the procedural texture painter.
- `js/starmap.js` is the Starmap tab: the three.js scene, camera controls and planet editor.
- `js/vendor/three.min.js` is three.js r187, bundled so it loads without a server. `js/vendor/README.md` explains how to rebuild it.
- `[rulebooks]/` contains your PDFs, which the rules were checked against.
