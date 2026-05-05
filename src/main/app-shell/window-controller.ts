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
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        return settingsWindow
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
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        return overlayWindow
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
      const window = this.getOverlayWindow()

      if (window.isVisible()) {
        window.hide()
      }
    },
    dispose() {
      isQuitting = true

      if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.destroy()
      }

      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.destroy()
      }

      settingsWindow = null
      overlayWindow = null
    },
  }
}
