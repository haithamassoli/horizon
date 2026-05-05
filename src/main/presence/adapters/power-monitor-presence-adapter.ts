import { powerMonitor } from 'electron'
import { createActivePresence, type PresenceState } from '@shared/contracts/break'
import {
  DEFAULT_IDLE_THRESHOLD_MS,
  DEFAULT_PRESENCE_POLL_MS,
  type NormalizedPresenceEvent,
  type PresenceAdapter,
  type PresenceEventSource,
  type PresenceTransition,
} from '../presence-types'

type PowerMonitorEvent = 'lock-screen' | 'unlock-screen' | 'suspend' | 'resume'

interface PowerMonitorLike {
  getSystemIdleTime: () => number
  on: (event: PowerMonitorEvent, listener: () => void) => void
  off: (event: PowerMonitorEvent, listener: () => void) => void
}

export interface CreatePowerMonitorPresenceAdapterOptions {
  powerMonitor?: PowerMonitorLike
  clock?: () => number
  idleThresholdMs?: number
  pollMs?: number
  setIntervalFn?: typeof globalThis.setInterval
  clearIntervalFn?: typeof globalThis.clearInterval
}

export function createPowerMonitorPresenceAdapter(
  options: CreatePowerMonitorPresenceAdapterOptions = {},
): PresenceAdapter {
  const monitor = options.powerMonitor ?? powerMonitor
  const clock = options.clock ?? Date.now
  const idleThresholdMs = options.idleThresholdMs ?? DEFAULT_IDLE_THRESHOLD_MS
  const pollMs = options.pollMs ?? DEFAULT_PRESENCE_POLL_MS
  const setIntervalFn = options.setIntervalFn ?? globalThis.setInterval
  const clearIntervalFn = options.clearIntervalFn ?? globalThis.clearInterval
  const listeners = new Set<(event: NormalizedPresenceEvent) => void>()
  let state: PresenceState = createActivePresence()

  const emit = (
    transition: PresenceTransition,
    source: PresenceEventSource,
    nextState: PresenceState,
    forceEmit = false,
  ): void => {
    const normalizedState = normalizePresenceState(nextState)
    const stateChanged = normalizedState.kind !== state.kind

    state = normalizedState

    if (!stateChanged && !forceEmit) {
      return
    }

    const event: NormalizedPresenceEvent = {
      transition,
      state: normalizedState,
      at: clock(),
      source,
    }

    for (const listener of listeners) {
      listener(event)
    }
  }

  const syncFromIdleTime = (source: PresenceEventSource, transition: PresenceTransition, forceEmit = false): void => {
    if (state.kind === 'locked' || state.kind === 'sleeping') {
      return
    }

    const idleMs = Math.max(0, Math.floor(monitor.getSystemIdleTime() * 1000))
    const idleTransition = transition === 'active' ? 'idle' : transition

    if (idleMs >= idleThresholdMs) {
      emit(idleTransition, source, { kind: 'idle', idleMs }, forceEmit)
      return
    }

    emit(transition, source, createActivePresence(), forceEmit)
  }

  const handleLocked = (): void => {
    emit('locked', 'power-monitor', { kind: 'locked', idleMs: 0 })
  }

  const handleUnlocked = (): void => {
    const previousState = state

    if (previousState.kind === 'locked') {
      state = createActivePresence()
    }

    syncFromIdleTime('power-monitor', 'unlocked', true)
  }

  const handleSleep = (): void => {
    emit('sleep', 'power-monitor', { kind: 'sleeping', idleMs: 0 })
  }

  const handleWake = (): void => {
    const previousState = state

    if (previousState.kind === 'sleeping') {
      state = createActivePresence()
    }

    syncFromIdleTime('power-monitor', 'wake', true)
  }

  syncFromIdleTime('poll', 'active')

  const interval = setIntervalFn(() => {
    syncFromIdleTime('poll', 'active')
  }, pollMs)

  interval.unref?.()

  monitor.on('lock-screen', handleLocked)
  monitor.on('unlock-screen', handleUnlocked)
  monitor.on('suspend', handleSleep)
  monitor.on('resume', handleWake)

  return {
    getState() {
      if (state.kind === 'locked' || state.kind === 'sleeping') {
        return state
      }

      const idleMs = Math.max(0, Math.floor(monitor.getSystemIdleTime() * 1000))

      if (idleMs >= idleThresholdMs) {
        state = { kind: 'idle', idleMs }
        return state
      }

      state = createActivePresence()
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      clearIntervalFn(interval)
      monitor.off('lock-screen', handleLocked)
      monitor.off('unlock-screen', handleUnlocked)
      monitor.off('suspend', handleSleep)
      monitor.off('resume', handleWake)
      listeners.clear()
    },
  }
}

function normalizePresenceState(state: PresenceState): PresenceState {
  if (state.kind === 'active') {
    return createActivePresence()
  }

  return {
    kind: state.kind,
    idleMs: Math.max(0, Math.floor(state.idleMs)),
  }
}
