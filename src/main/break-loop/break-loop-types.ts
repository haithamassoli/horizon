import type { BreakActionType, BreakLoopOutcome, BreakLoopSettings, PresenceState } from '@shared/contracts/break'

export interface BreakLoopState {
  settings: BreakLoopSettings
  presence: PresenceState
  isSuppressed: boolean
  activeElapsedMs: number
  breakStartedAt: number | null
  breakEndsAt: number | null
  snoozeUntil: number | null
  inactiveSince: number | null
  completedBreaks: number
  lastOutcome: BreakLoopOutcome | null
  lastOutcomeAt: number | null
  updatedAt: number
}

export type BreakLoopEvent =
  | { type: 'tick'; now: number }
  | { type: 'presence-changed'; now: number; presence: PresenceState }
  | { type: 'suppression-changed'; now: number; isSuppressed: boolean }
  | { type: 'settings-changed'; now: number; settings: Partial<BreakLoopSettings> }
  | { type: 'break-action'; now: number; action: BreakActionType }
