import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Kicker,
  MetricCard,
  Panel,
  SectionHeader,
  StatusBanner,
  ToneSwatch,
} from '@renderer/shared/ui'
import type { RuntimeInfo } from '@shared/contracts/app'
import type { BreakActionType, BreakLoopSnapshot } from '@shared/contracts/break'
import type { Result } from '@shared/contracts/result'
import '../styles.css'

const toneSwatches = [
  {
    name: 'Observatory Night',
    accent: 'Foundation',
    className: 'bg-ink-900 text-mist-50',
  },
  {
    name: 'Aurora Blue',
    accent: 'Active cadence',
    className: 'bg-aurora-400/20 text-aurora-300',
  },
  {
    name: 'Quiet Violet',
    accent: 'Suppression guard',
    className: 'bg-violet-500/18 text-violet-400',
  },
  {
    name: 'Recovery Mint',
    accent: 'Break completion',
    className: 'bg-mint-400/18 text-mint-300',
  },
]

type DraftSettings = {
  intervalMinutes: string
  breakSeconds: string
  snoozeMinutes: string
  remindersEnabled: boolean
}

const emptyDraftSettings: DraftSettings = {
  intervalMinutes: '20',
  breakSeconds: '20',
  snoozeMinutes: '2',
  remindersEnabled: true,
}

