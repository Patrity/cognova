import { readFile, stat, cp, mkdir } from 'fs/promises'
import { join } from 'path'
import { load as loadYaml } from 'js-yaml'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { resolveKnowledgeBase } from '~~/server/utils/knowledge-path'
import type { AgentManifest } from '~~/shared/types/agent'

interface ManifestFile {
  manifest: AgentManifest
  configSchema: Record<string, unknown> | null
}

/**
 * Parse manifest.yaml from an agent directory.
 */
export async function parseManifest(agentDir: string): Promise<ManifestFile> {
  const manifestPath = join(agentDir, 'manifest.yaml')
  const manifestStat = await stat(manifestPath).catch(() => null)
  if (!manifestStat?.isFile())
    throw createError({ statusCode: 400, message: 'manifest.yaml not found in agent directory' })

  const raw = await readFile(manifestPath, 'utf-8')
  const parsed = loadYaml(raw) as Record<string, unknown>

  if (!parsed.id || typeof parsed.id !== 'string')
    throw createError({ statusCode: 400, message: 'manifest.yaml must have an "id" field' })
  if (!parsed.name || typeof parsed.name !== 'string')
    throw createError({ statusCode: 400, message: 'manifest.yaml must have a "name" field' })

  const manifest: AgentManifest = {
    id: parsed.id,
    name: parsed.name,
    description: parsed.description as string | undefined,
    version: parsed.version as string | undefined,
    model: parsed.model as AgentManifest['model'],
    capabilities: parsed.capabilities as string[] | undefined,
    knowledge: parsed.knowledge as string[] | undefined
  }

  // Load config schema if referenced
  let configSchema: Record<string, unknown> | null = null
  const schemaRef = parsed.configSchema as string | undefined
  if (schemaRef) {
    const schemaPath = join(agentDir, schemaRef)
    const schemaStat = await stat(schemaPath).catch(() => null)
    if (schemaStat?.isFile()) {
      const schemaRaw = await readFile(schemaPath, 'utf-8')
      configSchema = JSON.parse(schemaRaw)
    }
  }

  return { manifest, configSchema }
}

/**
 * Install an agent from a local filesystem path.
 */
export async function installFromLocal(localPath: string): Promise<string> {
  // Validate the path
  const dirStat = await stat(localPath).catch(() => null)
  if (!dirStat?.isDirectory())
    throw createError({ statusCode: 400, message: 'Path is not a valid directory' })

  const { manifest, configSchema } = await parseManifest(localPath)

  // Check if already installed
  const db = getDb()
  const [existing] = await db.select()
    .from(schema.installedAgents)
    .where(eq(schema.installedAgents.localPath, localPath))
    .limit(1)

  if (existing)
    throw createError({ statusCode: 409, message: `Agent from "${localPath}" is already installed` })

  // Copy knowledge files to ~/knowledge/[manifest.id]/
  const knowledgeBase = resolveKnowledgeBase()
  const knowledgeDir = join(knowledgeBase, manifest.id)
  const sourceKnowledge = join(localPath, 'knowledge')
  const knowledgeStat = await stat(sourceKnowledge).catch(() => null)

  if (knowledgeStat?.isDirectory()) {
    await mkdir(knowledgeDir, { recursive: true })
    await cp(sourceKnowledge, knowledgeDir, { recursive: true })
  }

  // Insert into DB
  const [record] = await db.insert(schema.installedAgents)
    .values({
      name: manifest.name,
      localPath,
      manifestJson: manifest,
      configSchemaJson: configSchema,
      enabled: true,
      builtIn: false
    })
    .returning()

  if (!record)
    throw createError({ statusCode: 500, message: 'Failed to create agent record' })

  return record.id
}

/**
 * Reimport an agent: re-read manifest, config schema, and re-copy knowledge files.
 * Preserves the DB record ID and user configs.
 */
export async function reimportAgent(agentId: string): Promise<void> {
  const db = getDb()

  const [agent] = await db.select()
    .from(schema.installedAgents)
    .where(eq(schema.installedAgents.id, agentId))
    .limit(1)

  if (!agent)
    throw createError({ statusCode: 404, message: 'Agent not found' })

  if (agent.builtIn)
    throw createError({ statusCode: 400, message: 'Cannot reimport built-in agents' })

  if (!agent.localPath)
    throw createError({ statusCode: 400, message: 'Agent has no local path' })

  const dirStat = await stat(agent.localPath).catch(() => null)
  if (!dirStat?.isDirectory())
    throw createError({ statusCode: 400, message: `Agent path no longer exists: ${agent.localPath}` })

  const { manifest, configSchema } = await parseManifest(agent.localPath)

  // Re-copy knowledge files
  const knowledgeBase = resolveKnowledgeBase()
  const knowledgeDir = join(knowledgeBase, manifest.id)
  const sourceKnowledge = join(agent.localPath, 'knowledge')
  const knowledgeStat = await stat(sourceKnowledge).catch(() => null)

  if (knowledgeStat?.isDirectory()) {
    // Remove old knowledge and re-copy
    const { rm } = await import('fs/promises')
    await rm(knowledgeDir, { recursive: true, force: true }).catch(() => {})
    await mkdir(knowledgeDir, { recursive: true })
    await cp(sourceKnowledge, knowledgeDir, { recursive: true })
  }

  // Update DB record (preserves ID and user configs)
  await db.update(schema.installedAgents)
    .set({
      name: manifest.name,
      manifestJson: manifest,
      configSchemaJson: configSchema,
      updatedAt: new Date()
    })
    .where(eq(schema.installedAgents.id, agentId))
}

/**
 * Uninstall an agent. Optionally remove its knowledge directory.
 */
export async function uninstallAgent(agentId: string, removeKnowledge = false): Promise<void> {
  const db = getDb()

  const [agent] = await db.select()
    .from(schema.installedAgents)
    .where(eq(schema.installedAgents.id, agentId))
    .limit(1)

  if (!agent)
    throw createError({ statusCode: 404, message: 'Agent not found' })

  if (agent.builtIn)
    throw createError({ statusCode: 400, message: 'Cannot uninstall built-in agents' })

  // Delete DB record (cascades to agent_configs)
  await db.delete(schema.installedAgents)
    .where(eq(schema.installedAgents.id, agentId))

  // Optionally remove knowledge
  if (removeKnowledge) {
    const manifest = agent.manifestJson as AgentManifest
    if (manifest.id) {
      const { rm } = await import('fs/promises')
      const knowledgeBase = resolveKnowledgeBase()
      const knowledgeDir = join(knowledgeBase, manifest.id)
      await rm(knowledgeDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}
