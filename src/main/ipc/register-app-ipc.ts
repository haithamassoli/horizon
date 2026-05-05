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
const settingsUpdateKeys = new Set<keyof HorizonSettingsUpdate>([
  'remindersEnabled',
  'intervalMs',
  'breakDurationMs',
  'snoozeDurationMs',
  'launchAtLogin',
])
const environmentUpdateKeys = new Set<keyof BreakEnvironmentUpdate>(['presence', 'isSuppressed'])

export interface RegisterAppIpcOptions {
  breakLoop: BreakLoopController
  settings: SettingsController
  stats: StatsController
}

export function registerAppIpc(options: RegisterAppIpcOptions): () => void {
  ipcMain.handle('app:get-runtime-info', async (): Promise<Result<RuntimeInfo>> => {
    return toResult(async () => ({
      appName: app.getName(),
      appVersion: app.getVersion(),
      chromeVersion: process.versions.chrome,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      platform: process.platform,
    }))
  })

  ipcMain.handle('break:get-state', async (): Promise<Result<BreakLoopSnapshot>> => {
    return toResult(async () => options.breakLoop.getSnapshot())
  })

  ipcMain.handle('settings:get', async (): Promise<Result<HorizonSettingsSnapshot>> => {
    return toResult(async () => options.settings.getSnapshot())
  })

  ipcMain.handle('stats:get', async (): Promise<Result<HorizonStatsSnapshot>> => {
    return toResult(async () => options.stats.getSnapshot())
  })

  ipcMain.handle('settings:update', async (_event, update: unknown): Promise<Result<HorizonSettingsSnapshot>> => {
    const error = validateSettingsUpdate(update)

    if (error) {
      return failure(error)
    }

    return toResult(async () => options.settings.update(update as HorizonSettingsUpdate))
  })

  ipcMain.handle('break:perform-action', async (_event, action: unknown): Promise<Result<BreakLoopSnapshot>> => {
    if (typeof action !== 'string' || !breakActions.has(action as BreakActionType)) {
      return failure('Invalid break action.')
    }

    return toResult(async () => options.breakLoop.performAction(action as BreakActionType))
  })

  ipcMain.handle('break:set-environment', async (_event, update: unknown): Promise<Result<BreakLoopSnapshot>> => {
    const error = validateEnvironmentUpdate(update)

    if (error) {
      return failure(error)
    }

    return toResult(async () => options.breakLoop.updateEnvironment(update as BreakEnvironmentUpdate))
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

function validateSettingsUpdate(update: unknown): string | null {
  if (!isRecord(update)) {
    return 'settings update must be an object.'
  }

  for (const key of Object.keys(update)) {
    if (!settingsUpdateKeys.has(key as keyof HorizonSettingsUpdate)) {
      return `Unknown settings field: ${key}.`
    }
  }

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

function validateEnvironmentUpdate(update: unknown): string | null {
  if (!isRecord(update)) {
    return 'environment update must be an object.'
  }

  for (const key of Object.keys(update)) {
    if (!environmentUpdateKeys.has(key as keyof BreakEnvironmentUpdate)) {
      return `Unknown environment field: ${key}.`
    }
  }

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

function validatePresence(presence: unknown): string | null {
  if (!isRecord(presence)) {
    return 'presence must be an object.'
  }

  if (typeof presence.kind !== 'string' || !presenceKinds.has(presence.kind as PresenceKind)) {
    return 'presence.kind must be a valid presence state.'
  }

  if (typeof presence.idleMs !== 'number' || !Number.isFinite(presence.idleMs) || presence.idleMs < 0) {
    return 'presence.idleMs must be a non-negative number.'
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failure<T>(error: string): Result<T> {
  return {
    success: false,
    error,
  }
}

async function toResult<T>(execute: () => Promise<T> | T): Promise<Result<T>> {
  try {
    return {
      success: true,
      data: await execute(),
    }
  } catch (error) {
    return failure(toErrorMessage(error))
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unexpected IPC failure.'
}
