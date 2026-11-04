# Gridiron GM — Save Recovery and Startup QA Handoff

**Code branch:** main, repository `SaintJT-coder/Football-Sim`
**Scope:** Continue the November 3, 2026 game-wide QA pass, focusing on startup integrity, named save recovery and backward compatibility. This document records changes verified by source and headless tests; it is not a mobile browser completion certificate.

## Confirmed issues fixed

| Issue | Previous behavior | Current behavior |
| --- | --- | --- |
| Stale v2 mirror when another v3 franchise was selected | `index.html` and main menu read `gridiron-gm-save`, which could differ from the selected `gridiron-gm-current-slot-v3` | The earliest inline script now reads the active named save before any external modules run. The menu also restores the selected canonical slot first |
| First visit silently created an Original Franchise save | Menu bootstrap and opening Load Game created a slot from `fresh()` even though the visitor had not created a franchise | New installs begin with an empty vault. Load Game routes the visitor to New Franchise if no current, legacy or named saves exist |
| Damaged selected slot blocked Continue | Bootstrap trusted the ID in the save index without validating its backing data | The manager searches for another valid named slot, switches to it, and retains the damaged file for possible recovery |
| Old three-slot saves invisible in new Save Manager | v2 slots stored under `gridiron-gm-slots-v2` were not reachable from the v3 screen | If a valid old slot is found, the vault offers `IMPORT OLD SAVES`. Imports create distinct v3 copies with deterministic IDs, preserve v2 originals, and do not recreate copies after deletion |
| Saving updated the compatibility mirror before the actual selected slot | A quota failure during the second write could leave the newer mirror and an older canonical slot, causing a silent rollback on next launch | Save writes the canonical slot first, then the mirror. If the canonical write fails, the old mirror remains unmodified. If the mirror fails, the current named slot retains the newest state |
| Main menu entering a named franchise could write the mirror ahead of the canonical copy | A failed snapshot could leave partially divergent storage | Entering a franchise snapshots the canonical slot first |

## Storage structure

- `gridiron-gm-save-index-v3`: named franchise index and human labels.
- `gridiron-gm-current-slot-v3`: currently selected franchise ID.
- `gridiron-gm-slot-v3:<id>`: canonical active named franchise data.
- `gridiron-gm-save`: compatibility mirror; used for migration/fallback.
- `gridiron-gm-slots-v2`: historical three-slot saves, never deleted by the new importer.
- `gridiron-gm-v2-imported-v3`: marker for imported historical slot numbers. Prevents duplicate imports or resurrecting deleted copies.

The importer does not automatically copy legacy slots or overwrite active saves. The user explicitly selects the Import Old Saves action.

## New tests

- `tests/save-recovery-qa-smoke.js`: fresh install, first named save, stale compatibility mirror, corrupt selected save, and Continue state.
- `tests/legacy-save-import-qa-smoke.js`: two legacy saves import without changing the original storage, duplicate imports are prevented, deleting a migrated copy does not re-import it.
- `tests/save-storage-order-qa-smoke.js`: forced quota failures on canonical or mirror writes preserve a valid save.
- `tests/startup-save-qa-smoke.js`: earliest inline script prefers selected named data, safely falls back from corrupt JSON, and uses fresh defaults only when no valid save exists.

All four new tests were executed against current production source in an isolated JS compatibility harness and passed. GitHub Actions workflow `.github/workflows/franchise-qa.yml` now includes them alongside the seven earlier tests (11 total).

## Current verification limits

- The GitHub connector's commit status collection and PR-filtered workflow runs returned no status entries. This **does not** establish a successful or failed GitHub Actions run.
- The connected local browser was inaccessible from this conversation. No iPhone/iPad touch or DOM screenshot test was completed.
- The attempted public Pages URL was not accessible via the available web fetch; no live deployment status was confirmed.
- Full long-duration multiseason game simulation and localStorage quota testing on physical iPhone/iPad remain outstanding.

## Next browser QA checklist

1. Fresh Safari profile: first open shows New Franchise rather than Continue; Load Game with no saves opens New Franchise.
2. Create two differently named franchises; change cash, week, team, and lineup independently. Switch between them and fully reload the tab; verify the correct one resumes.
3. Make a What If branch, change its season, return to parent, and check that parent player records and balance did not change.
4. Import an old v2 three-slot backup if available, check that originals remain untouched and no duplicate appears on next load.
5. Import an exported v3 JSON save and compare roster, finances, year, and awards with the original.
6. Run a draft and a press conference on mobile; verify all actions respond and the pages scroll without horizontal clipping.
7. Continue at least five seasons while monitoring localStorage size and reload reliability; verify no save quota failure or unexpected reset.
8. In GitHub Actions, run `Gridiron GM — Franchise QA` and inspect job logs before treating continuous integration as green.

No user data was changed during these tests; the test runs used synthetic localStorage objects and simulated franchise states.
