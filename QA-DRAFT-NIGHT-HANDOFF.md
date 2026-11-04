# Gridiron GM — Draft Night & Animation QA Handoff

## Status

Draft animation and batch-drafting improvements have been committed to the default branch of `SaintJT-coder/Football-Sim`. Targeted JavaScript runtime tests pass. **This is not a verified physical-iPhone or live deployed-site playthrough.**

## Changes

| File | Improvement |
| --- | --- |
| `frontoffice.js` | CPU draft selections do not serialize the entire franchise after each pick; `advanceDraft()` and `autoDraft()` save once at the end of each CPU batch. Human selections still save immediately |
| `draftnight.js` | Intro appears once for each named franchise and draft year, not once per browser lifetime; does not auto-launch on a completed draft; board toggle reads HIDE/VIEW correctly; first-pick canvas errors fall back to a visible CSS celebration |
| `first-pick-broadcast.js` | First-pick overlay has a loading status, Replay Broadcast control and accessible Continue button; Replay restarts the full 24-second timer; fictional fallback data replaces real-world player examples |
| `tests/draft-animation-qa-smoke.js` | Regression coverage for preview rendering, injected canvas script parsing, closing, replay timer and fallback path |
| `tests/draft-presentation-qa-smoke.js` | New 32-team/224-pick headless DOM test for annual intro, preview action, first-pick broadcast, one immediate human save, and one CPU-batch save |
| `.github/workflows/franchise-qa.yml` | Adds the new draft-presentation smoke test to the existing regression workflow |

## Verification

- Both draft-related test files passed when run against the latest GitHub source in an isolated JavaScript harness.
- A 32-team synthetic draft produced 224 selections, with the first user selection saved once and the 223 remaining CPU picks saved as one batch.
- The synthetic preview created an iframe containing the actual canvas and animation frame loop, and its close operation removed the overlay.
- Annual intro state resets when the franchise or draft year changes; no old "12 franchises" label appears.
- The test verifies that the dynamically injected canvas scripts parse, but does **not** prove sustained animation frames or input responsiveness on iPhone Safari.
- If iframe initialization fails, the selected first-round prospect is announced via the existing CSS celebration screen rather than aborting selection.

## Important unresolved device validation

1. On a real iPhone, tap **Animation → Play Animation** and check visible movement, audio-free operation, the replay button and the 24-second auto-dismissal.
2. Tap **Continue Draft** and confirm no persistent black overlay or blocked touch actions.
3. From a newly created franchise's draft board, select the first overall prospect manually; repeat a second draft year to confirm the yearly intro.
4. Auto-draft the remainder while observing UI responsiveness and storage quota on iOS Safari.
5. Verify all tests completed successfully in the GitHub Actions UI; committing a workflow does not by itself prove that the runner is green.

These are code-level QA changes and safeguards, not a feature redesign.
