import { createBreakLoopController, type BreakLoopController } from '../break-loop/break-loop'
import { registerAppIpc } from '../ipc/register-app-ipc'
import { createPresenceModule, type CreatePresenceModuleOptions } from '../presence/presence-module'
import { createSuppressionModule, type CreateSuppressionModuleOptions } from '../suppression/suppression-module'
import { createWindowController, type WindowController } from './window-controller'

export interface AppShell {
  breakLoop: BreakLoopController
  windows: WindowController
  dispose: () => void
}

export interface CreateAppShellOptions {
  presence?: CreatePresenceModuleOptions
  suppression?: CreateSuppressionModuleOptions
}

export function createAppShell(options: CreateAppShellOptions = {}): AppShell {
  const breakLoop = createBreakLoopController()
  const presence = createPresenceModule(options.presence)
  const suppression = createSuppressionModule(options.suppression)

  breakLoop.updateEnvironment({
    presence: presence.getState(),
    isSuppressed: suppression.getState().isSuppressed,
  })

  registerAppIpc(breakLoop)

  const windows = createWindowController()
  windows.getOverlayWindow()

  const unsubscribePresence = presence.subscribe((nextPresence) => {
    breakLoop.updateEnvironment({ presence: nextPresence })
  })

  const unsubscribeSuppression = suppression.subscribe((nextSuppression) => {
    breakLoop.updateEnvironment({ isSuppressed: nextSuppression.isSuppressed })
  })

  breakLoop.subscribe((snapshot) => {
    const overlayWindow = windows.getOverlayWindow()
    const shouldShowOverlay = snapshot.status === 'due' || snapshot.status === 'on-break'

    if (shouldShowOverlay) {
      if (!overlayWindow.isVisible()) {
        overlayWindow.showInactive()
      }
      return
    }

    if (overlayWindow.isVisible()) {
      overlayWindow.hide()
    }
  })

  return {
    breakLoop,
    windows,
    dispose() {
      unsubscribePresence()
      unsubscribeSuppression()
      suppression.dispose()
      presence.dispose()
      breakLoop.dispose()
    },
  }
}
