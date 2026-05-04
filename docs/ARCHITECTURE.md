# Horizon Architecture

## Overview

This document turns the Horizon PRD into a concrete Electron architecture for v1.

The design goal is depth: keep the hard product behavior in a few deep modules with small interfaces, and keep Electron, OS APIs, and window plumbing behind clear seams.

## Architecture Summary

- Stack: Electron + TypeScript + React renderer
- Dev/build: `electron-vite`
- Packaging and distribution: `Electron Forge`
- Security defaults: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`
- Persistence: local-only settings and stats
- Update path: direct download first, auto-update-friendly structure

## Process Model

### Main Process

The main process owns all privileged behavior:

- app boot and single-instance handling
- tray or menubar lifecycle
- BrowserWindow creation for settings and break overlay
- launch-at-login integration
- native bridge loading
- local persistence adapters
- Presence and Suppression adapters
- Break Loop composition and orchestration

The main process should be the single source of truth for app state.

### Preload Process

The preload layer exposes a narrow, typed interface to renderer windows through `contextBridge`. It should not expose raw Electron primitives.

Responsibilities:

- typed IPC wrappers
- event subscription helpers with cleanup
- zero domain logic

### Renderer Processes

Horizon has two renderer surfaces in v1:

- settings window
- break overlay window

Renderers should stay pure UI. They render state received from the main process and emit user intents back through typed IPC.

## Deep Modules

These are the first modules to build because they concentrate product complexity and create the best locality.

### 1. Break Loop module

Purpose:

- convert time and system events into break decisions

This module should own:

- active-time accumulation
- due-time calculation
- pause and resume behavior
- snooze and skip handling
- auto-credit logic for meaningful idle near due time
- break completion and reset

Preferred interface:

- input: normalized events like `tick`, `presenceChanged`, `suppressionChanged`, `settingsChanged`, `breakAction`
- output: derived state like `running`, `due`, `suppressed`, `onBreak`, `nextBreakAt`, `progress`, `statsDelta`

Why this should be deep:

- the deletion test is strong here: if removed, its complexity would leak into timers, window handlers, and tray updates everywhere

### 2. Presence module

Purpose:

- normalize platform activity signals into one interface the Break Loop can trust

This module should own:

- idle duration detection
- lock and unlock detection
- sleep and wake detection
- active and idle transitions

Seam:

- `PresenceAdapter`

Adapters:

- `MacPresenceAdapter`
- `WindowsPresenceAdapter`

This is a real seam because Horizon already needs at least two adapters.

### 3. Suppression module

Purpose:

- decide whether Horizon may interrupt right now

This module should own:

- fullscreen detection policy
- presentation-like suppression policy
- edge-case handling for ambiguous window states

Seam:

- `SuppressionAdapter`

Adapters:

- `MacSuppressionAdapter`
- `WindowsSuppressionAdapter`

The Break Loop should consume a simple suppression state, not raw OS window observations.

### 4. Settings and Stats module

Purpose:

- own validated local persistence and hide storage details

This module should own:

- defaults
- validation
- migrations
- read and write behavior
- daily stats rollup

Seam:

- `StorageAdapter`

Callers should work with domain values, not raw keys.

### 5. Break Overlay module

Purpose:

- own the break prompt window lifecycle and interaction model

This module should own:

- show, update, and hide behavior
- countdown state projection from main-process state
- focus and visibility rules
- user actions like start, snooze, skip, and dismiss

The rest of the app should speak in break intents, not `BrowserWindow` details.

### 6. App Shell module

Purpose:

- compose everything at startup and expose the tray or menubar experience

This module should own:

- app boot sequence
- tray status and menu state
- window orchestration
- wiring between deep modules
- launch-at-login behavior

The App Shell is intentionally a composition seam, not a home for business logic.

## Proposed Repository Shape

```text
src/
  main/
    index.ts
    app-shell/
      create-app-shell.ts
      tray-controller.ts
      window-controller.ts
      login-item.ts
    break-loop/
      break-loop.ts
      break-loop-types.ts
      break-loop-reducer.ts
      break-loop-policy.ts
    presence/
      presence-module.ts
      presence-types.ts
      adapters/
        mac-presence-adapter.ts
        windows-presence-adapter.ts
    suppression/
      suppression-module.ts
      suppression-types.ts
      adapters/
        mac-suppression-adapter.ts
        windows-suppression-adapter.ts
    preferences/
      settings-module.ts
      stats-module.ts
      storage-adapter.ts
    overlay/
      overlay-controller.ts
      overlay-ipc.ts
    ipc/
      settings-ipc.ts
      stats-ipc.ts
      break-ipc.ts
    native/
      mac/
      windows/
  preload/
    index.ts
    api-types.ts
  renderer/
    settings/
      main.tsx
      app.tsx
    overlay/
      main.tsx
      app.tsx
    shared/
      ui/
      types/
  shared/
    contracts/
      result.ts
      settings.ts
      stats.ts
      break-state.ts
