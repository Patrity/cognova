export default defineNuxtRouteMiddleware(() => {
  const { isAuthenticated, isPending } = useAuth()

  if (isPending.value)
    return

  if (!isAuthenticated.value)
    return navigateTo('/login')
})
