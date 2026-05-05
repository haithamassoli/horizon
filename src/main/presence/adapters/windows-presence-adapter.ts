import { createPowerMonitorPresenceAdapter, type CreatePowerMonitorPresenceAdapterOptions } from './power-monitor-presence-adapter'

export function createWindowsPresenceAdapter(options: CreatePowerMonitorPresenceAdapterOptions = {}) {
  return createPowerMonitorPresenceAdapter({
    pollMs: options.pollMs ?? 3_000,
    ...options,
  })
}
