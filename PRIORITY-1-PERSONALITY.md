# Priority 1 — Player Personality, Play Styles & In-Season Progression

## Files created or changed

- NEW: player-personality.js — single CONFIG, player identity, modifiers, snap logs and weighted events.
- NEW: tests/personality-priority1-smoke.js — dependency-free Node smoke tests.
- UPDATED: player-development.js — personality/scheme/usage-informed XP; real participants earn game XP; Training Lab shows identity and last-game snaps.
- UPDATED: franchise-systems.js — small style bonuses in attribute-based OVR and simulated effectiveness.
- UPDATED: contracts-advanced.js — holdout and disgruntlement risk modifiers.
- UPDATED: engine.js — participation snaps, usage fatigue/injury, play-style weights, morale and event hooks; fixes numeric addition to the development object.
- UPDATED: index.html — loads player-personality.js after coaching and adds a Locker Room page.

## Data model

Each player now lazily receives:

    player.personalityProfile = {
      traits: ['Team Player', 'Gym Rat'], // two or three; stable across reloads
      playStyle: 'Pocket Passer',
      snaps: {
        year: 2026, season: 600, total: 600,
        last: { key: '2026:6:0:1', year: 2026, week: 6, count: 64, team: 0 },
        history: [{ year: 2026, week: 6, count: 64 }]
      },
      events: [{ year: 2026, week: 6, type: 'BREAKOUT', change: 1 }],
      lastEventYear: 2026,
      lastMoraleKey: '2026:6'
    }

The state retains state.playerProgressionEvents, a capped list of league-wide events.
Existing player.development, player.attributes, player.rating, and player.contractAdvanced remain independent.

## Design and balancing

All new tuning constants are grouped under GMPlayerPersonality.CONFIG at the start of player-personality.js.

- Personality provides XP, morale and holdout multipliers. Coach philosophy and measured scheme fit also affect each. XP multiplier is clamped to 0.78–1.25; weekly personality morale adjustment is clamped to -1/+1; holdout multiplier is clamped to 0.8–1.3.
- Play-style modifiers add roughly 0.9–1.5% to computed attribute-based OVR and 1.3–1.8% to matching simulation contexts. They do not permanently inflate player.rating, preventing repeated rating drift.
- Weekly breakout base probability is 0.35%, max 1.8%. Regression base is 0.25%, max 1.5%. Age, average snaps and scheme fit apply tunable weights. One mid-season event per player per season. Rating changes are 1–2 OVR.
- Snaps are **estimated** from position/depth, a team-level play count and the pass/run split. The current engine is not a play-by-play simulator; do not interpret these as actual per-play participation. Estimated counts drive game XP eligibility and modest usage-dependent XP, fatigue and injury risk.
- AI coaches default to the Balanced philosophy until the full AI coaching staff expansion in Priority 2. User-team head-coach philosophy is respected.
- Locker Room adds a new sidebar tab; Training Lab shows player identity and last-game snap counts.

### Balance risks and safer defaults

Too much weekly morale drift makes transactions feel arbitrary. The default personality morale change is capped at one point per week. Too many breakout rolls can create implausible rating inflation; the rate is low and capped at one event per player per year. Accumulated high-snap injury exposure could frustrate users; the additional injury probability is capped at 0.3% per game. The base simulation injury risk is separate. If injuries still feel frequent, lower CONFIG.usage.maxInjuryRisk.

## Browser console scenario (safe; uses a cloned state)

Paste this while inside a franchise:

    const testFranchise = JSON.parse(JSON.stringify(state));
    testFranchise.week = 6;
    const testGame = { a: testFranchise.team, b: (testFranchise.team + 1) % TEAMS.length };
    const testPlayer = testFranchise.players.find(p => p.team === testFranchise.team && p.pos === 'QB');
    console.log('Identity:', GMPlayerPersonality.ensure(testPlayer));
    console.log('XP / fit / holdout:', GMPlayerPersonality.factors(testPlayer, testFranchise));
    GMPlayerPersonality.recordGame(testFranchise, testGame, testFranchise.team, .55);
    console.log('Game snaps:', GMPlayerPersonality.snapsThisWeek(testPlayer, testFranchise));
    console.log('Event odds:', GMPlayerPersonality.odds(testPlayer, testFranchise));
    // Force a roll on the CLONED state only to verify the event integration:
    console.log('Test events:', GMPlayerPersonality.midseason(testFranchise, () => 0));
    console.log('Repeat events (expected empty):', GMPlayerPersonality.midseason(testFranchise, () => 0));

This does not call save() or modify the live franchise. A player who already had an event during that simulated year will not roll again. To run local tests from a cloned repository:

    node tests/personality-priority1-smoke.js

## Integration hooks

- GMDevelopment.gainXP(p, amount, state) applies the personality and scheme multiplier without changing the existing development trait system.
- GMDevelopment.weekly checks snapsThisWeek to prevent bench players getting starter XP.
- GMFranchise.overall and GMFranchise.effective apply play-style rating and on-field effectiveness, respectively.
- GMContractsAdvanced.weekly multiplies disgruntled/holdout rolls by holdoutMultiplier.
- The engine calls weeklyMorale before games; recordGame for each team during a game; and midseason after weekly XP.
- Player attributes and development state are never converted between numbers and objects in the new engine path.

## Follow-up boundary

Priority 2 (full coaching staff) is not implemented in this change. AI scheme and coaching affinities, assistants being poached, and owner/coach conflicts belong to that follow-up.
