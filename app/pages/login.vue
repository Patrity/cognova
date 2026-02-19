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

// Redirect if already authenticated
watchEffect(() => {
  if (isAuthenticated.value) navigateTo('/')
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
    navigateTo('/')
  }

  loading.value = false
}
</script>

<template>
  <div>
    <div class="flex flex-col items-center gap-6 mb-8">
      <div class="flex items-center gap-3">
        <UIcon
          name="i-lucide-brain"
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
    />
  </div>
</template>
