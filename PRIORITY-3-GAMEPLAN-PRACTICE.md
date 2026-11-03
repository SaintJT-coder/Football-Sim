# Gridiron GM — Priority 3: Weekly Game Plan & Practice Loop

Additive vanilla-JavaScript implementation, no framework, bundler, or TypeScript.

## Files changed

| File | Purpose |
| --- | --- |
| weekly-gameplan.js (new) | Central CONFIG; strategy, individual focus, squad elevations, matchup adjustments, trade market, reports, UI |
| tests/weekly-gameplan-priority3-smoke.js (new) | No-dependency regression tests |
| roster-rules.js | Temporarily elevated practice players are eligible and appear in depth charts |
| franchise-systems.js | Game-week focus and elevation bonuses add to effective simulated OVR, never permanently modify player.rating |
| engine.js | Start-of-week setup, matchup adjustments, postgame practice report and restoration |
| frontoffice.js | AI trade thresholds reflect team standings near Week 12 |
| index.html | Game Plan & Practice sidebar route and script tag |

The new module loads after roster-rules.js and before engine.js. It exposes window.GMWeeklyGameplan and registers on window.Gridiron.weeklyGameplan.

## Data model

Current-week data is stored inside state.weeklyOperations:

    {
      version: 1,
      season: 2026,
      plan: { offense: 'Balanced', defense: 'Balanced', target: 'Balanced' },
      plans: {
        '2026:5': { offense: 'Aggressive', defense: 'Balanced', target: 'Secondary' }
      },
      focuses: {
        '2026:5': [{
          playerId: 123,
          name: 'Example QB',
          mode: 'FILM',
          outcome: 'Gained 83 XP and +1 morale'
        }]
      },
      elevations: {
        '2026:5': [{
          playerId: 456,
          name: 'Example WR',
          pos: 'WR',
          replacingId: 789
        }]
      },
      elevationCounts: { '2026:456': 1 },
      reports: [{
        year: 2026, week: 5,
        playerId: 123, player: 'Example QB',
        playerPosition: 'QB', focuses: [], elevations: [], target: 'Secondary',
        notes: []
      }],
      processedWeek: '2026:5'
    }

Passing percentage and blitz rate use the existing state.coachingPhilosophy.weeklyPlan to prevent competing sources of truth. Temporary elevations set player.weeklyElevation, with original rosterStatus retained as PRACTICE; the flag is automatically cleared at the end of the week.

## Hooks and features

GMWeeklyGameplan.CONFIG contains balance constants at the beginning of weekly-gameplan.js.

- plan(state) and set(state, field, value): run/pass ratio, blitz frequency, offensive/defensive aggressiveness, and target unit.
- matchup(state, game, team): modest strength changes on user team's side; targets against a weak unit help, against a strong unit can hurt.
- focus(state, playerId, mode): uses existing GMDevelopment training points, costs 3, up to three players a week. TECHNIQUE gives +2 effective simulated OVR for the week, RECOVERY immediately restores up to 12 fatigue, FILM grants XP and +1 morale.
- elevate(state, playerId, injuredTeammateId): temporarily includes a healthy practice player in team game depth and playable eligibility; +1 effective simulated OVR. At most two per week, three per player per season.
- replacements(state), autoElevate(state): recommend/activate healthy same-position practice replacements for injured active players.
- beginWeek(state): reactivates this week's elevations and clears stale temporary flags.
- finishWeek(state, statsBefore): determines player of the week from measured game-stat increments; awards +2 morale; logs focus outcomes and elevations; removes game-day temporary eligibility.
- tradeTerms(state, opponentTeam): uses the opponent win percentage. Weeks 9–12: a rebuilding seller requires 0.93x the normal value while contenders require 1.12x; normal market outside that window. No trades after Week 12.

## Balance decisions

The underlying game engine estimates snaps and outcomes, rather than simulating individual practices or individual play calls. Accordingly, the selected practice focus modifies game effectiveness, fatigue or XP without rewriting raw attributes. The Player of the Week award is based on that week's in-game stats, not a separately simulated practice scrimmage.

Practice elevation is an *additional game-day eligibility slot*, not a permanent transaction and not a way to evade the active-roster limit. Moving a player between permanent roster lists still uses Roster Rules. User coaching strategy affects team scoring by small amounts, and new AI trade thresholds affect user-to-AI negotiation only, not autonomous CPU-to-CPU deals. These conservative defaults are intended to prevent unwanted roster or balance instability.

## Manual browser-console scenario (safe clone, no save())

    const test = JSON.parse(JSON.stringify(state));
    const GM = GMWeeklyGameplan;
    GM.set(test, 'offense', 'Aggressive');
    GM.set(test, 'target', 'Secondary');
    GM.set(test, 'passRatio', 60);
    console.log('Current game plan:', GM.plan(test));
    console.log('Practice points:', GMDevelopment.budget(test).points);
    const qb = test.players.find(p => p.team === test.team && p.pos === 'QB' && (p.rosterStatus||'ACTIVE') === 'ACTIVE');
    console.log('Focus:', GM.focus(test, qb.id, 'TECHNIQUE'));
    console.log('Temporary rating effect:', GM.playerBoost(qb, test));
    console.log('Injury replacements:', GM.replacements(test));
    console.log('AI trade threshold:', GM.tradeTerms(test, (test.team+1)%TEAMS.length));
    console.log('After training, actual save unchanged:', state.week === test.week);

To run a test from your repo checkout:

    node tests/weekly-gameplan-priority3-smoke.js

## Follow-up boundary

Priority 4 (advanced contract and agent personalities) is not included in this change. No existing contracts or cap data were rewritten.
