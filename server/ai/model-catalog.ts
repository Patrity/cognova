export interface ModelSuggestion {
  modelId: string
  displayName: string
  suggestedTags: string[]
}

export const MODEL_CATALOG: Record<string, ModelSuggestion[]> = {
  'anthropic': [
    { modelId: 'claude-sonnet-4-5-20250929', displayName: 'Claude Sonnet 4.5', suggestedTags: ['frontier'] },
    { modelId: 'claude-opus-4-6', displayName: 'Claude Opus 4.6', suggestedTags: ['frontier'] },
    { modelId: 'claude-haiku-4-5-20251001', displayName: 'Claude Haiku 4.5', suggestedTags: ['fast'] }
  ],
  'openai': [
    { modelId: 'gpt-4o', displayName: 'GPT-4o', suggestedTags: ['frontier'] },
    { modelId: 'gpt-4o-mini', displayName: 'GPT-4o Mini', suggestedTags: ['fast'] },
    { modelId: 'gpt-4.1', displayName: 'GPT-4.1', suggestedTags: ['frontier'] },
    { modelId: 'o3-mini', displayName: 'o3 Mini', suggestedTags: ['fast', 'coding'] }
  ],
  'google': [
    { modelId: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', suggestedTags: ['frontier'] },
    { modelId: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', suggestedTags: ['fast'] }
  ],
  'xai': [
    { modelId: 'grok-3', displayName: 'Grok 3', suggestedTags: ['frontier'] },
    { modelId: 'grok-3-mini', displayName: 'Grok 3 Mini', suggestedTags: ['fast'] }
  ],
  'openai-compatible': [],
  'ollama': [
    { modelId: 'llama3', displayName: 'Llama 3', suggestedTags: ['local'] },
    { modelId: 'mistral', displayName: 'Mistral', suggestedTags: ['local'] },
    { modelId: 'codellama', displayName: 'Code Llama', suggestedTags: ['local', 'coding'] }
  ]
}

export const TAG_SUGGESTIONS = ['frontier', 'fast', 'coding', 'creative', 'general', 'local']
