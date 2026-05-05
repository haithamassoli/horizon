import type { Result } from './result'
import type { BreakActionType, BreakEnvironmentUpdate, BreakLoopSnapshot, BreakSettingsUpdate } from './break'

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
  updateBreakSettings: (update: BreakSettingsUpdate) => Promise<Result<BreakLoopSnapshot>>
  performBreakAction: (action: BreakActionType) => Promise<Result<BreakLoopSnapshot>>
  setBreakEnvironment: (update: BreakEnvironmentUpdate) => Promise<Result<BreakLoopSnapshot>>
  subscribeBreakState: (listener: (snapshot: BreakLoopSnapshot) => void) => () => void
}
