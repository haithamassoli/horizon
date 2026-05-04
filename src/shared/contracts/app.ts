import type { Result } from './result'

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
}
