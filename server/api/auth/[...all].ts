import { getAuth } from '~~/server/utils/auth'
import { toNodeHandler } from 'better-auth/node'

export default defineEventHandler((event) => {
  const handler = toNodeHandler(getAuth())
  return handler(event.node.req, event.node.res)
})
