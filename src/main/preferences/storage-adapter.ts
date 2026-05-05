import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type { BreakLoopOutcome } from '@shared/contracts/break'
import { createDefaultSettingsSnapshot, type HorizonSettingsSnapshot } from '@shared/contracts/settings'
import { createEmptyStatsSnapshot, type HorizonStatsSnapshot } from '@shared/contracts/stats'
import type { PersistedBreakLoopState } from '../break-loop/break-loop'

const SETTINGS_FILE_NAME = 'settings.json'
const STATS_FILE_NAME = 'stats.json'
const SETTINGS_SCHEMA_VERSION = 1
const STATS_SCHEMA_VERSION = 1

interface PersistedSettingsDocumentV1 {
  version: 1
  remindersEnabled: boolean
  intervalMs: number
  breakDurationMs: number
  snoozeDurationMs: number
  autoCreditWindowMs: number
  launchAtLogin: boolean
  updatedAt: number
}

interface PersistedStatsDocumentV1 {
  version: 1
  dayKey: string
  breaksCompletedToday: number
  nextBreakAt: number | null
  updatedAt: number
  breakLoop: PersistedBreakLoopState
}

export interface StoredStatsState {
  snapshot: HorizonStatsSnapshot
  breakLoop: PersistedBreakLoopState
}

export interface StorageAdapter {
  loadSettings: () => HorizonSettingsSnapshot
  saveSettings: (settings: HorizonSettingsSnapshot) => void
  loadStats: () => StoredStatsState
  saveStats: (stats: StoredStatsState) => void
}

export interface CreateStorageAdapterOptions {
  baseDir?: string
  clock?: () => number
}

export function createStorageAdapter(options: CreateStorageAdapterOptions = {}): StorageAdapter {
  const clock = options.clock ?? Date.now
  const baseDir = options.baseDir ?? app.getPath('userData')
  const settingsPath = join(baseDir, SETTINGS_FILE_NAME)
  const statsPath = join(baseDir, STATS_FILE_NAME)

  const saveSettings = (settings: HorizonSettingsSnapshot): void => {
    const normalized = normalizeSettingsSnapshot(settings, settings.updatedAt)
    writeJsonFile(settingsPath, {
      version: SETTINGS_SCHEMA_VERSION,
      remindersEnabled: normalized.remindersEnabled,
      intervalMs: normalized.intervalMs,
      breakDurationMs: normalized.breakDurationMs,
      snoozeDurationMs: normalized.snoozeDurationMs,
      autoCreditWindowMs: normalized.autoCreditWindowMs,
      launchAtLogin: normalized.launchAtLogin,
      updatedAt: normalized.updatedAt,
    } satisfies PersistedSettingsDocumentV1)
  }

  const saveStats = (stats: StoredStatsState): void => {
    const normalizedSnapshot = normalizeStatsSnapshot(stats.snapshot, clock())
    const normalizedBreakLoop = normalizeBreakLoopState(stats.breakLoop)

    writeJsonFile(statsPath, {
      version: STATS_SCHEMA_VERSION,
      dayKey: normalizedSnapshot.dayKey,
      breaksCompletedToday: normalizedSnapshot.breaksCompletedToday,
      nextBreakAt: normalizedSnapshot.nextBreakAt,
      updatedAt: normalizedSnapshot.updatedAt,
      breakLoop: normalizedBreakLoop,
    } satisfies PersistedStatsDocumentV1)
  }

  return {
    loadSettings() {
      const settings = parseSettingsDocument(readJsonFile(settingsPath), clock())
      saveSettings(settings)
      return settings
    },
    saveSettings,
    loadStats() {
      const stats = parseStatsDocument(readJsonFile(statsPath), clock())
      saveStats(stats)
      return stats
    },
    saveStats,
  }
}

function parseSettingsDocument(document: unknown, now: number): HorizonSettingsSnapshot {
  const fallback = createDefaultSettingsSnapshot({}, now)

  if (!isRecord(document) || document.version !== SETTINGS_SCHEMA_VERSION) {
    return fallback
  }

  return normalizeSettingsSnapshot(
    {
      remindersEnabled: readBoolean(document.remindersEnabled, fallback.remindersEnabled),
      intervalMs: readPositiveNumber(document.intervalMs, fallback.intervalMs),
      breakDurationMs: readPositiveNumber(document.breakDurationMs, fallback.breakDurationMs),
      snoozeDurationMs: readPositiveNumber(document.snoozeDurationMs, fallback.snoozeDurationMs),
      autoCreditWindowMs: readPositiveNumber(document.autoCreditWindowMs, fallback.autoCreditWindowMs),
      launchAtLogin: readBoolean(document.launchAtLogin, fallback.launchAtLogin),
      updatedAt: readTimestamp(document.updatedAt, now),
    },
    now,
  )
}

