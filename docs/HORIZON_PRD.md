 # Horizon PRD

 ## Overview

 Horizon is a cross-platform desktop app for macOS and Windows that helps users reduce eye strain and maintain focus by prompting smart, well-timed eye breaks. It is inspired by the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.

 Horizon is designed to feel calm, minimal, and trustworthy. It should behave like a set-and-forget utility rather than a demanding productivity tool.

 ## Problem

 People who spend long hours at their computers often experience dry eyes, fatigue, headaches, and reduced focus. Existing reminder tools frequently feel naive because they interrupt at the wrong times, ignore whether the user is already away, or create too much friction.

 Users need a lightweight desktop utility that:

 - tracks real active computer usage rather than simple wall-clock time
 - avoids interrupting during inappropriate moments like fullscreen work or presentations
 - recognizes when the user already stepped away and credits that as a break
 - stays simple, private, and unobtrusive

 ## Vision

 Build the most trusted desktop eye-break companion for knowledge workers: quiet, intelligent, privacy-safe, and pleasant enough to leave running all day.

 ## Product Principles

 - Smart by default: interruptions should feel well-timed, not mechanical.
 - Calm over noisy: minimal UI, restrained motion, and supportive copy.
 - Local-first privacy: no account, no cloud requirement, no invasive sensors in v1.
 - Low-maintenance: users should configure Horizon once and mostly forget about it.
 - Cross-platform consistency: core behavior should feel the same on macOS and Windows.

 ## Target Users

 - Developers, designers, writers, analysts, and other desk-based knowledge workers
 - Users who work for long stretches in front of a screen
 - Users who want healthier computer habits without heavy productivity coaching

 ## Goals

 ### Business Goals

 - Ship a focused v1 that proves the core break loop feels intelligent and worth keeping installed.
 - Establish Horizon as a premium-feeling desktop utility that can expand later.

 ### User Goals

 - Get timely eye-break reminders without annoying interruptions.
 - Maintain better eye comfort and mental freshness during long computer sessions.
 - Trust that the app respects privacy and stays out of the way.

 ## Non-Goals for V1

 - Calendar integration
 - Camera or microphone-based presence detection
 - Focus modes, hydration reminders, stretch coaching, or broader wellness features
 - Team features or cloud sync
 - Heavy analytics dashboards or gamification
 - App-store-first distribution constraints

 ## V1 Scope

 Horizon v1 will include:

 - menubar/tray-first desktop app shell
 - support for macOS and Windows
 - active-time-based eye-break scheduling
 - gentle break overlay with countdown and actions
 - idle detection, sleep/wake handling, and screen lock awareness
 - fullscreen or presentation suppression
 - automatic credit when the user was already away long enough
 - launch at login enabled by default with clear user control
 - minimal local stats and settings
 - local-only persistence

 ## Core User Experience

 ### Main Loop

 1. User installs Horizon and enables launch at login.
 2. Horizon runs quietly in the system tray or menubar.
 3. Horizon tracks active computer time.
 4. If the user is idle, locked, asleep, or already taking a long enough pause, the timer pauses or the break is auto-credited.
 5. If a break becomes due while the user is actively working and not in a suppressed state, Horizon shows a gentle overlay.
 6. User can take the break, snooze it, skip it, or start immediately.
 7. Horizon resets the cycle and continues quietly.

 ### Break Experience

 The break prompt should:

 - feel calm and premium, not alarming
 - clearly communicate the 20-second eye-rest action
 - provide a countdown and lightweight controls
 - avoid feeling punitive or blocking unless the user explicitly chooses to engage

 ## Functional Requirements

 ### Scheduling

 - Default schedule is 20 minutes of active time followed by a 20-second eye break.
 - Users can customize break interval and break duration.
 - Active time only counts while the user is engaged at the computer.
 - Active timer pauses during system idle, lock, and sleep states.
 - After wake or return, Horizon resumes from the correct state.

 ### Smart Detection

 - Detect system idle time.
 - Detect screen lock and unlock when available.
 - Detect system sleep and wake.
 - Detect fullscreen or presentation-like states and suppress interruptions.
 - Use minimal native platform bridges where Electron APIs are insufficient.

 ### Auto-Credit Logic

 - If the user is idle for at least the configured break duration near the due time, Horizon should count that as a completed break.
 - Very short idle periods should not reset the break timer.

 ### Break Prompt Actions

 - Start break now
 - Snooze
 - Skip
 - Dismiss when break is completed

 ### App Shell

 - Tray/menubar icon with quick status
 - Small settings window
 - Dedicated overlay window for breaks
 - Next break time visible from tray/menubar UI

 ### Settings

 - Break interval
 - Break duration
 - Snooze duration
 - Launch at login
 - Enable or disable break reminders
 - Optional suppression preferences if feasible in v1

 ### Progress Feedback

 - Breaks completed today
 - Current day streak or completion count
 - Next break time
 - No heavy charts in v1

 ### Persistence and Privacy

 - All settings and usage data stored locally on device
 - No account required
 - No cloud sync in v1
 - No camera, microphone, or calendar access in v1

 ## UX Requirements

 - Calm, minimal, premium visual language
 - Fast startup and low resource usage
 - Low-friction onboarding
 - Clear status visibility without requiring a persistent main window
 - Keyboard and mouse friendly interactions
 - Native-feeling behavior on both macOS and Windows

 ## Technical Requirements

 - Electron app with TypeScript
 - Shared core scheduling engine across platforms
 - Small platform-specific native bridges only where required
 - Direct-download packaging for initial release
 - Support code signing and auto-update-friendly architecture
 - Local persistence for settings and lightweight stats

 ## Success Metrics

 ### Product Metrics

 - Daily active installs that keep launch-at-login enabled
 - Break acceptance rate versus skip rate
 - Retention after 7 and 30 days
 - Number of users keeping reminders enabled after first week

 ### Experience Metrics

 - Low complaint rate around mistimed interruptions
 - Low false-positive break prompts during fullscreen work
 - Stable idle and auto-credit behavior across both platforms

 ## Risks

 - Fullscreen and presentation suppression may behave inconsistently across platforms.
 - Idle-credit heuristics may feel wrong if tuned poorly.
 - Electron plus native bridges increases packaging and signing complexity.
 - A too-gentle break flow may reduce adherence if users dismiss prompts too easily.

 ## Open Questions

 - What exact snooze options should be available by default?
 - How aggressive should fullscreen suppression be for edge cases like borderless windows?
 - Should users be able to mark specific apps as always suppressed in a post-v1 release?
 - What level of local history is useful before the app starts to feel too analytics-heavy?

 ## Future Opportunities

 - Calendar-aware meeting suppression
 - App-aware suppression rules
 - Cross-device sync
 - Weekly insights and trends
 - Additional break types such as posture or stretch reminders
 - Team or workplace wellness reporting, if privacy model supports it

 ## Release Recommendation

 Ship Horizon v1 as a direct-download macOS and Windows desktop utility with a tray/menubar-first experience, a calm break overlay, active-time scheduling, and privacy-safe smart suppression. The product should optimize for trust, correctness, and daily usefulness over feature breadth.