```

## State Ownership

State ownership should be simple:

- main process owns authoritative runtime state
- renderer windows receive snapshots and emit intents
- storage is written by the main process only

This avoids renderer-to-renderer coupling and keeps locality high.

## IPC Design

Use `invoke/handle` for request-response and explicit event subscriptions for pushed updates.

Recommended rules:

- no raw `ipcRenderer` exposure in preload
- validate all renderer inputs in main
- use typed result shapes like `{ success, data, error }`
- group IPC handlers by module, not by window

Example channel groups:

- `settings:get`
- `settings:update`
- `stats:getToday`
- `break:getState`
- `break:performAction`
- `app:subscribeState`

## Native Bridge Strategy

Use native code only where Electron is insufficient.

Good candidates:

- better idle and lock signal quality
- stronger fullscreen or presentation detection
- launch-at-login polish where platform support differs

Rules:

- keep native bridges as leaf adapters
- never let native APIs leak into renderer code
- normalize platform output before it reaches the Break Loop
- keep a fallback adapter where possible so development remains easy

## Window Strategy

### Settings Window

- regular framed window
- opened from tray or menubar
- reflects current settings and minimal stats

### Break Overlay Window

- dedicated window used only when a break is due
- visually calm and distraction-light
- driven by main-process break state
- should be easy to show and hide without reinitializing core scheduling

The overlay should be replaceable without rewriting the Break Loop.

## Recommended Boot Flow

1. Start Electron app and acquire single instance lock.
2. Load settings and stats modules.
3. Create Presence and Suppression adapters for the current platform.
4. Create Break Loop with current settings.
5. Create App Shell and tray.
6. Register IPC handlers.
7. Lazily create settings window when requested.
8. Create and show Break Overlay only when the Break Loop emits a due state.

## Testing Strategy

### Unit Tests

Focus first on the Break Loop module.

Test through the interface:

- active time accumulation
- idle pause and resume
- auto-credit behavior
- snooze and skip behavior
- suppression while due
- wake and lock recovery

### Adapter Tests

Test Presence and Suppression adapters separately per platform with thin integration coverage.

### Renderer Tests

Keep renderer tests mostly at component level for settings and overlay behavior.

### End-to-End Tests

Use Playwright for Electron flows:

- app starts in tray
- settings update reaches main state
- due break opens overlay
- snooze and skip actions update tray state

## Implementation Order

1. `CONTEXT.md` and architecture docs
2. app shell scaffold with secure Electron defaults
3. Break Loop module with tests
4. Settings and Stats module
5. Presence adapters
6. Suppression adapters
7. Break Overlay window
8. Settings window and typed IPC
9. packaging, signing, and update path

## Decisions To Keep Stable

- Keep the Break Loop in the main process.
- Keep renderers free of Node access.
- Treat Presence and Suppression as separate modules.
- Keep native bridges minimal and adapter-shaped.
- Keep local persistence behind one module.

If these hold, Horizon will stay testable, secure, and much easier to evolve into smarter suppression and additional break types later.
