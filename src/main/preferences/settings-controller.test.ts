import { describe, expect, it, vi } from 'vitest'
import { createBreakLoopController } from '../break-loop/break-loop'
import { createSettingsController } from './settings-controller'

describe('createSettingsController', () => {
  it('updates Break Loop settings and launch-at-login together', () => {
    const breakLoop = createBreakLoopController({ tickMs: 60_000 })
    const setEnabled = vi.fn((enabled: boolean) => enabled)
    const settings = createSettingsController({
      breakLoop,
      loginItem: {
        getState: () => false,
        setEnabled,
      },
      clock: () => 123,
    })

    const snapshot = settings.update({
      intervalMs: 30 * 60 * 1000,
      breakDurationMs: 30_000,
      snoozeDurationMs: 5 * 60 * 1000,
      remindersEnabled: false,
      launchAtLogin: true,
    })

    expect(setEnabled).toHaveBeenCalledWith(true)
    expect(snapshot.launchAtLogin).toBe(true)
    expect(snapshot.intervalMs).toBe(30 * 60 * 1000)
    expect(snapshot.breakDurationMs).toBe(30_000)
    expect(snapshot.snoozeDurationMs).toBe(5 * 60 * 1000)
    expect(snapshot.remindersEnabled).toBe(false)
    expect(snapshot.updatedAt).toBe(123)

    breakLoop.dispose()
    settings.dispose()
  })
})
