import type { SuppressionProbeResult } from '../../suppression/suppression-types'
import { runNativeBridgeJson } from '../run-native-bridge'

const windowsSuppressionScript = `
Add-Type @"
using System;
using System.Runtime.InteropServices;

public static class HorizonNative {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
  public struct MONITORINFOEX {
    public int cbSize;
    public RECT rcMonitor;
    public RECT rcWork;
    public uint dwFlags;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
    public string szDevice;
  }

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  [DllImport("user32.dll")]
  public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

  [DllImport("user32.dll", CharSet = CharSet.Auto)]
  public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFOEX lpmi);
}
"@

$window = [HorizonNative]::GetForegroundWindow()

if ($window -eq [IntPtr]::Zero) {
  @{ isSuppressed = $false; reason = $null; source = 'fallback' } | ConvertTo-Json -Compress
  exit
}

$windowRect = New-Object HorizonNative+RECT
[void] [HorizonNative]::GetWindowRect($window, [ref] $windowRect)

$monitor = [HorizonNative]::MonitorFromWindow($window, 2)
$monitorInfo = New-Object HorizonNative+MONITORINFOEX
$monitorInfo.cbSize = [System.Runtime.InteropServices.Marshal]::SizeOf([type] [HorizonNative+MONITORINFOEX])
[void] [HorizonNative]::GetMonitorInfo($monitor, [ref] $monitorInfo)

$isFullscreen = (
  $windowRect.Left -le $monitorInfo.rcMonitor.Left -and
  $windowRect.Top -le $monitorInfo.rcMonitor.Top -and
  $windowRect.Right -ge $monitorInfo.rcMonitor.Right -and
  $windowRect.Bottom -ge $monitorInfo.rcMonitor.Bottom
)

@{
  isSuppressed = $isFullscreen
  reason = if ($isFullscreen) { 'fullscreen' } else { $null }
  source = 'native-bridge'
} | ConvertTo-Json -Compress
`

export async function detectWindowsSuppression(): Promise<SuppressionProbeResult | null> {
  return runNativeBridgeJson<SuppressionProbeResult>('powershell.exe', [
    '-NoLogo',
    '-NonInteractive',
    '-NoProfile',
    '-Command',
    windowsSuppressionScript,
  ])
}
