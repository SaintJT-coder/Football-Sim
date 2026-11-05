# Gridiron GM implementation guide

The ZIP contains the complete working source for each file below. Extract the entire folder and open index.html. All modules run as classic browser scripts, with no build step or runtime dependencies.

## 1. Play-by-play and season simulation

**Architecture.** possession-sim.js resolves downs, field position and clock and creates both the box score and scoring events. engine.js builds two teams from eligible depth charts, coaching, weekly game plan and health, then applies the result to the franchise.

**Files and code.** See [possession-sim.js](possession-sim.js), [engine.js](engine.js) and [presentation-immersion.js](presentation-immersion.js). The simulator API is `Gridiron.possessionSim.simulate({teams, weather, seed, onPlay})`. A seed repeats a game with identical input. The callback is optional.

**Integration.** Subscribe with `Gridiron.on('game:play', ({game, play}) => { /* consume play */ })`. The callback receives period, clock, offense team ID, down, distance, starting yard line, description and resulting score. Events fire synchronously as each snap resolves. Game Center displays the most recently captured franchise game's play list. Schedule's **Simulate to playoffs** runs the public weekly hooks through week 18, checkpoints the state, and performs one final render and save. Use the weekly button when making decisions between games.

**Edge cases.**

- Regulation ties proceed to overtime. The quarter score table includes overtime columns.
- A blocked kick, return score or safety changes the score through the same ledger as offensive scoring.
- Older game reports still render. Only the latest franchise play list is persisted to limit localStorage use.
- The 2-second performance target refers to the season shortcut. Saving and redrawing every individual week adds time.

## 2. Playoffs, standings and the draft

**Architecture.** [franchise-rules.js](franchise-rules.js) owns the schedule and pure standings functions. The engine and playoff screen share the seed calculation, and the next draft uses the completed regular season's ranking before results are cleared.

**Files and code.** See [engine.js](engine.js), [playoffs.js](playoffs.js) and [frontoffice.js](frontoffice.js). The APIs are `schedule(32)`, `standings(teams, games)`, `seeds(rows, games, conference)` and `draftOrder(rows, games)` on `Gridiron.franchiseRules`.

**Integration.** Each conference sends four division winners and two wild cards. Seeds 3 and 6 play, as do seeds 4 and 5. Seed 1 hosts the lower-ranked survivor, seed 2 hosts the other, and the two conference winners play at a neutral site. Existing championship, League History, Season Recap and celebration hooks receive the result. The existing broadcast plays when the user's franchise wins.

**Edge cases.**

- New 32-team schedules have 18 distinct opponents per team, one game per week, nine home games and nine road games.
- Equal winning percentages use head-to-head percentage among tied clubs when every club has played another club in the group. Then use division percentage, point differential and finally stable team ID.
- An old 17-game schedule can fill its empty week 9 if that week is still available. A legacy franchise already past it finishes the saved schedule and switches next season.
- Draft order determines original pick ownership. Trading a pick changes its owner. A new franchise without completed standings uses its initial draft order.

## 3. Save schema and migrations

**Architecture.** Save blobs have a numeric schemaVersion separate from slot IDs and JSON export-envelope versions. The loader regards an unversioned blob as v1, clones its data, and applies each registered transition to reach the current version. The included v1 → v2 migration initializes morale and handles eligible legacy schedules.

**Files and code.** See [franchise-rules.js](franchise-rules.js), [index.html](index.html), [gridiron-core.js](gridiron-core.js), [gridiron-saves.js](gridiron-saves.js) and [menu.js](menu.js). Use `GMFranchiseRules.migrate(data)` for strict conversion or `GMFranchiseRules.load(data, fresh)` for recoverable loading.

**Integration.** A plugin can register its schema transition in a small script loaded after franchise-rules.js and before the startup state is read. For example, `GMFranchiseRules.register(2, data => ({...data, scoutingNotes: data.scoutingNotes ?? []}))` registers the v2 → v3 step. Each global schema step has one owner. Register before loading a save and choose the next unused version.

**Edge cases.**

- A version gap, failed migration or unsupported future schema warns and falls back to a fresh franchise.
- Preserved zero morale remains zero. Missing morale gets the neutral starting value.
- A fallback marked as recovered is saved in a new named slot on snapshot to protect the original named slot.
- Invalid JSON or a structurally invalid file presented to the import dialog remains an import error.

## 4. Morale and chemistry

**Architecture.** Individual morale is a persisted 0–100 player field. Chemistry is the roster's mean morale, calculated when displayed. The weekly coaching and personality modules apply fit and trait effects, while the game engine applies workload, results and pay relative to a rating-based market estimate.

**Files and code.** See [franchise-rules.js](franchise-rules.js), [player-personality.js](player-personality.js), [coaching-philosophy.js](coaching-philosophy.js), [engine.js](engine.js) and [index.html](index.html). `mood(player, snaps, won, market)` calculates postgame morale. `moraleRating(morale)` calculates the adjustment to effective game rating.

**Integration.** Locker Room shows individual morale and team chemistry. Coaching Philosophy shows roster morale and updates players through existing weekly fit effects. Low morale amplifies the existing holdout and retirement risks. Above 75, morale adds at most two effective rating points and reduces injury exposure by seven percent.

**Edge cases.**

- Below 40 the penalty ramps to five points at zero. Exactly 40 and 75 have no rating adjustment.
- Injury and practice-squad absences are excluded from the new playing-time penalty.
- Morale carries into the offseason with the existing offseason recovery adjustment. Chemistry adds no second roster-wide rating modifier.

## 5. Contracts and automated tests

**Architecture.** Pure cap arithmetic, rankings and morale rules are directly importable by Node. The test runner also exercises the production contract and season transition modules together. No test libraries or package installation are required.

**Files and code.** See [tests/franchise-rules.test.cjs](tests/franchise-rules.test.cjs), [tests/possession-sim.test.cjs](tests/possession-sim.test.cjs), [contract-economy.js](contract-economy.js), [frontoffice.js](frontoffice.js), [freeagency.js](freeagency.js) and [contracts.js](contracts.js). Existing stress and integration fixtures in tests/ exercise the expanded schedule and bracket.

**Integration.** Run `node --test`. The suite checks per-team game counts, home/away balance, standings, draft order, affordability, blocked releases, migration recovery, morale, box-score conservation and the simulation budget. See [TESTING.md](TESTING.md) for the exact Monte Carlo method and how to add tests.

**Edge cases.**

- Signing multiple free agents books each contract before the next bid checks cap space. A release that would cause a current-year cap violation is rejected.
- If a rookie contract exceeds available room, the franchise retains the unsigned draft rights. The user can sign the player after freeing space, and AI teams retry weekly.
- Tests check transaction guards and intentionally retain the game's existing handling for imported or season-adjusted over-cap teams. The cap display exposes a deficit when one already exists.
- The default 10,000-season check resamples matchup outcomes from 2,250 full possession-engine games at three strength levels. It tests win distribution, separately from the multi-year franchise stress test and full-game timing test.
