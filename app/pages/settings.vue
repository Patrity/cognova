<script setup lang="ts">
import type { NotificationPreferences, NotificationResource, NotificationAction, Bridge, BridgePlatform } from '~~/shared/types'
import { defaultNotificationPreferences } from '~~/shared/utils/notification-defaults'

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
const { updatePreferences } = useNotificationBus()

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
  { label: 'Integrations', icon: 'i-lucide-plug', value: 'integrations', slot: 'integrations' },
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

// === Notification Preferences ===
const notifPrefs = ref<NotificationPreferences>({ ...defaultNotificationPreferences })
const notifLoading = ref(false)
const notifSaving = ref(false)
const expandedResources = ref<Set<string>>(new Set())

const resourceConfig: { key: NotificationResource, label: string, icon: string, subtypes: NotificationAction[] }[] = [
  { key: 'task', label: 'Tasks', icon: 'i-lucide-check-square', subtypes: ['create', 'edit', 'delete', 'restore'] },
  { key: 'project', label: 'Projects', icon: 'i-lucide-folder', subtypes: ['create', 'edit', 'delete'] },
  { key: 'agent', label: 'Agents', icon: 'i-lucide-bot', subtypes: ['create', 'edit', 'delete', 'run', 'complete', 'fail', 'cancel'] },
  { key: 'document', label: 'Documents', icon: 'i-lucide-file-text', subtypes: ['edit', 'delete', 'restore'] },
  { key: 'memory', label: 'Memories', icon: 'i-lucide-brain', subtypes: ['create', 'delete'] },
  { key: 'reminder', label: 'Reminders', icon: 'i-lucide-bell', subtypes: ['create'] },
  { key: 'secret', label: 'Secrets', icon: 'i-lucide-key-round', subtypes: ['create', 'edit', 'delete'] },
  { key: 'hook', label: 'Hooks', icon: 'i-lucide-webhook', subtypes: ['create'] },
  { key: 'conversation', label: 'Conversations', icon: 'i-lucide-message-square', subtypes: ['delete'] },
  { key: 'bridge', label: 'Bridges', icon: 'i-lucide-plug', subtypes: ['create', 'edit', 'delete', 'complete', 'fail'] }
]

async function loadNotificationPrefs() {
  notifLoading.value = true
  try {
    const { data } = await $fetch<{ data: { notifications: NotificationPreferences } }>('/api/settings')
    notifPrefs.value = { ...defaultNotificationPreferences, ...data.notifications }
  } catch {
    notifPrefs.value = { ...defaultNotificationPreferences }
  }
  notifLoading.value = false
}

async function saveNotificationPrefs() {
  notifSaving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PUT',
      body: { notifications: notifPrefs.value }
    })
    updatePreferences(notifPrefs.value)
    toast.add({ title: 'Notification preferences saved', color: 'success' })
  } catch {
    toast.add({ title: 'Failed to save preferences', color: 'error' })
  }
  notifSaving.value = false
}

function toggleResourceExpand(key: string) {
  if (expandedResources.value.has(key))
    expandedResources.value.delete(key)
  else
    expandedResources.value.add(key)
}

function setResourceEnabled(key: NotificationResource, enabled: boolean) {
  notifPrefs.value[key] = { ...notifPrefs.value[key], enabled }
}

function setSubtypeEnabled(key: NotificationResource, subtype: NotificationAction, enabled: boolean) {
  const current = notifPrefs.value[key]
  notifPrefs.value[key] = {
    ...current,
    subtypes: { ...current?.subtypes, [subtype]: enabled }
  }
}

// === Integrations / Bridges ===
const bridgesData = ref<Bridge[]>([])
const bridgesLoading = ref(false)
const bridgeModal = ref(false)
const bridgeSaving = ref(false)
const bridgeDeleteConfirm = ref(false)
const bridgeToDelete = ref<Bridge | null>(null)

const bridgeForm = reactive({
  platform: 'telegram' as BridgePlatform,
  name: ''
})

const platformOptions: { value: BridgePlatform, label: string, icon: string }[] = [
  { value: 'telegram', label: 'Telegram', icon: 'i-lucide-send' },
  { value: 'discord', label: 'Discord', icon: 'i-lucide-message-circle' },
  { value: 'imessage', label: 'iMessage', icon: 'i-lucide-smartphone' },
  { value: 'google', label: 'Google Suite', icon: 'i-lucide-mail' },
  { value: 'email', label: 'Email (IMAP)', icon: 'i-lucide-at-sign' }
]

