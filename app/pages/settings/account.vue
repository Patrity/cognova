<script setup lang="ts">
const { user, updateProfile, changePassword } = useAuth()
const toast = useToast()

const profileLoading = ref(false)
const profileName = ref(user.value?.name || '')

watch(() => user.value?.name, (name) => {
  if (name)
    profileName.value = name
})

async function handleProfileSubmit() {
  profileLoading.value = true
  const result = await updateProfile({ name: profileName.value })
  if (result.error) {
    toast.add({
      title: 'Update failed',
      description: result.error.message || 'Could not update profile',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } else {
    toast.add({
      title: 'Profile updated',
      description: 'Your profile has been saved.',
      color: 'success',
      icon: 'i-lucide-check'
    })
  }
  profileLoading.value = false
}

const passwordLoading = ref(false)
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

async function handlePasswordSubmit() {
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    toast.add({
      title: 'Passwords don\'t match',
      description: 'New password and confirmation must match.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return
  }

  if (passwordForm.newPassword.length < 8) {
    toast.add({
      title: 'Password too short',
      description: 'Password must be at least 8 characters.',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
    return
  }

  passwordLoading.value = true
  const result = await changePassword({
    currentPassword: passwordForm.currentPassword,
    newPassword: passwordForm.newPassword
  })

  if (result.error) {
    toast.add({
      title: 'Password change failed',
      description: result.error.message || 'Could not change password',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } else {
    toast.add({
      title: 'Password changed',
      description: 'Your password has been updated.',
      color: 'success',
      icon: 'i-lucide-check'
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  }
  passwordLoading.value = false
}
</script>

<template>
  <div class="flex flex-col gap-6 lg:gap-12">
    <UPageCard
      title="Profile"
      description="Update your display name."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    />

    <UPageCard variant="subtle">
      <div class="flex max-sm:flex-col justify-between items-start gap-4">
        <div>
          <p class="text-sm font-medium">
            Name
          </p>
          <p class="text-sm text-muted">
            Your display name.
          </p>
        </div>
        <UInput
          v-model="profileName"
          autocomplete="off"
          class="w-full sm:w-64"
        />
      </div>
      <USeparator />
      <div class="flex max-sm:flex-col justify-between items-start gap-4">
        <div>
          <p class="text-sm font-medium">
            Email
          </p>
          <p class="text-sm text-muted">
            Your account email address.
          </p>
        </div>
        <UInput
          :model-value="user?.email || ''"
          disabled
          class="w-full sm:w-64"
        />
      </div>
      <div class="flex max-sm:flex-col justify-end items-start gap-4">
        <UButton
          label="Save changes"
          color="neutral"
          :loading="profileLoading"
          @click="handleProfileSubmit"
        />
      </div>
    </UPageCard>

    <USeparator />

    <UPageCard
      title="Password"
      description="Change your account password."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Update password"
        color="neutral"
        :loading="passwordLoading"
        @click="handlePasswordSubmit"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <div class="flex max-sm:flex-col justify-between items-start gap-4">
        <div>
          <p class="text-sm font-medium">
            Current password
          </p>
        </div>
        <UInput
          v-model="passwordForm.currentPassword"
          type="password"
          autocomplete="current-password"
          class="w-full sm:w-64"
        />
      </div>
      <USeparator />
      <div class="flex max-sm:flex-col justify-between items-start gap-4">
        <div>
          <p class="text-sm font-medium">
            New password
          </p>
          <p class="text-sm text-muted">
            Must be at least 8 characters.
          </p>
        </div>
        <UInput
          v-model="passwordForm.newPassword"
          type="password"
          autocomplete="new-password"
          class="w-full sm:w-64"
        />
      </div>
      <USeparator />
      <div class="flex max-sm:flex-col justify-between items-start gap-4">
        <div>
          <p class="text-sm font-medium">
            Confirm password
          </p>
        </div>
        <UInput
          v-model="passwordForm.confirmPassword"
          type="password"
          autocomplete="new-password"
          class="w-full sm:w-64"
        />
      </div>
    </UPageCard>
  </div>
</template>
