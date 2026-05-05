import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

const preloadEntry = join(app.getAppPath(), 'dist/preload/index.cjs')
const rendererDirectory = join(app.getAppPath(), 'dist/renderer')

function loadRendererEntry(window: BrowserWindow, entryFile: string): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${entryFile}`)
    return
  }

  void window.loadFile(join(rendererDirectory, entryFile))
}

export function createOverlayWindow(): BrowserWindow {
  const overlayWindow = new BrowserWindow({
    width: 420,
    height: 320,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: preloadEntry,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  overlayWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true, {
    visibleOnFullScreen: true,
  })

  loadRendererEntry(overlayWindow, 'overlay.html')
  return overlayWindow
}
