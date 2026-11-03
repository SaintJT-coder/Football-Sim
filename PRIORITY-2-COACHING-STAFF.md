# Gridiron GM — Priority 2: Full Coaching Staff

This upgrade is additive vanilla JavaScript with no bundler.

## Changed files

- coaching-staff.js (new): OC, DC, STC and Strength & Conditioning Coach data, preferences, staff rating, development, hiring, retention, poaching and owner–coach conflict.
- tests/coaching-staff-priority2-smoke.js (new): no-dependency regression tests.
- index.html: new Coaching Staff navigation page and load order.
- coaching-philosophy.js: evaluates owner–coach conflict after a philosophy change.
- player-development.js: staff expertise and archetype affinities now modify XP.
- engine.js: staff effects on team strength, injuries, recovery and the offseason.

The load order is coaching-philosophy.js, coaching-staff.js, player-personality.js, then existing other systems, and engine.js after the staff module.

## Data model

Each franchise save lazily receives state.staffV2, with a teams object indexed by team number. Each team has offense, defense, special and strength coaches, each with a persistent id, name, role, ratings object, preferredSchemes array, playbook, affinities array, age, yearsCoaching, yearsOnStaff and retainedThrough. The league store also tracks staff movements, free agents, owner conflicts, season processed and offseason disruptions.

Existing state.staff and state.coachingPhilosophy fields are preserved.

## Public API

- GMStaff.CONFIG: centralized balance settings at the top of coaching-staff.js.
- GMStaff.init(state): add missing staff without replacing existing coaches.
- GMStaff.gameModifier(state, team, role): scheme, strategy and player development effectiveness in team simulation.
- GMStaff.developmentMultiplier(player, state): XP modifier using coordinator, scheme and archetype affinity.
- GMStaff.conditioning(player, state): fatigue recovery and injury risk.
- GMStaff.weekly(state): one ownership/alignment check per week.
- GMStaff.resolveConflict(state, choice): choice is owner, coach, or compromise.
- GMStaff.retain(state, role): retention bonus protects a coordinator next year.
- GMStaff.candidates(state, role): deterministic, three-candidate shortlist.
- GMStaff.hire(state, role, index): choose a new coach; cash cost.
- GMStaff.seasonEnd(state): once per season skill growth and optional coordinator poaching.

## Gameplay balance

All numbers are in GMStaff.CONFIG. Default XP multiplier is clamped to 0.80–1.15. Strong coordinators (minimum 82 overall) face low annual poaching probabilities, with no more than three league-wide transfers in a season. Losing a strong OC gives the team an interim replacement and a one-season penalty of -2.5 offensive strength points and 12% lower offensive development. A retention bonus paid in franchise cash protects the next season.

Coach ratings influence team simulation by roughly +/-2.3 team strength points, special-teams effects are smaller, and strength staff have capped injury/recovery effects. These conservative modifiers prevent staff from overwhelming player ratings or skill progression.

An ownership dispute can arise when a Win Now mandate conflicts with a Developmental coach, or when a young roster and developmental ownership clash with an Aggressive or Conservative philosophy. The Coaching Staff UI gives explicit consequences before selection: backing ownership gives job security +4 and team morale -2; backing the coach gives job security -4 and morale +3; compromise gives both +1. A conflict can be resolved only once.

## Console test (runs on a cloned state)

Paste inside an active franchise. The live save is not modified by this test.

    const test = JSON.parse(JSON.stringify(state));
    test.coachingPhilosophy ??= { headCoach: 'Developmental' };
    test.coachingPhilosophy.headCoach = 'Developmental';
    GMOwner.init(test).jobSecurity = 40;
    const crew = GMStaff.init(test);
    console.log('Roles:', Object.keys(crew.teams[test.team]));
    console.log('Owner conflict:', GMStaff.evaluateConflict(test));
    console.log('Offensive staff:', crew.teams[test.team].offense);
    const qb = test.players.find(p => p.team === test.team && p.pos === 'QB');
    console.log('QB development multiplier:', GMStaff.developmentMultiplier(qb, test));
    const oc = crew.teams[test.team].offense;
    Object.keys(oc.ratings).forEach(k => oc.ratings[k] = 95);
    console.log('Forced offseason transfers:', GMStaff.seasonEnd(test, () => 0));
    test.year++;
    console.log('Temporary OC disruption:', GMStaff.isDisrupted(test, test.team, 'offense'));

For local automated testing:

    node tests/coaching-staff-priority2-smoke.js

## Assumptions and limitations

The existing head coach continues to use coaching-philosophy.js rather than a separate head-coach hiring contract. Team strength rather than every individual play is adjusted; the game's underlying simulation is not yet play-by-play. AI head coaching strategies are currently treated as Balanced, while coordinators vary across the league. Generated candidates are a lightweight shortlist, not a fully persistent free-agent market. Cash, not player salary cap, pays coach hiring and retention bonuses.

Priority 3 game-planning and practice-loop expansion is intentionally deferred.
