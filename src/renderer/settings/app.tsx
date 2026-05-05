import { startTransition, useDeferredValue, useEffect, useEffectEvent, useRef, useState } from 'react'
import { AppShell, Button, Kicker, MetricCard, Panel, SectionHeader, StatusBanner } from '@renderer/shared/ui'
import type { RuntimeInfo } from '@shared/contracts/app'
import type { BreakActionType, BreakLoopSnapshot } from '@shared/contracts/break'
import type { Result } from '@shared/contracts/result'
import type { HorizonSettingsSnapshot } from '@shared/contracts/settings'
import type { HorizonStatsSnapshot } from '@shared/contracts/stats'
import '../styles.css'

type DraftSettings = {
  intervalMinutes: string
  breakSeconds: string
  snoozeMinutes: string
  remindersEnabled: boolean
  launchAtLogin: boolean
}

const emptyDraftSettings: DraftSettings = {
  intervalMinutes: '20',
  breakSeconds: '20',
  snoozeMinutes: '2',
  remindersEnabled: true,
  launchAtLogin: false,
}

const nextBreakFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const updatedAtFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

export default function SettingsApp() {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null)
  const [breakState, setBreakState] = useState<BreakLoopSnapshot | null>(null)
  const [settingsSnapshot, setSettingsSnapshot] = useState<HorizonSettingsSnapshot | null>(null)
  const [statsSnapshot, setStatsSnapshot] = useState<HorizonStatsSnapshot | null>(null)
  const [draftSettings, setDraftSettings] = useState<DraftSettings>(emptyDraftSettings)
  const [error, setError] = useState<string | null>(null)
  const syncedSettingsKeyRef = useRef('')
  const loopState = useDeferredValue(breakState)

  const syncDraftSettings = (snapshot: HorizonSettingsSnapshot): void => {
    const nextKey = getSettingsKey(snapshot)

    if (syncedSettingsKeyRef.current === nextKey) {
      return
    }

    syncedSettingsKeyRef.current = nextKey
    setDraftSettings(toDraftSettings(snapshot))
  }

  const commitBreakSnapshot = (snapshot: BreakLoopSnapshot): void => {
    startTransition(() => {
      setBreakState(snapshot)
    })
  }

  const commitSettingsSnapshot = (snapshot: HorizonSettingsSnapshot): void => {
    startTransition(() => {
      setSettingsSnapshot(snapshot)
    })

    setError(null)
    syncDraftSettings(snapshot)
  }

  const commitStatsSnapshot = (snapshot: HorizonStatsSnapshot): void => {
    startTransition(() => {
      setStatsSnapshot(snapshot)
    })

    setError(null)
  }

  const applyBreakSnapshot = useEffectEvent((snapshot: BreakLoopSnapshot): void => {
    commitBreakSnapshot(snapshot)
  })

  const applySettingsSnapshot = useEffectEvent((snapshot: HorizonSettingsSnapshot): void => {
    commitSettingsSnapshot(snapshot)
  })

  const applyStatsSnapshot = useEffectEvent((snapshot: HorizonStatsSnapshot): void => {
    commitStatsSnapshot(snapshot)
  })

  useEffect(() => {
    let cancelled = false

    async function loadData(): Promise<void> {
      const [runtimeResult, breakResult, settingsResult, statsResult] = await Promise.all([
        window.horizon.getRuntimeInfo(),
        window.horizon.getBreakState(),
        window.horizon.getSettings(),
        window.horizon.getStats(),
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
        applyBreakSnapshot(breakResult.data)
      } else {
        setError(breakResult.error)
      }

      if (settingsResult.success) {
        applySettingsSnapshot(settingsResult.data)
      } else {
        setError(settingsResult.error)
      }

      if (statsResult.success) {
        applyStatsSnapshot(statsResult.data)
      } else {
        setError(statsResult.error)
      }
    }

    void loadData()

    const unsubscribeBreak = window.horizon.subscribeBreakState((snapshot) => {
      if (!cancelled) {
        applyBreakSnapshot(snapshot)
      }
    })

    const unsubscribeSettings = window.horizon.subscribeSettings((snapshot) => {
      if (!cancelled) {
        applySettingsSnapshot(snapshot)
      }
    })

    const unsubscribeStats = window.horizon.subscribeStats((snapshot) => {
      if (!cancelled) {
        applyStatsSnapshot(snapshot)
      }
    })

    return () => {
      cancelled = true
      unsubscribeBreak()
      unsubscribeSettings()
      unsubscribeStats()
    }
  }, [])

  async function runBreakAction(action: BreakActionType): Promise<void> {
    const result = await window.horizon.performBreakAction(action)

    if (result.success) {
      setError(null)
      commitBreakSnapshot(result.data)
      return
    }

    setError(result.error)
  }

  async function applySettings(): Promise<void> {
    const intervalMinutes = Number(draftSettings.intervalMinutes)
    const breakSeconds = Number(draftSettings.breakSeconds)
    const snoozeMinutes = Number(draftSettings.snoozeMinutes)

    if (intervalMinutes <= 0 || breakSeconds <= 0 || snoozeMinutes <= 0) {
      setError('Interval, break duration, and snooze duration must be positive values.')
      return
    }

    const result = await window.horizon.updateSettings({
      remindersEnabled: draftSettings.remindersEnabled,
      intervalMs: Math.round(intervalMinutes * 60000),
      breakDurationMs: Math.round(breakSeconds * 1000),
      snoozeDurationMs: Math.round(snoozeMinutes * 60000),
      launchAtLogin: draftSettings.launchAtLogin,
    })

    handleResult(result, commitSettingsSnapshot, setError)
  }

  const statusCopy = getStatusCopy(loopState)

  return (
    <AppShell>
      <section className="app-container">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
          <Panel className="px-6 py-7 sm:px-8 sm:py-9">
            <Kicker>Milestone 5 live</Kicker>

            <div className="mt-6 grid gap-5">
              <div>
                <p className="section-kicker">App shell and interaction surfaces</p>
                <h1 className="mt-3 max-w-3xl text-5xl leading-none text-mist-50 sm:text-6xl lg:text-7xl font-display">
                  Milestone 5 keeps settings, daily stats, and quiet restarts on one trusted main-process rail.
                </h1>
              </div>

              <p className="hero-copy">
                {statusCopy.body} Settings and daily stats now persist locally, launch-at-login stays user-controlled, and restart recovery no longer resets the day.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard label="Loop status" note="Live Break Loop snapshot from main process." value={statusCopy.title} />
                <MetricCard
                  label="Next break"
                  note="Persisted and shared with tray status after restart."
                  value={formatNextMoment(statsSnapshot, loopState)}
                />
                <MetricCard
                  label="Completed today"
                  note="Daily local stat from main-process storage."
                  value={String(statsSnapshot?.breaksCompletedToday ?? 0)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void runBreakAction('start-now')}>Start break now</Button>
                <Button onClick={() => void runBreakAction('snooze')} tone="secondary">
                  Snooze
                </Button>
                <Button onClick={() => void runBreakAction('skip')} tone="secondary">
                  Skip cycle
                </Button>
                <Button onClick={() => void runBreakAction('reset')} tone="ghost">
                  Reset loop
                </Button>
              </div>
            </div>
          </Panel>

          <Panel as="aside" className="px-6 py-7 sm:px-7 sm:py-8" tone="soft">
            <SectionHeader aside={<Kicker>Local shell</Kicker>} kicker="Preferences" title="Quiet defaults, durable control" />

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm text-mist-300">
                Break interval in minutes
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
                Break duration in seconds
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
                Snooze duration in minutes
                <input
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-mist-50 outline-none transition focus:border-violet-400/30"
                  inputMode="numeric"
                  onChange={(event) => {
                    setDraftSettings((current) => ({ ...current, snoozeMinutes: event.target.value }))
                  }}
                  value={draftSettings.snoozeMinutes}
                />
              </label>

              <ToggleRow
                active={draftSettings.remindersEnabled}
                label="Break reminders"
                note="Pause the loop without exposing privileged logic to renderer."
                onToggle={() => {
                  setDraftSettings((current) => ({
                    ...current,
                    remindersEnabled: !current.remindersEnabled,
                  }))
                }}
              />

              <ToggleRow
                active={draftSettings.launchAtLogin}
                label="Launch at login"
                note="Delegated to Electron login-item settings in main process."
                onToggle={() => {
                  setDraftSettings((current) => ({
                    ...current,
                    launchAtLogin: !current.launchAtLogin,
                  }))
                }}
              />

              <Button className="w-full" onClick={() => void applySettings()}>
                Apply settings
              </Button>
            </div>
          </Panel>
        </div>

        {error ? <StatusBanner>IPC error: {error}</StatusBanner> : null}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-6">
            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader
                description="Tray, settings window, and break overlay all project from main-process state instead of duplicating logic in UI."
                kicker="Shell sync"
                title="One source of truth"
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <MetricCard label="Presence" note="Normalized system state." value={titleCase(loopState?.presence.kind ?? 'loading')} />
                <MetricCard label="Suppression" note="Fullscreen or presentation hold." value={loopState?.isSuppressed ? 'Active' : 'Clear'} />
                <MetricCard label="Progress" note="Shared with tray timing." value={formatProgress(loopState)} />
                <MetricCard
                  label="Launch at login"
                  note="Persisted preference applied through Electron login-item state."
                  value={settingsSnapshot?.launchAtLogin ? 'Enabled' : 'Disabled'}
                />
                <MetricCard label="Electron" note="Secure preload bridge only." value={runtimeInfo?.electronVersion ?? 'Loading'} />
                <MetricCard label="Platform" note="Current desktop target." value={runtimeInfo?.platform ?? 'Loading'} />
              </div>
            </Panel>

            <Panel className="px-6 py-7 sm:px-8 sm:py-8" tone="soft">
              <SectionHeader kicker="Window surfaces" title="How Milestone 5 behaves now" />

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Tray"
                  note="Shows status, persisted next break timing, quick actions, and daily completion count."
                />
                <MetricCard
                  label="Settings"
                  note="Reads settings and daily stats through typed IPC while staying pure React UI."
                />
                <MetricCard
                  label="Overlay"
                  note="Window is created once, shown only when due or on-break, then hidden without resetting persisted cycle progress."
                />
              </div>
            </Panel>
          </div>

          <div className="grid gap-6">
            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader kicker="Saved snapshot" title="Current preference and stats payload" />

              <div className="mt-6 grid gap-4">
                <MetricCard label="Interval" note="Main-process settings snapshot." value={`${draftSettings.intervalMinutes} min`} />
                <MetricCard label="Break" note="Overlay countdown target." value={`${draftSettings.breakSeconds} sec`} />
                <MetricCard label="Snooze" note="Delay before due prompt returns." value={`${draftSettings.snoozeMinutes} min`} />
                <MetricCard
                  label="Updated"
                  note="Latest persisted settings state seen from IPC subscription."
                  value={formatUpdatedAt(settingsSnapshot?.updatedAt ?? null)}
                />
                <MetricCard
                  label="Today"
                  note="Daily rollover key for local stats storage."
                  value={statsSnapshot?.dayKey ?? 'Loading'}
                />
                <MetricCard
                  label="Daily breaks"
                  note="Completed breaks tracked across restarts."
                  value={String(statsSnapshot?.breaksCompletedToday ?? 0)}
                />
              </div>
            </Panel>

            <Panel className="px-6 py-7 sm:px-8 sm:py-8">
              <SectionHeader kicker="Behavior notes" title="Why shell stays trustworthy" />

              <div className="mt-6 grid gap-4">
                <MetricCard note="Tray actions mutate same Break Loop controller used by overlay and settings, so timing never forks between windows or restarts." />
                <MetricCard note="Launch-at-login changes stay inside main process, persist locally, and never expose raw Electron primitives to renderer." />
                <MetricCard note="Daily stats roll forward in storage, so completed breaks and next break time recover cleanly when app relaunches." />
              </div>
            </Panel>
          </div>
        </section>
      </section>
    </AppShell>
  )
}

