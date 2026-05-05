export const DEFAULT_SUPPRESSION_POLL_MS = 2_000

export type SuppressionReason = 'fullscreen' | 'presentation' | 'unknown'

export type SuppressionSource = 'native-bridge' | 'electron' | 'fallback'

export interface SuppressionState {
  isSuppressed: boolean
  reason: SuppressionReason | null
  source: SuppressionSource
  updatedAt: number
}

export interface SuppressionProbeResult {
  isSuppressed: boolean
  reason: SuppressionReason | null
  source: SuppressionSource
}

export interface SuppressionAdapter {
  getState(): SuppressionState
  subscribe: (listener: (state: SuppressionState) => void) => () => void
  dispose: () => void
}

export interface SuppressionModule {
  getState(): SuppressionState
  subscribe: (listener: (state: SuppressionState) => void) => () => void
  dispose: () => void
}
