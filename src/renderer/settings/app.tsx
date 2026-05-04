import { useEffect, useState } from 'react'
import type { RuntimeInfo } from '@shared/contracts/app'
import type { Result } from '@shared/contracts/result'
import '../styles.css'

const experiencePillars = [
  {
    title: 'Break Loop',
    body: 'Active time drives reminders, while pause, snooze, and auto-credit keep the cadence feeling intentional instead of mechanical.',
  },
  {
    title: 'Presence',
    body: 'Idle, lock, and wake signals should quietly steer the experience so the app feels observant without becoming invasive.',
  },
  {
    title: 'Suppression',
    body: 'Fullscreen and presentation states are treated as moments where trust matters more than adherence, so Horizon stays quiet.',
  },
]

const toneSwatches = [
  {
    name: 'Observatory Night',
    accent: 'Foundation',
    className: 'bg-ink-900 text-mist-50',
  },
  {
    name: 'Aurora Blue',
    accent: 'Primary action',
    className: 'bg-aurora-400/20 text-aurora-300',
  },
  {
    name: 'Quiet Violet',
    accent: 'Ambient depth',
    className: 'bg-violet-500/18 text-violet-400',
  },
  {
    name: 'Recovery Mint',
    accent: 'Success and relief',
    className: 'bg-mint-400/18 text-mint-300',
  },
]

const surfaceNotes = [
  'Rounded glass panels for settings, overlays, and lightweight stats.',
  'Serif display type paired with system sans text for calm, premium contrast.',
  'Soft orbits, fine grid texture, and low-noise gradients to imply focus without urgency.',
]

function RuntimeCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <p className="metric-note">Securely exposed from the main process through the typed preload bridge.</p>
    </article>
  )
}

export default function SettingsApp() {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    function loadRuntimeInfo(): void {
      void window.horizon.getRuntimeInfo().then((result: Result<RuntimeInfo>) => {
        if (cancelled) {
          return
        }

        if (result.success) {
          setRuntimeInfo(result.data)
          return
        }

        setError(result.error)
      })
    }

    loadRuntimeInfo()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app-shell">
      <div className="ambient-orb ambient-orb-left" />
      <div className="ambient-orb ambient-orb-right" />

      <section className="app-container">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <section className="horizon-panel px-6 py-7 sm:px-8 sm:py-9">
            <span className="hero-kicker">Calm desktop companion</span>

            <div className="mt-6 grid gap-5">
              <div>
                <p className="section-kicker">Tailwind v4 theme</p>
                <h1 className="mt-3 max-w-3xl text-5xl leading-none text-mist-50 sm:text-6xl lg:text-7xl font-display">
                  Horizon makes healthy screen breaks feel quiet, precise, and premium.
                </h1>
              </div>

              <p className="hero-copy">
                The interface direction turns the PRD into a nocturnal observatory system: soft glass
                surfaces, serif-led hierarchy, and cool recovery tones that support trust over pressure.
              </p>

              <div className="flex flex-wrap gap-3">
                <button className="control-button control-button-primary" type="button">
                  Start break walkthrough
                </button>
                <button className="control-button control-button-secondary" type="button">
                  Review settings surfaces
                </button>
              </div>
            </div>
          </section>

          <aside className="horizon-panel-soft px-6 py-7 sm:px-7 sm:py-8">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Experience principles</p>
                <h2 className="section-title">Quiet intelligence</h2>
              </div>
              <span className="hero-kicker">20-20-20</span>
            </div>

            <div className="mt-6 grid gap-4">
              {experiencePillars.map((pillar) => (
                <article className="metric-card" key={pillar.title}>
                  <h3 className="text-base font-semibold text-mist-50">{pillar.title}</h3>
                  <p className="metric-note">{pillar.body}</p>
                </article>
              ))}
            </div>
          </aside>
        </div>

        {error ? <div className="status-banner status-banner-warning">IPC error: {error}</div> : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-6">
            <section className="horizon-panel px-6 py-7 sm:px-8 sm:py-8">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">System snapshot</p>
                  <h2 className="section-title">Renderer foundation</h2>
                </div>
                <p className="section-copy">
                  These values verify the multi-process contract while the visual system establishes the
                  product’s long-term UI language.
                </p>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <RuntimeCard label="App" value={runtimeInfo?.appName ?? 'Loading'} />
                <RuntimeCard label="Version" value={runtimeInfo?.appVersion ?? 'Loading'} />
                <RuntimeCard label="Platform" value={runtimeInfo?.platform ?? 'Loading'} />
                <RuntimeCard label="Electron" value={runtimeInfo?.electronVersion ?? 'Loading'} />
                <RuntimeCard label="Chrome" value={runtimeInfo?.chromeVersion ?? 'Loading'} />
                <RuntimeCard label="Node" value={runtimeInfo?.nodeVersion ?? 'Loading'} />
              </div>
            </section>

            <section className="horizon-panel-soft px-6 py-7 sm:px-8 sm:py-8">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Design system primitives</p>
                  <h2 className="section-title">Theme palette and surfaces</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {toneSwatches.map((tone) => (
                  <article className={`tone-swatch ${tone.className}`} key={tone.name}>
                    <span className="tone-chip">{tone.accent}</span>
                    <div>
                      <p className="text-sm text-current/80">{tone.accent}</p>
                      <h3 className="mt-1 text-lg font-semibold text-current">{tone.name}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <section className="horizon-panel px-6 py-7 sm:px-8 sm:py-8">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Interaction rules</p>
                <h2 className="section-title">What ships across surfaces</h2>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {surfaceNotes.map((note) => (
                <article className="metric-card" key={note}>
                  <p className="metric-note mt-0">{note}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="control-button control-button-secondary" type="button">
                Minimal motion
              </button>
              <button className="control-button control-button-secondary" type="button">
                Local-first privacy
              </button>
              <button className="control-button control-button-ghost" type="button">
                Menubar-first shell
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
  )
}
