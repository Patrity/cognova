import { getDb } from '~~/server/db'
import { decryptSecret } from '~~/server/utils/crypto'

/**
 * Retrieve and decrypt a secret by key.
 * Returns null if the secret doesn't exist.
 */
export async function getSecretValue(key: string): Promise<string | null> {
  const db = getDb()

  const secret = await db.query.secrets.findFirst({
    where: (s, { eq }) => eq(s.key, key)
  })

  if (!secret) return null

  return decryptSecret(secret.encryptedValue, secret.iv)
}
