import type { HorizonStatsSnapshot } from '@shared/contracts/stats'
import type { BreakLoopSnapshot } from '@shared/contracts/break'
import type { BreakLoopController, PersistedBreakLoopState } from '../break-loop/break-loop'
import type { StoredStatsState, StorageAdapter } from './storage-adapter'

export interface StatsController {
  getSnapshot: () => HorizonStatsSnapshot
  subscribe: (listener: (snapshot: HorizonStatsSnapshot) => void) => () => void
  dispose: () => void
}

export interface CreateStatsControllerOptions {
  breakLoop: BreakLoopController
  storage: StorageAdapter
  initialState: StoredStatsState
  clock?: () => number
}

export function createStatsController(options: CreateStatsControllerOptions): StatsController {
  const clock = options.clock ?? Date.now
  const listeners = new Set<(snapshot: HorizonStatsSnapshot) => void>()
  let snapshot = normalizeSnapshot(options.initialState.snapshot, clock())
  let lastRecordedCompletionAt = getRecordedCompletionAt(options.initialState.breakLoop)
  let lastPersistenceKey = ''

  const emit = (): HorizonStatsSnapshot => {
    for (const listener of listeners) {
      listener(snapshot)
    }

    return snapshot
  }

  const persistSnapshot = (nextSnapshot: HorizonStatsSnapshot, breakLoop: PersistedBreakLoopState, breakSnapshot: BreakLoopSnapshot) => {
    const persistenceKey = getPersistenceKey(nextSnapshot, breakLoop, breakSnapshot)

    if (persistenceKey === lastPersistenceKey) {
      return
    }

    lastPersistenceKey = persistenceKey
    options.storage.saveStats({ snapshot: nextSnapshot, breakLoop })
  }

  const syncFromBreakLoop = (persistedBreakLoop: PersistedBreakLoopState): HorizonStatsSnapshot => {
    const breakSnapshot = options.breakLoop.getSnapshot()
    const now = clock()
    const dayKey = createDayKey(now)
    let breaksCompletedToday = snapshot.dayKey === dayKey ? snapshot.breaksCompletedToday : 0

    if (
      isCompletionOutcome(breakSnapshot.lastOutcome) &&
      breakSnapshot.lastOutcomeAt !== null &&
      breakSnapshot.lastOutcomeAt !== lastRecordedCompletionAt
    ) {
      if (createDayKey(breakSnapshot.lastOutcomeAt) === dayKey) {
        breaksCompletedToday += 1
      }

      lastRecordedCompletionAt = breakSnapshot.lastOutcomeAt
    }

    snapshot = {
      dayKey,
      breaksCompletedToday,
      nextBreakAt: breakSnapshot.nextBreakAt,
      updatedAt: now,
    }

    persistSnapshot(snapshot, persistedBreakLoop, breakSnapshot)

    return emit()
  }

  const unsubscribeBreakLoop = options.breakLoop.subscribe(() => {
    syncFromBreakLoop(options.breakLoop.getPersistenceState())
  })

  return {
    getSnapshot() {
      return snapshot
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot)

      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      unsubscribeBreakLoop()
      listeners.clear()
    },
  }
}

function normalizeSnapshot(snapshot: HorizonStatsSnapshot, now: number): HorizonStatsSnapshot {
  const dayKey = createDayKey(now)

  return {
    dayKey,
    breaksCompletedToday: snapshot.dayKey === dayKey ? snapshot.breaksCompletedToday : 0,
    nextBreakAt: snapshot.nextBreakAt,
    updatedAt: now,
  }
}

function getRecordedCompletionAt(breakLoop: PersistedBreakLoopState): number | null {
  if (isCompletionOutcome(breakLoop.lastOutcome)) {
    return breakLoop.lastOutcomeAt
  }

  return null
}

function isCompletionOutcome(outcome: string | null): boolean {
  return outcome === 'break-completed' || outcome === 'auto-credited'
}

function createDayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPersistenceKey(
  snapshot: HorizonStatsSnapshot,
  breakLoop: PersistedBreakLoopState,
  breakSnapshot: BreakLoopSnapshot,
): string {
  const activeBucketMs =
    breakSnapshot.status === 'running' ? Math.floor(breakLoop.activeElapsedMs / 15_000) * 15_000 : breakLoop.activeElapsedMs

  return [
    snapshot.dayKey,
    snapshot.breaksCompletedToday,
    breakSnapshot.status,
    activeBucketMs,
    breakLoop.breakStartedAt,
    breakLoop.breakEndsAt,
    breakLoop.snoozeUntil,
    breakLoop.completedBreaks,
    breakLoop.lastOutcome,
    breakLoop.lastOutcomeAt,
  ].join(':')
}