function ToggleRow({
  active,
  label,
  note,
  onToggle,
}: {
  active: boolean
  label: string
  note: string
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.035] px-4 py-3 text-sm text-mist-200">
      <div>
        <div className="text-mist-50">{label}</div>
        <p className="mt-1 text-xs leading-6 text-mist-300">{note}</p>
      </div>

      <button className={active ? 'text-mint-300' : 'text-mist-300'} onClick={onToggle} type="button">
        {active ? 'On' : 'Off'}
      </button>
    </div>
  )
}

function handleResult<T>(
  result: Result<T>,
  applySnapshot: (snapshot: T) => void,
  setError: (error: string | null) => void,
): void {
  if (result.success) {
    setError(null)
    applySnapshot(result.data)
    return
  }

  setError(result.error)
}

function getStatusCopy(snapshot: BreakLoopSnapshot | null): { title: string; body: string } {
  if (!snapshot) {
    return {
      title: 'Loading',
      body: 'Renderer is waiting for app-shell state from main process.',
    }
  }

  switch (snapshot.status) {
    case 'running':
      return {
        title: 'Running',
        body: 'Break Loop is advancing active time and tray timing together.',
      }
    case 'paused':
      return {
        title: 'Paused',
        body: 'Loop is quiet because reminders are disabled or presence says user is away.',
      }
    case 'due':
      return {
        title: 'Due now',
        body: 'Overlay is eligible to surface and tray shows immediate action state.',
      }
    case 'snoozed':
      return {
        title: 'Snoozed',
        body: 'Main process is holding the reminder without resetting the cycle.',
      }
    case 'suppressed':
      return {
        title: 'Suppressed',
        body: 'Interruption is intentionally blocked while tray still tracks the due state.',
      }
    case 'on-break':
      return {
        title: 'On break',
        body: 'Overlay countdown is live and dismissal will complete through same controller.',
      }
  }
}

