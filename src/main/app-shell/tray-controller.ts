import { Menu, Tray, nativeImage } from 'electron'
import type { BreakActionType, BreakLoopSnapshot } from '@shared/contracts/break'
import type { HorizonSettingsSnapshot } from '@shared/contracts/settings'

export interface TrayControllerState {
  breakSnapshot: BreakLoopSnapshot
  settingsSnapshot: HorizonSettingsSnapshot
}

export interface CreateTrayControllerOptions {
  state: TrayControllerState
  onOpenSettings: () => void
  onBreakAction: (action: BreakActionType) => void
  onSettingsUpdate: (update: { remindersEnabled?: boolean; launchAtLogin?: boolean }) => void
  onQuit: () => void
}

export interface TrayController {
  update: (state: TrayControllerState) => void
  dispose: () => void
}

const nextBreakFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export function createTrayController(options: CreateTrayControllerOptions): TrayController {
  const icon = nativeImage.createFromDataURL(createTrayIconDataUrl())
  icon.setTemplateImage(process.platform === 'darwin')

  const tray = new Tray(icon)
  tray.setIgnoreDoubleClickEvents(true)
  tray.on('click', options.onOpenSettings)

  const applyState = (state: TrayControllerState): void => {
    const compactStatus = formatCompactStatus(state.breakSnapshot)
    const tooltip = [
      `Horizon: ${formatStatus(state.breakSnapshot.status)}`,
      `Next break: ${formatNextBreakLabel(state.breakSnapshot)}`,
      `Reminders: ${state.settingsSnapshot.remindersEnabled ? 'On' : 'Off'}`,
    ].join('\n')

    tray.setToolTip(tooltip)

    if (process.platform === 'darwin') {
      tray.setTitle(compactStatus)
    }

    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: `Horizon ${compactStatus}`, enabled: false },
        { label: `Next break: ${formatNextBreakLabel(state.breakSnapshot)}`, enabled: false },
        { label: `Completed today: ${state.breakSnapshot.completedBreaks}`, enabled: false },
        { type: 'separator' },
        {
          label: 'Open Settings',
          click: options.onOpenSettings,
        },
        {
          label: 'Start Break Now',
          click: () => {
            options.onBreakAction('start-now')
          },
        },
        {
          label: 'Snooze',
          enabled: state.breakSnapshot.status === 'due' || state.breakSnapshot.status === 'suppressed',
          click: () => {
            options.onBreakAction('snooze')
          },
        },
        {
          label: state.breakSnapshot.status === 'on-break' ? 'Dismiss Break' : 'Skip Current Cycle',
          click: () => {
            options.onBreakAction(state.breakSnapshot.status === 'on-break' ? 'complete' : 'skip')
          },
        },
        { type: 'separator' },
        {
          label: 'Reminders Enabled',
          type: 'checkbox',
          checked: state.settingsSnapshot.remindersEnabled,
          click: () => {
            options.onSettingsUpdate({ remindersEnabled: !state.settingsSnapshot.remindersEnabled })
          },
        },
        {
          label: 'Launch At Login',
          type: 'checkbox',
          checked: state.settingsSnapshot.launchAtLogin,
          click: () => {
            options.onSettingsUpdate({ launchAtLogin: !state.settingsSnapshot.launchAtLogin })
          },
        },
        { type: 'separator' },
        {
          label: 'Quit Horizon',
          click: options.onQuit,
        },
      ]),
    )
  }

  applyState(options.state)

  return {
    update(state) {
      applyState(state)
    },
    dispose() {
      tray.destroy()
    },
  }
}

function formatCompactStatus(snapshot: BreakLoopSnapshot): string {
  switch (snapshot.status) {
    case 'due':
      return 'Due now'
    case 'on-break':
      return formatClock(snapshot.breakRemainingMs)
    case 'snoozed':
      return `Snooze ${formatRelativeMinutes(snapshot.snoozeRemainingMs)}`
    case 'suppressed':
      return 'Suppressed'
    case 'paused':
      return 'Paused'
    case 'running':
      return formatRelativeMinutes(snapshot.remainingActiveMs)
  }
}

function formatNextBreakLabel(snapshot: BreakLoopSnapshot): string {
  if (snapshot.status === 'due') {
    return 'Due now'
  }

  if (snapshot.status === 'on-break') {
    return `On break • ${formatClock(snapshot.breakRemainingMs)} left`
  }

  if (!snapshot.nextBreakAt) {
    return 'Paused'
  }

  return nextBreakFormatter.format(snapshot.nextBreakAt)
}

function formatStatus(status: BreakLoopSnapshot['status']): string {
  return status.replace('-', ' ')
}

function formatRelativeMinutes(ms: number): string {
  const totalMinutes = Math.max(Math.ceil(ms / 60000), 0)

  if (totalMinutes < 1) {
    return '<1m'
  }

  return `${totalMinutes}m`
}

function formatClock(ms: number): string {
  const totalSeconds = Math.max(Math.ceil(ms / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function createTrayIconDataUrl(): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="2" width="18" height="18" rx="9" fill="#E5F0FB" fill-opacity="0.12"/>
      <circle cx="11" cy="11" r="6.5" stroke="#E5F0FB" stroke-width="1.5"/>
      <path d="M11 7.8V11.2L13.5 13.3" stroke="#83D9FF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="11" cy="11" r="1" fill="#98F4DA"/>
    </svg>
  `.trim()

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
