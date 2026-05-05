import {
  createActivePresence,
  createDefaultBreakLoopSettings,
  type BreakActionType,
  type BreakEnvironmentUpdate,
  type BreakLoopSettings,
  type BreakLoopSnapshot,
  type BreakLoopStatus,
  type BreakLoopOutcome,
  type BreakSettingsUpdate,
  type PresenceState,
} from '@shared/contracts/break'
import type { BreakLoopEvent, BreakLoopState } from './break-loop-types'

export interface BreakLoopController {
  getSnapshot: () => BreakLoopSnapshot
  getPersistenceState: () => PersistedBreakLoopState
  performAction: (action: BreakActionType) => BreakLoopSnapshot
  updateEnvironment: (update: BreakEnvironmentUpdate) => BreakLoopSnapshot
  updateSettings: (update: BreakSettingsUpdate) => BreakLoopSnapshot
  subscribe: (listener: (snapshot: BreakLoopSnapshot) => void) => () => void
  dispose: () => void
}

export interface PersistedBreakLoopState {
  activeElapsedMs: number
  breakStartedAt: number | null
  breakEndsAt: number | null
  snoozeUntil: number | null
  completedBreaks: number
  lastOutcome: BreakLoopOutcome | null
  lastOutcomeAt: number | null
}

export interface CreateBreakLoopStateOptions {
  now?: number
  settings?: Partial<BreakLoopSettings>
  presence?: PresenceState
  isSuppressed?: boolean
  restoredState?: Partial<PersistedBreakLoopState>
}

export interface CreateBreakLoopControllerOptions extends CreateBreakLoopStateOptions {
  clock?: () => number
  tickMs?: number
}

export function createBreakLoopState(options: CreateBreakLoopStateOptions = {}): BreakLoopState {
  const now = options.now ?? Date.now()
  const settings = createDefaultBreakLoopSettings(options.settings)
  const restoredState = options.restoredState ?? {}
  const activeElapsedMs = Math.min(Math.max(restoredState.activeElapsedMs ?? 0, 0), settings.intervalMs)

  return restoreBreakLoopState({
    settings,
    presence: options.presence ?? createActivePresence(),
    isSuppressed: options.isSuppressed ?? false,
    activeElapsedMs,
    breakStartedAt: restoredState.breakStartedAt ?? null,
    breakEndsAt: restoredState.breakEndsAt ?? null,
    snoozeUntil: restoredState.snoozeUntil ?? null,
    inactiveSince: null,
    completedBreaks: Math.max(restoredState.completedBreaks ?? 0, 0),
    lastOutcome: restoredState.lastOutcome ?? null,
    lastOutcomeAt: restoredState.lastOutcomeAt ?? null,
    updatedAt: now,
  }, now)
}

export function reduceBreakLoop(state: BreakLoopState, event: BreakLoopEvent): BreakLoopState {
  let next = advanceBreakLoop(state, event.now)

  switch (event.type) {
    case 'tick':
      return reconcileBreakLoopState(next)
    case 'presence-changed':
      next = {
        ...next,
        presence: event.presence,
        inactiveSince: resolveInactiveSince(next.inactiveSince, event.now, event.presence),
      }
      return reconcileBreakLoopState(next)
    case 'suppression-changed':
      return reconcileBreakLoopState({
        ...next,
        isSuppressed: event.isSuppressed,
      })
    case 'settings-changed':
      next = applySettingsChange(next, event.now, event.settings)
      return reconcileBreakLoopState(next)
    case 'break-action':
      next = applyBreakAction(next, event.now, event.action)
      return reconcileBreakLoopState(next)
  }
}

export function toBreakLoopSnapshot(state: BreakLoopState, now = state.updatedAt): BreakLoopSnapshot {
  const presence = toPresenceSnapshot(state, now)
  const status = getBreakLoopStatus(state, now)
  const remainingActiveMs = Math.max(state.settings.intervalMs - state.activeElapsedMs, 0)
  const breakRemainingMs = state.breakEndsAt === null ? 0 : Math.max(state.breakEndsAt - now, 0)
  const snoozeRemainingMs = state.snoozeUntil === null ? 0 : Math.max(state.snoozeUntil - now, 0)

  return {
    status,
    presence,
    isSuppressed: state.isSuppressed,
    settings: state.settings,
    activeElapsedMs: state.activeElapsedMs,
    remainingActiveMs,
    activeProgress: state.settings.intervalMs === 0 ? 0 : state.activeElapsedMs / state.settings.intervalMs,
    breakRemainingMs,
    snoozeRemainingMs,
    nextBreakAt: resolveNextBreakAt(state, now, remainingActiveMs),
    snoozeUntil: state.snoozeUntil,
    breakEndsAt: state.breakEndsAt,
    completedBreaks: state.completedBreaks,
    isAutoCreditEligible: isAutoCreditEligible(state, now),
    lastOutcome: state.lastOutcome,
    lastOutcomeAt: state.lastOutcomeAt,
    updatedAt: now,
  }
}