const healthColors: Record<string, string> = {
  connected: 'text-success',
  disconnected: 'text-dimmed',
  error: 'text-error',
  unconfigured: 'text-dimmed'
}

async function fetchBridges() {
  bridgesLoading.value = true
  try {
    const { data } = await $fetch<{ data: Bridge[] }>('/api/bridges')
    bridgesData.value = data
  } catch {
    toast.add({ title: 'Failed to load integrations', color: 'error' })
  }
  bridgesLoading.value = false
}

function openCreateBridge() {
  bridgeForm.platform = 'telegram'
  bridgeForm.name = ''
  bridgeModal.value = true
}

async function handleBridgeCreate() {
  if (!bridgeForm.name) {
    toast.add({ title: 'Name is required', color: 'error' })
    return
  }
  bridgeSaving.value = true
  try {
    await $fetch('/api/bridges', {
      method: 'POST',
      body: { platform: bridgeForm.platform, name: bridgeForm.name }
    })
    toast.add({ title: 'Integration created', color: 'success' })
    bridgeModal.value = false
    await fetchBridges()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: 'Failed to create integration', description: error.data?.message, color: 'error' })
  }
  bridgeSaving.value = false
}

async function toggleBridge(bridge: Bridge) {
  try {
    await $fetch(`/api/bridges/${bridge.id}`, {
      method: 'PUT',
      body: { enabled: !bridge.enabled }
    })
    await fetchBridges()
  } catch {
    toast.add({ title: 'Failed to update integration', color: 'error' })
  }
}

function confirmDeleteBridge(bridge: Bridge) {
  bridgeToDelete.value = bridge
  bridgeDeleteConfirm.value = true
}

