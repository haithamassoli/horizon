import { app, ipcMain } from 'electron'
import type { RuntimeInfo } from '@shared/contracts/app'
import type { Result } from '@shared/contracts/result'

export function registerAppIpc(): void {
  ipcMain.handle('app:get-runtime-info', async (): Promise<Result<RuntimeInfo>> => {
    return {
      success: true,
      data: {
        appName: app.getName(),
        appVersion: app.getVersion(),
        chromeVersion: process.versions.chrome,
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        platform: process.platform,
      },
    }
  })
}
