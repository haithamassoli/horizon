import { createActivePresence, type PresenceState } from '@shared/contracts/break'
import { createMacPresenceAdapter } from './adapters/mac-presence-adapter'
import { createPowerMonitorPresenceAdapter } from './adapters/power-monitor-presence-adapter'
import { createWindowsPresenceAdapter } from './adapters/windows-presence-adapter'
import type { NormalizedPresenceEvent, PresenceAdapter, PresenceModule } from './presence-types'

export interface CreatePresenceModuleOptions {
  adapter?: PresenceAdapter
  platform?: NodeJS.Platform
}

export function createPresenceModule(options: CreatePresenceModuleOptions = {}): PresenceModule {
  const adapter = options.adapter ?? createPlatformPresenceAdapter(options.platform ?? process.platform)
  let currentState = normalizePresenceState(adapter.getState())
  const listeners = new Set<(presence: PresenceState, event: NormalizedPresenceEvent) => void>()
  const unsubscribe = adapter.subscribe((event) => {
    currentState = normalizePresenceState(event.state)
    const normalizedEvent: NormalizedPresenceEvent = {
      ...event,
      state: currentState,
    }

    for (const listener of listeners) {
      listener(currentState, normalizedEvent)
    }
  })

  return {
    getState() {
      currentState = normalizePresenceState(adapter.getState())
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

function createPlatformPresenceAdapter(platform: NodeJS.Platform): PresenceAdapter {
  if (platform === 'darwin') {
    return createMacPresenceAdapter()
  }

  if (platform === 'win32') {
    return createWindowsPresenceAdapter()
  }

  return createPowerMonitorPresenceAdapter()
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
