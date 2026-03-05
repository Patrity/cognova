<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { register, isAuthenticated } = useAuth()
const toast = useToast()
const loading = ref(false)

const fields = [
  {
    name: 'name',
    type: 'text' as const,
    label: 'Name',
    placeholder: 'Your name',
    required: true
  },
  {
    name: 'email',
    type: 'email' as const,
    label: 'Email',
    placeholder: 'you@example.com',
    required: true
  },
  {
    name: 'password',
    type: 'password' as const,
    label: 'Password',
    placeholder: 'Create a password',
    required: true
  }
]

watchEffect(() => {
  if (isAuthenticated.value)
    navigateTo('/dashboard')
})

async function handleSubmit(event: { data: { name: string, email: string, password: string } }) {
  loading.value = true

  const result = await register(event.data.email, event.data.password, event.data.name)

  if (result.error) {
    toast.add({
      title: 'Registration failed',
      description: result.error.message || 'Could not create account',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } else {
    toast.add({
      title: 'Account created',
      description: 'Welcome to Cognova!',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
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
      title="Create Account"
      description="Register to get started with Cognova"
      :fields="fields"
      :submit="{ label: 'Create Account', loading }"
      @submit="handleSubmit"
    >
      <template #footer>
        <p class="text-sm text-muted text-center">
          Already have an account?
          <NuxtLink
            to="/login"
            class="text-primary font-medium"
          >
            Sign in
          </NuxtLink>
        </p>
      </template>
    </UAuthForm>
  </div>
</template>
