import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { createStorageAdapter } from './storage-adapter'

describe('createStorageAdapter', () => {
  const directories: string[] = []

  afterEach(() => {
    for (const directory of directories.splice(0)) {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('falls back to defaults for invalid settings payloads', () => {
    const directory = mkdtempSync(join(tmpdir(), 'horizon-storage-'))
    directories.push(directory)
    writeFileSync(join(directory, 'settings.json'), JSON.stringify({ version: 1, intervalMs: -1 }), 'utf8')

    const storage = createStorageAdapter({ baseDir: directory, clock: () => 123 })
    const settings = storage.loadSettings()

    expect(settings.intervalMs).toBe(20 * 60 * 1000)
    expect(settings.launchAtLogin).toBe(false)

    const persisted = JSON.parse(readFileSync(join(directory, 'settings.json'), 'utf8')) as { intervalMs: number }
    expect(persisted.intervalMs).toBe(20 * 60 * 1000)
  })

  it('resets daily stats when persisted day is stale but keeps loop state', () => {
    const directory = mkdtempSync(join(tmpdir(), 'horizon-storage-'))
    directories.push(directory)
    writeFileSync(
      join(directory, 'stats.json'),
      JSON.stringify({
        version: 1,
        dayKey: '2026-05-04',
        breaksCompletedToday: 3,
        nextBreakAt: 5000,
        updatedAt: 50,
        breakLoop: {
          activeElapsedMs: 120000,
          breakStartedAt: null,
          breakEndsAt: null,
          snoozeUntil: null,
          completedBreaks: 3,
          lastOutcome: 'break-completed',
          lastOutcomeAt: 40,
        },
      }),
      'utf8',
    )

    const timestamp = new Date(2026, 4, 5, 9, 0, 0, 0).getTime()
    const storage = createStorageAdapter({ baseDir: directory, clock: () => timestamp })
    const stats = storage.loadStats()

    expect(stats.snapshot.dayKey).toBe('2026-05-05')
    expect(stats.snapshot.breaksCompletedToday).toBe(0)
    expect(stats.breakLoop.activeElapsedMs).toBe(120000)
  })
})
