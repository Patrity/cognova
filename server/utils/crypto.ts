import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const SALT = 'second-brain-secrets-salt'

function deriveKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('BETTER_AUTH_SECRET not set')
  return scryptSync(secret, SALT, 32)
}

export function encryptSecret(plaintext: string): { encrypted: string, iv: string } {
  const key = deriveKey()
  const iv = randomBytes(16)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return {
    encrypted: encrypted + ':' + authTag,
    iv: iv.toString('hex')
  }
}

export function decryptSecret(encrypted: string, ivHex: string): string {
  const key = deriveKey()
  const iv = Buffer.from(ivHex, 'hex')
  const [ciphertext, authTag] = encrypted.split(':')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(Buffer.from(authTag!, 'hex'))

  const decryptedBuf = Buffer.concat([
    decipher.update(Buffer.from(ciphertext!, 'hex')),
    decipher.final()
  ])
  return decryptedBuf.toString('utf8')
}
