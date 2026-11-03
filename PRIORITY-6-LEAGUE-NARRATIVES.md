# Gridiron GM — Priority 6: League Narratives & Records

**Implementation:** additive classic JavaScript, preserving current modules and localStorage saves. No bundler, framework or rewrite.

## Files created / changed

| Path | Status | Responsibility |
|---|---|---|
| league-narratives.js | NEW | League headlines, game/season/career/franchise records, position-specific award voting and Pro Bowl |
| franchise-relocation.js | NEW | Owner relocation approval, stadium deal choices, fan/media reactions and stable relocated franchise identities |
| tests/league-narratives-priority6-smoke.js | NEW | Node built-in VM regression test, no npm install |
| engine.js | UPDATED | Capture statistics before each game, update record book immediately afterward, generate weekly stories, finalize awards before stats reset |
| season-recap.js | UPDATED | Archive All-Pro, Pro Bowl voting, league stories and records |
| expansion.js | UPDATED | Add Relocation & Stadium to legacy side navigation |
| team-names.js | UPDATED | Respect relocated team identities alongside fictional, NFL-city and Riverside naming presets |
| index.html | UPDATED | New League Pulse & Records tab, module loading order and identity restoration on render |

## Data structures

### Records and media

Each save lazily gains:

    state.leagueNarratives = {
      version: 1,
      headlines: [
        { year: 2026, week: 5, kind: 'RIVALRY', message: '...', teams: [0, 1] }
      ],
      processedGames: ['2026:5:0:1'],
      processedWeeks: ['2026:5'],
      seasonRecords: {
        '2026:passYards': {
          value: 4200, year: 2026, week: 18,
          name: 'Example QB', playerId: 12, team: 0,
          pos: 'QB', kind: 'league season passYards'
        }
      },
      allTimeSeasonRecords: {}, // greatest single-season statistical total ever
      careerRecords: {},        // most career yards, sacks, etc.
      franchiseRecords: {},     // each team's season records
      gameRecords: {},          // single-game high marks across league
      recordEvents: [],
      honors: [
        {
          year: 2026, mvp: {}, offense: {}, defense: {}, rookie: {},
          allPro: [], proBowlByConference: [], votes: []
        }
      ]
    };

Player career totals accumulate in the existing-compatible player.careerStats object. The regular player.stats field remains the **current season only** and is reset by the existing offseason code. Each game uses a pregame snapshot to calculate the actual positive change in a player's statistics, then updates career/season records exactly once. Records also track their team, player, year and week.

The system intentionally does not fabricate historic career stats when an existing franchise save lacks them; it begins accumulating from the time Priority 6 is installed. Current-season records are nevertheless observed immediately after the first subsequent game.

### Relocation and stadium operations

    state.franchiseRelocation = {
      version: 1, team: 0, city: 'Portland',
      identity: { name: 'Portland Wolves', abbreviation: 'POR' },
      proposal: null,
      history: [
        {
          year: 2026, week: 4, kind: 'RELOCATION_APPROVED',
          city: 'Portland', fan: -9, media: 12, security: -3,
          message: '...'
        }
      ],
      lastDealYear: 2026
    };

Owner and fan reactions are written to state.ownerFranchise.{fanHappiness,mediaHeat,jobSecurity} and to state.news. Team IDs, divisions, rivalries, schedule assignments and player ownership remain unchanged when the public display name changes. After switching save slots, the rendering path restores the current save's identity instead of leaking a renamed team from another save.

## APIs and module hooks

### GMLeagueNarratives

- init(state): create or migrate the ledger.
- snap(state, game): capture each participant's cumulative stats before kickoff.
- afterGame(state, result, snapshot): idempotent game/career/franchise record updates and rivalry/statement/torch headlines.
- weekly(state): league quarterback race and coach hot-seat stories; at most once per simulated week.
- ballot(state): position-specific stats votes, team win rate, scarcity of roster slots. Raw overall only contributes to OL/K as a partial fallback because the game engine does not yet track meaningful blocking or kicking statistics.
- seasonEnd(state): award winners, All-Pro and Pro Bowl selections; persisted once per season.
- page(state): League Pulse & Records tab.

