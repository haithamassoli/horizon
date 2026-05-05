import { DEFAULT_SUPPRESSION_POLL_MS, type SuppressionAdapter, type SuppressionProbeResult, type SuppressionState } from '../suppression-types'

export interface CreatePollingSuppressionAdapterOptions {
  detector: () => Promise<SuppressionProbeResult | null>
  clock?: () => number
  pollMs?: number
  setIntervalFn?: typeof globalThis.setInterval
  clearIntervalFn?: typeof globalThis.clearInterval
}

export function createPollingSuppressionAdapter(
  options: CreatePollingSuppressionAdapterOptions,
): SuppressionAdapter {
  const clock = options.clock ?? Date.now
  const pollMs = options.pollMs ?? DEFAULT_SUPPRESSION_POLL_MS
  const setIntervalFn = options.setIntervalFn ?? globalThis.setInterval
  const clearIntervalFn = options.clearIntervalFn ?? globalThis.clearInterval
  const listeners = new Set<(state: SuppressionState) => void>()
  let state = createUnsuppressedState(clock())
  let disposed = false
  let syncInFlight = false

  const sync = async (): Promise<void> => {
    if (disposed || syncInFlight) {
      return
    }

    syncInFlight = true

    try {
      const result = await options.detector()

      if (!result || disposed) {
        return
      }

      const nextState = normalizeSuppressionState(result, clock())

      if (areSuppressionStatesEqual(state, nextState)) {
        state = nextState
        return
      }

      state = nextState

      for (const listener of listeners) {
        listener(state)
      }
    } finally {
      syncInFlight = false
    }
  }

  const interval = setIntervalFn(() => {
    void sync()
  }, pollMs)

  interval.unref?.()
  void sync()

  return {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      disposed = true
      clearIntervalFn(interval)
      listeners.clear()
    },
  }
}

function createUnsuppressedState(updatedAt: number): SuppressionState {
  return {
    isSuppressed: false,
    reason: null,
    source: 'fallback',
    updatedAt,
  }
}

function normalizeSuppressionState(result: SuppressionProbeResult, updatedAt: number): SuppressionState {
  if (!result.isSuppressed) {
    return {
      isSuppressed: false,
      reason: null,
      source: result.source,
      updatedAt,
    }
  }

  return {
    isSuppressed: true,
    reason: result.reason ?? 'unknown',
    source: result.source,
    updatedAt,
  }
}

function areSuppressionStatesEqual(left: SuppressionState, right: SuppressionState): boolean {
  return (
    left.isSuppressed === right.isSuppressed &&
    left.reason === right.reason &&
    left.source === right.source
  )
}
