<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { login, isAuthenticated } = useAuth()
const toast = useToast()
const loading = ref(false)

const fields = [
  {
    name: 'email',
    type: 'email' as const,
    label: 'Email',
    placeholder: 'admin@example.com',
    required: true
  },
  {
    name: 'password',
    type: 'password' as const,
    label: 'Password',
    placeholder: 'Enter your password',
    required: true
  }
]

watchEffect(() => {
  if (isAuthenticated.value)
    navigateTo('/dashboard')
})

async function handleSubmit(event: { data: { email: string, password: string } }) {
  loading.value = true

  const result = await login(event.data.email, event.data.password)

  if (result.error) {
    toast.add({
      title: 'Login failed',
      description: result.error.message || 'Invalid email or password',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } else {
    navigateTo('/dashboard')
  }

  loading.value = false
}
</script>

<template>
  <div>
    <div class="flex flex-col items-center gap-6 mb-8">
      <div class="flex items-center gap-3">
        <UIcon
          name="i-lucide-zap"
          class="size-10 text-primary"
        />
        <span class="font-bold text-2xl">Cognova</span>
      </div>
    </div>
    <UAuthForm
      title="Sign In"
      description="Enter your credentials to access your account"
      :fields="fields"
      :submit="{ label: 'Sign In', loading }"
      @submit="handleSubmit"
    >
      <template #footer>
        <p class="text-sm text-muted text-center">
          Don't have an account?
          <NuxtLink
            to="/register"
            class="text-primary font-medium"
          >
            Register
          </NuxtLink>
        </p>
      </template>
    </UAuthForm>
  </div>
</template>