export function createBreakLoopController(options: CreateBreakLoopControllerOptions = {}): BreakLoopController {
  const clock = options.clock ?? Date.now
  const tickMs = options.tickMs ?? 1000
  let state = createBreakLoopState(options)
  const listeners = new Set<(snapshot: BreakLoopSnapshot) => void>()

  const emit = (): BreakLoopSnapshot => {
    const snapshot = toBreakLoopSnapshot(state)
    for (const listener of listeners) {
      listener(snapshot)
    }
    return snapshot
  }

  const dispatch = (event: BreakLoopEvent): BreakLoopSnapshot => {
    state = reduceBreakLoop(state, event)
    return emit()
  }

  const interval = setInterval(() => {
    dispatch({ type: 'tick', now: clock() })
  }, tickMs)

  interval.unref?.()

  return {
    getSnapshot() {
      state = advanceBreakLoop(state, clock())
      return toBreakLoopSnapshot(state)
    },
    getPersistenceState() {
      state = advanceBreakLoop(state, clock())
      return toPersistedBreakLoopState(state)
    },
    performAction(action) {
      return dispatch({ type: 'break-action', now: clock(), action })
    },
    updateEnvironment(update) {
      let snapshot = this.getSnapshot()

      if (update.presence) {
        snapshot = dispatch({
          type: 'presence-changed',
          now: clock(),
          presence: update.presence,
        })
      }

      if (typeof update.isSuppressed === 'boolean') {
        snapshot = dispatch({
          type: 'suppression-changed',
          now: clock(),
          isSuppressed: update.isSuppressed,
        })
      }

      return snapshot
    },
    updateSettings(update) {
      return dispatch({ type: 'settings-changed', now: clock(), settings: update })
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(this.getSnapshot())
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      clearInterval(interval)
      listeners.clear()
    },
  }
}

export function toPersistedBreakLoopState(state: BreakLoopState): PersistedBreakLoopState {
  return {
    activeElapsedMs: state.activeElapsedMs,
    breakStartedAt: state.breakStartedAt,
    breakEndsAt: state.breakEndsAt,
    snoozeUntil: state.snoozeUntil,
    completedBreaks: state.completedBreaks,
    lastOutcome: state.lastOutcome,
    lastOutcomeAt: state.lastOutcomeAt,
  }
}

function advanceBreakLoop(state: BreakLoopState, now: number): BreakLoopState {
  if (now <= state.updatedAt) {
    return state
  }

  let next = state

  while (next.updatedAt < now) {
    if (next.breakEndsAt !== null && next.breakEndsAt <= now) {
      next = resetCycle(next, next.breakEndsAt, 'break-completed', true)
      continue
    }

    const autoCreditAt = resolveAutoCreditAt(next)

    if (autoCreditAt !== null && autoCreditAt <= now) {
      next = resetCycle(next, autoCreditAt, 'auto-credited', true)
      continue
    }

    if (canAccumulateActiveTime(next, next.updatedAt)) {
      const remainingActiveMs = next.settings.intervalMs - next.activeElapsedMs

      if (remainingActiveMs <= 0) {
        break
      }

      const dueAt = next.updatedAt + remainingActiveMs

      if (dueAt <= now) {
        next = {
          ...next,
          activeElapsedMs: next.settings.intervalMs,
          updatedAt: dueAt,
        }
        continue
      }

      next = {
        ...next,
        activeElapsedMs: next.activeElapsedMs + (now - next.updatedAt),
        updatedAt: now,
      }
      return next
    }

    next = {
      ...next,
      updatedAt: now,
    }
  }

  if (next.updatedAt !== now) {
    next = {
      ...next,
      updatedAt: now,
    }
  }

  return next
}

function applySettingsChange(state: BreakLoopState, now: number, update: Partial<BreakLoopSettings>): BreakLoopState {
  const settings = {
    ...state.settings,
    ...update,
  }

  let next: BreakLoopState = {
    ...state,
    settings,
    activeElapsedMs: Math.min(state.activeElapsedMs, settings.intervalMs),
  }

  if (state.breakStartedAt !== null) {
    next = {
      ...next,
      breakEndsAt: state.breakStartedAt + settings.breakDurationMs,
    }
  }

  if (!settings.remindersEnabled) {
    return resetCycle(next, now, 'reset', false)
  }

  if (next.breakEndsAt !== null && next.breakEndsAt <= now) {
    return resetCycle(next, next.breakEndsAt, 'break-completed', true)
  }

  return next
}

function applyBreakAction(state: BreakLoopState, now: number, action: BreakActionType): BreakLoopState {
  switch (action) {
    case 'start-now':
      return {
        ...state,
        breakStartedAt: now,
        breakEndsAt: now + state.settings.breakDurationMs,
        snoozeUntil: null,
        updatedAt: now,
      }
    case 'snooze':
      if (state.breakEndsAt !== null || state.activeElapsedMs < state.settings.intervalMs) {
        return state
      }

      return {
        ...state,
        snoozeUntil: now + state.settings.snoozeDurationMs,
        updatedAt: now,
      }
    case 'skip':
      return resetCycle(state, now, 'skipped', false)
    case 'complete':
      return resetCycle(state, now, 'break-completed', true)
    case 'reset':
      return resetCycle(state, now, 'reset', false)
  }
}

