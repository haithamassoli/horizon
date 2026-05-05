import { app, BrowserWindow, ipcMain } from 'electron'
import type { RuntimeInfo } from '@shared/contracts/app'
import type {
  BreakActionType,
  BreakEnvironmentUpdate,
  BreakLoopSnapshot,
  PresenceKind,
  PresenceState,
} from '@shared/contracts/break'
import type { Result } from '@shared/contracts/result'
import type { HorizonSettingsSnapshot, HorizonSettingsUpdate } from '@shared/contracts/settings'
import type { HorizonStatsSnapshot } from '@shared/contracts/stats'
import type { BreakLoopController } from '../break-loop/break-loop'
import type { SettingsController } from '../preferences/settings-controller'
import type { StatsController } from '../preferences/stats-controller'

const breakActions = new Set<BreakActionType>(['start-now', 'snooze', 'skip', 'complete', 'reset'])
const presenceKinds = new Set<PresenceKind>(['active', 'idle', 'locked', 'sleeping'])

export interface RegisterAppIpcOptions {
  breakLoop: BreakLoopController
  settings: SettingsController
  stats: StatsController
}

export function registerAppIpc(options: RegisterAppIpcOptions): () => void {
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

  ipcMain.handle('break:get-state', async (): Promise<Result<BreakLoopSnapshot>> => {
    return {
      success: true,
      data: options.breakLoop.getSnapshot(),
    }
  })

  ipcMain.handle('settings:get', async (): Promise<Result<HorizonSettingsSnapshot>> => {
    return {
      success: true,
      data: options.settings.getSnapshot(),
    }
  })

  ipcMain.handle('stats:get', async (): Promise<Result<HorizonStatsSnapshot>> => {
    return {
      success: true,
      data: options.stats.getSnapshot(),
    }
  })

  ipcMain.handle('settings:update', async (_event, update: HorizonSettingsUpdate): Promise<Result<HorizonSettingsSnapshot>> => {
    const error = validateSettingsUpdate(update)

    if (error) {
      return { success: false, error }
    }

    return {
      success: true,
      data: options.settings.update(update),
    }
  })

  ipcMain.handle('break:perform-action', async (_event, action: BreakActionType): Promise<Result<BreakLoopSnapshot>> => {
    if (!breakActions.has(action)) {
      return {
        success: false,
        error: 'Invalid break action.',
      }
    }

    return {
      success: true,
      data: options.breakLoop.performAction(action),
    }
  })

  ipcMain.handle('break:set-environment', async (_event, update: BreakEnvironmentUpdate): Promise<Result<BreakLoopSnapshot>> => {
    const error = validateEnvironmentUpdate(update)

    if (error) {
      return { success: false, error }
    }

    return {
      success: true,
      data: options.breakLoop.updateEnvironment(update),
    }
  })

  const unsubscribeBreak = options.breakLoop.subscribe((snapshot) => {
    broadcast('break:state-changed', snapshot)
  })

  const unsubscribeSettings = options.settings.subscribe((snapshot) => {
    broadcast('settings:changed', snapshot)
  })

  const unsubscribeStats = options.stats.subscribe((snapshot) => {
    broadcast('stats:changed', snapshot)
  })

  return () => {
    unsubscribeBreak()
    unsubscribeSettings()
    unsubscribeStats()
    ipcMain.removeHandler('app:get-runtime-info')
    ipcMain.removeHandler('break:get-state')
    ipcMain.removeHandler('settings:get')
    ipcMain.removeHandler('stats:get')
    ipcMain.removeHandler('settings:update')
    ipcMain.removeHandler('break:perform-action')
    ipcMain.removeHandler('break:set-environment')
  }
}

function broadcast(channel: string, payload: BreakLoopSnapshot | HorizonSettingsSnapshot | HorizonStatsSnapshot): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload)
    }
  }
}

function validateSettingsUpdate(update: HorizonSettingsUpdate): string | null {
  for (const [key, value] of Object.entries(update)) {
    if (key === 'remindersEnabled' || key === 'launchAtLogin') {
      if (typeof value !== 'boolean') {
        return `${key} must be a boolean.`
      }

      continue
    }

    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return `${key} must be a positive number.`
    }
  }

  return null
}

function validateEnvironmentUpdate(update: BreakEnvironmentUpdate): string | null {
  if (typeof update.isSuppressed !== 'undefined' && typeof update.isSuppressed !== 'boolean') {
    return 'isSuppressed must be a boolean.'
  }

  if (typeof update.presence !== 'undefined') {
    const error = validatePresence(update.presence)

    if (error) {
      return error
    }
  }

  return null
}

function validatePresence(presence: PresenceState): string | null {
  if (!presenceKinds.has(presence.kind)) {
    return 'presence.kind must be a valid presence state.'
  }

  if (typeof presence.idleMs !== 'number' || !Number.isFinite(presence.idleMs) || presence.idleMs < 0) {
    return 'presence.idleMs must be a non-negative number.'
  }

  return null
}
