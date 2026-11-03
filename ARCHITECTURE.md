# Gridiron GM — Incremental Architecture Guide

No bundler or framework is required. The project still loads classic scripts in index.html.

## Current architecture

1. The inline script in index.html defines the existing state, core UI functions and legacy save function.
2. gridiron-core.js exposes window.Gridiron, a module registry and event bus.
3. gridiron-saves.js registers Gridiron.saves / window.GMSaveManager.
4. season-recap.js registers Gridiron.seasonRecaps / window.GMSeasonRecap.
5. Existing simulation and franchise scripts load afterward in their established order.

The core scripts must run after the inline index.html script has initialized state, but before any feature that calls them. Each module should register a named API instead of replacing render(), save(), or simulate().

## Pattern for new features

```javascript
(function (window) {
  'use strict';
  const api = {
    init(state) { state.example ??= { enabled: true }; },
    weekly(state) { /* update once per week */ },
    page(state) { return '<div class="card">Example</div>'; }
  };
  window.Gridiron.register('example', api);
})(window);
```

The engine should call `Gridiron.example.weekly(state)` explicitly at the appropriate phase. Avoid wrapping the existing simulate() function in another global override. Emit events for optional observers: `Gridiron.emit('week:complete', { year: state.year, week: state.week })`.

## Save ownership

The current franchise remains in the legacy active key `gridiron-gm-save` for compatibility with the main menu and engine. The new save manager keeps independent named slots under `gridiron-gm-slot-v3:<id>`, with metadata in `gridiron-gm-save-index-v3`. An active slot is identified by `gridiron-gm-current-slot-v3`. The Save Manager supports JSON import/export and lightweight What If branches.

Important: LocalStorage is limited. Very large saves may exceed browser quota. Export JSON backups regularly. Do not load JSON files from untrusted sources. The import validator checks core state shape but does not yet deeply validate every nested franchise field.

## Season recap lifecycle

At the end of the playoffs, before player statistics and season results are reset, `GMSeasonRecap.generate(state, standings, playoffs, awards)` captures a snapshot into `state.seasonRecaps`. The recap is available from the Season Recaps sidebar. All-Pro teams are currently rating-based, not voted by season performance.

## Migration plan

- Phase 1 (done): namespace, independent saves, recaps, additive UI routes.
- Phase 2: unify legacy main-menu slots and Save Manager storage; eliminate duplicate save wrappers.
- Phase 3: move inline UI and styles into separate files without changing behavior.
- Phase 4: migrate game systems to explicit lifecycle hooks; remove global function overrides one at a time.
- Phase 5: browser regression tests for franchise creation, weekly simulation, season transition, save import/export and What If branch isolation.

Avoid moving every file at once: each phase should preserve a playable game and be independently tested.
