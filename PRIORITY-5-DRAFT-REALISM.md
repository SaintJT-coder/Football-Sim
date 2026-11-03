# Gridiron GM — Priority 5: Scouting, Combine & Draft Realism

Implemented as an additive, vanilla-JavaScript module. No framework, ES-module import, TypeScript, or build step. Existing draft-night cutscenes and menu navigation are retained.

## Files created or modified

| File | Action | Responsibility |
| --- | --- | --- |
| draft-realism.js | NEW | Seven-round class, hidden attributes, probabilistic public grades, combine, Pro Day, workouts, realistic pick trade evaluations, first-round fifth-year options, evaluation UI |
| tests/draft-priority5-smoke.js | NEW | No-dependency Node regression test covering 224 picks, scouting, transactions, options |
| frontoffice.js | UPDATED | Generates enough prospects, uses grade estimates, performs CPU need-weighted selections, completes all picks, creates rookie contracts |
| draft-scouting-advanced.js | UPDATED | Shares the front-office prospect pool, scouting/workout hooks, Combine navigation |
| engine.js | UPDATED | Settles fifth-year decisions before the season-end age/contract countdown |
| index.html | UPDATED | Adds Draft Combine tab and loads the new script before engine.js and frontoffice.js |

Load order:
- draft-scouting-advanced.js
- draft-realism.js
- simulation-presentation.js and engine.js (existing order retained)
- frontoffice.js
- draftnight.js (existing animation layer retained)
- contracts-advanced.js (may load later; gameplay actions occur after initialization)

## Core data model

Each prospect in state.frontOffice.prospects has true player values, revealed only when drafted, and an internal evaluation profile:

    prospect = {
      id: "rookie-2026-14",
      name: "Mason Porter",
      pos: "WR",
      rating: 78,           // internal true rating; NOT shown in public draft UI
      pot: 91,
      projection: 75,       // mutable public scouting estimate
      draftRealism: {
        version: 1,
        hiddenOverall: 78,
        trueAttributes: { speed: 87, catching: 81, routeRunning: 79 },
        initialError: -5,
        combine: null,
        proDay: null,
        scoutingAccuracy: 0.34,
        reviews: 0,
        gradeShift: 0
      }
    };

**Important implementation assumption:** this is a localStorage single-player simulator. True ratings are hidden from the in-game UI and scouting displays, but they still exist in browser memory and saves. A technically savvy player can inspect their own local save; preventing that would require a trusted backend.

The draft pick structure is unchanged:

    state.frontOffice.picks = [
      { id: "2026-1-1", round: 1, slot: 1, owner: 0, original: 0, used: false }
    ];

The generated class now contains 280 prospects for 224 picks (32 teams x 7 rounds), rather than 130 prospects for an impossible 224 selections.

First-round rookies get:

    rookie.rookieDraft = { year: 2026, round: 1, slot: 12 };
    rookie.draftFifthYear = {
      draftYear: 2026,
      optionYear: 2030,
      deadlineYear: 2028,
      deadlineWeek: 18,
      salary: 8.1,
      decided: false,
      exercised: null
    };

The standard four-year rookie contract remains in player.contractAdvanced. Exercising the option adds a fifth base-salary year and increments player.years once. Declining leaves the original contract intact. Unresolved decisions automatically resolve at the deadline according to the player's rating to prevent accidental lost years; the decision is idempotent.

## Scouting accuracy

Scouting estimate accuracy is driven by the team's scouting staff rating, the Owner Goals scouting facility tier, the number of Front Office scouting points spent, combine/Pro Day review, and private workouts. Each action improves the projected rating's closeness to the hidden true rating without revealing it exactly; public uncertainty narrows. Estimates are repeatable for the same player/save, not a new random roll on every screen rendering.

The combine provides 40-yard dash, vertical, bench, and shuttle results. Each player has stable measurements, and reviewing the same combine twice does not spend resources again. Pro Day adds separate evaluation variance and uses one of eight annual reviews. Private workouts add confidence and consume from eight annual opportunities. Combine review slots default to 24 per year.

## Draft-day pick trades

GM Draft Realism evaluates an offered package of unused draft picks using the existing pick-value curve, a positional-need multiplier, and a modest 8% AI acceptance margin. Player pick ownership is validated before any transfer, preventing duplicate or already-used pick swaps. Successful trades reassign pick.owner directly, so the current-draft clock and existing animations reflect the new team automatically.

For now this is a **pick-for-pick trade interaction**. The original Trade Center continues to support player/pick packages for the regular season. Autonomous AI-to-AI draft trading is not yet generated.

## CPU drafting

AI teams rank available prospects using inaccurate published scouting grades, positional need, potential, and a small deterministic variance. They no longer always know every prospect's true rating. An AI selection is made for every pick in the draft; auto-draft has been increased from a hard-coded 84-pick stop to all 224 available pick slots.

## Tunable balance

All newly introduced numbers are collected under GM Draft Realism CONFIG at the top of draft-realism.js. Default configuration includes:

- 7 rounds x 32 teams = 224 selections, plus at least 56 additional prospects
- Public grade initial possible error up to ±15 OVR, improving with evaluations
- Scouting confidence cap of 96%; reviews cannot guarantee perfect information
- Combine review budget 24, Pro Day budget 8, private workout budget 8
- AI pick-trade acceptance value threshold = requested value x 1.08
- First-round fifth-year salary = rookie salary x 1.4, minimum $5M
- Fifth-year manual option decision in the third season of the rookie deal, due by Week 18
- Automatic conservative exercise threshold of 77 OVR if no user choice is submitted

## Balance cautions

Large classes (280 prospects per year) increase localStorage file sizes. Prior drafts should no longer be kept in active state.frontOffice.prospects after the new season initializes; the draft log retains selection details. Heavy year-by-year draft histories can still grow save size, so JSON exports are recommended.

Accurate combine measurements do not always predict player success: true overall and play style also matter. Confidence tops out below 100%, keeping a degree of draft risk. The fifth-year rule is a simplified football franchise mechanic rather than an exact real-world NFL labor agreement.

## Safe browser console test

To inspect the evaluation code without modifying your live franchise:

    const clone = JSON.parse(JSON.stringify(state));
    clone.frontOffice ??= { prospects: [], picks: [], scouted: {} };
    const prospectPool = GMDraftRealism.generate(clone, clone.frontOffice.prospects);
    const prospect = prospectPool[0];
    console.log("Prospect count", prospectPool.length);
    console.log("Initial published grade", GMDraftRealism.publicGrade(prospect,clone));
    console.log("Combine report", GMDraftRealism.combine(prospect,clone));
    console.log("Pro Day", GMDraftRealism.proDay(prospect,clone));
    console.log("Grade after evaluation", GMDraftRealism.publicGrade(prospect,clone));

The clone is not saved. Do not paste developer-console changes into the real state unless you intend to keep them.

Run the automated test from a GitHub repository checkout:

    node tests/draft-priority5-smoke.js

## Integration verification

The full headless draft was executed with a synthetic 32-team, 960-player league: all 224 selections were completed, 224 rookies received four-year contracts, 32 first-round players received fifth-year eligibility, and the draft did not exhaust its pool. Targeted runtime checks confirmed scouting confidence, finite combine/Pro Day resources, pick transfers, and third-season fifth-year option decisions.

A full interactive browser/iPad playthrough and deployment check have not been performed.

**Priority 6 — League Narratives & Records — remains untouched by this change.**
