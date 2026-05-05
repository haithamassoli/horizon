import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { HorizonApi } from '@shared/contracts/app'
import type { BreakLoopSnapshot } from '@shared/contracts/break'

const horizonApi: HorizonApi = {
  getRuntimeInfo: () => ipcRenderer.invoke('app:get-runtime-info'),
  getBreakState: () => ipcRenderer.invoke('break:get-state'),
  updateBreakSettings: (update) => ipcRenderer.invoke('break:update-settings', update),
  performBreakAction: (action) => ipcRenderer.invoke('break:perform-action', action),
  setBreakEnvironment: (update) => ipcRenderer.invoke('break:set-environment', update),
  subscribeBreakState: (listener) => {
    const handler = (_event: IpcRendererEvent, snapshot: BreakLoopSnapshot) => {
      listener(snapshot)
    }

    ipcRenderer.on('break:state-changed', handler)

    return () => {
      ipcRenderer.removeListener('break:state-changed', handler)
    }
  },
}

contextBridge.exposeInMainWorld('horizon', horizonApi)
