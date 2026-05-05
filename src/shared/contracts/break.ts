export const DEFAULT_BREAK_INTERVAL_MS = 20 * 60 * 1000
export const DEFAULT_BREAK_DURATION_MS = 20 * 1000
export const DEFAULT_SNOOZE_DURATION_MS = 2 * 60 * 1000
export const DEFAULT_AUTO_CREDIT_WINDOW_MS = 2 * 60 * 1000

export type PresenceKind = 'active' | 'idle' | 'locked' | 'sleeping'

export interface PresenceState {
  kind: PresenceKind
  idleMs: number
}

export interface BreakLoopSettings {
  remindersEnabled: boolean
  intervalMs: number
  breakDurationMs: number
  snoozeDurationMs: number
  autoCreditWindowMs: number
}

export type BreakLoopStatus = 'running' | 'paused' | 'due' | 'snoozed' | 'suppressed' | 'on-break'

export type BreakActionType = 'start-now' | 'snooze' | 'skip' | 'complete' | 'reset'

export type BreakLoopOutcome = 'break-completed' | 'auto-credited' | 'skipped' | 'reset'

export interface BreakSettingsUpdate {
  remindersEnabled?: boolean
  intervalMs?: number
  breakDurationMs?: number
  snoozeDurationMs?: number
}

export interface BreakLoopSnapshot {
  status: BreakLoopStatus
  presence: PresenceState
  isSuppressed: boolean
  settings: BreakLoopSettings
  activeElapsedMs: number
  remainingActiveMs: number
  activeProgress: number
  breakRemainingMs: number
  snoozeRemainingMs: number
  nextBreakAt: number | null
  snoozeUntil: number | null
  breakEndsAt: number | null
  completedBreaks: number
  isAutoCreditEligible: boolean
  lastOutcome: BreakLoopOutcome | null
  lastOutcomeAt: number | null
  updatedAt: number
}

export interface BreakEnvironmentUpdate {
  presence?: PresenceState
  isSuppressed?: boolean
}

export function createDefaultBreakLoopSettings(overrides: Partial<BreakLoopSettings> = {}): BreakLoopSettings {
  return {
    remindersEnabled: true,
    intervalMs: DEFAULT_BREAK_INTERVAL_MS,
    breakDurationMs: DEFAULT_BREAK_DURATION_MS,
    snoozeDurationMs: DEFAULT_SNOOZE_DURATION_MS,
    autoCreditWindowMs: DEFAULT_AUTO_CREDIT_WINDOW_MS,
    ...overrides,
  }
}

export function createActivePresence(): PresenceState {
  return {
    kind: 'active',
    idleMs: 0,
  }
}
