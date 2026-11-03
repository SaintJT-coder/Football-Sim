# Gridiron GM — Priority 4: Contracts and Agent Personalities

This feature extends the existing franchise save model with plain JavaScript, no build tools, no frameworks and no TypeScript.

## Files

- contract-economy.js — NEW: agent negotiations, no-trade/no-tag clauses, option years, void years, incentive ladders, league cap growth, carryover, penalties, and interactive Contract Strategy page.
- tests/contracts-priority4-smoke.js — NEW: standalone regression test using Node built-in modules.
- contracts-advanced.js — modified: delegates negotiation and release/option accounting, honors no-tag protections, uses the league cap ledger.
- contracts.js — modified: persistent agent personalities, offer scoring, free-agent options and incentive registration.
- freeagency.js — modified: includes signing-bonus proration when checking salary-cap space.
- cap-management.js — modified: unified Salary Cap page and compatibility bridge for older contract actions.
- frontoffice.js — modified: no-trade restrictions and correct salary-cap checks for both sides of a trade.
- engine.js — modified: season-end incentive/option decisions and offseason salary-cap growth.
- index.html — modified: Contract Strategy sidebar and contract-economy script.

## Loading and migration

After the legacy free-agency and signing-presentation scripts have loaded, load contracts-advanced.js, then contract-economy.js, then the rest of the preexisting script order. cap-management.js must load after contract-economy.js. There are no new imports or ES modules.

New fields are lazily added to existing saves. Existing player.salary, player.years, player.contractAdvanced, p.agent, state.cap and the save method are preserved.

## Example data structures

    p.agent = {
      name: "Example Agent",
      persona: "Money-First",
      style: "Financial"
    };

    p.contractAdvanced.clauses = { noTrade: true, noTag: false };

    p.contractAdvanced.options = [{
      year: 2029, holder: "TEAM", salary: 25,
      decided: false, exercised: null,
      deadlineYear: 2028, deadlineWeek: 18
    }];

    p.contractAdvanced.voidYears = 2;
    p.contractAdvanced.voidProration = [
      { year: 2030, amount: 0.75, accelerated: false },
      { year: 2031, amount: 0.75, accelerated: false }
    ];

    p.contractAdvanced.incentiveLadders = [{
      signedYear: 2026, yearIndex: 2, targetYear: 2027,
      conditions: [
        { type: "REC_YARDS", threshold: 1200 },
        { type: "PLAYOFFS", threshold: 1 }
      ],
      payout: 3, paidYear: null, settled: false
    }];

    state.contractEconomy = {
      version: 1, originYear: 2026, baseCap: 350, growthRate: 0.04,
      carryover: { 2027: { 0: 28.5 } },
      penalties: { 2027: { 0: 0 } },
      processed: [2026], history: []
    };

All salaries and bonuses are in fictional millions.

## Main methods and hooks

- GMContractEconomy.CONFIG — all new tunable game balance constants.
- agent(player) and evaluateOffer(player, state, terms) — agent personality and preferred deal structure.
- freeAgentScoreModifier(player, offer) — small free-agent offer influence.
- extend(player, state, offer) — active years, optional years, void years, salary, bonus, guaranteed salary and clauses.
- canTrade(player), canTag(player), grantClause(player, state, kind).
- setOption(player, state, year, exercise) and settleOptions(player, state).
- addLadder(player, state, terms) and assessLadders(player, state, context).
- sheet(state), capAt(state, team, year), table(state, years) and baseLimit(state, year).
- release(player, state), accelerateVoid(player, state) and registerSigning(player, state, offer).
- seasonEnd(state, teamResults) and advanceYear(state).

The engine calls the yearly settlement before player stats reset, and grows the league cap after incrementing the year. Both legacy advanced contracts and the new cap UI read one common ledger.

## Balance defaults

Agents: Aggressive, Patient, Money-First, Loyalty-Focused. Negotiated no-trade/no-tag protection requires at least 84 OVR. A separate clause amendment costs $1M. High-rated players may demand clause protection before accepting a new deal.

Contract extensions support up to two additional option years and three accounting-only void years. Free-agent option clauses add one conditional year after the base free-agent deal. Team options can be manually exercised; player options resolve before the eligible season according to the current market. Bonus dollars spread across contract/void years; deferred bonus money accelerates into dead cap at expiry. Early releases also accelerate future guaranteed salary.

Incentives: up to 12 per contract, at most 3 requirements per ladder and up to $25M each. Combined conditions, such as 1,200 receiving yards in contract year two AND a playoff appearance, settle once at the relevant season end. CPU-team payouts do not reduce user-team cash.

League cap grows 4% per year from the original salary cap. Carryover is 35% of unspent cap space, capped at 10% of the next year's league cap. Overspending imposes a next-year limit penalty of 50% of the excess, plus a user-team owner security and fan happiness consequence.

## Console test (safe clone)

Paste inside an active franchise. Only the clone is modified:

    const demo = JSON.parse(JSON.stringify(state));
    const E = GMContractEconomy;
    const player = demo.players.find(p => p.team === demo.team && p.rating >= 84);
    console.log("Agent:", E.agent(player));
    console.log("Current cap:", E.sheet(demo));
    console.log("Offer:", E.evaluateOffer(player, demo, {
      years: 3, salary: 25, bonus: 6, guaranteed: 10,
      clauses: { noTrade: true }
    }));
    console.log("5-year projection:", E.table(demo, 5));

For live-game safety, do not invoke seasonEnd on the actual state from the console.

Standalone regression test from a local checkout:

    node tests/contracts-priority4-smoke.js

## Balance cautions

Void years create extra spending flexibility but can lead to large future dead-cap hits. The three-year cap and guaranteed salary accounting limit exploitation. Growth/carryover are conservative and should not overwhelm on-field team building. The rules are fictional simplified franchise accounting, not a complete real-world NFL collective bargaining agreement.

Full iPhone/iPad browser testing and deployed-site verification remain separate tasks. The existing cap screen, recruiting UI and offline save system are retained rather than rewritten.

Priority 5 — Scouting, Combine and Draft Realism — is not included.
