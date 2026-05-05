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

      app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: enabled,
      })

      openAtLogin = app.getLoginItemSettings().openAtLogin
      return openAtLogin
    },
  }
}
