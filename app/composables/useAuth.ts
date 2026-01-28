import { createAuthClient } from 'better-auth/vue'

let _authClient: ReturnType<typeof createAuthClient> | null = null

function getAuthClient() {
  if (!_authClient) {
    const baseURL = import.meta.server
      ? (process.env.BETTER_AUTH_URL || 'http://localhost:3000')
      : window.location.origin

    _authClient = createAuthClient({ baseURL })
  }
  return _authClient
}

export function useAuth() {
  const authClient = getAuthClient()
  const session = authClient.useSession()

  async function login(email: string, password: string) {
    const result = await authClient.signIn.email({ email, password })
    return result
  }

  async function logout() {
    await authClient.signOut()
    navigateTo('/login')
  }

  async function register(email: string, password: string, name: string) {
    const result = await authClient.signUp.email({ email, password, name })
    return result
  }

  return {
    session,
    user: computed(() => session.value?.data?.user),
    isAuthenticated: computed(() => !!session.value?.data?.user),
    isPending: computed(() => session.value?.isPending ?? true),
    login,
    logout,
    register
  }
}
