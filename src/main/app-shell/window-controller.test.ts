import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createWindowController } from './window-controller'

const { createOverlayWindow } = vi.hoisted(() => ({
  createOverlayWindow: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => 'C:/horizon',
  },
  BrowserWindow: vi.fn(),
  shell: {
    openExternal: vi.fn(),
  },
}))

vi.mock('../overlay/overlay-controller', () => ({
  createOverlayWindow,
}))

describe('createWindowController', () => {
  beforeEach(() => {
    createOverlayWindow.mockReset()
  })

  it('does not create overlay window when hide is requested before first show', () => {
    const controller = createWindowController()

    controller.hideOverlayWindow()

    expect(createOverlayWindow).not.toHaveBeenCalled()
  })
})
