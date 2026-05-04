import '../styles.css'

export default function OverlayApp() {
  return (
    <main className="app-shell flex items-center justify-center px-4 py-6">
      <div className="ambient-orb ambient-orb-left" />
      <div className="ambient-orb ambient-orb-right" />

      <section className="horizon-panel relative z-10 w-full max-w-sm px-6 py-7 sm:px-7 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <span className="hero-kicker">Break overlay</span>
          <span className="text-[0.7rem] uppercase tracking-[0.24em] text-mist-300/80">Suppression aware</span>
        </div>

        <div className="mt-6 grid gap-6">
          <div className="break-orbit mx-auto w-full max-w-[15rem]">
            <div className="text-center">
              <p className="section-kicker">Recovery countdown</p>
              <div className="mt-3 text-5xl leading-none text-mist-50 font-display">00:20</div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl leading-none text-mist-50 font-display">Look 20 feet away.</h1>
            <p className="mt-3 text-sm leading-7 text-mist-300">
              A gentle pause for your eyes. Horizon keeps this brief, respects fullscreen work, and
              returns you to flow without friction.
            </p>
          </div>

          <div className="grid gap-3">
            <button className="control-button control-button-primary w-full" type="button">
              Start break now
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button className="control-button control-button-secondary w-full" type="button">
                Snooze
              </button>
              <button className="control-button control-button-secondary w-full" type="button">
                Skip
              </button>
            </div>
          </div>

          <div className="metric-card text-center">
            <div className="metric-label">Behavior</div>
            <p className="metric-note mt-3">
              If you are already away long enough near the due moment, the Break Loop can auto-credit
              this recovery instead of interrupting.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