async function handleDeleteBridge() {
  if (!bridgeToDelete.value) return
  try {
    await $fetch(`/api/bridges/${bridgeToDelete.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Integration deleted', color: 'success' })
    bridgeDeleteConfirm.value = false
    bridgeToDelete.value = null
    await fetchBridges()
  } catch {
    toast.add({ title: 'Failed to delete integration', color: 'error' })
  }
}

// Load secrets + notification prefs + bridges when component mounts
onMounted(() => {
  fetchSecrets()
  loadNotificationPrefs()
  fetchBridges()
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
          class="w-full mx-auto"
          :ui="{ list: 'max-w-xl' }"
        >
          <!-- Account Tab -->
          <template #account>
            <div class="space-y-8 max-w-2xl mx-auto py-6">
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

          <!-- Integrations Tab -->
          <template #integrations>
            <div class="py-6">
              <div class="flex items-center justify-between mb-6">
                <div>
                  <h3 class="text-lg font-semibold">
                    Integrations
                  </h3>
                  <p class="text-sm text-dimmed">
                    Connect external platforms to the message bridge.
                  </p>
                </div>
                <UButton
                  icon="i-lucide-plus"
                  @click="openCreateBridge"
                >
                  Add Integration
                </UButton>
              </div>

              <div
                v-if="bridgesLoading"
                class="space-y-3"
              >
                <USkeleton
                  v-for="i in 3"
                  :key="i"
                  class="h-16 w-full"
                />
              </div>

              <div
                v-else-if="bridgesData.length === 0"
                class="py-12 text-center"
              >
                <UIcon
                  name="i-lucide-plug"
                  class="size-12 mx-auto mb-4 text-dimmed"
                />
                <p class="text-dimmed">
                  No integrations configured.
                </p>
                <p class="text-sm text-dimmed mt-1">
                  Connect Telegram, Discord, iMessage, or Google Suite.
                </p>
              </div>

              <div
                v-else
                class="space-y-3"
              >
                <div
                  v-for="bridge in bridgesData"
                  :key="bridge.id"
                  class="border border-default rounded-lg px-4 py-3"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <UIcon
                        :name="platformOptions.find(p => p.value === bridge.platform)?.icon || 'i-lucide-plug'"
                        class="size-5 text-dimmed"
                      />
                      <div>
                        <span class="font-medium">{{ bridge.name }}</span>
                        <span class="text-sm text-dimmed ml-2">{{ platformOptions.find(p => p.value === bridge.platform)?.label }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <span
                        class="text-xs capitalize"
                        :class="healthColors[bridge.healthStatus] || 'text-dimmed'"
                      >
                        {{ bridge.healthStatus }}
                      </span>
                      <USwitch
                        :model-value="bridge.enabled"
                        @update:model-value="toggleBridge(bridge)"
                      />
                      <UButton
                        variant="ghost"
                        color="error"
                        icon="i-lucide-trash-2"
                        size="xs"
                        @click="confirmDeleteBridge(bridge)"
                      />
                    </div>
                  </div>
                  <p
                    v-if="bridge.healthMessage"
                    class="text-xs text-dimmed mt-1 pl-8"
                  >
                    {{ bridge.healthMessage }}
                  </p>
                </div>
              </div>
            </div>
          </template>

          <!-- App Tab -->
          <template #app>
            <div class="max-w-2xl mx-auto py-6">
              <div class="mb-6">
                <h3 class="text-lg font-semibold mb-1">
                  Notification Preferences
                </h3>
                <p class="text-sm text-dimmed">
                  Choose which resource changes show toast notifications.
                </p>
              </div>

              <div
                v-if="notifLoading"
                class="space-y-3"
              >
                <USkeleton
                  v-for="i in 5"
                  :key="i"
                  class="h-12 w-full"
                />
              </div>

              <div
                v-else
                class="space-y-2"
              >
                <div
                  v-for="rc in resourceConfig"
                  :key="rc.key"
                  class="border border-default rounded-lg"
                >
                  <div class="flex items-center justify-between px-4 py-3">
                    <div class="flex items-center gap-3">
                      <UButton
                        variant="ghost"
                        size="xs"
                        :icon="expandedResources.has(rc.key) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        @click="toggleResourceExpand(rc.key)"
                      />
                      <UIcon
                        :name="rc.icon"
                        class="size-5 text-dimmed"
                      />
                      <span class="font-medium">{{ rc.label }}</span>
                    </div>
                    <USwitch
                      :model-value="notifPrefs[rc.key]?.enabled ?? false"
                      @update:model-value="(v: boolean) => setResourceEnabled(rc.key, v)"
                    />
                  </div>

                  <div
                    v-if="expandedResources.has(rc.key) && notifPrefs[rc.key]?.enabled"
                    class="border-t border-default px-4 py-3 space-y-2 bg-elevated/50"
                  >
                    <div
                      v-for="subtype in rc.subtypes"
                      :key="subtype"
                      class="flex items-center justify-between pl-11"
                    >
                      <span class="text-sm text-dimmed capitalize">{{ subtype }}</span>
                      <USwitch
                        :model-value="notifPrefs[rc.key]?.subtypes?.[subtype] !== false"
                        size="sm"
                        @update:model-value="(v: boolean) => setSubtypeEnabled(rc.key, subtype, v)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-6">
                <UButton
                  :loading="notifSaving"
                  @click="saveNotificationPrefs"
                >
                  Save Preferences
                </UButton>
              </div>
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

    <!-- Bridge Create Modal -->
    <UModal v-model:open="bridgeModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          Add Integration
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField
            label="Platform"
            name="platform"
          >
            <USelect
              v-model="bridgeForm.platform"
              :items="platformOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Name"
            name="name"
          >
            <UInput
              v-model="bridgeForm.name"
              placeholder="My Telegram Bot"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton
              variant="ghost"
              @click="bridgeModal = false"
            >
              Cancel
            </UButton>
            <UButton
              :loading="bridgeSaving"
              @click="handleBridgeCreate"
            >
              Create
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Bridge Delete Confirmation Modal -->
    <UModal v-model:open="bridgeDeleteConfirm">
      <template #header>
        <h3 class="text-lg font-semibold">
          Delete Integration
        </h3>
      </template>
      <template #body>
        <p class="mb-4">
          Are you sure you want to delete <strong>{{ bridgeToDelete?.name }}</strong>?
        </p>
        <p class="text-sm text-dimmed">
          This will remove the integration and all associated message history.
        </p>
        <div class="flex justify-end gap-2 pt-6">
          <UButton
            variant="ghost"
            @click="bridgeDeleteConfirm = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="handleDeleteBridge"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UDashboardPanel>
</template>
