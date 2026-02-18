import { query } from '@anthropic-ai/claude-agent-sdk'
import type { ExtractedMemory, MemoryChunkType } from '~~/shared/types'
import { logTokenUsage } from '../utils/log-token-usage'

const EXTRACTION_PROMPT = `You are a memory extraction assistant. Analyze this conversation excerpt and extract key memories worth preserving for future reference.

Output ONLY a JSON array with this exact structure (no markdown, no code blocks, no explanation):
[{"type": "decision|fact|solution|pattern|preference", "content": "concise statement", "relevance": 0.0-1.0}]

Memory types:
- decision: Choices made about implementation, architecture, or approach
- fact: Important information about the codebase, APIs, or constraints
- solution: How a problem was solved or a bug was fixed
- pattern: Recurring patterns or conventions identified
- preference: User preferences for code style, tools, or workflows

Rules:
- Only extract genuinely useful information
- Skip routine acknowledgments ("I'll do that", "Sure", "Let me...")
- Skip obvious facts already in code, debugging steps, greetings
- Content max 100 characters
- relevance: 1.0 = highly important, 0.5 = moderately useful, 0.1 = minor detail
- If nothing worth extracting, return []

Conversation to analyze:
`

export async function extractMemories(transcript: string): Promise<ExtractedMemory[]> {
  if (!transcript || transcript.trim().length < 50)
    return []

  try {
    // Use Agent SDK which checks CLAUDE_CODE_OAUTH_TOKEN first (Max subscription),
    // then falls back to ANTHROPIC_API_KEY (API billing)
    const conversation = query({
      prompt: `${EXTRACTION_PROMPT}\n\n${transcript.slice(0, 8000)}`,
      options: {
        maxTurns: 1, // Single turn extraction
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true
      }
    })

    let result = ''
    let costUsd = 0
    let durationMs = 0
    let inputTokens = 0
    let outputTokens = 0

    // Stream through messages and get the result
    for await (const message of conversation) {
      if (message.type === 'result') {
        const msg = message as unknown as {
          subtype: string
          result?: string
          total_cost_usd: number
          duration_ms: number
          usage: { input_tokens: number, output_tokens: number }
        }
        if (msg.subtype === 'success' && msg.result)
          result = msg.result

        costUsd = msg.total_cost_usd || 0
        durationMs = msg.duration_ms || 0
        inputTokens = msg.usage?.input_tokens || 0
        outputTokens = msg.usage?.output_tokens || 0
      }
    }

    // Log token usage for memory extraction
    if (costUsd > 0 || inputTokens > 0)
      logTokenUsage({
        source: 'memory_extraction',
        sourceName: 'Memory Extraction',
        inputTokens,
        outputTokens,
        costUsd,
        durationMs,
        numTurns: 1
      })

    if (!result)
      return []

    // Extract JSON array from result (may have surrounding text)
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (!jsonMatch)
      return []

    const memories = JSON.parse(jsonMatch[0]) as Array<{
      type: string
      content: string
      relevance: number
    }>

    return memories
      .filter(m => isValidMemoryType(m.type) && m.content && typeof m.relevance === 'number')
      .map(m => ({
        type: m.type as MemoryChunkType,
        content: m.content.slice(0, 200),
        relevance: Math.max(0, Math.min(1, m.relevance))
      }))
  } catch (error) {
    console.error('[memory-extractor] Failed to extract memories:', error)
    return []
  }
}

function isValidMemoryType(type: string): type is MemoryChunkType {
  return ['decision', 'fact', 'solution', 'pattern', 'preference', 'summary'].includes(type)
}

export async function extractMemoriesFromTranscriptFile(transcriptPath: string): Promise<ExtractedMemory[]> {
  const fs = await import('node:fs/promises')

  try {
    const content = await fs.readFile(transcriptPath, 'utf-8')
    const lines = content.trim().split('\n')

    // Parse JSONL and extract recent messages
    const messages: Array<{ role: string, content: string }> = []
    for (const line of lines.slice(-20)) {
      try {
        const entry = JSON.parse(line)
        if (entry.role && entry.content)
          messages.push({ role: entry.role, content: entry.content })
      } catch {
        // Skip invalid lines
      }
    }

    if (messages.length === 0)
      return []

    // Format for extraction
    const formatted = messages
      .map(m => `${m.role.toUpperCase()}: ${m.content.slice(0, 1000)}`)
      .join('\n\n')

    return extractMemories(formatted)
  } catch (error) {
    console.error('[memory-extractor] Failed to read transcript:', error)
    return []
  }
}
