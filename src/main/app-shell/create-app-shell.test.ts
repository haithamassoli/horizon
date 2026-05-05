import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PresenceState } from '@shared/contracts/break'
import { createDefaultSettingsSnapshot } from '@shared/contracts/settings'
import { createEmptyStatsSnapshot } from '@shared/contracts/stats'
import type { PresenceAdapter, NormalizedPresenceEvent } from '../presence/presence-types'
import type { SuppressionAdapter, SuppressionState } from '../suppression/suppression-types'
import { createAppShell } from './create-app-shell'

const overlayWindow = {
  hide: vi.fn(),
  isVisible: vi.fn(() => false),
  moveTop: vi.fn(),
  showInactive: vi.fn(),
}

const trayController = {
  dispose: vi.fn(),
  update: vi.fn(),
}

vi.mock('../ipc/register-app-ipc', () => ({
  registerAppIpc: vi.fn(() => vi.fn()),
}))

vi.mock('./login-item', () => ({
  createLoginItemController: () => ({
    getState: () => false,
    setEnabled: (enabled: boolean) => enabled,
  }),
}))

vi.mock('./tray-controller', () => ({
  createTrayController: () => trayController,
}))

vi.mock('./window-controller', () => ({
  createWindowController: () => ({
    getOverlayWindow: () => overlayWindow,
    getSettingsWindow: vi.fn(),
    hideOverlayWindow: vi.fn(() => overlayWindow.hide()),
    showOverlayWindow: vi.fn(() => overlayWindow.showInactive()),
    showSettingsWindow: vi.fn(),
    dispose: vi.fn(),
  }),
}))

describe('createAppShell', () => {
  afterEach(() => {
    overlayWindow.hide.mockClear()
    overlayWindow.isVisible.mockClear()
    overlayWindow.moveTop.mockClear()
    overlayWindow.showInactive.mockClear()
    trayController.dispose.mockClear()
    trayController.update.mockClear()
  })

  it('moves Break Loop from paused to running when Presence returns active', () => {
    const presenceAdapter = createFakePresenceAdapter({ kind: 'idle', idleMs: 0 })
    const suppressionAdapter = createFakeSuppressionAdapter()
    const storage = createFakeStorage()
    const appShell = createAppShell({
      presence: { adapter: presenceAdapter },
      suppression: { adapter: suppressionAdapter },
      storage,
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

function createFakeStorage() {
  const now = Date.now()

  return {
    loadSettings: () => createDefaultSettingsSnapshot({}, now),
    saveSettings: vi.fn(),
    loadStats: () => ({
      snapshot: createEmptyStatsSnapshot('2026-05-05', now),
      breakLoop: {
        activeElapsedMs: 0,
        breakStartedAt: null,
        breakEndsAt: null,
        snoozeUntil: null,
        completedBreaks: 0,
        lastOutcome: null,
        lastOutcomeAt: null,
      },
    }),
    saveStats: vi.fn(),
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
