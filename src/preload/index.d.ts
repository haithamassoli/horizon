import type { HorizonApi } from '@shared/contracts/app'

declare global {
  interface Window {
    horizon: HorizonApi
  }
}

export {}
