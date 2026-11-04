# Gridiron GM — Priority 7: Franchise Immersion

Additive classic JavaScript and responsive CSS. The existing engine, roster rules, media system, owner system, season recaps and localStorage saves remain in use. No build step or new framework.

## Changed files

| File | Integration |
| --- | --- |
| presentation-immersion.js | Film Room, game-day depth chart, contextual press conferences, Year in Review and archive switching |
| presentation-immersion.css | Responsive scoreboards, quarter tables, film selector, alternate-timeline comparison |
| gridiron-saves.js | Safe parent snapshot on branching; compare wins, salaries/cash, roster average, injuries, titles, cap and owner confidence; dedicated What If Lab |
| season-recap.js | Detailed yearbook selector synchronized with premium Year in Review |
| index.html | Adds Game Center and What If Lab pages |
| tests/priority7-immersion-smoke.js | Node regression for press, depth, real game reports, historical recaps and branch isolation |

Priority 6 records, honors and Hall of Fame are retained, not overwritten.

## Functional design

### Press Room

The engine invokes GMImmersion.afterWeek(state) after completing a game week or league bye. Each week has three contextual questions: the result, leadership/healthy starter and a medical update or future plan. Answers have deterministic consequences for supporters, media pressure, owner job security and the relevant player's morale; the page now previews those effects. Only the relevant QB (the active healthy starter) is discussed.

One session can be answered only once. If left incomplete when the next week arrives, it is marked MISSED and archived. Related games can be opened directly in the Film Room.

    state.immersionPress = {
      version: 1,
      active: { key: "2026:1", questions: [], answers: [], completed: false },
      history: [],
      processed: ["2026:1"]
    };

API: GMImmersion.pressStore, openConference, afterWeek, respond, pressPage. Balance is set in GMImmersion.CONFIG.press. Values are bounded to 0–100, but repeatedly selecting the best fan responses could still saturate fan happiness over many seasons; this remains a balancing consideration.

### Film Room

The new Game Center route shows the recorded final scoreboard, quarter totals, game conditions, actual team yardage/turnovers/third downs, previously captured player spotlights, injury reports and postgame comments. Data comes from state.results and state.simPresentation.gameReports, deduplicated by year:week:home:away.

    state.immersionGameView = { year: 2026, id: "2026:1:0:1" };

API: GMImmersion.gameResults, selectGame, gameCenterPage.

The engine derives the final score and then distributes it across four quarters, so quarter scoring is a consistent presentation of the simulation, NOT a true play-by-play event log. Likewise, preexisting player spotlights are not fabricated per-game box scores. The media-report retention window limits how many years of individual film remain available; season recaps persist separately.

### Depth Chart

The premium Depth Chart uses the real GMFranchise.setDepth and GMRosterRules.depth APIs. It shows active starters, availability, fatigue-adjusted effective rating estimate, scheme fit and replacements. Starter selection rejects invalid positions, injured or unavailable players, players on IR/PUP or unpromoted practice-squad players. Selecting a new starter changes the actual depth chart; raw permanent overall ratings do not change.

API: GMImmersion.depthData, status, setStarter, depthPage.

### Season Yearbook

The cinematic Year in Review shows franchise trajectory, championship recap, league rank, stats and award highlights. The archived-season selector works for every retained season and the FULL STATISTICAL YEARBOOK button toggles to the detailed existing Season Recap. Both selectors remain synchronized through state.recapViewYear and the immersion selected-year setting.

API: GMImmersion.yearReview, yearPage and GMSeasonRecap.page.

### What If Lab

The existing GMSaveManager remains the only save manager. Forking now persists an exact parent snapshot before activating a new independent branch. Every branch has its own players, contracts, draft choices, owner state, scores, press conferences, history and future saves. Nested branches are permitted; each records branchOf in its metadata.

    // Persisted save metadata (example)
    { id: "branch-id", name: "What If: Trade the picks",
      year: 2026, week: 12, team: 0, branchOf: "original-slot-id" }

The comparison page shows original and alternate team records, cap, cash, average roster OVR with one decimal place, injured players, titles and job security. Different seasons are explicitly marked noncomparable for win totals.

API: GMSaveManager.branch, compare, labPage, activate, snapshot, exportSave.

Remember: the Save Manager is LOCAL to Safari or the browser. The original is preserved in localStorage, but it does not exist on a backend. Export the JSON to preserve save data against browser deletion, device loss or storage expiration. Browsing the What If Lab does not create or overwrite a save.

## Testing

To run the complete Priority 7 smoke test in a checkout:

    node tests/priority7-immersion-smoke.js

Tests cover healthy backup promotion and injured-starter rejection, real recorded film and quarter stats, press answer effects, missed and completed sessions, the cinematic/detailed yearbook selector, branch comparison accuracy, nested branches, and original-timeline isolation.

A separate headless full-engine test completed 16 games in Week 1, produced the corresponding Film Room tape and allowed all three press answers, with an archived conference. The outstanding Priority 6 headless offseason verification also passed: advancing to 2027 preserved the champion, MVP, All-Pro class and previous year's recap.

### Safe browser-console inspection

These commands inspect the currently open franchise without mutating the actual save:

    const copy = JSON.parse(JSON.stringify(state));
    console.log(GMImmersion.pressStore(copy));
    console.log(GMImmersion.gameResults(copy));
    console.log(GMImmersion.depthData(copy, 'QB'));
    console.log(GMSaveManager.index().length);

Do not call GMSaveManager.branch on a test copy: that action intentionally writes a real saved alternate universe. Use the What If Lab UI to create branches.

## Limits and scope

- Work is committed to the existing GitHub repo. A live production deployment was not independently verified in this task.
- Tests were run in a JavaScript VM and a headless engine, not a real iPad Safari or iPhone browser.
- The Film Room presents simulated score and stats; it is not an individual play-by-play tracker.
- No new backend, account sync, or cloud save service was introduced.
- All new Priority 7 tuning remains together in GMImmersion.CONFIG at the top of presentation-immersion.js.
- No Priority 8 or unrelated game feature was started.
