export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated, isPending } = useAuth()

  // Wait for auth to be determined
  if (isPending.value) return

  if (!isAuthenticated.value)
    return navigateTo('/login')
})
