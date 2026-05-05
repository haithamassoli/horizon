import { createBreakLoopController, type BreakLoopController } from '../break-loop/break-loop'
import { registerAppIpc } from '../ipc/register-app-ipc'
import { createWindowController, type WindowController } from './window-controller'

export interface AppShell {
  breakLoop: BreakLoopController
  windows: WindowController
}

export function createAppShell(): AppShell {
  const breakLoop = createBreakLoopController()
  registerAppIpc(breakLoop)

  const windows = createWindowController()
  windows.getOverlayWindow()

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
  }
}
