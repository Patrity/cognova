<script setup lang="ts">
interface Secret {
  id: string
  key: string
  description: string | null
  createdAt: string
  updatedAt: string
}

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

// Secrets state
const secretsData = ref<Secret[]>([])
const secretsLoading = ref(false)
const secretModal = ref(false)
const secretDeleteConfirm = ref(false)
const secretToDelete = ref<Secret | null>(null)
const secretSaving = ref(false)
const editingSecret = ref<Secret | null>(null)

const secretForm = reactive({
  key: '',
  value: '',
  description: ''
})

// Initialize forms with current user data
watch(() => user.value, (u) => {
  if (u) {
    profileState.name = u.name || ''
    emailState.newEmail = u.email || ''
  }
}, { immediate: true })

// Fetch secrets
async function fetchSecrets() {
  secretsLoading.value = true
  try {
    const { data } = await $fetch<{ data: Secret[] }>('/api/secrets')
    secretsData.value = data
  } catch {
    toast.add({
      title: 'Failed to load secrets',
      color: 'error'
    })
  }
  secretsLoading.value = false
}

// Tab items
const tabs = [
  { label: 'Account', icon: 'i-lucide-user', value: 'account', slot: 'account' },
  { label: 'Secrets', icon: 'i-lucide-key', value: 'secrets', slot: 'secrets' },
  { label: 'App', icon: 'i-lucide-settings', value: 'app', slot: 'app' }
]

// Secrets table columns
const secretColumns = [
  { accessorKey: 'key', header: 'Key' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'updatedAt', header: 'Last Updated' },
  { accessorKey: 'actions', header: '' }
]

function openCreateSecret() {
  editingSecret.value = null
  secretForm.key = ''
  secretForm.value = ''
  secretForm.description = ''
  secretModal.value = true
}

function openEditSecret(secret: Secret) {
  editingSecret.value = secret
  secretForm.key = secret.key
  secretForm.value = ''
  secretForm.description = secret.description || ''
  secretModal.value = true
}

function confirmDeleteSecret(secret: Secret) {
  secretToDelete.value = secret
  secretDeleteConfirm.value = true
}

async function handleSecretSubmit() {
  if (!secretForm.key || (!editingSecret.value && !secretForm.value)) {
    toast.add({
      title: 'Missing fields',
      description: editingSecret.value ? 'Key is required.' : 'Key and value are required.',
      color: 'error'
    })
    return
  }

  secretSaving.value = true
  try {
    if (editingSecret.value) {
      await $fetch(`/api/secrets/${editingSecret.value.key}`, {
        method: 'PUT',
        body: {
          value: secretForm.value || undefined,
          description: secretForm.description || undefined
        }
      })
      toast.add({
        title: 'Secret updated',
        color: 'success'
      })
    } else {
      await $fetch('/api/secrets', {
        method: 'POST',
        body: {
          key: secretForm.key,
          value: secretForm.value,
          description: secretForm.description || undefined
        }
      })
      toast.add({
        title: 'Secret created',
        color: 'success'
      })
    }
    secretModal.value = false
    await fetchSecrets()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({
      title: editingSecret.value ? 'Failed to update secret' : 'Failed to create secret',
      description: error.data?.message || 'An error occurred',
      color: 'error'
    })
  }
  secretSaving.value = false
}

async function handleDeleteSecret() {
  if (!secretToDelete.value) return

  try {
    await $fetch(`/api/secrets/${secretToDelete.value.key}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Secret deleted',
      color: 'success'
    })
    secretDeleteConfirm.value = false
    secretToDelete.value = null
    await fetchSecrets()
  } catch {
    toast.add({
      title: 'Failed to delete secret',
      color: 'error'
    })
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

// Load secrets when component mounts
onMounted(() => {
  fetchSecrets()
})

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

          <!-- Secrets Tab -->
          <template #secrets>
            <div class="py-6">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-lg font-semibold">
                    Secrets
                  </h3>
                  <p class="text-sm text-dimmed">
                    Encrypted key-value store for skills and integrations.
                  </p>
                </div>
                <UButton
                  icon="i-lucide-plus"
                  @click="openCreateSecret"
                >
                  Add Secret
                </UButton>
              </div>

              <UTable
                :columns="secretColumns"
                :data="secretsData"
                :loading="secretsLoading"
              >
                <template #key-cell="{ row }">
                  <code class="text-sm bg-elevated px-2 py-0.5 rounded">{{ row.original.key }}</code>
                </template>
                <template #description-cell="{ row }">
                  <span class="text-dimmed">{{ row.original.description || '—' }}</span>
                </template>
                <template #updatedAt-cell="{ row }">
                  <span class="text-dimmed text-sm">{{ formatDate(row.original.updatedAt) }}</span>
                </template>
                <template #actions-cell="{ row }">
                  <div class="flex gap-2 justify-end">
                    <UButton
                      variant="ghost"
                      icon="i-lucide-pencil"
                      size="xs"
                      @click="openEditSecret(row.original)"
                    />
                    <UButton
                      variant="ghost"
                      color="error"
                      icon="i-lucide-trash-2"
                      size="xs"
                      @click="confirmDeleteSecret(row.original)"
                    />
                  </div>
                </template>
                <template #empty>
                  <div class="py-12 text-center">
                    <UIcon
                      name="i-lucide-key"
                      class="size-12 mx-auto mb-4 text-dimmed"
                    />
                    <p class="text-dimmed">
                      No secrets yet. Add one to get started.
                    </p>
                  </div>
                </template>
              </UTable>
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

    <!-- Secret Create/Edit Modal -->
    <UModal v-model:open="secretModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ editingSecret ? 'Edit Secret' : 'Add Secret' }}
        </h3>
      </template>
      <template #body>
        <UForm
          :state="secretForm"
          class="space-y-4"
          @submit="handleSecretSubmit"
        >
          <UFormField
            label="Key"
            name="key"
            :hint="editingSecret ? '' : 'SCREAMING_SNAKE_CASE'"
          >
            <UInput
              v-model="secretForm.key"
              :disabled="!!editingSecret"
              placeholder="MY_API_KEY"
              class="w-full font-mono"
            />
          </UFormField>
          <UFormField
            label="Value"
            name="value"
            :hint="editingSecret ? 'Leave empty to keep current value' : ''"
          >
            <UInput
              v-model="secretForm.value"
              type="password"
              :placeholder="editingSecret ? '••••••••' : 'Secret value'"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Description"
            name="description"
          >
            <UInput
              v-model="secretForm.description"
              placeholder="Optional description"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton
              variant="ghost"
              @click="secretModal = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="secretSaving"
            >
              {{ editingSecret ? 'Update' : 'Create' }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="secretDeleteConfirm">
      <template #header>
        <h3 class="text-lg font-semibold">
          Delete Secret
        </h3>
      </template>
      <template #body>
        <p class="mb-4">
          Are you sure you want to delete <code class="bg-elevated px-2 py-0.5 rounded">{{ secretToDelete?.key }}</code>?
        </p>
        <p class="text-sm text-dimmed">
          This action cannot be undone. Any skills using this secret will stop working.
        </p>
        <div class="flex justify-end gap-2 pt-6">
          <UButton
            variant="ghost"
            @click="secretDeleteConfirm = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="handleDeleteSecret"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UDashboardPanel>
</template>
