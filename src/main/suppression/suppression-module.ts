import { createMacSuppressionAdapter } from './adapters/mac-suppression-adapter'
import { createPollingSuppressionAdapter } from './adapters/polling-suppression-adapter'
import { createWindowsSuppressionAdapter } from './adapters/windows-suppression-adapter'
import type { SuppressionAdapter, SuppressionModule, SuppressionState } from './suppression-types'

export interface CreateSuppressionModuleOptions {
  adapter?: SuppressionAdapter
  platform?: NodeJS.Platform
}

export function createSuppressionModule(options: CreateSuppressionModuleOptions = {}): SuppressionModule {
  const adapter = options.adapter ?? createPlatformSuppressionAdapter(options.platform ?? process.platform)
  let currentState = normalizeSuppressionState(adapter.getState())
  const listeners = new Set<(state: SuppressionState) => void>()
  const unsubscribe = adapter.subscribe((state) => {
    currentState = normalizeSuppressionState(state)

    for (const listener of listeners) {
      listener(currentState)
    }
  })

  return {
    getState() {
      currentState = normalizeSuppressionState(adapter.getState())
      return currentState
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      unsubscribe()
      listeners.clear()
      adapter.dispose()
    },
  }
}

function createPlatformSuppressionAdapter(platform: NodeJS.Platform): SuppressionAdapter {
  if (platform === 'darwin') {
    return createMacSuppressionAdapter()
  }

  if (platform === 'win32') {
    return createWindowsSuppressionAdapter()
  }

  return createPollingSuppressionAdapter({
    detector: async () => ({
      isSuppressed: false,
      reason: null,
      source: 'fallback',
    }),
    pollMs: 60_000,
  })
}

function normalizeSuppressionState(state: SuppressionState): SuppressionState {
  if (!state.isSuppressed) {
    return {
      isSuppressed: false,
      reason: null,
      source: state.source,
      updatedAt: state.updatedAt,
    }
  }

  return {
    isSuppressed: true,
    reason: state.reason ?? 'unknown',
    source: state.source,
    updatedAt: state.updatedAt,
  }
}
