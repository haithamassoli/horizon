import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
  className?: string
}

type PanelProps = {
  children: ReactNode
  className?: string
  tone?: 'default' | 'soft'
  as?: 'section' | 'aside' | 'div'
}

type KickerProps = {
  children: ReactNode
  className?: string
}

type SectionHeaderProps = {
  kicker: string
  title: string
  description?: string
  aside?: ReactNode
}

type MetricCardProps = {
  label?: string
  title?: string
  value?: string
  note?: string
  align?: 'left' | 'center'
  className?: string
  children?: ReactNode
}

type ButtonProps = {
  children: ReactNode
  tone?: 'primary' | 'secondary' | 'ghost'
  className?: string
  type?: 'button' | 'submit' | 'reset'
  onClick?: () => void
}

type ToneSwatchProps = {
  name: string
  accent: string
  className: string
}

type StatusBannerProps = {
  children: ReactNode
  tone?: 'warning'
  className?: string
}

type BreakOrbitProps = {
  children: ReactNode
  className?: string
}

function joinClassNames(...classNames: Array<string | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <main className={joinClassNames('app-shell', className)}>
      <div aria-hidden="true" className="ambient-orb ambient-orb-left" />
      <div aria-hidden="true" className="ambient-orb ambient-orb-right" />
      {children}
    </main>
  )
}

export function Panel({ children, className, tone = 'default', as = 'section' }: PanelProps) {
  const Component = as
  const toneClassName = tone === 'soft' ? 'horizon-panel-soft' : 'horizon-panel'

  return <Component className={joinClassNames(toneClassName, className)}>{children}</Component>
}

export function Kicker({ children, className }: KickerProps) {
  return <span className={joinClassNames('hero-kicker', className)}>{children}</span>
}

export function SectionHeader({ kicker, title, description, aside }: SectionHeaderProps) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2 className="section-title">{title}</h2>
      </div>
      {aside ?? (description ? <p className="section-copy">{description}</p> : null)}
    </div>
  )
}

export function MetricCard({
  label,
  title,
  value,
  note,
  align = 'left',
  className,
  children,
}: MetricCardProps) {
  return (
    <article className={joinClassNames('metric-card', align === 'center' ? 'text-center' : undefined, className)}>
      {label ? <div className="metric-label">{label}</div> : null}
      {title ? <h3 className="text-base font-semibold text-mist-50">{title}</h3> : null}
      {value ? <div className="metric-value">{value}</div> : null}
      {note ? <p className={joinClassNames('metric-note', title ? undefined : 'mt-0')}>{note}</p> : null}
      {children}
    </article>
  )
}

export function Button({ children, tone = 'primary', className, type = 'button', onClick }: ButtonProps) {
  const toneClassName = {
    primary: 'control-button-primary',
    secondary: 'control-button-secondary',
    ghost: 'control-button-ghost',
  }[tone]

  return (
    <button className={joinClassNames('control-button', toneClassName, className)} onClick={onClick} type={type}>
      {children}
    </button>
  )
}

export function ToneSwatch({ name, accent, className }: ToneSwatchProps) {
  return (
    <article className={joinClassNames('tone-swatch', className)}>
      <span className="tone-chip">{accent}</span>
      <div>
        <p className="text-sm text-current/80">{accent}</p>
        <h3 className="mt-1 text-lg font-semibold text-current">{name}</h3>
      </div>
    </article>
  )
}

export function StatusBanner({ children, tone = 'warning', className }: StatusBannerProps) {
  const toneClassName = {
    warning: 'status-banner-warning',
  }[tone]

  return <div className={joinClassNames('status-banner', toneClassName, className)}>{children}</div>
}

export function BreakOrbit({ children, className }: BreakOrbitProps) {
  return <div className={joinClassNames('break-orbit', className)}>{children}</div>
}