export default function SettingsApp() {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null)
  const [breakState, setBreakState] = useState<BreakLoopSnapshot | null>(null)
  const [draftSettings, setDraftSettings] = useState<DraftSettings>(emptyDraftSettings)
  const [error, setError] = useState<string | null>(null)
  const syncedSettingsKeyRef = useRef('')
  const loopState = useDeferredValue(breakState)

  const applyBreakState = (snapshot: BreakLoopSnapshot): void => {
    startTransition(() => {
      setBreakState(snapshot)
    })
  }

  const syncDraftSettings = (snapshot: BreakLoopSnapshot): void => {
    const nextKey = getSettingsKey(snapshot)

    if (syncedSettingsKeyRef.current === nextKey) {
      return
    }

    syncedSettingsKeyRef.current = nextKey
    setDraftSettings(toDraftSettings(snapshot))
  }

  const handleStateResult = (result: Result<BreakLoopSnapshot>): void => {
    if (result.success) {
      setError(null)
      syncDraftSettings(result.data)
      applyBreakState(result.data)
      return
    }

    setError(result.error)
  }

  useEffect(() => {
    let cancelled = false

    async function loadData(): Promise<void> {
      const [runtimeResult, breakResult] = await Promise.all([
        window.horizon.getRuntimeInfo(),
        window.horizon.getBreakState(),
      ])

      if (cancelled) {
        return
      }

      if (runtimeResult.success) {
        setRuntimeInfo(runtimeResult.data)
      } else {
        setError(runtimeResult.error)
      }

      if (breakResult.success) {
        setError(null)
        syncDraftSettings(breakResult.data)
        applyBreakState(breakResult.data)
        return
      }

      setError(breakResult.error)
    }

    void loadData()

    const unsubscribe = window.horizon.subscribeBreakState((snapshot) => {
      if (!cancelled) {
        applyBreakState(snapshot)
      }
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  async function runBreakAction(action: BreakActionType): Promise<void> {
    const result = await window.horizon.performBreakAction(action)
    handleStateResult(result)
  }

  async function applySettings(): Promise<void> {
    const intervalMinutes = Number(draftSettings.intervalMinutes)
    const breakSeconds = Number(draftSettings.breakSeconds)
    const snoozeMinutes = Number(draftSettings.snoozeMinutes)

    if (intervalMinutes <= 0 || breakSeconds <= 0 || snoozeMinutes <= 0) {
      setError('Interval, break duration, and snooze duration must be positive values.')
      return
    }

    const result = await window.horizon.updateBreakSettings({
      remindersEnabled: draftSettings.remindersEnabled,
      intervalMs: Math.round(intervalMinutes * 60000),
      breakDurationMs: Math.round(breakSeconds * 1000),
      snoozeDurationMs: Math.round(snoozeMinutes * 60000),
    })

    handleStateResult(result)
  }

  const statusCopy = getStatusCopy(loopState)
  const presenceLabel = loopState ? titleCase(loopState.presence.kind) : 'Loading'

  return (
    <AppShell>
      <section className="app-container">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <Panel className="px-6 py-7 sm:px-8 sm:py-9">
            <Kicker>Milestone 3 live</Kicker>

            <div className="mt-6 grid gap-5">
              <div>
                <p className="section-kicker">Presence and suppression intelligence</p>
                <h1 className="mt-3 max-w-3xl text-5xl leading-none text-mist-50 sm:text-6xl lg:text-7xl font-display">
                  Horizon now reads platform signals before it decides whether interruption is welcome.
                </h1>
              </div>

              <p className="hero-copy">
                {statusCopy.body} Presence adapters normalize idle, lock, sleep, and wake. Suppression adapters guard fullscreen and presentation-like work before overlay can surface.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Loop status"
                  note="Derived from active time, current presence, suppression, and break actions."
                  value={statusCopy.title}
                />
                <MetricCard
                  label="Next moment"
                  note="Wall-clock projection when loop is advancing or currently due."
                  value={formatNextMoment(loopState)}
                />
                <MetricCard
                  label="Completed today"
                  note="Counts finished or auto-credited cycles from this runtime session."
                  value={String(loopState?.completedBreaks ?? 0)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void runBreakAction('start-now')}>Start break now</Button>
                <Button onClick={() => void runBreakAction('snooze')} tone="secondary">
                  Snooze
                </Button>
                <Button onClick={() => void runBreakAction('skip')} tone="secondary">
                  Skip
                </Button>
                <Button onClick={() => void runBreakAction('reset')} tone="ghost">
                  Reset cycle
                </Button>
              </div>
            </div>
          </Panel>

          <Panel as="aside" className="px-6 py-7 sm:px-7 sm:py-8" tone="soft">
            <SectionHeader aside={<Kicker>20-20-20</Kicker>} kicker="Current loop" title="Cadence controls" />

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-mist-300">
                Interval minutes
                <input
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-mist-50 outline-none transition focus:border-aurora-300/30"
                  inputMode="numeric"
                  onChange={(event) => {
                    setDraftSettings((current) => ({ ...current, intervalMinutes: event.target.value }))
                  }}
                  value={draftSettings.intervalMinutes}
                />
              </label>

              <label className="grid gap-2 text-sm text-mist-300">
                Break seconds
                <input
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-mist-50 outline-none transition focus:border-mint-300/30"
                  inputMode="numeric"
                  onChange={(event) => {
                    setDraftSettings((current) => ({ ...current, breakSeconds: event.target.value }))
                  }}
                  value={draftSettings.breakSeconds}
                />
              </label>

              <label className="grid gap-2 text-sm text-mist-300">
                Snooze minutes
                <input
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-mist-50 outline-none transition focus:border-violet-400/30"
                  inputMode="numeric"
                  onChange={(event) => {
                    setDraftSettings((current) => ({ ...current, snoozeMinutes: event.target.value }))
                  }}
                  value={draftSettings.snoozeMinutes}
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-mist-200">
                Reminders enabled
                <button
                  className={draftSettings.remindersEnabled ? 'text-mint-300' : 'text-mist-300'}
                  onClick={() => {
                    setDraftSettings((current) => ({
                      ...current,
                      remindersEnabled: !current.remindersEnabled,
                    }))
                  }}
                  type="button"
                >
                  {draftSettings.remindersEnabled ? 'On' : 'Off'}
                </button>
              </label>

              <Button onClick={() => void applySettings()} className="w-full">
                Apply loop settings
              </Button>
            </div>
          </Panel>
        </div>

        {error ? <StatusBanner>IPC error: {error}</StatusBanner> : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-6">
            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader
                description="Typed IPC now carries live Break Loop state driven by real platform adapters."
                kicker="Runtime snapshot"
                title="Single source of truth"
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Presence" note="Normalized Presence input." value={presenceLabel} />
                <MetricCard
                  label="Idle time"
                  note="Derived from current inactive duration."
                  value={formatDuration(loopState?.presence.idleMs ?? 0)}
                />
                <MetricCard
                  label="Suppression"
                  note="Fullscreen or presentation guardrail input."
                  value={loopState?.isSuppressed ? 'Active' : 'Clear'}
                />
                <MetricCard
                  label="Active progress"
                  note="Active-time accumulation toward next due break."
                  value={formatProgress(loopState)}
                />
                <MetricCard
                  label="Break timer"
                  note="Remaining break countdown while on-break."
                  value={formatDuration(loopState?.breakRemainingMs ?? 0)}
                />
                <MetricCard
                  label="Last outcome"
                  note="Last reset reason emitted by loop engine."
                  value={formatOutcome(loopState?.lastOutcome)}
                />
                <MetricCard label="App" note="Main process runtime metadata." value={runtimeInfo?.appName ?? 'Loading'} />
                <MetricCard
                  label="Electron"
                  note="Securely exposed through preload bridge."
                  value={runtimeInfo?.electronVersion ?? 'Loading'}
                />
                <MetricCard
                  label="Platform"
                  note="Runtime target for current desktop shell."
                  value={runtimeInfo?.platform ?? 'Loading'}
                />
              </div>
            </Panel>

            <Panel className="px-6 py-7 sm:px-8 sm:py-8" tone="soft">
              <SectionHeader kicker="Design system primitives" title="Loop semantics in Horizon palette" />

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {toneSwatches.map((tone) => (
                  <ToneSwatch accent={tone.accent} className={tone.className} key={tone.name} name={tone.name} />
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6">
            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader kicker="Platform awareness" title="Adapter-backed interruption guardrails" />

              <div className="mt-6 grid gap-4">
                <MetricCard note="Presence comes from Electron power-monitor signals plus normalized idle polling in main process." />
                <MetricCard note="Suppression comes from platform-specific fullscreen detection through narrow native bridge commands when Electron alone is not enough." />
                <MetricCard note="Manual environment forcing stays available through IPC for diagnostics, but normal product behavior now follows live system state." />
              </div>
            </Panel>

            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader kicker="Behavior notes" title="What milestone 3 now covers" />

              <div className="mt-6 grid gap-4">
                <MetricCard note="Idle, lock, sleep, unlock, and wake now enter Break Loop through one normalized Presence seam." />
                <MetricCard note="Fullscreen or presentation-like work now holds due breaks behind Suppression instead of surfacing mistimed overlays." />
                <MetricCard note="Near-due idle still auto-credits a break, but only after adapter-normalized system state reaches core loop." />
              </div>
            </Panel>
          </div>
        </section>
      </section>
    </AppShell>
  )
}

function getStatusCopy(snapshot: BreakLoopSnapshot | null): { title: string; body: string } {
  if (!snapshot) {
    return {
      title: 'Loading',
      body: 'Renderer is waiting for main-process loop state.',
    }
  }

  switch (snapshot.status) {
    case 'running':
      return {
        title: 'Running',
        body: 'Active input is flowing, timer is advancing, and next break is projected from real accumulated work time.',
      }
    case 'paused':
      return {
        title: 'Paused',
        body: 'Loop is intentionally still because reminders are disabled or Presence is currently away, locked, or sleeping.',
      }
    case 'due':
      return {
        title: 'Due now',
        body: 'Break is ready and overlay may surface because interval target has been reached without suppression.',
      }
    case 'snoozed':
      return {
        title: 'Snoozed',
        body: 'Loop is holding break prompt for short recovery delay while keeping cycle state intact.',
      }
    case 'suppressed':
      return {
        title: 'Suppressed',
        body: 'Break is due, but interruption is blocked until suppression clears so trust wins over rigidity.',
      }
    case 'on-break':
      return {
        title: 'On break',
        body: 'Overlay countdown is active and loop will reset on completion without leaking timing logic into renderer.',
      }
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) {
    return '0s'
  }

  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  if (seconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${seconds}s`
}

function formatNextMoment(snapshot: BreakLoopSnapshot | null): string {
  if (!snapshot?.nextBreakAt) {
    return 'Paused'
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return formatter.format(snapshot.nextBreakAt)
}

function formatProgress(snapshot: BreakLoopSnapshot | null): string {
  if (!snapshot) {
    return 'Loading'
  }

  return `${Math.round(snapshot.activeProgress * 100)}%`
}

function formatOutcome(outcome: BreakLoopSnapshot['lastOutcome'] | undefined): string {
  if (!outcome) {
    return 'None yet'
  }

  return outcome.replace('-', ' ')
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toDraftSettings(snapshot: BreakLoopSnapshot): DraftSettings {
  return {
    intervalMinutes: String(Math.round(snapshot.settings.intervalMs / 60000)),
    breakSeconds: String(Math.round(snapshot.settings.breakDurationMs / 1000)),
    snoozeMinutes: String(Math.round(snapshot.settings.snoozeDurationMs / 60000)),
    remindersEnabled: snapshot.settings.remindersEnabled,
  }
}

function getSettingsKey(snapshot: BreakLoopSnapshot): string {
  return [
    snapshot.settings.intervalMs,
    snapshot.settings.breakDurationMs,
    snapshot.settings.snoozeDurationMs,
    snapshot.settings.remindersEnabled,
  ].join(':')
}
