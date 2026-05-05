import { app } from 'electron'
import { createBreakLoopController, type BreakLoopController } from '../break-loop/break-loop'
import { registerAppIpc } from '../ipc/register-app-ipc'
import { createStorageAdapter, type StorageAdapter } from '../preferences/storage-adapter'
import { createPresenceModule, type CreatePresenceModuleOptions } from '../presence/presence-module'
import { createSettingsController } from '../preferences/settings-controller'
import { createStatsController } from '../preferences/stats-controller'
import { createSuppressionModule, type CreateSuppressionModuleOptions } from '../suppression/suppression-module'
import { createLoginItemController } from './login-item'
import { createTrayController } from './tray-controller'
import { createWindowController, type WindowController } from './window-controller'

export interface AppShell {
  breakLoop: BreakLoopController
  windows: WindowController
  dispose: () => void
}

export interface CreateAppShellOptions {
  presence?: CreatePresenceModuleOptions
  suppression?: CreateSuppressionModuleOptions
  storage?: StorageAdapter
}

export function createAppShell(options: CreateAppShellOptions = {}): AppShell {
  let isDisposed = false
  const storage = options.storage ?? createStorageAdapter()
  const storedSettings = storage.loadSettings()
  const storedStats = storage.loadStats()
  const breakLoop = createBreakLoopController({
    settings: {
      remindersEnabled: storedSettings.remindersEnabled,
      intervalMs: storedSettings.intervalMs,
      breakDurationMs: storedSettings.breakDurationMs,
      snoozeDurationMs: storedSettings.snoozeDurationMs,
      autoCreditWindowMs: storedSettings.autoCreditWindowMs,
    },
    restoredState: storedStats.breakLoop,
  })
  const presence = createPresenceModule(options.presence)
  const suppression = createSuppressionModule(options.suppression)
  const loginItem = createLoginItemController()
  const settings = createSettingsController({
    breakLoop,
    loginItem,
    storage,
    initialSnapshot: storedSettings,
  })
  const stats = createStatsController({
    breakLoop,
    storage,
    initialState: storedStats,
  })

  breakLoop.updateEnvironment({
    presence: presence.getState(),
    isSuppressed: suppression.getState().isSuppressed,
  })

  const windows = createWindowController()
  windows.getOverlayWindow()
  const tray = createTrayController({
    state: {
      breakSnapshot: breakLoop.getSnapshot(),
      settingsSnapshot: settings.getSnapshot(),
      statsSnapshot: stats.getSnapshot(),
    },
    onOpenSettings: () => {
      windows.showSettingsWindow()
    },
    onBreakAction: (action) => {
      breakLoop.performAction(action)
    },
    onSettingsUpdate: (update) => {
      settings.update(update)
    },
    onQuit: () => {
      app.quit()
    },
  })
  const disposeIpc = registerAppIpc({ breakLoop, settings, stats })

  const unsubscribePresence = presence.subscribe((nextPresence) => {
    breakLoop.updateEnvironment({ presence: nextPresence })
  })

  const unsubscribeSuppression = suppression.subscribe((nextSuppression) => {
    breakLoop.updateEnvironment({ isSuppressed: nextSuppression.isSuppressed })
  })

  const unsubscribeBreak = breakLoop.subscribe((snapshot) => {
    const shouldShowOverlay = snapshot.status === 'due' || snapshot.status === 'on-break'

    if (shouldShowOverlay) {
      windows.showOverlayWindow()
    } else {
      windows.hideOverlayWindow()
    }

    tray.update({
      breakSnapshot: snapshot,
      settingsSnapshot: settings.getSnapshot(),
      statsSnapshot: stats.getSnapshot(),
    })
  })

  const unsubscribeSettings = settings.subscribe((settingsSnapshot) => {
    tray.update({
      breakSnapshot: breakLoop.getSnapshot(),
      settingsSnapshot,
      statsSnapshot: stats.getSnapshot(),
    })
  })

  function dispose(): void {
    if (isDisposed) {
      return
    }

    isDisposed = true
    disposeIpc()
    unsubscribePresence()
    unsubscribeSuppression()
    unsubscribeBreak()
    unsubscribeSettings()
    tray.dispose()
    windows.dispose()
    settings.dispose()
    stats.dispose()
    suppression.dispose()
    presence.dispose()
    breakLoop.dispose()
  }

  return {
    breakLoop,
    windows,
    dispose,
  }
}
