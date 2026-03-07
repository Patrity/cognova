import type { H3Event } from 'h3'
import { getAuth } from '~~/server/utils/auth'

const publicPaths = [
  '/api/auth',
  '/api/health',
  '/_ws',
  '/_nuxt',
  '/login',
  '/register',
  '/view',
  '/api/view'
]

export default defineEventHandler(async (event: H3Event) => {
  const path = getRequestURL(event).pathname

  if (path === '/')
    return

  if (publicPaths.some(p => path.startsWith(p)))
    return

  if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/))
    return

  const session = await getAuth().api.getSession({
    headers: event.headers
  })

  if (!session) {
    if (path.startsWith('/api/')) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }
    return sendRedirect(event, '/login')
  }

  event.context.user = session.user
  event.context.session = session.session
})
