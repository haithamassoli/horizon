import type { BreakLoopController } from '../break-loop/break-loop'
import type { LoginItemController } from '../app-shell/login-item'
import type { HorizonSettingsSnapshot, HorizonSettingsUpdate } from '@shared/contracts/settings'
import type { StorageAdapter } from './storage-adapter'

export interface SettingsController {
  getSnapshot: () => HorizonSettingsSnapshot
  update: (update: HorizonSettingsUpdate) => HorizonSettingsSnapshot
  subscribe: (listener: (snapshot: HorizonSettingsSnapshot) => void) => () => void
  dispose: () => void
}

export interface CreateSettingsControllerOptions {
  breakLoop: BreakLoopController
  loginItem: LoginItemController
  storage: StorageAdapter
  initialSnapshot: HorizonSettingsSnapshot
  clock?: () => number
}

export function createSettingsController(options: CreateSettingsControllerOptions): SettingsController {
  const clock = options.clock ?? Date.now
  const listeners = new Set<(snapshot: HorizonSettingsSnapshot) => void>()
  let launchAtLogin = options.loginItem.setEnabled(options.initialSnapshot.launchAtLogin)
  let snapshot = toSettingsSnapshot(options.breakLoop.getSnapshot().settings, launchAtLogin, options.initialSnapshot.updatedAt)

  options.storage.saveSettings(snapshot)

  const emit = (): HorizonSettingsSnapshot => {
    for (const listener of listeners) {
      listener(snapshot)
    }

    return snapshot
  }

  return {
    getSnapshot() {
      return snapshot
    },
    update(update) {
      if (typeof update.launchAtLogin === 'boolean') {
        launchAtLogin = options.loginItem.setEnabled(update.launchAtLogin)
      }

      const breakUpdate = {
        remindersEnabled: update.remindersEnabled,
        intervalMs: update.intervalMs,
        breakDurationMs: update.breakDurationMs,
        snoozeDurationMs: update.snoozeDurationMs,
      }

      const hasBreakUpdate = Object.values(breakUpdate).some((value) => typeof value !== 'undefined')
      const breakSettings = hasBreakUpdate ? options.breakLoop.updateSettings(breakUpdate).settings : options.breakLoop.getSnapshot().settings

      snapshot = toSettingsSnapshot(breakSettings, launchAtLogin, clock())
      options.storage.saveSettings(snapshot)
      return emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot)

      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      listeners.clear()
    },
  }
}

function toSettingsSnapshot(
  breakSettings: {
    remindersEnabled: boolean
    intervalMs: number
    breakDurationMs: number
    snoozeDurationMs: number
    autoCreditWindowMs: number
  },
  launchAtLogin: boolean,
  updatedAt: number,
): HorizonSettingsSnapshot {
  return {
    remindersEnabled: breakSettings.remindersEnabled,
    intervalMs: breakSettings.intervalMs,
    breakDurationMs: breakSettings.breakDurationMs,
    snoozeDurationMs: breakSettings.snoozeDurationMs,
    autoCreditWindowMs: breakSettings.autoCreditWindowMs,
    launchAtLogin,
    updatedAt,
  }
}
