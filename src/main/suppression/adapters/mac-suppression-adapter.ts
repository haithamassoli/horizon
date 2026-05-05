import { detectMacSuppression } from '../../native/mac/detect-mac-suppression'
import { createPollingSuppressionAdapter, type CreatePollingSuppressionAdapterOptions } from './polling-suppression-adapter'

type Options = Omit<CreatePollingSuppressionAdapterOptions, 'detector'>

export function createMacSuppressionAdapter(options: Options = {}) {
  return createPollingSuppressionAdapter({
    detector: detectMacSuppression,
    ...options,
  })
}
