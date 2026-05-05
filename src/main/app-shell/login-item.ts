import { app } from 'electron'

export interface LoginItemController {
  getState: () => boolean
  setEnabled: (enabled: boolean) => boolean
}

export function createLoginItemController(): LoginItemController {
  const supported = process.platform === 'darwin' || process.platform === 'win32'
  let openAtLogin = supported ? app.getLoginItemSettings().openAtLogin : false

  return {
    getState() {
      return openAtLogin
    },
    setEnabled(enabled) {
      if (!supported) {
        openAtLogin = false
        return openAtLogin
      }

      if (process.platform === 'darwin') {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          openAsHidden: enabled,
        })
      } else {
        app.setLoginItemSettings({
          openAtLogin: enabled,
          path: process.execPath,
        })
      }

      openAtLogin = app.getLoginItemSettings().openAtLogin
      return openAtLogin
    },
  }
}
