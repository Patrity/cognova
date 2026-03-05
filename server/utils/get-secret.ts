import { and, eq } from 'drizzle-orm'
import { getDb, schema } from '~~/server/db'
import { decrypt } from '~~/server/utils/crypto'

export async function getSecretValue(key: string, userId: string): Promise<string | null> {
  const db = getDb()
  const [secret] = await db.select()
    .from(schema.secrets)
    .where(and(eq(schema.secrets.key, key), eq(schema.secrets.userId, userId)))
    .limit(1)

  if (!secret)
    return null

  return decrypt(secret.encryptedValue, secret.iv)
}
