# Horizon Context

## Product

Horizon is a cross-platform desktop app for macOS and Windows that delivers smart eye breaks based on the 20-20-20 rule.

## Domain Terms

### Break Loop

The Break Loop is Horizon's core scheduling behavior. It turns active computer time plus system signals into break decisions such as running, due, snoozed, suppressed, and completed.

### Presence

Presence is Horizon's normalized view of whether the user is actively at the computer. It includes active use, idle time, lock state, sleep, and wake.

### Suppression

Suppression is the policy that decides whether Horizon should stay quiet even when a break is due. In v1, suppression is driven by fullscreen or presentation-like states.

### Break Overlay

The Break Overlay is the focused UI shown when a break is due. It presents the countdown and actions such as start now, snooze, and skip.

### App Shell

The App Shell is the tray or menubar-first desktop wrapper that owns startup, quick status, window orchestration, and launch-at-login behavior.

### Settings

Settings are the user's local preferences for scheduling and app behavior, including break interval, break duration, snooze duration, launch at login, and reminder enablement.

### Stats

Stats are lightweight local records about recent Horizon usage, such as breaks completed today and next break time.

### Native Bridge

A Native Bridge is a minimal platform-specific adapter used only where Electron APIs are not sufficient for Horizon's Presence or Suppression behavior.
