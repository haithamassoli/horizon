import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPollingSuppressionAdapter } from './adapters/polling-suppression-adapter'
import type { SuppressionProbeResult } from './suppression-types'

describe('Suppression module adapters', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('normalizes fullscreen suppression and clears when detector resets', async () => {
    vi.useFakeTimers()

    const results: SuppressionProbeResult[] = [
      { isSuppressed: true, reason: 'fullscreen', source: 'native-bridge' },
      { isSuppressed: false, reason: null, source: 'native-bridge' },
    ]
    const states: Array<{ isSuppressed: boolean; reason: string | null; source: string }> = []
    const adapter = createPollingSuppressionAdapter({
      detector: vi.fn(async () => results.shift() ?? null),
      pollMs: 1_000,
    })

    adapter.subscribe((state) => {
      states.push({
        isSuppressed: state.isSuppressed,
        reason: state.reason,
        source: state.source,
      })
    })

    await vi.advanceTimersByTimeAsync(2_000)

    expect(states).toEqual([
      { isSuppressed: true, reason: 'fullscreen', source: 'native-bridge' },
      { isSuppressed: false, reason: null, source: 'native-bridge' },
    ])

    adapter.dispose()
  })

  it('keeps last state when native bridge is unavailable', async () => {
    vi.useFakeTimers()

    const detector = vi
      .fn<() => Promise<SuppressionProbeResult | null>>()
      .mockResolvedValueOnce({ isSuppressed: true, reason: null, source: 'native-bridge' })
      .mockResolvedValueOnce(null)

    const states: Array<{ isSuppressed: boolean; reason: string | null }> = []
    const adapter = createPollingSuppressionAdapter({
      detector,
      pollMs: 1_000,
    })

    adapter.subscribe((state) => {
      states.push({
        isSuppressed: state.isSuppressed,
        reason: state.reason,
      })
    })

    await vi.advanceTimersByTimeAsync(2_000)

    expect(states).toEqual([{ isSuppressed: true, reason: 'unknown' }])
    expect(adapter.getState().isSuppressed).toBe(true)

    adapter.dispose()
  })
})