function parseStatsDocument(document: unknown, now: number): StoredStatsState {
  const dayKey = createDayKey(now)
  const fallbackSnapshot = createEmptyStatsSnapshot(dayKey, now)
  const fallback = {
    snapshot: fallbackSnapshot,
    breakLoop: createEmptyBreakLoopState(),
  }

  if (!isRecord(document) || document.version !== STATS_SCHEMA_VERSION) {
    return fallback
  }

  const snapshot = normalizeStatsSnapshot(
    {
      dayKey: typeof document.dayKey === 'string' ? document.dayKey : dayKey,
      breaksCompletedToday: readCount(document.breaksCompletedToday),
      nextBreakAt: readNullableTimestamp(document.nextBreakAt),
      updatedAt: readTimestamp(document.updatedAt, now),
    },
    now,
  )

  return {
    snapshot,
    breakLoop: normalizeBreakLoopState(document.breakLoop),
  }
}

function normalizeSettingsSnapshot(settings: HorizonSettingsSnapshot, now: number): HorizonSettingsSnapshot {
  return createDefaultSettingsSnapshot(
    {
      remindersEnabled: readBoolean(settings.remindersEnabled, true),
      intervalMs: readPositiveNumber(settings.intervalMs, 20 * 60 * 1000),
      breakDurationMs: readPositiveNumber(settings.breakDurationMs, 20 * 1000),
      snoozeDurationMs: readPositiveNumber(settings.snoozeDurationMs, 2 * 60 * 1000),
      autoCreditWindowMs: readPositiveNumber(settings.autoCreditWindowMs, 2 * 60 * 1000),
      launchAtLogin: readBoolean(settings.launchAtLogin, false),
      updatedAt: readTimestamp(settings.updatedAt, now),
    },
    now,
  )
}

function normalizeStatsSnapshot(snapshot: HorizonStatsSnapshot, now: number): HorizonStatsSnapshot {
  const dayKey = createDayKey(now)
  const currentDayKey = snapshot.dayKey === dayKey ? snapshot.dayKey : dayKey
  const breaksCompletedToday = snapshot.dayKey === dayKey ? readCount(snapshot.breaksCompletedToday) : 0

  return {
    dayKey: currentDayKey,
    breaksCompletedToday,
    nextBreakAt: readNullableTimestamp(snapshot.nextBreakAt),
    updatedAt: readTimestamp(snapshot.updatedAt, now),
  }
}

function normalizeBreakLoopState(state: unknown): PersistedBreakLoopState {
  if (!isRecord(state)) {
    return createEmptyBreakLoopState()
  }

  return {
    activeElapsedMs: readCount(state.activeElapsedMs),
    breakStartedAt: readNullableTimestamp(state.breakStartedAt),
    breakEndsAt: readNullableTimestamp(state.breakEndsAt),
    snoozeUntil: readNullableTimestamp(state.snoozeUntil),
    completedBreaks: readCount(state.completedBreaks),
    lastOutcome: readOutcome(state.lastOutcome),
    lastOutcomeAt: readNullableTimestamp(state.lastOutcomeAt),
  }
}

function createEmptyBreakLoopState(): PersistedBreakLoopState {
  return {
    activeElapsedMs: 0,
    breakStartedAt: null,
    breakEndsAt: null,
    snoozeUntil: null,
    completedBreaks: 0,
    lastOutcome: null,
    lastOutcomeAt: null,
  }
}

function createDayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

function writeJsonFile(path: string, value: object): void {
  const directory = dirname(path)
  const temporaryPath = `${path}.tmp`

  mkdirSync(directory, { recursive: true })
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temporaryPath, path)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback
}

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

function readTimestamp(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function readNullableTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

function readOutcome(value: unknown): BreakLoopOutcome | null {
  return value === 'break-completed' || value === 'auto-credited' || value === 'skipped' || value === 'reset'
    ? value
    : null
}
