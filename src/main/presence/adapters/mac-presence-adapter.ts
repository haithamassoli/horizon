import { createPowerMonitorPresenceAdapter, type CreatePowerMonitorPresenceAdapterOptions } from './power-monitor-presence-adapter'

export function createMacPresenceAdapter(options: CreatePowerMonitorPresenceAdapterOptions = {}) {
  return createPowerMonitorPresenceAdapter({
    pollMs: options.pollMs ?? 5_000,
    ...options,
  })
}
