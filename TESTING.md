# Testing Gridiron GM

From the repository root, run `node --test` with Node 22 or newer. There is no install step. Open `index.html` directly to run the game.

The runner discovers `tests/*.test.cjs`. The franchise suite uses the same schedule, standings, draft ordering, migration, affordability and morale functions as the browser. It also calls the existing contract and engine integration fixtures, including a release that would accelerate too much dead money, an actual offseason, the 12-team bracket and the saved recap.

The performance test runs 288 complete possession games on prepared rosters and fails at two seconds. This is an engine timing budget. For end-to-end browser timing, create a disposable franchise, open Schedule and time **Simulate to playoffs**. This runs the normal weekly hooks and saves once at the end. Timing individual weekly saves and screen redraws measures a different interaction. Results vary by device.

The 10,000-season test runs 2,880,000 scheduled matchups. It first plays 250 complete games for each of nine home/away strength combinations, then samples from those win probabilities for each fixture. Fixed seeds make failures reproducible. This tests schedule and strength balance with fixed roster tiers. It does not simulate ten thousand years of injuries, drafts and player development. A separate 400-game test checks passing/receiving totals, scoring events and repeatability play by play.

For persistent-franchise regression testing, run `node tests/multiseason-stress-qa-smoke.js`. It drafts, simulates, saves, and advances through five seasons, checks the 5 MiB save budget, and verifies season recaps and roster turnover.

Add tests by creating a `.test.cjs` file in `tests/`, importing `node:test` and `node:assert/strict`, and calling the production API. Supply a fixed seed when testing randomness. Assert outcomes such as identical touchdown totals for passers and receivers, not a duplicate implementation. New migrations should have fixtures for the old version, successful conversion, immutability and failure recovery.

For manual save checks use a disposable slot. Simulate one week, open Game Center, expand Play-by-play, save and reload. Compare the clock, score, team and down in the restored feed. Before a full season, check the original slot and any What If branch remain independently loadable.
