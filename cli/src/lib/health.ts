import { execSync } from 'child_process'
import * as p from '@clack/prompts'

export async function waitForHealth(url: string, maxWaitSeconds = 30): Promise<boolean> {
  const s = p.spinner()
  s.start('Waiting for app to become healthy')

  for (let i = 0; i < maxWaitSeconds; i++) {
    try {
      const result = execSync(`curl -sf ${url}/api/health`, { encoding: 'utf-8', timeout: 3000 })
      const data = JSON.parse(result)
      if (data.status === 'ok') {
        s.stop('App is healthy')
        return true
      }
    } catch {
      // not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  s.stop('App did not become healthy in time')
  p.log.warn('Check logs: cognova logs')
  return false
}
