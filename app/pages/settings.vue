<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const { user, updateProfile, changeEmail, changePassword } = useAuth()
const toast = useToast()

// Profile form state
const profileState = reactive({
  name: ''
})
const profileLoading = ref(false)

// Email form state
const emailState = reactive({
  newEmail: ''
})
const emailLoading = ref(false)

// Password form state
const passwordState = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const passwordLoading = ref(false)

// Initialize forms with current user data
watch(() => user.value, (u) => {
  if (u) {
    profileState.name = u.name || ''
    emailState.newEmail = u.email || ''
  }
}, { immediate: true })

// Tab items
const tabs = [
  { label: 'Account', icon: 'i-lucide-user', value: 'account', slot: 'account' },
  { label: 'App', icon: 'i-lucide-settings', value: 'app', slot: 'app' }
]

// Form handlers
async function handleProfileSubmit() {
  profileLoading.value = true
  const result = await updateProfile({
    name: profileState.name
  })

  if (result.error) {
    toast.add({
      title: 'Update failed',
      description: result.error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: 'Profile updated',
      description: 'Your name has been updated successfully.',
      color: 'success'
    })
  }
  profileLoading.value = false
}

async function handleEmailSubmit() {
  if (!emailState.newEmail) {
    toast.add({
      title: 'Email required',
      description: 'Please enter a new email address.',
      color: 'error'
    })
    return
  }

  emailLoading.value = true
  const result = await changeEmail(emailState.newEmail)

  if (result.error) {
    toast.add({
      title: 'Email change failed',
      description: result.error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: 'Email updated',
      description: 'Your email has been changed successfully.',
      color: 'success'
    })
  }
  emailLoading.value = false
}

async function handlePasswordSubmit() {
  // Client-side validation
  if (passwordState.newPassword !== passwordState.confirmPassword) {
    toast.add({
      title: 'Passwords do not match',
      description: 'Please make sure your new passwords match.',
      color: 'error'
    })
    return
  }

  if (!passwordState.currentPassword || !passwordState.newPassword) {
    toast.add({
      title: 'Missing fields',
      description: 'Please fill in all password fields.',
      color: 'error'
    })
    return
  }

  passwordLoading.value = true
  const result = await changePassword({
    currentPassword: passwordState.currentPassword,
    newPassword: passwordState.newPassword
  })

  if (result.error) {
    toast.add({
      title: 'Password change failed',
      description: result.error.message,
      color: 'error'
    })
  } else {
    toast.add({
      title: 'Password changed',
      description: 'Your password has been changed successfully.',
      color: 'success'
    })
    // Clear form
    passwordState.currentPassword = ''
    passwordState.newPassword = ''
    passwordState.confirmPassword = ''
  }
  passwordLoading.value = false
}
</script>

<template>
  <UDashboardPanel
    id="settings"
    grow
  >
    <UDashboardNavbar title="Settings">
      <template #right>
        <UColorModeButton />
      </template>
    </UDashboardNavbar>

    <div class="p-6">
      <ClientOnly>
        <UTabs
          :items="tabs"
          default-value="account"
          class="w-full"
        >
          <!-- Account Tab -->
          <template #account>
            <div class="space-y-8 max-w-xl mx-auto py-6">
              <!-- Profile Section -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  Profile
                </h3>
                <UForm
                  :state="profileState"
                  class="space-y-4"
                  @submit="handleProfileSubmit"
                >
                  <UFormField
                    label="Name"
                    name="name"
                  >
                    <UInput
                      v-model="profileState.name"
                      placeholder="Your name"
                      class="w-full"
                    />
                  </UFormField>
                  <UButton
                    type="submit"
                    :loading="profileLoading"
                  >
                    Save Name
                  </UButton>
                </UForm>
              </div>

              <USeparator />

              <!-- Email Section -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  Email Address
                </h3>
                <UForm
                  :state="emailState"
                  class="space-y-4"
                  @submit="handleEmailSubmit"
                >
                  <UFormField
                    label="Email"
                    name="newEmail"
                  >
                    <UInput
                      v-model="emailState.newEmail"
                      type="email"
                      placeholder="your@email.com"
                      class="w-full"
                    />
                  </UFormField>
                  <UButton
                    type="submit"
                    :loading="emailLoading"
                  >
                    Change Email
                  </UButton>
                </UForm>
              </div>

              <USeparator />

              <!-- Password Section -->
              <div>
                <h3 class="text-lg font-semibold mb-4">
                  Change Password
                </h3>
                <UForm
                  :state="passwordState"
                  class="space-y-4"
                  @submit="handlePasswordSubmit"
                >
                  <UFormField
                    label="Current Password"
                    name="currentPassword"
                  >
                    <UInput
                      v-model="passwordState.currentPassword"
                      type="password"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="New Password"
                    name="newPassword"
                  >
                    <UInput
                      v-model="passwordState.newPassword"
                      type="password"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    label="Confirm New Password"
                    name="confirmPassword"
                  >
                    <UInput
                      v-model="passwordState.confirmPassword"
                      type="password"
                      class="w-full"
                    />
                  </UFormField>
                  <UButton
                    type="submit"
                    :loading="passwordLoading"
                  >
                    Change Password
                  </UButton>
                </UForm>
              </div>
            </div>
          </template>

          <!-- App Tab -->
          <template #app>
            <div class="py-12 text-center">
              <UIcon
                name="i-lucide-settings"
                class="size-16 mx-auto mb-4 text-dimmed"
              />
              <h3 class="text-lg font-semibold mb-2">
                App Settings
              </h3>
              <p class="text-dimmed">
                Coming soon...
              </p>
            </div>
          </template>
        </UTabs>

        <template #fallback>
          <div class="space-y-8 max-w-xl mx-auto py-6">
            <USkeleton class="h-10 w-full" />
            <div class="space-y-4">
              <USkeleton class="h-5 w-20" />
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-10 w-28" />
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </UDashboardPanel>
</template>