function resetCycle(
  state: BreakLoopState,
  now: number,
  outcome: BreakLoopOutcome,
  incrementCompletedBreaks: boolean,
): BreakLoopState {
  return {
    ...state,
    activeElapsedMs: 0,
    breakStartedAt: null,
    breakEndsAt: null,
    snoozeUntil: null,
    completedBreaks: incrementCompletedBreaks ? state.completedBreaks + 1 : state.completedBreaks,
    lastOutcome: outcome,
    lastOutcomeAt: now,
    updatedAt: now,
  }
}

function reconcileBreakLoopState(state: BreakLoopState): BreakLoopState {
  let next = state

  if (isPresenceActive(next.presence)) {
    next = {
      ...next,
      inactiveSince: null,
      presence: {
        kind: next.presence.kind,
        idleMs: 0,
      },
    }
  } else if (next.inactiveSince !== null) {
    next = {
      ...next,
      presence: {
        kind: next.presence.kind,
        idleMs: next.updatedAt - next.inactiveSince,
      },
    }
  }

  if (next.snoozeUntil !== null && next.snoozeUntil <= next.updatedAt) {
    next = {
      ...next,
      snoozeUntil: null,
    }
  }

  return next
}

function restoreBreakLoopState(state: BreakLoopState, now: number): BreakLoopState {
  let next = reconcileBreakLoopState(state)

  if (next.breakEndsAt !== null && next.breakEndsAt <= now) {
    next = resetCycle(next, next.breakEndsAt, 'break-completed', true)
  }

  if (next.snoozeUntil !== null && next.snoozeUntil <= now) {
    next = {
      ...next,
      snoozeUntil: null,
      updatedAt: now,
    }
  }

  return next
}

function resolveInactiveSince(currentInactiveSince: number | null, now: number, presence: PresenceState): number | null {
  if (isPresenceActive(presence)) {
    return null
  }

  if (presence.idleMs > 0) {
    return now - presence.idleMs
  }

  return currentInactiveSince ?? now
}

function canAccumulateActiveTime(state: BreakLoopState, now: number): boolean {
  return (
    state.settings.remindersEnabled &&
    isPresenceActive(state.presence) &&
    state.breakEndsAt === null &&
    !isSnoozed(state, now) &&
    state.activeElapsedMs < state.settings.intervalMs
  )
}

function resolveAutoCreditAt(state: BreakLoopState): number | null {
  if (
    !state.settings.remindersEnabled ||
    state.inactiveSince === null ||
    state.breakEndsAt !== null ||
    state.activeElapsedMs < state.settings.intervalMs - state.settings.autoCreditWindowMs
  ) {
    return null
  }

  return state.inactiveSince + state.settings.breakDurationMs
}

function isAutoCreditEligible(state: BreakLoopState, now: number): boolean {
  if (
    !state.settings.remindersEnabled ||
    state.inactiveSince === null ||
    state.breakEndsAt !== null ||
    now - state.inactiveSince < state.settings.breakDurationMs
  ) {
    return false
  }

  return state.activeElapsedMs >= state.settings.intervalMs - state.settings.autoCreditWindowMs
}

function getBreakLoopStatus(state: BreakLoopState, now: number): BreakLoopStatus {
  if (state.breakEndsAt !== null) {
    return 'on-break'
  }

  if (isSnoozed(state, now)) {
    return 'snoozed'
  }

  if (state.activeElapsedMs >= state.settings.intervalMs) {
    return state.isSuppressed ? 'suppressed' : 'due'
  }

  if (!state.settings.remindersEnabled || !isPresenceActive(state.presence)) {
    return 'paused'
  }

  return 'running'
}

function resolveNextBreakAt(state: BreakLoopState, now: number, remainingActiveMs: number): number | null {
  if (state.breakEndsAt !== null) {
    return state.breakEndsAt
  }

  if (isSnoozed(state, now)) {
    return state.snoozeUntil
  }

  if (state.activeElapsedMs >= state.settings.intervalMs) {
    return now
  }

  if (!state.settings.remindersEnabled || !isPresenceActive(state.presence)) {
    return null
  }

  return now + remainingActiveMs
}

function toPresenceSnapshot(state: BreakLoopState, now: number): PresenceState {
  if (isPresenceActive(state.presence) || state.inactiveSince === null) {
    return {
      kind: state.presence.kind,
      idleMs: 0,
    }
  }

  return {
    kind: state.presence.kind,
    idleMs: now - state.inactiveSince,
  }
}

function isPresenceActive(presence: PresenceState): boolean {
  return presence.kind === 'active'
}

function isSnoozed(state: BreakLoopState, now: number): boolean {
  return state.snoozeUntil !== null && state.snoozeUntil > now
}
