import { detectWindowsSuppression } from '../../native/windows/detect-windows-suppression'
import { createPollingSuppressionAdapter, type CreatePollingSuppressionAdapterOptions } from './polling-suppression-adapter'

type Options = Omit<CreatePollingSuppressionAdapterOptions, 'detector'>

export function createWindowsSuppressionAdapter(options: Options = {}) {
  return createPollingSuppressionAdapter({
    detector: detectWindowsSuppression,
    ...options,
  })
}
