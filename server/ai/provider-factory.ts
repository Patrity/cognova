import type { LanguageModel } from 'ai'

type AIModel = LanguageModel & { modelId: string }

/** Strip non-ASCII characters that break HTTP headers (ByteString requirement) */
function sanitizeForHeader(value: string): string {
  return value.replace(/[^ -~]/g, '')
}

export async function createAIModel(
  typeId: string,
  _aiSdkPackage: string,
  config: Record<string, unknown>,
  modelId: string
): Promise<AIModel> {
  switch (typeId) {
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      const provider = createAnthropic({ apiKey: config.apiKey as string })
      return provider(modelId) as AIModel
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      const provider = createOpenAI({ apiKey: config.apiKey as string })
      return provider(modelId) as AIModel
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
      const provider = createGoogleGenerativeAI({ apiKey: config.apiKey as string })
      return provider(modelId) as AIModel
    }
    case 'xai': {
      const { createXai } = await import('@ai-sdk/xai')
      const provider = createXai({ apiKey: config.apiKey as string })
      return provider(modelId) as AIModel
    }
    case 'openai-compatible': {
      const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible')
      // Sanitize name and API key — HTTP headers require ASCII (ByteString)
      const safeName = sanitizeForHeader((config.name as string) || 'custom') || 'custom'
      const apiKey = config.apiKey ? sanitizeForHeader(config.apiKey as string) : undefined
      const provider = createOpenAICompatible({
        name: safeName,
        baseURL: config.baseURL as string,
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
      })
      return provider(modelId) as AIModel
    }
    case 'ollama': {
      const { createOllama } = await import('ollama-ai-provider')
      const provider = createOllama({
        baseURL: (config.baseURL as string) || 'http://localhost:11434/api'
      })
      return provider(modelId) as unknown as AIModel
    }
    default:
      throw new Error(`Unknown provider type: ${typeId}`)
  }
}
