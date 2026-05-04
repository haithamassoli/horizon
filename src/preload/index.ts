import { contextBridge, ipcRenderer } from 'electron'
import type { HorizonApi } from '@shared/contracts/app'

const horizonApi: HorizonApi = {
  getRuntimeInfo: () => ipcRenderer.invoke('app:get-runtime-info'),
}

contextBridge.exposeInMainWorld('horizon', horizonApi)
