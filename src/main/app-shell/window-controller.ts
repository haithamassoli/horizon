import { BrowserWindow, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createOverlayWindow } from '../overlay/overlay-controller'

const currentDirectory = dirname(fileURLToPath(import.meta.url))

function loadRendererEntry(window: BrowserWindow, entryFile: string): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${entryFile}`)
    return
  }

  void window.loadFile(join(currentDirectory, '../../renderer', entryFile))
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
      preload: join(currentDirectory, '../../preload/index.mjs'),
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
}

export function createWindowController(): WindowController {
  let settingsWindow: BrowserWindow | null = null
  let overlayWindow: BrowserWindow | null = null

  return {
    getSettingsWindow() {
      if (settingsWindow && !settingsWindow.isDestroyed()) {
        return settingsWindow
      }

      settingsWindow = createSettingsWindow()
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
  }
}