function formatNextMoment(statsSnapshot: HorizonStatsSnapshot | null, breakSnapshot: BreakLoopSnapshot | null): string {
  if (breakSnapshot?.status === 'due') {
    return 'Due now'
  }

  if (!statsSnapshot?.nextBreakAt) {
    return 'Paused'
  }

  return nextBreakFormatter.format(statsSnapshot.nextBreakAt)
}

function formatProgress(snapshot: BreakLoopSnapshot | null): string {
  if (!snapshot) {
    return 'Loading'
  }

  return `${Math.round(snapshot.activeProgress * 100)}%`
}

function formatUpdatedAt(updatedAt: number | null): string {
  if (!updatedAt) {
    return 'Waiting'
  }

  return updatedAtFormatter.format(updatedAt)
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toDraftSettings(snapshot: HorizonSettingsSnapshot): DraftSettings {
  return {
    intervalMinutes: String(Math.round(snapshot.intervalMs / 60000)),
    breakSeconds: String(Math.round(snapshot.breakDurationMs / 1000)),
    snoozeMinutes: String(Math.round(snapshot.snoozeDurationMs / 60000)),
    remindersEnabled: snapshot.remindersEnabled,
    launchAtLogin: snapshot.launchAtLogin,
  }
}

function getSettingsKey(snapshot: HorizonSettingsSnapshot): string {
  return [
    snapshot.intervalMs,
    snapshot.breakDurationMs,
    snapshot.snoozeDurationMs,
    snapshot.remindersEnabled,
    snapshot.launchAtLogin,
  ].join(':')
}
