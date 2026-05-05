import { describe, expect, it } from 'vitest'
import { createDefaultBreakLoopSettings } from '@shared/contracts/break'
import { createBreakLoopController, createBreakLoopState, reduceBreakLoop, toBreakLoopSnapshot } from './break-loop'

describe('Break Loop', () => {
  it('accumulates active time until break becomes due', () => {
    let state = createBreakLoopState({ now: 0 })

    state = reduceBreakLoop(state, { type: 'tick', now: 19 * 60 * 1000 })
    expect(toBreakLoopSnapshot(state).status).toBe('running')

    state = reduceBreakLoop(state, { type: 'tick', now: 20 * 60 * 1000 })

    const snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('due')
    expect(snapshot.activeElapsedMs).toBe(snapshot.settings.intervalMs)
    expect(snapshot.remainingActiveMs).toBe(0)
  })

  it('pauses while inactive and resumes from prior progress', () => {
    let state = createBreakLoopState({ now: 0 })

    state = reduceBreakLoop(state, { type: 'tick', now: 5 * 60 * 1000 })
    state = reduceBreakLoop(state, {
      type: 'presence-changed',
      now: 5 * 60 * 1000,
      presence: { kind: 'idle', idleMs: 0 },
    })
    state = reduceBreakLoop(state, { type: 'tick', now: 10 * 60 * 1000 })

    let snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('paused')
    expect(snapshot.activeElapsedMs).toBe(5 * 60 * 1000)

    state = reduceBreakLoop(state, {
      type: 'presence-changed',
      now: 10 * 60 * 1000,
      presence: { kind: 'active', idleMs: 0 },
    })
    state = reduceBreakLoop(state, { type: 'tick', now: 15 * 60 * 1000 })

    snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('running')
    expect(snapshot.activeElapsedMs).toBe(10 * 60 * 1000)
  })

  it('supports snooze and returns to due when snooze expires', () => {
    let state = createBreakLoopState({ now: 0 })

    state = reduceBreakLoop(state, { type: 'tick', now: 20 * 60 * 1000 })
    state = reduceBreakLoop(state, { type: 'break-action', now: 20 * 60 * 1000, action: 'snooze' })

    let snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('snoozed')
    expect(snapshot.snoozeRemainingMs).toBe(snapshot.settings.snoozeDurationMs)

    state = reduceBreakLoop(state, { type: 'tick', now: 22 * 60 * 1000 })
    snapshot = toBreakLoopSnapshot(state)

    expect(snapshot.status).toBe('due')
    expect(snapshot.snoozeRemainingMs).toBe(0)
  })

  it('resets cycle cleanly after skip', () => {
    let state = createBreakLoopState({ now: 0 })

    state = reduceBreakLoop(state, { type: 'tick', now: 20 * 60 * 1000 })
    state = reduceBreakLoop(state, { type: 'break-action', now: 20 * 60 * 1000, action: 'skip' })

    const snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('running')
    expect(snapshot.activeElapsedMs).toBe(0)
    expect(snapshot.completedBreaks).toBe(0)
    expect(snapshot.lastOutcome).toBe('skipped')
  })

  it('auto-credits meaningful idle near due time', () => {
    let state = createBreakLoopState({ now: 0 })

    state = reduceBreakLoop(state, { type: 'tick', now: 19 * 60 * 1000 })
    state = reduceBreakLoop(state, {
      type: 'presence-changed',
      now: 19 * 60 * 1000,
      presence: { kind: 'idle', idleMs: 0 },
    })
    state = reduceBreakLoop(state, { type: 'tick', now: 19 * 60 * 1000 + 20 * 1000 })

    const snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('paused')
    expect(snapshot.completedBreaks).toBe(1)
    expect(snapshot.lastOutcome).toBe('auto-credited')
    expect(snapshot.activeElapsedMs).toBe(0)
  })

  it('holds due state behind suppression until suppression clears', () => {
    let state = createBreakLoopState({ now: 0, isSuppressed: true })

    state = reduceBreakLoop(state, { type: 'tick', now: 20 * 60 * 1000 })
    expect(toBreakLoopSnapshot(state).status).toBe('suppressed')

    state = reduceBreakLoop(state, { type: 'suppression-changed', now: 20 * 60 * 1000, isSuppressed: false })
    expect(toBreakLoopSnapshot(state).status).toBe('due')
  })

  it('cuts active accumulation at delayed idle boundary instead of detection time', () => {
    let now = 0
    const breakLoop = createBreakLoopController({ clock: () => now, tickMs: 60_000 })

    now = 5 * 60 * 1000
    breakLoop.getSnapshot()

    now = 7 * 60 * 1000
    breakLoop.updateEnvironment({
      presence: { kind: 'idle', idleMs: 60 * 1000 },
    })

    const snapshot = breakLoop.getSnapshot()
    expect(snapshot.status).toBe('paused')
    expect(snapshot.activeElapsedMs).toBe(6 * 60 * 1000)

    breakLoop.dispose()
  })

  it('auto-credits long idle detected after break became nearly due', () => {
    let now = 0
    const breakLoop = createBreakLoopController({ clock: () => now, tickMs: 60_000 })

    now = 19 * 60 * 1000 + 50 * 1000
    breakLoop.getSnapshot()

    now = 20 * 60 * 1000 + 10 * 1000
    breakLoop.updateEnvironment({
      presence: { kind: 'idle', idleMs: 20 * 1000 },
    })

    const snapshot = breakLoop.getSnapshot()
    expect(snapshot.status).toBe('paused')
    expect(snapshot.completedBreaks).toBe(1)
    expect(snapshot.lastOutcome).toBe('auto-credited')
    expect(snapshot.activeElapsedMs).toBe(0)

    breakLoop.dispose()
  })

  it('completes break countdown and starts fresh cycle', () => {
    let state = createBreakLoopState({ now: 0 })

    state = reduceBreakLoop(state, { type: 'tick', now: 20 * 60 * 1000 })
    state = reduceBreakLoop(state, { type: 'break-action', now: 20 * 60 * 1000, action: 'start-now' })

    expect(toBreakLoopSnapshot(state).status).toBe('on-break')

    state = reduceBreakLoop(state, { type: 'tick', now: 20 * 60 * 1000 + 20 * 1000 })

    const snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('running')
    expect(snapshot.completedBreaks).toBe(1)
    expect(snapshot.lastOutcome).toBe('break-completed')
    expect(snapshot.activeElapsedMs).toBe(0)
  })

  it('applies updated interval, break duration, and snooze duration', () => {
    const settings = createDefaultBreakLoopSettings({
      intervalMs: 30 * 60 * 1000,
      breakDurationMs: 30 * 1000,
      snoozeDurationMs: 5 * 60 * 1000,
    })
    let state = createBreakLoopState({ now: 0, settings })

    state = reduceBreakLoop(state, { type: 'tick', now: 15 * 60 * 1000 })
    state = reduceBreakLoop(state, {
      type: 'settings-changed',
      now: 15 * 60 * 1000,
      settings: {
        intervalMs: 10 * 60 * 1000,
        breakDurationMs: 15 * 1000,
        snoozeDurationMs: 60 * 1000,
      },
    })

    const snapshot = toBreakLoopSnapshot(state)
    expect(snapshot.status).toBe('due')
    expect(snapshot.settings.intervalMs).toBe(10 * 60 * 1000)
    expect(snapshot.settings.breakDurationMs).toBe(15 * 1000)
    expect(snapshot.settings.snoozeDurationMs).toBe(60 * 1000)
  })
})
