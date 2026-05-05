import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function runNativeBridge(command: string, args: string[], timeoutMs = 1_500): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      signal: AbortSignal.timeout(timeoutMs),
      windowsHide: true,
      maxBuffer: 64 * 1024,
    })

    return stdout.trim() || null
  } catch {
    return null
  }
}

export async function runNativeBridgeJson<T>(command: string, args: string[], timeoutMs = 1_500): Promise<T | null> {
  const stdout = await runNativeBridge(command, args, timeoutMs)

  if (!stdout) {
    return null
  }

  try {
    return JSON.parse(stdout) as T
  } catch {
    return null
  }
}
