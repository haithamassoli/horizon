import type { BreakLoopSettings, BreakSettingsUpdate } from './break'

export interface HorizonSettingsSnapshot extends BreakLoopSettings {
  launchAtLogin: boolean
  updatedAt: number
}

export interface HorizonSettingsUpdate extends BreakSettingsUpdate {
  launchAtLogin?: boolean
}
