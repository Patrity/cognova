import { createRequire } from 'module'
import { dirname, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type { IPty } from 'node-pty'
import { getVaultRoot } from './path-validator'

// Use createRequire for node-pty to avoid ESM issues with native modules
// For bundled builds, we need to resolve from a known location
const requireFromCwd = createRequire(resolve(process.cwd(), 'package.json'))
let pty: typeof import('node-pty')
try {
  pty = requireFromCwd('node-pty')
  const helperPath = resolve(dirname(requireFromCwd.resolve('node-pty')), '..', 'build', 'Release', 'spawn-helper')
  console.log(`[PTY] node-pty loaded, spawn-helper exists: ${existsSync(helperPath)} (${helperPath})`)
} catch (e) {
  console.error('[PTY] Failed to load node-pty:', e)
  throw e
}

// Shell candidates in order of preference
const SHELL_CANDIDATES = [
  process.env.SHELL,
  '/bin/zsh',
  '/bin/bash',
  '/bin/sh'
].filter(Boolean) as string[]

function findShell(): string {
  for (const sh of SHELL_CANDIDATES)
    if (existsSync(sh)) return sh
  return '/bin/sh'
}

function ptyEnv(): Record<string, string | undefined> {
  const nodeDir = dirname(process.execPath)
  const currentPath = process.env.PATH || ''
  return {
    ...process.env,
    PATH: currentPath.includes(nodeDir)
      ? currentPath
      : `${nodeDir}:${currentPath}`,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor'
  }
}

interface PtySession {
  pty: IPty
  outputBuffer: string[]
  maxBufferSize: number
  lastActivity: number
}

const sessions = new Map<string, PtySession>()
const MAX_BUFFER_SIZE = 10000 // Lines to keep in buffer
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes

export function createPtySession(sessionId: string, cols = 80, rows = 24): IPty {
  const shell = findShell()
  const cwd = getVaultRoot()

  // Ensure cwd exists so posix_spawnp doesn't fail
  if (!existsSync(cwd)) mkdirSync(cwd, { recursive: true })

  const env = ptyEnv()
  console.log(`[PTY] Creating session: shell=${shell}, cwd=${cwd}, cols=${cols}, rows=${rows}, PATH=${(env.PATH || '').slice(0, 200)}`)

  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env
  }) as IPty

  const session: PtySession = {
    pty: ptyProcess,
    outputBuffer: [],
    maxBufferSize: MAX_BUFFER_SIZE,
    lastActivity: Date.now()
  }

  // Buffer output for replay on reconnect
  ptyProcess.onData((data: string) => {
    session.lastActivity = Date.now()
    session.outputBuffer.push(data)

    // Trim buffer if too large
    if (session.outputBuffer.length > session.maxBufferSize) {
      session.outputBuffer = session.outputBuffer.slice(-session.maxBufferSize / 2)
    }
  })

  ptyProcess.onExit(() => {
    sessions.delete(sessionId)
  })

  sessions.set(sessionId, session)
  return ptyProcess
}

export function getPtySession(sessionId: string): PtySession | undefined {
  const session = sessions.get(sessionId)
  if (session) {
    session.lastActivity = Date.now()
  }
  return session
}

export function getOrCreatePtySession(sessionId: string, cols = 80, rows = 24): { pty: IPty, isNew: boolean } {
  const existing = sessions.get(sessionId)
  if (existing) {
    existing.lastActivity = Date.now()
    return { pty: existing.pty, isNew: false }
  }

  const pty = createPtySession(sessionId, cols, rows)
  return { pty, isNew: true }
}

export function getOutputBuffer(sessionId: string): string[] {
  const session = sessions.get(sessionId)
  return session?.outputBuffer || []
}

export function resizePty(sessionId: string, cols: number, rows: number): boolean {
  const session = sessions.get(sessionId)
  if (session) {
    session.pty.resize(cols, rows)
    session.lastActivity = Date.now()
    return true
  }
  return false
}

export function writeToPty(sessionId: string, data: string): boolean {
  const session = sessions.get(sessionId)
  if (session) {
    session.pty.write(data)
    session.lastActivity = Date.now()
    return true
  }
  return false
}

export function destroyPtySession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (session) {
    session.pty.kill()
    sessions.delete(sessionId)
    return true
  }
  return false
}

// Cleanup inactive sessions periodically
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_TIMEOUT) {
      console.log(`Cleaning up inactive PTY session: ${sessionId}`)
      session.pty.kill()
      sessions.delete(sessionId)
    }
  }
}, 60000) // Check every minute
