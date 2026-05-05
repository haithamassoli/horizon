import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Result } from '@shared/contracts/result'
import { createActivePresence, type BreakLoopSnapshot } from '@shared/contracts/break'
import { createDefaultSettingsSnapshot } from '@shared/contracts/settings'
import { createEmptyStatsSnapshot } from '@shared/contracts/stats'
import { registerAppIpc } from './register-app-ipc'

const handlers = new Map<string, (event: unknown, payload?: unknown) => Promise<Result<unknown>>>()

vi.mock('electron', () => ({
  app: {
    getName: () => 'Horizon',
    getVersion: () => '0.1.0',
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
  ipcMain: {
    handle: (channel: string, handler: (event: unknown, payload?: unknown) => Promise<Result<unknown>>) => {
      handlers.set(channel, handler)
    },
    removeHandler: (channel: string) => {
      handlers.delete(channel)
    },
  },
}))

describe('registerAppIpc', () => {
  beforeEach(() => {
    handlers.clear()
  })

  it('rejects unknown settings fields and non-object environment payloads', async () => {
    const dispose = registerAppIpc(createOptions())

    const settingsHandler = handlers.get('settings:update')
    const environmentHandler = handlers.get('break:set-environment')

    expect(settingsHandler).toBeTypeOf('function')
    expect(environmentHandler).toBeTypeOf('function')

    await expect(settingsHandler!({}, { theme: 'dark' })).resolves.toEqual({
      success: false,
      error: 'Unknown settings field: theme.',
    })
    await expect(environmentHandler!({}, 'bad-payload')).resolves.toEqual({
      success: false,
      error: 'environment update must be an object.',
    })

    dispose()
  })

  it('wraps controller failures in result objects', async () => {
    const dispose = registerAppIpc(
      createOptions({
        settings: {
          getSnapshot: () => createDefaultSettingsSnapshot({}, 123),
          update: () => {
            throw new Error('disk full')
          },
          subscribe: () => () => {},
          dispose: () => {},
        },
      }),
    )

    const settingsHandler = handlers.get('settings:update')
    expect(settingsHandler).toBeTypeOf('function')

    await expect(settingsHandler!({}, { launchAtLogin: true })).resolves.toEqual({
      success: false,
      error: 'disk full',
    })

    dispose()
    expect(handlers.size).toBe(0)
  })
})

function createOptions(overrides: Partial<Parameters<typeof registerAppIpc>[0]> = {}) {
  const breakSnapshot: BreakLoopSnapshot = {
    status: 'running',
    presence: createActivePresence(),
    isSuppressed: false,
    settings: createDefaultSettingsSnapshot({}, 123),
    activeElapsedMs: 0,
    remainingActiveMs: 20 * 60 * 1000,
    activeProgress: 0,
    breakRemainingMs: 0,
    snoozeRemainingMs: 0,
    nextBreakAt: null,
    snoozeUntil: null,
    breakEndsAt: null,
    completedBreaks: 0,
    isAutoCreditEligible: false,
    lastOutcome: null,
    lastOutcomeAt: null,
    updatedAt: 123,
  }

  return {
    breakLoop: {
      getSnapshot: () => breakSnapshot,
      getPersistenceState: vi.fn(),
      performAction: () => breakSnapshot,
      updateEnvironment: () => breakSnapshot,
      updateSettings: () => breakSnapshot,
      subscribe: () => () => {},
      dispose: () => {},
    },
    settings: {
      getSnapshot: () => createDefaultSettingsSnapshot({}, 123),
      update: () => createDefaultSettingsSnapshot({}, 124),
      subscribe: () => () => {},
      dispose: () => {},
    },
    stats: {
      getSnapshot: () => createEmptyStatsSnapshot('2026-05-05', 123),
      subscribe: () => () => {},
      dispose: () => {},
    },
    ...overrides,
  }
}
