import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { AppShell, BreakOrbit, Button, Kicker, MetricCard, Panel, StatusBanner } from '@renderer/shared/ui'
import type { BreakActionType, BreakLoopSnapshot } from '@shared/contracts/break'
import type { Result } from '@shared/contracts/result'
import '../styles.css'

export default function OverlayApp() {
  const [breakState, setBreakState] = useState<BreakLoopSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const applyBreakState = useEffectEvent((snapshot: BreakLoopSnapshot) => {
    startTransition(() => {
      setBreakState(snapshot)
    })
  })

  useEffect(() => {
    let cancelled = false

    async function loadState(): Promise<void> {
      const result = await window.horizon.getBreakState()

      if (cancelled) {
        return
      }

      handleStateResult(result)
    }

    void loadState()

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

  function handleStateResult(result: Result<BreakLoopSnapshot>): void {
    if (result.success) {
      setError(null)
      applyBreakState(result.data)
      return
    }

    setError(result.error)
  }

  const countdown = breakState?.status === 'on-break' ? breakState.breakRemainingMs : breakState?.settings.breakDurationMs ?? 20000
  const heading = breakState?.status === 'on-break' ? 'Look 20 feet away.' : 'Break is due.'
  const body =
    breakState?.status === 'on-break'
      ? 'Recovery countdown is live. Complete when you are ready and Horizon will reset the cycle in main process.'
      : 'Active-time interval is complete. Start now, snooze briefly, or skip and let the next cycle recover cleanly.'

  return (
    <AppShell className="flex items-center justify-center px-4 py-6">
      <Panel className="relative z-10 w-full max-w-sm px-6 py-7 sm:px-7 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <Kicker>Break overlay</Kicker>
          <span className="text-[0.7rem] uppercase tracking-[0.24em] text-mist-300/80">{formatOverlayStatus(breakState)}</span>
        </div>

        <div className="mt-6 grid gap-6">
          <BreakOrbit className="mx-auto w-full max-w-[15rem]">
            <div className="text-center">
              <p className="section-kicker">Recovery countdown</p>
              <div className="mt-3 text-5xl leading-none text-mist-50 font-display">{formatClock(countdown)}</div>
            </div>
          </BreakOrbit>

          <div className="text-center">
            <h1 className="text-3xl leading-none text-mist-50 font-display">{heading}</h1>
            <p className="mt-3 text-sm leading-7 text-mist-300">{body}</p>
          </div>

          {error ? <StatusBanner>IPC error: {error}</StatusBanner> : null}

          <div className="grid gap-3">
            {breakState?.status === 'on-break' ? (
              <Button className="w-full" onClick={() => void runBreakAction('complete')}>
                Complete break
              </Button>
            ) : (
              <Button className="w-full" onClick={() => void runBreakAction('start-now')}>
                Start break now
              </Button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button className="w-full" onClick={() => void runBreakAction('snooze')} tone="secondary">
                Snooze
              </Button>
              <Button className="w-full" onClick={() => void runBreakAction('skip')} tone="secondary">
                Skip
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              align="center"
              label="Progress"
              note="Active cadence finished before overlay opened."
              value={breakState ? `${Math.round(breakState.activeProgress * 100)}%` : '...'}
            />
            <MetricCard
              align="center"
              label="Completed"
              note="Breaks completed in current runtime session."
              value={String(breakState?.completedBreaks ?? 0)}
            />
          </div>
        </div>
      </Panel>
    </AppShell>
  )
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatOverlayStatus(snapshot: BreakLoopSnapshot | null): string {
  if (!snapshot) {
    return 'Syncing'
  }

  return snapshot.status.replace('-', ' ')
}
