import { registerAppIpc } from '../ipc/register-app-ipc'
import { createWindowController, type WindowController } from './window-controller'

export interface AppShell {
  windows: WindowController
}

export function createAppShell(): AppShell {
  registerAppIpc()

  const windows = createWindowController()
  windows.getOverlayWindow()

  return {
    windows,
  }
}