### GMRelocation

- init(state), applyTeamIdentity(state): preserve relocation across saves.
- propose(state, cityKey): charge feasibility study cost and generate media/fan pushback.
- decide(state, 'MOVE' | 'STAY'): owner approval, cash requirement and club identity update.
- stadiumDeal(state, 'RENOVATE' | 'PARTNERSHIP' | 'PRIVATE'): adjust stadium tier, owner confidence, fan happiness and media heat; one deal per season.
- page(state): Relocation & Stadium screen.

Existing modules keep their APIs intact. The engine invokes new methods after each match and at season end, and season-recap.js reads the finalized award snapshot.

## Balance defaults

All newly introduced tunables are grouped in CONFIG objects near the beginning of their modules.

| Setting | Default |
|---|---:|
| Award voter stats weight | 72% |
| Team win-rate weight | 20% |
| Positional competition weight | 8% |
| Close-game headline threshold | 3 points |
| Blowout headline threshold | 21 points |
| Coach hot seat | 35% win rate or lower after at least six games |
| Hot-seat check interval | Every 4 weeks |
| Relocation feasibility study | $5M |
| Relocation cost | $42M |
| Minimum owner job security to approve relocation | 35% |
| Stadium renovation | $18M, +1 tier, +5 fan happiness |
| Public-private partnership | $12M, +1 tier, media heat +10 |
| Privately funded stadium | $36M, +2 tiers, +9 fan happiness |

### Potential fun / balance issues

- **Award fairness:** OL and K lack complete role-specific stat production in the present engine. Their voting uses games played and part of their raw rating, rather than making up blocking or kicking production. Richer sim statistics can replace these proxies in a later release.
- **Headline spam:** Important events have distinct triggers. Headlines, record events and processed-game keys have caps to avoid endlessly expanding localStorage.
- **Relocation drama:** A move is expensive, requires owner support and reduces legacy fan approval. It does **not** automatically realign divisions, which would require rebuilding scheduling rules.
- **Career records on preexisting saves:** only new games are counted if earlier career totals were not previously recorded. This avoids invented statistics or double-counting older season totals.
- **All-time records:** allTimeSeasonRecords stores best single-season marks across different franchise seasons, distinct from each specific year's league leaders.

## Safe console scenario (cloned state)

Paste this while inside an active franchise. It never calls save():

    const test = JSON.parse(JSON.stringify(state));
    const game = { year: test.year, week: test.week, a: test.team,
      b: (test.team + 1) % TEAMS.length, sa: 31, sb: 28 };
    const before = GMLeagueNarratives.snap(test, game);
    const qb = test.players.find(p => p.team === test.team && p.pos === 'QB');
    qb.stats ??= {};
    qb.stats.passYards = (qb.stats.passYards || 0) + 320;
    qb.stats.games = (qb.stats.games || 0) + 1;
    console.log('Record updated:', GMLeagueNarratives.afterGame(test, game, before));
    console.log('Repeat does nothing:', GMLeagueNarratives.afterGame(test, game, before));
    console.log('Record book:', test.leagueNarratives.seasonRecords);
    console.log('Voting preview:', GMLeagueNarratives.ballot(test).mvp);
    console.log('Relocation proposal:', GMRelocation.propose(test, 'PORTLAND'));
    console.log('Fan reaction:', test.ownerFranchise.fanHappiness);

This console scenario modifies only the cloned franchise. Team-name display changes are triggered by calling GMRelocation.decide; the safe example intentionally stops at the proposal stage.

## Automated regression test

From a local checkout of Football-Sim:

    node tests/league-narratives-priority6-smoke.js

Tests validate game idempotence, cumulative career totals, single-season/all-time records, league honors, yearbook archival, relocation approval, stadium negotiations, save isolation and team-name preset compatibility.

## Verification / scope boundary

The actual game loop has been exercised in a headless 32-team/16-game synthetic league, including season rollover with honors and recaps. Core module tests for record idempotence, voting, relocation, and team identity also passed in an isolated JavaScript harness. **A real iPad/iPhone interactive browser playthrough and live deployed-site check have not yet been performed.**

**Priority 7 presentation features remain separate** and are not part of this change.
