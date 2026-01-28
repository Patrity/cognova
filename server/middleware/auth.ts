import { auth } from '~~/server/utils/auth'

// Paths that don't require authentication
const publicPaths = [
  '/api/auth', // BetterAuth endpoints
  '/api/health', // Health check
  '/api/home', // Public home page content
  '/api/_mdc', // MDC syntax highlighting
  '/_nuxt', // Nuxt assets
  '/login', // Login page
  '/view' // Public document viewer
]

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Skip auth for root path (public home page)
  if (path === '/') return

  // Skip auth for public paths
  if (publicPaths.some(p => path.startsWith(p))) return

  // Skip auth for static assets
  if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) return

  // Public document API - allow through but still try to get session for owner check
  if (path.match(/^\/api\/documents\/[^/]+\/public$/)) {
    const session = await auth.api.getSession({ headers: event.headers })
    if (session) {
      event.context.user = session.user
      event.context.session = session.session
    }
    return
  }

  // Check session
  const session = await auth.api.getSession({
    headers: event.headers
  })

  if (!session) {
    // API requests get 401
    if (path.startsWith('/api/')) {
      throw createError({
        statusCode: 401,
        message: 'Unauthorized'
      })
    }
    // Page requests redirect to login
    return sendRedirect(event, '/login')
  }

  // Attach user to event context for use in routes
  event.context.user = session.user
  event.context.session = session.session
})
