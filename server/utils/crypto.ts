import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SALT = 'cognova-secrets-salt'

let _key: Buffer | null = null

function deriveKey(): Buffer {
  if (!_key) {
    const config = useRuntimeConfig()
    if (!config.encryptionKey)
      throw new Error('NUXT_ENCRYPTION_KEY not set')
    _key = scryptSync(config.encryptionKey, SALT, 32)
  }
  return _key
}

export function encrypt(plaintext: string): { encrypted: string, iv: string } {
  const key = deriveKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return {
    encrypted: `${encrypted}:${authTag}`,
    iv: iv.toString('hex')
  }
}

export function decrypt(encryptedData: string, ivHex: string): string {
  const key = deriveKey()
  const iv = Buffer.from(ivHex, 'hex')
  const [ciphertext, authTag] = encryptedData.split(':')
  if (!ciphertext || !authTag)
    throw new Error('Invalid encrypted data format')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))
  const buf = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'hex')),
    decipher.final()
  ])
  return buf.toString('utf8')
}
