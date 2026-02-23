import * as p from '@clack/prompts'
import pc from 'picocolors'

export class SkipError extends Error {
  constructor() {
    super('Step skipped by user')
    this.name = 'SkipError'
  }
}

interface RetryOptions {
  maxRetries?: number
  canSkip?: boolean
}

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, canSkip = true } = options
  let attempt = 0

  while (true) {
    try {
      return await fn()
    } catch (err) {
      attempt++
      const errorMsg = err instanceof Error ? err.message : String(err)

      p.log.error(`${label} failed: ${errorMsg}`)

      if (attempt >= maxRetries) {
        p.log.error(`Maximum retry attempts (${maxRetries}) reached`)
        if (!canSkip) {
          p.log.error('This step cannot be skipped. Setup aborted.')
          process.exit(1)
        }
      }

      const choices = [
        { value: 'retry', label: 'Retry', hint: 'Try again' }
      ]

      if (canSkip) {
        choices.push({ value: 'skip', label: 'Skip', hint: 'Continue without this step' })
      }

      choices.push({ value: 'abort', label: 'Abort', hint: 'Exit setup' })

      const action = await p.select({
        message: `${label} failed. What would you like to do?`,
        options: choices
      })

      if (p.isCancel(action) || action === 'abort') {
        p.log.warn('Setup aborted by user')
        process.exit(1)
      }

      if (action === 'skip') {
        throw new SkipError()
      }

      // action === 'retry', loop continues
      p.log.info(pc.dim(`Retrying ${label}...`))
    }
  }
}
