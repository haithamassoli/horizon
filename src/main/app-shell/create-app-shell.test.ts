import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PresenceState } from '@shared/contracts/break'
import type { PresenceAdapter, NormalizedPresenceEvent } from '../presence/presence-types'
import type { SuppressionAdapter, SuppressionState } from '../suppression/suppression-types'
import { createAppShell } from './create-app-shell'

const overlayWindow = {
  hide: vi.fn(),
  isVisible: vi.fn(() => false),
  showInactive: vi.fn(),
}

vi.mock('../ipc/register-app-ipc', () => ({
  registerAppIpc: vi.fn(),
}))

vi.mock('./window-controller', () => ({
  createWindowController: () => ({
    getOverlayWindow: () => overlayWindow,
    getSettingsWindow: vi.fn(),
    showSettingsWindow: vi.fn(),
  }),
}))

describe('createAppShell', () => {
  afterEach(() => {
    overlayWindow.hide.mockClear()
    overlayWindow.isVisible.mockClear()
    overlayWindow.showInactive.mockClear()
  })

  it('moves Break Loop from paused to running when Presence returns active', () => {
    const presenceAdapter = createFakePresenceAdapter({ kind: 'idle', idleMs: 0 })
    const suppressionAdapter = createFakeSuppressionAdapter()
    const appShell = createAppShell({
      presence: { adapter: presenceAdapter },
      suppression: { adapter: suppressionAdapter },
    })

    expect(appShell.breakLoop.getSnapshot().status).toBe('paused')

    presenceAdapter.emit({ kind: 'active', idleMs: 0 })

    expect(appShell.breakLoop.getSnapshot().status).toBe('running')

    appShell.dispose()
  })
})

function createFakePresenceAdapter(initialState: PresenceState): PresenceAdapter & { emit: (state: PresenceState) => void } {
  let state = initialState
  const listeners = new Set<(event: NormalizedPresenceEvent) => void>()

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
    emit(nextState) {
      state = nextState

      const transition = nextState.kind === 'active' ? 'active' : 'idle'

      for (const listener of listeners) {
        listener({
          transition,
          state: nextState,
          at: Date.now(),
          source: 'poll',
        })
      }
    },
    dispose() {
      listeners.clear()
    },
  }
}

function createFakeSuppressionAdapter(): SuppressionAdapter {
  const state: SuppressionState = {
    isSuppressed: false,
    reason: null,
    source: 'fallback',
    updatedAt: Date.now(),
  }

  return {
    getState() {
      return state
    },
    subscribe() {
      return () => {}
    },
    dispose() {},
  }
}
