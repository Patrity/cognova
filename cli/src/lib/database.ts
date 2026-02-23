import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import type { DatabaseConfig, SecondBrainMetadata } from './types'

function checkPortInUse(port: number): boolean {
  try {
    // Check if port is in use by docker container
    const containers = execSync(`docker ps --filter "publish=${port}" --format "{{.Names}}"`, {
      encoding: 'utf-8'
    }).trim()
    return containers.length > 0
  } catch {
    // If docker command fails, try lsof (Unix-like systems)
    try {
      execSync(`lsof -i :${port}`, { stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }
}

function readMetadata(): SecondBrainMetadata | null {
  try {
    const metaPath = join(process.env.HOME || '~', '.cognova')
    if (!existsSync(metaPath))
      return null
    const content = readFileSync(metaPath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function setupDatabase(dockerReady: boolean): Promise<DatabaseConfig> {
  const dbType = await p.select({
    message: 'Database setup',
    options: [
      { value: 'local', label: 'Local PostgreSQL', hint: 'Docker container (requires Docker)' },
      { value: 'remote', label: 'Remote PostgreSQL', hint: 'Neon, Supabase, or other hosted' }
    ]
  })
  if (p.isCancel(dbType)) process.exit(0)

  if (dbType === 'local') {
    if (!dockerReady) {
      p.log.error('Docker daemon is not running.')
      p.log.info('Start Docker Desktop (macOS) or run: sudo systemctl start docker (Linux)')
      p.log.info('Or choose "Remote PostgreSQL" and use Neon: https://neon.tech')
      process.exit(1)
    }

    const password = crypto.randomBytes(16).toString('hex')
    const containerName = 'cognova-db'
    let port = 5432

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

          // Try to get password from metadata
          const metadata = readMetadata()
          if (metadata?.dbPassword && metadata?.dbPort) {
            const connectionString = `postgres://postgres:${metadata.dbPassword}@localhost:${metadata.dbPort}/cognova`
            p.log.info(`Using stored credentials (port ${metadata.dbPort})`)
            return {
              type: 'local',
              connectionString,
              password: metadata.dbPassword,
              port: metadata.dbPort
            }
          }

          // Fall back to asking user
          p.log.info('Using existing container. Ensure DATABASE_URL in .env matches its credentials.')
          const connStr = await p.text({
            message: 'Connection string for existing container',
            placeholder: 'postgres://postgres:password@localhost:5432/cognova',
            defaultValue: 'postgres://postgres:postgres@localhost:5432/cognova'
          })
          if (p.isCancel(connStr)) process.exit(0)
          return { type: 'local', connectionString: connStr as string }
        }

        // Remove old container
        execSync(`docker rm -f ${containerName}`, { stdio: 'pipe' })
      }
    } catch {
      // docker not running or container doesn't exist, proceed
    }

    // Check for port conflicts
    if (checkPortInUse(port)) {
      p.log.warn(`Port ${port} is already in use`)
      const altPort = await p.text({
        message: 'Choose an alternative port',
        placeholder: '5433',
        defaultValue: '5433',
        validate: (v) => {
          const num = parseInt(v)
          if (isNaN(num) || num < 1024 || num > 65535)
            return 'Port must be between 1024 and 65535'
          if (checkPortInUse(num))
            return `Port ${num} is also in use`
        }
      })
      if (p.isCancel(altPort)) process.exit(0)
      port = parseInt(altPort as string)
    }

    const s = p.spinner()
    s.start('Starting PostgreSQL container')

    try {
      execSync([
        'docker run -d',
        `--name ${containerName}`,
        `-e POSTGRES_USER=postgres`,
        `-e POSTGRES_PASSWORD=${password}`,
        `-e POSTGRES_DB=cognova`,
        `-p ${port}:5432`,
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

    const connectionString = `postgres://postgres:${password}@localhost:${port}/cognova`
    p.log.info(`Connection: ${pc.dim(connectionString)}`)

    return {
      type: 'local',
      connectionString,
      password,
      port
    }
  }

  // Remote database
  const connectionString = await p.text({
    message: 'PostgreSQL connection string',
    placeholder: 'postgres://user:pass@ep-xxx.us-east-2.aws.neon.tech/cognova?sslmode=require',
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
