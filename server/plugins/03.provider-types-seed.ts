import { getDb, schema } from '~~/server/db'

const PROVIDER_TYPES = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    aiSdkPackage: '@ai-sdk/anthropic',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' }
      },
      required: ['apiKey']
    }
  },
  {
    id: 'openai',
    name: 'OpenAI',
    aiSdkPackage: '@ai-sdk/openai',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' }
      },
      required: ['apiKey']
    }
  },
  {
    id: 'google',
    name: 'Google Gemini',
    aiSdkPackage: '@ai-sdk/google',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' }
      },
      required: ['apiKey']
    }
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    aiSdkPackage: '@ai-sdk/xai',
    configSchema: {
      type: 'object',
      properties: {
        apiKey: { type: 'string', title: 'API Key', format: 'password' }
      },
      required: ['apiKey']
    }
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI Compatible',
    aiSdkPackage: '@ai-sdk/openai-compatible',
    configSchema: {
      type: 'object',
      properties: {
        baseURL: { type: 'string', title: 'Base URL' },
        apiKey: { type: 'string', title: 'API Key (optional)', format: 'password' },
        name: { type: 'string', title: 'Provider Name' }
      },
      required: ['baseURL']
    }
  },
  {
    id: 'ollama',
    name: 'Ollama',
    aiSdkPackage: 'ollama-ai-provider',
    configSchema: {
      type: 'object',
      properties: {
        baseURL: { type: 'string', title: 'Base URL', default: 'http://localhost:11434/api' }
      },
      required: []
    }
  }
]

export default defineNitroPlugin(async () => {
  try {
    const db = getDb()

    for (const type of PROVIDER_TYPES) {
      await db.insert(schema.providerTypes)
        .values(type)
        .onConflictDoUpdate({
          target: schema.providerTypes.id,
          set: {
            name: type.name,
            aiSdkPackage: type.aiSdkPackage,
            configSchema: type.configSchema
          }
        })
    }

    console.log(`[seed] ${PROVIDER_TYPES.length} provider types seeded`)
  } catch (error) {
    console.error('[seed] Failed to seed provider types:', error)
  }
})
