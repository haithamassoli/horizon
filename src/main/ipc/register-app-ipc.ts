import { app, BrowserWindow, ipcMain } from 'electron'
import type { RuntimeInfo } from '@shared/contracts/app'
import type {
  BreakActionType,
  BreakEnvironmentUpdate,
  BreakLoopSnapshot,
  BreakSettingsUpdate,
  PresenceKind,
  PresenceState,
} from '@shared/contracts/break'
import type { Result } from '@shared/contracts/result'
import type { BreakLoopController } from '../break-loop/break-loop'

const breakActions = new Set<BreakActionType>(['start-now', 'snooze', 'skip', 'complete', 'reset'])
const presenceKinds = new Set<PresenceKind>(['active', 'idle', 'locked', 'sleeping'])

export function registerAppIpc(breakLoop: BreakLoopController): void {
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
      data: breakLoop.getSnapshot(),
    }
  })

  ipcMain.handle('break:update-settings', async (_event, update: BreakSettingsUpdate): Promise<Result<BreakLoopSnapshot>> => {
    const error = validateSettingsUpdate(update)

    if (error) {
      return { success: false, error }
    }

    return {
      success: true,
      data: breakLoop.updateSettings(update),
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
      data: breakLoop.performAction(action),
    }
  })

  ipcMain.handle('break:set-environment', async (_event, update: BreakEnvironmentUpdate): Promise<Result<BreakLoopSnapshot>> => {
    const error = validateEnvironmentUpdate(update)

    if (error) {
      return { success: false, error }
    }

    return {
      success: true,
      data: breakLoop.updateEnvironment(update),
    }
  })

  breakLoop.subscribe((snapshot) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send('break:state-changed', snapshot)
      }
    }
  })
}

function validateSettingsUpdate(update: BreakSettingsUpdate): string | null {
  for (const [key, value] of Object.entries(update)) {
    if (key === 'remindersEnabled') {
      if (typeof value !== 'boolean') {
        return 'remindersEnabled must be a boolean.'
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
