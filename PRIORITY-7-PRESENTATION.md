# Priority 7 — Presentation & Immersion

Gridiron GM / Football-Sim — additive vanilla JavaScript and CSS. Existing simulation data, league structure, localStorage saves, and prior modules are preserved.

## Files

| File | Change |
| --- | --- |
| presentation-immersion.js | NEW — three-question postgame press room, depth chart, medical report, and Year in Review |
| presentation-immersion.css | NEW — premium dark sports-game visuals, responsive mobile grids and status cards |
| tests/presentation-priority7-smoke.js | NEW — regression tests using built-in Node APIs |
| engine.js | Generates a unique postgame press conference each week, including byes |
| season-recap.js | Saves franchise trajectory and surprise stories before yearly stat reset |
| roster-rules.js | Honors selected starter order during actual gameplay |
| gridiron-saves.js | Prominent What If branches, comparisons to parent, return-to-parent control |
| index.html | Press Room navigation, CSS reference, final script loading |

## Press room

One optional three-question press conference is available after each simulated week. Questions reflect the latest score, the quarterback/locker room, and injuries or franchise goals. Answers have small configurable changes to fan happiness, media heat, owner security and relevant player morale.

Choices are one-time, in order, and visible before selection. The Meet the Press achievement is awarded after all three questions. Unanswered prior conferences are marked MISSED when another week is simulated rather than being silently discarded.

Press data is stored under state.immersionPress with active session, history, and processed week keys. All numerical balance settings are at the top of the new module in CONFIG.press. The game never forces a press response before playing another week.

## Depth chart

A new visually grouped OFFENSE, DEFENSE and SPECIAL TEAMS view displays player ratings, depth, fatigue and availability. START chooses a healthy active player and persists selection through GMFranchise.setDepth. The existing roster rules were fixed so saved order is reflected in real game team strength, not only the UI. IR, PUP, injured and practice-squad players are ineligible for permanent START actions; temporary elevations remain handled through the existing practice module.

## Injury report

A mobile-friendly injury screen displays OUT, DOUBTFUL, QUESTIONABLE, IR and PUP statuses; diagnosis, treatment, estimated recovery, reinjury risk and history. My Franchise / Entire League filters remain available. Existing medical treatment controls are reused, including conservative rehabilitation and surgery where applicable. This does not change injury simulation rules.

## Year in Review

The season recap receives a yearInReview snapshot before the game clears season statistics. It contains season record, prior wins, win differential, league ranking, All-Pro count, playoff results, championship outcome, grounded surprise storylines and franchise trajectory. The redesigned Year in Review has cinematic typography, big season numbers, playoff summaries, awards, stat leaders and a season selector. Prior recaps can still be rendered.

Trajectory labels include DYNASTY BUILDING, ON THE RISE, PLAYOFF CONTENDER, RETOOLING, KNOCKING ON THE DOOR and REBUILDING. The first saved year uses current results rather than inventing preseason projections.

## What If branches

Save Manager now emphasizes What If timelines with a main create button, distinct branch cards, an active-universe indicator, a parent label, and a comparison of year/week, cash and same-season wins. A RETURN TO ORIGINAL TIMELINE button uses the existing guarded load workflow. Branches continue using original v3 save keys and retain independent game state; no migration is needed.

## Module API

    GMImmersion.CONFIG
    GMImmersion.afterWeek(state)
    GMImmersion.respond(state,questionId,choiceId)
    GMImmersion.pressPage(state)
    GMImmersion.setStarter(state,position,playerId)
    GMImmersion.depthPage(state)
    GMImmersion.injuryPage(state)
    GMImmersion.yearReview(state,recap,previousRecap)
    GMImmersion.yearPage(state,selectedYear)

The new script loads last to wrap the existing view dispatcher rather than replacing game architecture.

## Safe browser console preview

    const cloned=JSON.parse(JSON.stringify(state));
    console.log('Press state:', GMImmersion.pressStore(cloned));
    console.log('QB depth:', GMImmersion.depthData(cloned,'QB').map(p=>p.name));
    console.log('Injury page preview:', GMImmersion.injuryPage(cloned).slice(0,200));
    console.log('Yearbook:', cloned.seasonRecaps?.length ?
      GMImmersion.yearReview(cloned,cloned.seasonRecaps[0],cloned.seasonRecaps[1]) :
      'Complete a season first');

This preview only alters a clone, not the active saved franchise.

## Regression test

    node tests/presentation-priority7-smoke.js

The smoke test covers three questions, once-only owner/morale effects, actual starter sorting, injury eligibility, yearbook creation, save branching, comparison and returning to parent. A separate full engine headless integration test completed 16 games in one week, archived all three press answers, and advanced to 2027 with a saved Year in Review.

## Balance and testing cautions

Press answer effects are deliberately small (generally ±1–3) to avoid easy owner-stat farming. Visual depth changes do not bypass medical or roster restrictions. The yearbook surprises only use measured performance; no fabricated baselines. What If comparisons are directional rather than a complete roster-by-roster alternate history.

Full live browser, iPhone/iPad touch, and deployed-site checks have not been performed. The code is committed and targeted headless runtime tests passed.

Priority 7 completes the seven-priority development prompt; the next useful work would be a holistic browser QA/deployment pass, not a new feature tier.
