# Horizon Milestones And Tasks

This file captures milestone-level planning and the task checklist for each milestone.

## Milestone 1: Product and Technical Foundation

Align the repository, architecture, and development setup around the Horizon v1 scope.

Expected outcome:

- Electron + TypeScript + React foundation is established
- secure process boundaries are in place across main, preload, and renderer
- local development, testing, and packaging workflows are defined
- domain language and module seams are stable enough for implementation

Tasks:

- [x] Initialize the Electron, TypeScript, and React application structure
- [x] Configure `electron-vite` for main, preload, and renderer builds
- [x] Configure Electron Forge for local packaging workflows
- [x] Establish secure Electron defaults with `contextIsolation`, `sandbox`, and disabled `nodeIntegration`
- [x] Create the base repository structure for `main`, `preload`, `renderer`, and `shared` modules
- [x] Add TypeScript configuration for shared typing across processes
- [x] Set up linting, formatting, and test command scaffolding
- [x] Create the initial typed IPC contract shape for main-to-renderer communication
- [x] Align the codebase structure with `ARCHITECTURE.md` and `CONTEXT.md`

## Milestone 2: Core Break Loop Engine

Implement the Break Loop as the central product module that turns active time and normalized system events into break decisions.

Expected outcome:

- active-time scheduling works reliably
- snooze, skip, completion, and reset behavior are defined in one place
- auto-credit behavior exists for meaningful idle periods
- the core loop is testable independent of UI and platform adapters

Tasks:

- [x] Define the Break Loop state model and event model
- [x] Implement active-time accumulation based on normalized Presence input
- [x] Implement due-time calculation for the default 20-20-20 schedule
- [x] Add configurable break interval and break duration support
- [x] Implement pause and resume behavior for inactive states
- [x] Implement break due, on-break, completed, and reset transitions
- [x] Implement snooze behavior with configurable snooze duration
- [x] Implement skip behavior and correct timer recovery after skip
- [x] Implement auto-credit logic for meaningful idle near due time
- [x] Expose derived Break Loop state for tray, settings, and overlay consumers
- [x] Add unit tests for core Break Loop scenarios and edge cases

## Milestone 3: Presence and Suppression Intelligence

Add cross-platform system awareness so Horizon behaves like a smart background utility instead of a simple timer.

Expected outcome:

- Presence supports idle, lock, sleep, wake, and return flows
- Suppression prevents interruptions during fullscreen or presentation-like states
- macOS and Windows adapters are normalized behind stable seams
- the Break Loop can make reliable interruption decisions from platform signals

Tasks:

- [ ] Define the `PresenceAdapter` interface and normalized Presence events
- [ ] Define the `SuppressionAdapter` interface and normalized Suppression state
- [ ] Implement the macOS Presence adapter
- [ ] Implement the Windows Presence adapter
- [ ] Implement the macOS Suppression adapter for fullscreen or presentation detection
- [ ] Implement the Windows Suppression adapter for fullscreen or presentation detection
- [ ] Add native bridge support where Electron APIs are insufficient
- [ ] Normalize adapter output before it reaches the Break Loop
- [ ] Handle sleep, wake, lock, unlock, and idle transitions consistently across platforms
- [ ] Add adapter-level tests or integration checks for platform-specific behavior
- [ ] Validate that Suppression prevents mistimed overlays while preserving timer correctness

## Milestone 4: App Shell and User Interaction Surfaces

Build the tray or menubar-first desktop experience and the two primary user-facing windows.

Expected outcome:

- App Shell manages startup, tray state, and window orchestration
- settings window supports the required v1 preferences
- Break Overlay delivers the calm, minimal break prompt experience
- renderer windows are driven by typed IPC and main-process state

Tasks:

- [ ] Implement the App Shell composition module in the main process
- [ ] Create tray or menubar initialization and lifecycle management
- [ ] Show current Horizon status and next break timing in the tray or menubar UI
- [ ] Create the settings window shell and window lifecycle logic
- [ ] Create the Break Overlay window shell and window lifecycle logic
- [ ] Implement typed IPC handlers for settings reads and updates
- [ ] Implement typed IPC handlers for Break Loop state and break actions
- [ ] Build the settings renderer with controls for interval, duration, snooze, reminders, and launch at login
- [ ] Build the Break Overlay renderer with countdown and actions for start now, snooze, skip, and dismiss
- [ ] Ensure renderer windows remain UI-only and do not contain privileged logic
- [ ] Validate that tray actions, overlay actions, and settings changes stay synchronized with main-process state

