import '../styles.css'

export default function OverlayApp() {
  return (
    <main className="overlay-shell">
      <section className="overlay-card stack">
        <span className="eyebrow">Break overlay scaffold</span>
        <div className="hero">
          <h2>Look 20 feet away for 20 seconds.</h2>
          <p>
            This placeholder window proves the dedicated overlay surface, secure preload bridge, and
            multi-window renderer setup are wired correctly.
          </p>
        </div>

        <div className="overlay-actions">
          <button className="button" type="button">
            Start now
          </button>
          <button className="button secondary" type="button">
            Snooze
          </button>
        </div>
      </section>
    </main>
  )
}
