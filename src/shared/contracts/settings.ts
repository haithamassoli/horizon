import type { BreakLoopSettings, BreakSettingsUpdate } from './break'

export interface HorizonSettingsSnapshot extends BreakLoopSettings {
  launchAtLogin: boolean
  updatedAt: number
}

export interface HorizonSettingsUpdate extends BreakSettingsUpdate {
  launchAtLogin?: boolean
}

export function createDefaultSettingsSnapshot(
  overrides: Partial<HorizonSettingsSnapshot> = {},
  updatedAt = Date.now(),
): HorizonSettingsSnapshot {
  return {
    remindersEnabled: true,
    intervalMs: 20 * 60 * 1000,
    breakDurationMs: 20 * 1000,
    snoozeDurationMs: 2 * 60 * 1000,
    autoCreditWindowMs: 2 * 60 * 1000,
    launchAtLogin: false,
    updatedAt,
    ...overrides,
  }
}