## Milestone 5: Persistence, Stats, and Daily Usability

Round out the product so it feels trustworthy, configurable, and useful across repeated daily use.

Expected outcome:

- settings and stats are stored locally with validation and migrations
- launch-at-login behavior is supported and user-controllable
- minimal progress feedback is available, including breaks completed and next break time
- the app can run quietly in the background as a set-and-forget utility

Tasks:

- [ ] Define the Settings schema and default values
- [ ] Define the Stats schema for daily local usage tracking
- [ ] Implement the local storage adapter for Settings and Stats
- [ ] Add validation and migration support for persisted data
- [ ] Persist reminder enablement, break interval, duration, snooze, and launch-at-login preferences
- [ ] Implement launch-at-login behavior for macOS and Windows
- [ ] Expose minimal Stats to the settings window and tray or menubar UI
- [ ] Track breaks completed today and next break time
- [ ] Ensure app state restores correctly across app restarts
- [ ] Verify the background experience remains quiet and low-friction during normal use

## Milestone 6: Cross-Platform Hardening and Quality

Harden the product for real-world desktop use across macOS and Windows.

Expected outcome:

- edge cases in fullscreen, idle credit, wake recovery, and window lifecycle are addressed
- performance, memory usage, and startup behavior are acceptable for always-on usage
- security, IPC validation, and failure handling are reviewed
- automated coverage exists for the most important unit and end-to-end flows

Tasks:

- [ ] Audit idle-credit heuristics against realistic user flows
- [ ] Harden wake, sleep, and lock recovery behavior in the Break Loop
- [ ] Harden fullscreen and presentation suppression edge cases
- [ ] Review tray, settings window, and overlay window lifecycle behavior for race conditions
- [ ] Validate all IPC inputs and standardize result-style error handling
- [ ] Review preload exposure to ensure no raw Electron primitives leak to renderers
- [ ] Measure startup time, memory usage, and idle resource consumption
- [ ] Fix performance bottlenecks that would harm always-on desktop usage
- [ ] Add automated end-to-end coverage for critical daily flows
- [ ] Add regression coverage for platform-specific bugs discovered during testing

## Milestone 7: Packaging, Signing, and Release Readiness

Prepare Horizon for direct-download distribution as a polished desktop utility.

Expected outcome:

- platform packaging is working for macOS and Windows
- signing and release workflows are defined
- the app is structured for future auto-update support
- release criteria for Horizon v1 are clear and measurable

Tasks:

- [ ] Finalize Electron Forge packaging for macOS builds
- [ ] Finalize Electron Forge packaging for Windows builds
- [ ] Define code signing requirements and secrets handling for both platforms
- [ ] Set up release build scripts for local and CI usage
- [ ] Verify install, launch, upgrade, and uninstall behavior on both platforms
- [ ] Confirm the app structure supports future auto-update integration
- [ ] Create a release checklist for quality, packaging, and signing gates
- [ ] Define v1 exit criteria tied to product and experience metrics

## Milestone 8: V1 Launch

Ship the first production release and validate that the core value proposition holds in real use.

Expected outcome:

- Horizon v1 is released to early users
- success metrics can be observed for retention, break acceptance, and interruption quality
- major post-launch issues are triaged quickly
- learnings are captured for the next planning cycle

Tasks:

- [ ] Prepare the final release candidate build for early users
- [ ] Publish Horizon v1 through the direct-download distribution flow
- [ ] Confirm that retention, break acceptance, skip rate, and interruption quality can be measured
- [ ] Establish a process for collecting and triaging early-user issues
- [ ] Monitor launch feedback for mistimed interruptions and platform-specific failures
- [ ] Prioritize and fix critical post-launch issues
- [ ] Summarize launch learnings and convert them into the next planning cycle
