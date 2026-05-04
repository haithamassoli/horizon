import { useEffect, useState } from 'react'
import type { RuntimeInfo } from '@shared/contracts/app'
import type { Result } from '@shared/contracts/result'
import '../styles.css'

function RuntimeCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </article>
  )
}

export default function SettingsApp() {
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRuntimeInfo(): Promise<void> {
      const result: Result<RuntimeInfo> = await window.horizon.getRuntimeInfo()

      if (cancelled) {
        return
      }

      if (result.success) {
        setRuntimeInfo(result.data)
        return
      }

      setError(result.error)
    }

    void loadRuntimeInfo()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="page">
      <section className="panel stack">
        <span className="eyebrow">Milestone 1 foundation</span>

        <header className="hero">
          <h1>Horizon</h1>
          <p>
            Secure Electron + React scaffold for the menubar-first eye-break app. This window exists to
            verify the main, preload, renderer, and typed IPC path before the Break Loop and tray logic
            are added.
          </p>
        </header>

        {error ? <div className="card">IPC error: {error}</div> : null}

        <section className="grid">
          <RuntimeCard label="App" value={runtimeInfo?.appName ?? 'Loading'} />
          <RuntimeCard label="Version" value={runtimeInfo?.appVersion ?? 'Loading'} />
          <RuntimeCard label="Platform" value={runtimeInfo?.platform ?? 'Loading'} />
          <RuntimeCard label="Electron" value={runtimeInfo?.electronVersion ?? 'Loading'} />
          <RuntimeCard label="Chrome" value={runtimeInfo?.chromeVersion ?? 'Loading'} />
          <RuntimeCard label="Node" value={runtimeInfo?.nodeVersion ?? 'Loading'} />
        </section>
      </section>
    </main>
  )
}
