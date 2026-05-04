import { app, BrowserWindow } from 'electron'
import { createAppShell } from './app-shell/create-app-shell'

let appShell: ReturnType<typeof createAppShell> | null = null

function showPrimaryWindow(): void {
  if (!appShell) {
    return
  }

  appShell.windows.showSettingsWindow()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showPrimaryWindow()
  })

  app.whenReady().then(() => {
    appShell = createAppShell()
    showPrimaryWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        showPrimaryWindow()
      }
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
