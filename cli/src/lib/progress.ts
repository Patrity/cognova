import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { SetupProgress } from './types'

const PROGRESS_FILE = join(process.env.HOME || '~', '.cognova-setup.json')

export function loadProgress(): SetupProgress | null {
  try {
    if (!existsSync(PROGRESS_FILE))
      return null

    const content = readFileSync(PROGRESS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export function saveProgress(progress: SetupProgress): void {
  try {
    const content = JSON.stringify(progress, null, 2)
    writeFileSync(PROGRESS_FILE, content, 'utf-8')
  } catch (err) {
    // Non-fatal — progress saving is best-effort
    console.warn(`Failed to save progress: ${err}`)
  }
}

export function clearProgress(): void {
  try {
    if (existsSync(PROGRESS_FILE))
      unlinkSync(PROGRESS_FILE)
  } catch {
    // Non-fatal
  }
}
