# Gridiron GM — Five-Season Stability & Save Size QA

Tested source: `SaintJT-coder/Football-Sim`, main branch, latest regression commit `de2bb058e4ea411591876f46ec27809f5c3191fd`.

## Result

The full five-season simulation regression passed in GitHub Actions:
https://github.com/SaintJT-coder/Football-Sim/actions/runs/41762500783

It covers five annual 32-team, 17-game schedules (272 regular-season games each; 1,360 total), five complete 224-pick drafts, postseason resolution, year rollovers, cap growth, award histories, retirement archival, explicit 53-man roster compliance, free-agent supply management and serialization on *every* weekly save.

### Actual save-size measurements

| Season | Peak serialized state during the season | After offseason | Active players on user's team | Free agents after offseason |
|---|---:|---:|---:|---:|
| 2026 | 3.02 MiB | 2.86 MiB | 37 | 0 |
| 2027 | 3.70 MiB | 3.53 MiB | 44 | 0 |
| 2028 | 4.34 MiB | 4.17 MiB | 50 | 0 |
| 2029 | 4.97 MiB | 3.37 MiB | 22 | 300 |
| 2030 | 4.11 MiB | 3.55 MiB | 22 | 300 |

**Caution:** 4.97 MiB in the 2029 season is only slightly below the test's 5 MiB threshold. The threshold is a *test safety budget*, not a guarantee of Safari's storage quota. Web Storage quotas vary and can count keys, values and other origin data differently.

## Bugs discovered and fixed in this QA pass

1. **Duplicate retirements and unbounded retired-player active entries.** The same retired veteran could be aged and retired again in later seasons. Retirement now occurs once, duplicate archives are deduplicated and retired players are removed from active simulation records. Full career summaries remain in the retirement archive.
2. **Reused rookie IDs after archived departures.** Draft-generated player IDs now use a persistent monotonic counter, and fallback migration checks active, retired and departed-player archives.
3. **Repeated full-roster initialization during scheme scoring.** The scheme lookup re-used the already initialized franchise scheme map, eliminating thousands of redundant whole-roster scans without changing the formula.
4. **Unbounded game-report duplication.** The media system now retains 60 detailed reports involving the user's team, plus 24 recent league summary reports. Historic season recaps, awards, results and career records remain separately saved.
5. **Transient AI development logs dominating saves.** The save-retention module keeps the user's complete practice, development, snap and event details. It retains one latest AI practice/event record, drops redundant AI weekly snap history, and leaves current attributes, XP, ability traits, contracts and career totals intact.
6. **53-man roster overflow.** In season four, the user's team reached 57 active players. A new explicit `Move Eligible Backups to Practice` control previews and moves suitable players without releasing contracts. Locked starters, targeted players, positional minimums and practice-squad limits are respected. The stress test exercises the same action.
7. **Free-agent market overflow.** After expiring contracts, the simplified league contained 1,079 free agents. The new lifecycle module keeps 300 active free agents with positional diversity and protects recent former user players for re-signing; others exit the active market with compact historical summaries. This is a **gameplay tradeoff**: not every unsigned player remains signable forever.

## Files changed

- `engine.js` — retirement correctness, expiry-origin tracking and market lifecycle hook
- `frontoffice.js` — monotonic rookie IDs across archived players
- `franchise-systems.js` — scheme lookup performance
- `simulation-presentation.js` — report retention without full duplicate AI box scores
- `save-retention.js` (new) — CPU-only transient history cleanup at save time
- `league-player-lifecycle.js` (new) — bounded active free-agent pool and compact departed-player archive
- `roster-rules.js` — safe, user-confirmed practice-squad final cuts
- `index.html` — loads new modules and invokes retention before saving
- `tests/multiseason-stress-qa-smoke.js` (new) — five-season serialization and league progression regression
- `tests/retirement-archive-qa-smoke.js`, `tests/scheme-cache-qa-smoke.js`, `tests/save-retention-qa-smoke.js`, `tests/roster-autocuts-qa-smoke.js`, `tests/freeagent-lifecycle-qa-smoke.js` — focused safety regressions
- `.github/workflows/franchise-qa.yml` — runs the above tests

## Verified and unverified

Verified:

- GitHub Actions full franchise QA: successful on `de2bb058`.
- GitHub validation/Chromium mobile viewport tests: successful on `de2bb058`.
- GitHub Pages deployment: successful on `de2bb058`.
- A single serialized franchise remained below the 5 MiB test budget during all five simulated seasons.

**Not yet verified:**

- Physical iPhone/iPad Safari performance and real-device storage quotas.
- **Aggregate origin storage usage for multiple named franchises, What If branches and the legacy save mirror.** These occupy separate entries in localStorage. Even if one franchise is below 5 MiB, several stored copies can exceed the device's origin-level quota. A separate storage architecture change (for example IndexedDB-backed slots or lossless compressed snapshots) is needed for dependable multi-save long-term careers.
- Gameplay quality and AI roster strength over 10–20 seasons; this test proves functional progression, not balanced league competition.

## Running the test

In a repository checkout:

```bash
node tests/multiseason-stress-qa-smoke.js
```

No npm package install is required for this Node stress test. For browser UI and mobile layout tests, use the GitHub validation workflow (which installs Playwright Chromium).
