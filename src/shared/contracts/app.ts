import type { Result } from './result'
import type { BreakActionType, BreakEnvironmentUpdate, BreakLoopSnapshot } from './break'
import type { HorizonSettingsSnapshot, HorizonSettingsUpdate } from './settings'

export interface RuntimeInfo {
  appName: string
  appVersion: string
  chromeVersion: string
  electronVersion: string
  nodeVersion: string
  platform: NodeJS.Platform
}

export interface HorizonApi {
  getRuntimeInfo: () => Promise<Result<RuntimeInfo>>
  getBreakState: () => Promise<Result<BreakLoopSnapshot>>
  getSettings: () => Promise<Result<HorizonSettingsSnapshot>>
  updateSettings: (update: HorizonSettingsUpdate) => Promise<Result<HorizonSettingsSnapshot>>
  performBreakAction: (action: BreakActionType) => Promise<Result<BreakLoopSnapshot>>
  setBreakEnvironment: (update: BreakEnvironmentUpdate) => Promise<Result<BreakLoopSnapshot>>
  subscribeBreakState: (listener: (snapshot: BreakLoopSnapshot) => void) => () => void
  subscribeSettings: (listener: (snapshot: HorizonSettingsSnapshot) => void) => () => void
}
