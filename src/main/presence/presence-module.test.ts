import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPowerMonitorPresenceAdapter } from './adapters/power-monitor-presence-adapter'

class FakePowerMonitor extends EventEmitter {
  idleSeconds = 0

  getSystemIdleTime(): number {
    return this.idleSeconds
  }

  on(event: 'lock-screen' | 'unlock-screen' | 'suspend' | 'resume', listener: () => void): this {
    return super.on(event, listener)
  }

  off(event: 'lock-screen' | 'unlock-screen' | 'suspend' | 'resume', listener: () => void): this {
    return super.off(event, listener)
  }
}

describe('Presence module adapters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('transitions between active and idle using normalized idle state', () => {
    vi.useFakeTimers()

    const monitor = new FakePowerMonitor()
    const adapter = createPowerMonitorPresenceAdapter({
      powerMonitor: monitor,
      idleThresholdMs: 60_000,
      pollMs: 1_000,
    })
    const events: Array<{ transition: string; kind: string; idleMs: number }> = []

    adapter.subscribe((event) => {
      events.push({
        transition: event.transition,
        kind: event.state.kind,
        idleMs: event.state.idleMs,
      })
    })

    monitor.idleSeconds = 65
    vi.advanceTimersByTime(1_000)

    monitor.idleSeconds = 0
    vi.advanceTimersByTime(1_000)

    expect(events).toEqual([
      { transition: 'idle', kind: 'idle', idleMs: 65_000 },
      { transition: 'active', kind: 'active', idleMs: 0 },
    ])

    adapter.dispose()
  })

  it('handles lock, unlock, sleep, and wake transitions consistently', () => {
    vi.useFakeTimers()

    const monitor = new FakePowerMonitor()
    const adapter = createPowerMonitorPresenceAdapter({
      powerMonitor: monitor,
      idleThresholdMs: 60_000,
      pollMs: 1_000,
    })
    const transitions: string[] = []
    const kinds: string[] = []

    adapter.subscribe((event) => {
      transitions.push(event.transition)
      kinds.push(event.state.kind)
    })

    monitor.emit('lock-screen')
    monitor.idleSeconds = 0
    monitor.emit('unlock-screen')
    monitor.emit('suspend')
    monitor.idleSeconds = 90
    monitor.emit('resume')

    expect(transitions).toEqual(['locked', 'unlocked', 'sleep', 'wake'])
    expect(kinds).toEqual(['locked', 'active', 'sleeping', 'idle'])

    adapter.dispose()
  })
})
