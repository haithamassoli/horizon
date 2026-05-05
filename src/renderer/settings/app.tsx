import { startTransition, useDeferredValue, useEffect, useEffectEvent, useState } from 'react'
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
import type {
  BreakActionType,
  BreakLoopSnapshot,
  BreakSettingsUpdate,
  PresenceKind,
  PresenceState,
} from '@shared/contracts/break'
import type { Result } from '@shared/contracts/result'
import '../styles.css'

const presenceModes: Array<{ kind: PresenceKind; label: string; note: string }> = [
  { kind: 'active', label: 'Active', note: 'Accumulate active time toward next break.' },
  { kind: 'idle', label: 'Idle', note: 'Pause timer and allow near-due auto-credit.' },
  { kind: 'locked', label: 'Locked', note: 'Pause loop while workstation stays unavailable.' },
  { kind: 'sleeping', label: 'Sleeping', note: 'Model system sleep and wake recovery.' },
]

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
  const loopState = useDeferredValue(breakState)

  const applyBreakState = useEffectEvent((snapshot: BreakLoopSnapshot) => {
    startTransition(() => {
      setBreakState(snapshot)
    })
  })

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
        applyBreakState(breakResult.data)
      } else {
        setError(breakResult.error)
      }
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

  useEffect(() => {
    if (!breakState) {
      return
    }

    setDraftSettings({
      intervalMinutes: String(Math.round(breakState.settings.intervalMs / 60000)),
      breakSeconds: String(Math.round(breakState.settings.breakDurationMs / 1000)),
      snoozeMinutes: String(Math.round(breakState.settings.snoozeDurationMs / 60000)),
      remindersEnabled: breakState.settings.remindersEnabled,
    })
  }, [
    breakState?.settings.breakDurationMs,
    breakState?.settings.intervalMs,
    breakState?.settings.remindersEnabled,
    breakState?.settings.snoozeDurationMs,
  ])

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

  async function updatePresence(kind: PresenceKind): Promise<void> {
    const result = await window.horizon.setBreakEnvironment({
      presence: { kind, idleMs: 0 },
    })

    handleStateResult(result)
  }

  async function updateSuppression(isSuppressed: boolean): Promise<void> {
    const result = await window.horizon.setBreakEnvironment({ isSuppressed })
    handleStateResult(result)
  }

  function handleStateResult(result: Result<BreakLoopSnapshot>): void {
    if (result.success) {
      setError(null)
      applyBreakState(result.data)
      return
    }

    setError(result.error)
  }

  const statusCopy = getStatusCopy(loopState)
  const presenceLabel = loopState ? titleCase(loopState.presence.kind) : 'Loading'

  return (
    <AppShell>
      <section className="app-container">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <Panel className="px-6 py-7 sm:px-8 sm:py-9">
            <Kicker>Milestone 2 live</Kicker>

            <div className="mt-6 grid gap-5">
              <div>
                <p className="section-kicker">Core Break Loop engine</p>
                <h1 className="mt-3 max-w-3xl text-5xl leading-none text-mist-50 sm:text-6xl lg:text-7xl font-display">
                  Horizon now runs active-time scheduling in main process, not mock copy.
                </h1>
              </div>

              <p className="hero-copy">
                {statusCopy.body} Presence, suppression, snooze, skip, completion, reset, and
                auto-credit all resolve inside one loop so tray, settings, and overlay stay in sync.
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
                description="Main-process loop state now flows into renderer through typed IPC subscriptions."
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
              <SectionHeader kicker="Environment simulation" title="Presence and suppression debug" />

              <div className="mt-6 grid gap-4">
                {presenceModes.map((mode) => (
                  <button
                    className={
                      loopState?.presence.kind === mode.kind
                        ? 'metric-card border-aurora-300/18 bg-aurora-300/10 text-left'
                        : 'metric-card text-left'
                    }
                    key={mode.kind}
                    onClick={() => void updatePresence(mode.kind)}
                    type="button"
                  >
                    <div className="metric-label">{mode.label}</div>
                    <p className="mt-3 text-base font-semibold text-mist-50">{mode.note}</p>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  onClick={() => void updateSuppression(!(loopState?.isSuppressed ?? false))}
                  tone="secondary"
                >
                  {loopState?.isSuppressed ? 'Disable suppression' : 'Enable suppression'}
                </Button>
              </div>
            </Panel>

            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader kicker="Behavior notes" title="What milestone 2 now covers" />

              <div className="mt-6 grid gap-4">
                <MetricCard note="Active time accumulates only while Presence is active, then pauses cleanly during idle, lock, and sleep states." />
                <MetricCard note="Near-due idle for at least break duration auto-credits a break instead of forcing a prompt." />
                <MetricCard note="Snooze, skip, complete, and reset all recover through same main-process transition model." />
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
