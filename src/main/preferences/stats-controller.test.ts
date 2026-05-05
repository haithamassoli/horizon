import { describe, expect, it, vi } from 'vitest'
import { createBreakLoopController } from '../break-loop/break-loop'
import { createEmptyStatsSnapshot } from '@shared/contracts/stats'
import { createStatsController } from './stats-controller'

describe('createStatsController', () => {
  it('tracks completed breaks for current day', () => {
    let now = new Date(2026, 4, 5, 9, 0, 0, 0).getTime()
    const breakLoop = createBreakLoopController({
      clock: () => now,
      tickMs: 60_000,
      settings: {
        intervalMs: 60_000,
        breakDurationMs: 20_000,
      },
    })
    const storage = {
      loadSettings: vi.fn(),
      saveSettings: vi.fn(),
      loadStats: vi.fn(),
      saveStats: vi.fn(),
    }
    const stats = createStatsController({
      breakLoop,
      storage,
      initialState: {
        snapshot: createEmptyStatsSnapshot('2026-05-05', now),
        breakLoop: breakLoop.getPersistenceState(),
      },
      clock: () => now,
    })

    breakLoop.performAction('start-now')
    breakLoop.performAction('complete')

    expect(stats.getSnapshot().breaksCompletedToday).toBe(1)

    stats.dispose()
    breakLoop.dispose()
  })

  it('does not double count restored completions', () => {
    const now = new Date(2026, 4, 5, 9, 0, 0, 0).getTime()
    const breakLoop = createBreakLoopController({
      clock: () => now,
      tickMs: 60_000,
      restoredState: {
        completedBreaks: 1,
        lastOutcome: 'break-completed',
        lastOutcomeAt: now - 1000,
      },
    })
    const storage = {
      loadSettings: vi.fn(),
      saveSettings: vi.fn(),
      loadStats: vi.fn(),
      saveStats: vi.fn(),
    }
    const stats = createStatsController({
      breakLoop,
      storage,
      initialState: {
        snapshot: {
          dayKey: '2026-05-05',
          breaksCompletedToday: 1,
          nextBreakAt: breakLoop.getSnapshot().nextBreakAt,
          updatedAt: now,
        },
        breakLoop: breakLoop.getPersistenceState(),
      },
      clock: () => now,
    })

    expect(stats.getSnapshot().breaksCompletedToday).toBe(1)

    stats.dispose()
    breakLoop.dispose()
  })
})
