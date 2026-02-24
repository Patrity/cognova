#!/usr/bin/env node
/**
 * Test script to verify imsg spawn and stdout communication.
 * Run with: node test-imsg-spawn.js
 */

import { spawn } from 'child_process'

console.log('Starting imsg watch test...')
console.log('User:', process.env.USER)
console.log('Home:', process.env.HOME)
console.log('Node binary:', process.execPath)

const watchProcess = spawn('imsg', ['watch', '--json'], {
  stdio: ['ignore', 'pipe', 'pipe']
})

console.log('Process spawned with PID:', watchProcess.pid)

let buffer = ''
watchProcess.stdout?.on('data', (chunk) => {
  console.log('[STDOUT] Received data, length:', chunk.length)
  console.log('[STDOUT] Raw chunk:', chunk.toString())
  buffer += chunk.toString()
  const lines = buffer.split('\n')
  buffer = lines.pop() || ''

  for (const line of lines) {
    if (!line.trim()) continue
    console.log('[LINE] Processing:', line.substring(0, 200))
    try {
      const msg = JSON.parse(line)
      console.log('[PARSED]', JSON.stringify(msg, null, 2))
    } catch {
      console.warn('[ERROR] Failed to parse:', line.substring(0, 100))
    }
  }
})

watchProcess.stderr?.on('data', (chunk) => {
  console.error('[STDERR]', chunk.toString().trim())
})

watchProcess.on('exit', (code) => {
  console.log(`Process exited with code ${code}`)
  process.exit(code || 0)
})

process.on('SIGINT', () => {
  console.log('\nShutting down...')
  watchProcess.kill('SIGTERM')
  process.exit(0)
})

console.log('\nWaiting for messages... (Press Ctrl+C to exit)')
console.log('Send yourself an iMessage now to test.\n')
