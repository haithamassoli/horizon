import { app } from 'electron'
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

    app.on('activate', () => {
      showPrimaryWindow()
    })
  })
}

app.on('window-all-closed', () => {
  // Tray-first shell stays resident even when windows are hidden.
})

app.on('before-quit', () => {
  appShell?.dispose()
})
