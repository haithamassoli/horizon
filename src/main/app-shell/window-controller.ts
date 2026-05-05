import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { createOverlayWindow } from '../overlay/overlay-controller'

const preloadEntry = join(app.getAppPath(), 'dist/preload/index.cjs')
const rendererDirectory = join(app.getAppPath(), 'dist/renderer')

function loadRendererEntry(window: BrowserWindow, entryFile: string): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${entryFile}`)
    return
  }

  void window.loadFile(join(rendererDirectory, entryFile))
}

function createSettingsWindow(): BrowserWindow {
  const settingsWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0b1020',
    title: 'Horizon',
    webPreferences: {
      preload: preloadEntry,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  loadRendererEntry(settingsWindow, 'settings.html')
  return settingsWindow
}

export interface WindowController {
  getOverlayWindow: () => BrowserWindow
  getSettingsWindow: () => BrowserWindow
  showSettingsWindow: () => void
  showOverlayWindow: () => void
  hideOverlayWindow: () => void
  dispose: () => void
}

export function createWindowController(): WindowController {
  let settingsWindow: BrowserWindow | null = null
  let overlayWindow: BrowserWindow | null = null
  let isQuitting = false

  const getLiveWindow = (window: BrowserWindow | null): BrowserWindow | null => {
    if (!window || window.isDestroyed()) {
      return null
    }

    return window
  }

  const hideOnClose = (window: BrowserWindow): void => {
    window.on('close', (event) => {
      if (isQuitting) {
        return
      }

      event.preventDefault()
      window.hide()
    })
  }

  return {
    getSettingsWindow() {
      const liveWindow = getLiveWindow(settingsWindow)

      if (liveWindow) {
        return liveWindow
      }

      settingsWindow = createSettingsWindow()
      settingsWindow.removeMenu()
      hideOnClose(settingsWindow)
      settingsWindow.on('closed', () => {
        settingsWindow = null
      })
      return settingsWindow
    },
    getOverlayWindow() {
      const liveWindow = getLiveWindow(overlayWindow)

      if (liveWindow) {
        return liveWindow
      }

      overlayWindow = createOverlayWindow()
      overlayWindow.removeMenu()
      hideOnClose(overlayWindow)
      overlayWindow.on('closed', () => {
        overlayWindow = null
      })
      return overlayWindow
    },
    showSettingsWindow() {
      const window = this.getSettingsWindow()
      if (window.isMinimized()) {
        window.restore()
      }
      window.show()
      window.focus()
    },
    showOverlayWindow() {
      const window = this.getOverlayWindow()

      if (!window.isVisible()) {
        window.center()
        window.moveTop()
        window.showInactive()
        return
      }

      window.moveTop()
    },
    hideOverlayWindow() {
      const window = getLiveWindow(overlayWindow)

      if (window && window.isVisible()) {
        window.hide()
      }
    },
    dispose() {
      isQuitting = true

      const liveSettingsWindow = getLiveWindow(settingsWindow)

      if (liveSettingsWindow) {
        liveSettingsWindow.destroy()
      }

      const liveOverlayWindow = getLiveWindow(overlayWindow)

      if (liveOverlayWindow) {
        liveOverlayWindow.destroy()
      }

      settingsWindow = null
      overlayWindow = null
    },
  }
}
