import type { LanguageModel } from 'ai'

export async function createAIModel(
  typeId: string,
  _aiSdkPackage: string,
  config: Record<string, unknown>,
  modelId: string
): Promise<LanguageModel> {
  switch (typeId) {
    case 'anthropic': {
      const { createAnthropic } = await import('@ai-sdk/anthropic')
      const provider = createAnthropic({ apiKey: config.apiKey as string })
      return provider(modelId)
    }
    case 'openai': {
      const { createOpenAI } = await import('@ai-sdk/openai')
      const provider = createOpenAI({ apiKey: config.apiKey as string })
      return provider(modelId)
    }
    case 'google': {
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google')
      const provider = createGoogleGenerativeAI({ apiKey: config.apiKey as string })
      return provider(modelId)
    }
    case 'xai': {
      const { createXai } = await import('@ai-sdk/xai')
      const provider = createXai({ apiKey: config.apiKey as string })
      return provider(modelId)
    }
    case 'openai-compatible': {
      const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible')
      const provider = createOpenAICompatible({
        name: (config.name as string) || 'custom',
        baseURL: config.baseURL as string,
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined
      })
      return provider(modelId)
    }
    case 'ollama': {
      const { createOllama } = await import('ollama-ai-provider')
      const provider = createOllama({
        baseURL: (config.baseURL as string) || 'http://localhost:11434/api'
      })
      return provider(modelId)
    }
    default:
      throw new Error(`Unknown provider type: ${typeId}`)
  }
}
