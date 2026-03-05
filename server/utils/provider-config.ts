import { encrypt, decrypt } from '~~/server/utils/crypto'

interface EncryptedEnvelope {
  encrypted: string
  iv: string
}

export function encryptProviderConfig(config: Record<string, unknown>): EncryptedEnvelope {
  return encrypt(JSON.stringify(config))
}

export function decryptProviderConfig(stored: unknown): Record<string, unknown> {
  if (!stored || typeof stored !== 'object')
    return {}
  const envelope = stored as EncryptedEnvelope
  if (!envelope.encrypted || !envelope.iv)
    return stored as Record<string, unknown>
  const plaintext = decrypt(envelope.encrypted, envelope.iv)
  return JSON.parse(plaintext)
}

export function maskSensitiveFields(
  config: Record<string, unknown>,
  configSchema: unknown
): Record<string, unknown> {
  if (!configSchema || typeof configSchema !== 'object')
    return config
  const props = (configSchema as Record<string, unknown>).properties as Record<string, Record<string, unknown>> | undefined
  if (!props)
    return config
  const masked = { ...config }
  for (const [key, schemaDef] of Object.entries(props)) {
    if (schemaDef.format === 'password' && masked[key])
      masked[key] = '••••••••'
  }
  return masked
}
