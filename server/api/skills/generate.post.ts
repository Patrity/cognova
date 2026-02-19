import { mkdir, readdir, rm, stat } from 'fs/promises'
import { join } from 'path'
import { query } from '@anthropic-ai/claude-agent-sdk'
import { getInactiveSkillsDir, validateSkillName } from '~~/server/utils/skills-path'
import { logTokenUsage } from '~~/server/utils/log-token-usage'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ name: string, description: string }>(event)
  if (!body?.name || !body?.description)
    throw createError({ statusCode: 400, message: 'name and description are required' })

  const nameError = validateSkillName(body.name)
  if (nameError)
    throw createError({ statusCode: 400, message: nameError })

  // Create in inactive-skills so user can review before enabling
  const skillDir = join(getInactiveSkillsDir(), body.name)

  const existing = await stat(skillDir).catch(() => null)
  if (existing)
    throw createError({ statusCode: 409, message: `Skill '${body.name}' already exists` })

  await mkdir(skillDir, { recursive: true })

  const appendInstructions = `You are creating a Claude Code skill called "${body.name}".
Description: ${body.description}

Use the Write tool to create files in the current directory. You MUST create:
1. SKILL.md with proper frontmatter (name, description, allowed-tools, metadata with version/requires-secrets/author)
2. A Python script if the skill needs to call APIs or run logic

CRITICAL RULES:
- Use the Write tool to create each file
- NEVER hardcode API keys, tokens, or secrets. Use get_secret() from the shared library.
- If the skill needs external API keys, list them in metadata.requires-secrets
- Import the shared client: sys.path.insert(0, str(Path(__file__).parent.parent)); from _lib.api import get, post, get_secret
- Use argparse for CLI interface
- Follow existing skill patterns (task.py, memory.py, etc.)

SKILL.md frontmatter format:
---
name: ${body.name}
description: ${body.description}
allowed-tools: Bash, Read
metadata:
  version: "1.0.0"
  requires-secrets: []
  author: ""
  repository: ""
  installed-from: ""
---`

  const startTime = Date.now()
  let totalInput = 0
  let totalOutput = 0
  let totalCost = 0
  let turns = 0

  try {
    const conversation = query({
      prompt: `Create the "${body.name}" skill: ${body.description}`,
      options: {
        systemPrompt: {
          type: 'preset',
          preset: 'claude_code',
          append: appendInstructions
        },
        cwd: skillDir,
        settingSources: ['user'],
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 30
      }
    })

    for await (const event of conversation) {
      if (event.type === 'result') {
        // Cast to access usage fields the SDK provides but aren't in the TS types
        const msg = event as unknown as {
          total_cost_usd: number
          num_turns: number
          usage: { input_tokens: number, output_tokens: number }
        }
        totalInput = msg.usage?.input_tokens || 0
        totalOutput = msg.usage?.output_tokens || 0
        totalCost = msg.total_cost_usd || 0
        turns = msg.num_turns || 0
      }
    }
  } catch (e) {
    console.error('[skills/generate] SDK error:', e)
    // Clean up empty directory on failure
    await rm(skillDir, { recursive: true }).catch(() => {})
    throw createError({ statusCode: 500, message: 'Skill generation failed' })
  }

  // Verify files were actually created
  const files = await readdir(skillDir).catch(() => [])
  if (files.length === 0) {
    await rm(skillDir, { recursive: true }).catch(() => {})
    throw createError({ statusCode: 500, message: 'Skill generation produced no files' })
  }

  const durationMs = Date.now() - startTime

  // Log token usage
  await logTokenUsage({
    source: 'agent',
    sourceName: 'Skill Generator',
    inputTokens: totalInput,
    outputTokens: totalOutput,
    costUsd: totalCost,
    durationMs,
    numTurns: turns
  })

  return {
    data: {
      name: body.name,
      path: skillDir,
      active: false,
      costUsd: totalCost,
      durationMs
    }
  }
})
