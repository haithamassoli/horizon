export interface HorizonStatsSnapshot {
  dayKey: string
  breaksCompletedToday: number
  nextBreakAt: number | null
  updatedAt: number
}

export function createEmptyStatsSnapshot(dayKey: string, updatedAt = Date.now()): HorizonStatsSnapshot {
  return {
    dayKey,
    breaksCompletedToday: 0,
    nextBreakAt: null,
    updatedAt,
  }
}
