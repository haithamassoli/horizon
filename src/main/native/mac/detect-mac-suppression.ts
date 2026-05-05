import type { SuppressionProbeResult } from '../../suppression/suppression-types'
import { runNativeBridgeJson } from '../run-native-bridge'

const macSuppressionScript = String.raw`
set outputJson to "{\"isSuppressed\":false,\"reason\":null,\"source\":\"native-bridge\"}"
try
  tell application "System Events"
    set frontProcess to first application process whose frontmost is true
    set processName to name of frontProcess
    set isFullscreen to false
    try
      tell front window of frontProcess
        set isFullscreen to value of attribute "AXFullScreen"
      end tell
    end try
  end tell

  if isFullscreen then
    if processName is "Keynote" or processName is "Microsoft PowerPoint" then
      set outputJson to "{\"isSuppressed\":true,\"reason\":\"presentation\",\"source\":\"native-bridge\"}"
    else
      set outputJson to "{\"isSuppressed\":true,\"reason\":\"fullscreen\",\"source\":\"native-bridge\"}"
    end if
  end if
on error
  set outputJson to "{\"isSuppressed\":false,\"reason\":null,\"source\":\"fallback\"}"
end try

return outputJson
`

export async function detectMacSuppression(): Promise<SuppressionProbeResult | null> {
  return runNativeBridgeJson<SuppressionProbeResult>('osascript', ['-e', macSuppressionScript])
}
