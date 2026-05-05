import type { PresenceState } from '@shared/contracts/break'

export const DEFAULT_IDLE_THRESHOLD_MS = 60_000
export const DEFAULT_PRESENCE_POLL_MS = 5_000

export type PresenceTransition = 'active' | 'idle' | 'locked' | 'unlocked' | 'sleep' | 'wake'

export type PresenceEventSource = 'poll' | 'power-monitor'

export interface NormalizedPresenceEvent {
  transition: PresenceTransition
  state: PresenceState
  at: number
  source: PresenceEventSource
}

export interface PresenceAdapter {
  getState(): PresenceState
  subscribe: (listener: (event: NormalizedPresenceEvent) => void) => () => void
  dispose: () => void
}

export interface PresenceModule {
  getState(): PresenceState
  subscribe: (listener: (presence: PresenceState, event: NormalizedPresenceEvent) => void) => () => void
  dispose: () => void
}
