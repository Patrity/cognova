import { execSync } from 'child_process'
import crypto from 'crypto'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { DatabaseConfig } from './types'

export async function setupDatabase(hasDocker: boolean): Promise<DatabaseConfig> {
  const dbType = await p.select({
    message: 'Database setup',
    options: [
      { value: 'local', label: 'Local PostgreSQL', hint: 'Docker container (requires Docker)' },
      { value: 'remote', label: 'Remote PostgreSQL', hint: 'Neon, Supabase, or other hosted' }
    ]
  })
  if (p.isCancel(dbType)) process.exit(0)

  if (dbType === 'local') {
    if (!hasDocker) {
      p.log.error('Docker is required for local PostgreSQL.')
      p.log.info('Install Docker: https://docs.docker.com/get-docker/')
      p.log.info('Or choose "Remote PostgreSQL" and use Neon: https://neon.tech')
      process.exit(1)
    }

    const password = crypto.randomBytes(16).toString('hex')
    const containerName = 'second-brain-db'

    // Check if container already exists
    try {
      const existing = execSync(`docker ps -a --filter name=${containerName} --format "{{.Status}}"`, {
        encoding: 'utf-8'
      }).trim()

      if (existing) {
        p.log.warn(`Container "${containerName}" already exists (${existing})`)
        const reuse = await p.confirm({
          message: 'Use existing container?',
          initialValue: true
        })
        if (p.isCancel(reuse)) process.exit(0)

        if (reuse) {
          // Start it if stopped
          if (!existing.startsWith('Up'))
            execSync(`docker start ${containerName}`, { stdio: 'pipe' })

          // For existing container, user needs to know the password
          p.log.info('Using existing container. Ensure DATABASE_URL in .env matches its credentials.')
          const connStr = await p.text({
            message: 'Connection string for existing container',
            placeholder: 'postgres://postgres:password@localhost:5432/second_brain',
            defaultValue: 'postgres://postgres:postgres@localhost:5432/second_brain'
          })
          if (p.isCancel(connStr)) process.exit(0)
          return { type: 'local', connectionString: connStr }
        }

        // Remove old container
        execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' })
      }
    } catch {
      // docker not running or container doesn't exist, proceed
    }

    const s = p.spinner()
    s.start('Starting PostgreSQL container')

    try {
      execSync([
        'docker run -d',
        `--name ${containerName}`,
        `-e POSTGRES_USER=postgres`,
        `-e POSTGRES_PASSWORD=${password}`,
        `-e POSTGRES_DB=second_brain`,
        `-p 5432:5432`,
        `--restart unless-stopped`,
        `postgres:16-alpine`
      ].join(' '), { stdio: 'pipe' })

      // Wait for postgres to be ready
      let ready = false
      for (let i = 0; i < 30; i++) {
        try {
          execSync(`docker exec ${containerName} pg_isready -U postgres`, { stdio: 'pipe' })
          ready = true
          break
        } catch {
          await sleep(1000)
        }
      }

      if (!ready) {
        s.stop('PostgreSQL container started but not yet ready')
        p.log.warn('Database may need a few more seconds to initialize')
      } else {
        s.stop('PostgreSQL is running')
      }
    } catch (err) {
      s.stop('Failed to start PostgreSQL')
      p.log.error(`Docker error: ${err}`)
      process.exit(1)
    }

    const connectionString = `postgres://postgres:${password}@localhost:5432/second_brain`
    p.log.info(`Connection: ${pc.dim(connectionString)}`)

    return { type: 'local', connectionString }
  }

  // Remote database
  const connectionString = await p.text({
    message: 'PostgreSQL connection string',
    placeholder: 'postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/second_brain?sslmode=require',
    validate: (v) => {
      if (!v.startsWith('postgres://') && !v.startsWith('postgresql://'))
        return 'Must be a postgres:// or postgresql:// URL'
    }
  })
  if (p.isCancel(connectionString)) process.exit(0)

  return { type: 'remote', connectionString }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
