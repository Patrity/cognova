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

// === App URL ===
const appUrl = ref('')
const appUrlSaving = ref(false)

async function loadAppUrl() {
  try {
    const { data } = await $fetch<{ data: { key: string, value: string } }>('/api/secrets/APP_URL')
    appUrl.value = data.value || ''
  } catch {
    appUrl.value = ''
  }
}

async function saveAppUrl() {
  appUrlSaving.value = true
  try {
    if (appUrl.value) {
      // Upsert the APP_URL secret
      const exists = secretsData.value.some(s => s.key === 'APP_URL')
      if (exists) {
        await $fetch('/api/secrets/APP_URL', {
          method: 'PUT',
          body: { value: appUrl.value, description: 'Public URL for webhooks and auth callbacks' }
        })
      } else {
        await $fetch('/api/secrets', {
          method: 'POST',
          body: { key: 'APP_URL', value: appUrl.value, description: 'Public URL for webhooks and auth callbacks' }
        })
      }
    } else {
      // Remove the secret if cleared
      const exists = secretsData.value.some(s => s.key === 'APP_URL')
      if (exists)
        await $fetch('/api/secrets/APP_URL', { method: 'DELETE' })
    }
    toast.add({ title: 'Public URL saved', description: 'Restart running integrations for changes to take effect.', color: 'success' })
    await fetchSecrets()
  } catch {
    toast.add({ title: 'Failed to save URL', color: 'error' })
  }
  appUrlSaving.value = false
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

// Bridge config modal state
const bridgeConfigModal = ref(false)
const editingBridge = ref<Bridge | null>(null)
const bridgeConfigSaving = ref(false)

const bridgeConfigForm = reactive({
  name: '',
  // Telegram
  botUsername: '',
  allowedChatIds: '',
  // Discord
  listenMode: 'mentions' as 'mentions' | 'dm' | 'all',
  guildId: '',
  channelId: '',
  // iMessage
  strategy: 'imsg' as 'imsg' | 'bluebubbles',
  allowedNumbers: '',
  blueBubblesUrl: '',
  // Google
  enabledServices: [] as string[],
  account: '',
  // Email
  imapHost: '',
  imapPort: '',
  smtpHost: '',
  smtpPort: '',
  emailAddress: ''
})

const discordListenModeOptions = [
  { value: 'mentions', label: 'Mentions & DMs' },
  { value: 'dm', label: 'DMs only' },
  { value: 'all', label: 'All messages' }
]

const imessageStrategyOptions = [
  { value: 'imsg', label: 'Local (imsg CLI)' },
  { value: 'bluebubbles', label: 'BlueBubbles' }
]

const googleServiceOptions = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'drive', label: 'Drive' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'tasks', label: 'Tasks' }
]

const platformNamePlaceholders: Record<BridgePlatform, string> = {
  telegram: 'My Telegram Bot',
  discord: 'My Discord Bot',
  imessage: 'iMessage Bridge',
  google: 'Google Suite',
  email: 'Work Email'
}

// Secrets required to create a bridge (blocks creation if missing)
const platformRequiredSecrets: Record<BridgePlatform, string[]> = {
  telegram: ['TELEGRAM_BOT_TOKEN'],
  discord: ['DISCORD_BOT_TOKEN'],
  imessage: [],
  google: [],
  email: []
}

const platformOptions: { value: BridgePlatform, label: string, icon: string }[] = [
  { value: 'telegram', label: 'Telegram', icon: 'i-lucide-send' },
  { value: 'discord', label: 'Discord', icon: 'i-lucide-message-circle' },
  { value: 'imessage', label: 'iMessage', icon: 'i-lucide-smartphone' },
  { value: 'google', label: 'Google Suite', icon: 'i-lucide-mail' },
  { value: 'email', label: 'Email (IMAP)', icon: 'i-lucide-at-sign' }
]

function getMissingSecrets(platform: BridgePlatform): string[] {
  const required = platformRequiredSecrets[platform]
  if (!required.length) return []
  const existing = new Set(secretsData.value.map(s => s.key))
  return required.filter(k => !existing.has(k))
}

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

function openBridgeConfig(bridge: Bridge) {
  editingBridge.value = bridge
  bridgeConfigForm.name = bridge.name

  const config = bridge.config ? JSON.parse(bridge.config) : {}

  // Reset all fields
  bridgeConfigForm.botUsername = ''
  bridgeConfigForm.allowedChatIds = ''
  bridgeConfigForm.listenMode = 'mentions'
  bridgeConfigForm.guildId = ''
  bridgeConfigForm.channelId = ''
  bridgeConfigForm.strategy = 'imsg'
  bridgeConfigForm.allowedNumbers = ''
  bridgeConfigForm.blueBubblesUrl = ''
  bridgeConfigForm.enabledServices = []
  bridgeConfigForm.account = ''
  bridgeConfigForm.imapHost = ''
  bridgeConfigForm.imapPort = ''
  bridgeConfigForm.smtpHost = ''
  bridgeConfigForm.smtpPort = ''
  bridgeConfigForm.emailAddress = ''

  // Populate platform-specific fields from config
  switch (bridge.platform) {
    case 'telegram':
      bridgeConfigForm.botUsername = config.botUsername || ''
      bridgeConfigForm.allowedChatIds = (config.allowedChatIds || []).join(', ')
      break
    case 'discord':
      bridgeConfigForm.listenMode = config.listenMode || 'mentions'
      bridgeConfigForm.guildId = config.guildId || ''
      bridgeConfigForm.channelId = config.channelId || ''
      break
    case 'imessage':
      bridgeConfigForm.strategy = config.strategy || 'imsg'
      bridgeConfigForm.allowedNumbers = (config.allowedNumbers || []).join(', ')
      bridgeConfigForm.blueBubblesUrl = config.blueBubblesUrl || ''
      break
    case 'google':
      bridgeConfigForm.enabledServices = config.enabledServices || []
      bridgeConfigForm.account = config.account || ''
      break
    case 'email':
      bridgeConfigForm.imapHost = config.imapHost || ''
      bridgeConfigForm.imapPort = config.imapPort?.toString() || ''
      bridgeConfigForm.smtpHost = config.smtpHost || ''
      bridgeConfigForm.smtpPort = config.smtpPort?.toString() || ''
      bridgeConfigForm.emailAddress = config.emailAddress || ''
      break
  }

  bridgeConfigModal.value = true
}

async function handleBridgeConfigSave() {
  if (!editingBridge.value) return

  const platform = editingBridge.value.platform
  let config: Record<string, unknown> = {}

  // Preserve existing config (like webhookSecret) and merge new fields
  if (editingBridge.value.config)
    config = JSON.parse(editingBridge.value.config)

  switch (platform) {
    case 'telegram':
      config.botUsername = bridgeConfigForm.botUsername || undefined
      config.allowedChatIds = bridgeConfigForm.allowedChatIds
        ? bridgeConfigForm.allowedChatIds.split(',').map(s => s.trim()).filter(Boolean)
        : undefined
      break
    case 'discord':
      config.listenMode = bridgeConfigForm.listenMode
      config.guildId = bridgeConfigForm.guildId || undefined
      config.channelId = bridgeConfigForm.channelId || undefined
      break
    case 'imessage':
      config.strategy = bridgeConfigForm.strategy
      config.allowedNumbers = bridgeConfigForm.allowedNumbers
        ? bridgeConfigForm.allowedNumbers.split(',').map(s => s.trim()).filter(Boolean)
        : undefined
      config.blueBubblesUrl = bridgeConfigForm.blueBubblesUrl || undefined
      break
    case 'google':
      config.enabledServices = bridgeConfigForm.enabledServices
      config.account = bridgeConfigForm.account || undefined
      break
    case 'email':
      config.imapHost = bridgeConfigForm.imapHost || undefined
      config.imapPort = bridgeConfigForm.imapPort ? Number(bridgeConfigForm.imapPort) : undefined
      config.smtpHost = bridgeConfigForm.smtpHost || undefined
      config.smtpPort = bridgeConfigForm.smtpPort ? Number(bridgeConfigForm.smtpPort) : undefined
      config.emailAddress = bridgeConfigForm.emailAddress || undefined
      break
  }

  bridgeConfigSaving.value = true
  try {
    await $fetch(`/api/bridges/${editingBridge.value.id}` as string, {
      method: 'PUT',
      body: { name: bridgeConfigForm.name, config }
    })
    toast.add({ title: 'Integration updated', color: 'success' })
    bridgeConfigModal.value = false
    await fetchBridges()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({ title: 'Failed to update integration', description: error.data?.message, color: 'error' })
  }
  bridgeConfigSaving.value = false
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
  const missing = getMissingSecrets(bridgeForm.platform)
  if (missing.length) {
    toast.add({
      title: 'Missing required secrets',
      description: `Add ${missing.join(', ')} in the Secrets tab first.`,
      color: 'error'
    })
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
    await $fetch(`/api/bridges/${bridge.id}` as string, {
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
    await $fetch(`/api/bridges/${bridgeToDelete.value.id}` as string, { method: 'DELETE' })
    toast.add({ title: 'Integration deleted', color: 'success' })
    bridgeDeleteConfirm.value = false
    bridgeToDelete.value = null
    await fetchBridges()
  } catch {
    toast.add({ title: 'Failed to delete integration', color: 'error' })
  }
}

// Load secrets + notification prefs + bridges + app url when component mounts
onMounted(() => {
  fetchSecrets()
  loadNotificationPrefs()
  fetchBridges()
  loadAppUrl()
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
                  class="border border-default rounded-lg px-4 py-3 cursor-pointer hover:bg-elevated/50 transition-colors"
                  @click="openBridgeConfig(bridge)"
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
                        @click.stop
                        @update:model-value="toggleBridge(bridge)"
                      />
                      <UButton
                        variant="ghost"
                        color="error"
                        icon="i-lucide-trash-2"
                        size="xs"
                        @click.stop="confirmDeleteBridge(bridge)"
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
              <!-- Public URL -->
              <div class="mb-8">
                <h3 class="text-lg font-semibold mb-1">
                  Public URL
                </h3>
                <p class="text-sm text-dimmed mb-4">
                  The publicly accessible URL for this instance. Used for Telegram webhooks, auth callbacks, and other integrations that need to reach your server.
                </p>
                <div class="flex gap-2">
                  <UInput
                    v-model="appUrl"
                    placeholder="https://example.com"
                    class="flex-1"
                  />
                  <UButton
                    :loading="appUrlSaving"
                    @click="saveAppUrl"
                  >
                    Save
                  </UButton>
                </div>
                <p class="text-xs text-dimmed mt-2">
                  Leave empty to use long-polling for Telegram instead of webhooks. Changes require restarting running integrations.
                </p>
              </div>

              <USeparator class="mb-8" />

              <!-- Notification Preferences -->
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

          <!-- Missing secrets warning -->
          <div
            v-if="getMissingSecrets(bridgeForm.platform).length"
            class="flex items-start gap-2 rounded-lg bg-error/10 border border-error/20 p-3 text-sm"
          >
            <UIcon
              name="i-lucide-alert-triangle"
              class="size-4 mt-0.5 text-error shrink-0"
            />
            <div>
              <p class="font-medium text-error">
                Missing required secrets
              </p>
              <p class="text-dimmed mt-1">
                Add the following in Settings &rarr; Secrets before creating:
              </p>
              <ul class="mt-1 space-y-0.5">
                <li
                  v-for="key in getMissingSecrets(bridgeForm.platform)"
                  :key="key"
                >
                  <code class="text-xs bg-elevated px-1.5 py-0.5 rounded">{{ key }}</code>
                </li>
              </ul>
            </div>
          </div>

          <UFormField
            label="Name"
            name="name"
          >
            <UInput
              v-model="bridgeForm.name"
              :placeholder="platformNamePlaceholders[bridgeForm.platform]"
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
              :disabled="getMissingSecrets(bridgeForm.platform).length > 0"
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

    <!-- Bridge Config Modal -->
    <UModal v-model:open="bridgeConfigModal">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            :name="platformOptions.find(p => p.value === editingBridge?.platform)?.icon || 'i-lucide-plug'"
            class="size-5"
          />
          <h3 class="text-lg font-semibold">
            Configure {{ editingBridge?.name }}
          </h3>
        </div>
      </template>
      <template #body>
        <div class="space-y-4">
          <!-- Secret hint -->
          <div
            v-if="editingBridge && platformRequiredSecrets[editingBridge.platform].length"
            class="flex items-start gap-2 rounded-lg bg-elevated p-3 text-sm"
          >
            <UIcon
              name="i-lucide-info"
              class="size-4 mt-0.5 text-dimmed shrink-0"
            />
            <span class="text-dimmed">
              Requires
              <template
                v-for="(key, i) in platformRequiredSecrets[editingBridge.platform]"
                :key="key"
              >
                <code class="bg-elevated px-1 py-0.5 rounded text-xs">{{ key }}</code><template v-if="i < platformRequiredSecrets[editingBridge.platform].length - 1">, </template>
              </template>
              in the Secrets tab.
            </span>
          </div>

          <!-- Common: Name -->
          <UFormField
            label="Name"
            name="name"
          >
            <UInput
              v-model="bridgeConfigForm.name"
              placeholder="Integration name"
              class="w-full"
            />
          </UFormField>

          <!-- Telegram -->
          <template v-if="editingBridge?.platform === 'telegram'">
            <UFormField
              label="Bot Username"
              name="botUsername"
              hint="Without the @ prefix"
            >
              <UInput
                v-model="bridgeConfigForm.botUsername"
                placeholder="my_bot"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Allowed Chat IDs"
              name="allowedChatIds"
              hint="Comma-separated. Leave empty for all."
            >
              <UInput
                v-model="bridgeConfigForm.allowedChatIds"
                placeholder="123456, -100789"
                class="w-full"
              />
            </UFormField>
          </template>

          <!-- Discord -->
          <template v-if="editingBridge?.platform === 'discord'">
            <UFormField
              label="Listen Mode"
              name="listenMode"
            >
              <USelect
                v-model="bridgeConfigForm.listenMode"
                :items="discordListenModeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Server ID"
              name="guildId"
              hint="Optional. Limit to one server."
            >
              <UInput
                v-model="bridgeConfigForm.guildId"
                placeholder="Discord server ID"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Channel ID"
              name="channelId"
              hint="Optional. Limit to one channel (for 'all' mode)."
            >
              <UInput
                v-model="bridgeConfigForm.channelId"
                placeholder="Discord channel ID"
                class="w-full"
              />
            </UFormField>
          </template>

          <!-- iMessage -->
          <template v-if="editingBridge?.platform === 'imessage'">
            <UFormField
              label="Strategy"
              name="strategy"
            >
              <USelect
                v-model="bridgeConfigForm.strategy"
                :items="imessageStrategyOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <div
              v-if="bridgeConfigForm.strategy === 'bluebubbles' && !secretsData.some(s => s.key === 'BLUEBUBBLES_PASSWORD')"
              class="flex items-start gap-2 rounded-lg bg-error/10 border border-error/20 p-3 text-sm"
            >
              <UIcon
                name="i-lucide-alert-triangle"
                class="size-4 mt-0.5 text-error shrink-0"
              />
              <span class="text-dimmed">
                BlueBubbles requires secret <code class="text-xs bg-elevated px-1.5 py-0.5 rounded">BLUEBUBBLES_PASSWORD</code> in the Secrets tab.
              </span>
            </div>
            <UFormField
              v-if="bridgeConfigForm.strategy === 'bluebubbles'"
              label="BlueBubbles URL"
              name="blueBubblesUrl"
            >
              <UInput
                v-model="bridgeConfigForm.blueBubblesUrl"
                placeholder="http://192.168.1.100:1234"
                class="w-full"
              />
            </UFormField>
            <UFormField
              label="Allowed Numbers"
              name="allowedNumbers"
              hint="Comma-separated. Leave empty for all."
            >
              <UInput
                v-model="bridgeConfigForm.allowedNumbers"
                placeholder="+15551234567, +15559876543"
                class="w-full"
              />
            </UFormField>
          </template>

          <!-- Google Suite -->
          <template v-if="editingBridge?.platform === 'google'">
            <UFormField
              label="Enabled Services"
              name="enabledServices"
            >
              <div class="space-y-2">
                <label
                  v-for="svc in googleServiceOptions"
                  :key="svc.value"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="bridgeConfigForm.enabledServices.includes(svc.value)"
                    class="rounded"
                    @change="
                      bridgeConfigForm.enabledServices.includes(svc.value)
                        ? bridgeConfigForm.enabledServices = bridgeConfigForm.enabledServices.filter(s => s !== svc.value)
                        : bridgeConfigForm.enabledServices.push(svc.value)
                    "
                  >
                  <span class="text-sm">{{ svc.label }}</span>
                </label>
              </div>
            </UFormField>
            <UFormField
              label="Google Account"
              name="account"
              hint="Email used with gogcli"
            >
              <UInput
                v-model="bridgeConfigForm.account"
                placeholder="user@gmail.com"
                class="w-full"
              />
            </UFormField>
          </template>

          <!-- Email (IMAP/SMTP) -->
          <template v-if="editingBridge?.platform === 'email'">
            <UFormField
              label="Email Address"
              name="emailAddress"
            >
              <UInput
                v-model="bridgeConfigForm.emailAddress"
                placeholder="user@example.com"
                class="w-full"
              />
            </UFormField>
            <div class="grid grid-cols-2 gap-4">
              <UFormField
                label="IMAP Host"
                name="imapHost"
              >
                <UInput
                  v-model="bridgeConfigForm.imapHost"
                  placeholder="imap.example.com"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="IMAP Port"
                name="imapPort"
              >
                <UInput
                  v-model="bridgeConfigForm.imapPort"
                  placeholder="993"
                  class="w-full"
                />
              </UFormField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UFormField
                label="SMTP Host"
                name="smtpHost"
              >
                <UInput
                  v-model="bridgeConfigForm.smtpHost"
                  placeholder="smtp.example.com"
                  class="w-full"
                />
              </UFormField>
              <UFormField
                label="SMTP Port"
                name="smtpPort"
              >
                <UInput
                  v-model="bridgeConfigForm.smtpPort"
                  placeholder="587"
                  class="w-full"
                />
              </UFormField>
            </div>
          </template>

          <!-- Save / Cancel -->
          <div class="flex justify-end gap-2 pt-4">
            <UButton
              variant="ghost"
              @click="bridgeConfigModal = false"
            >
              Cancel
            </UButton>
            <UButton
              :loading="bridgeConfigSaving"
              @click="handleBridgeConfigSave"
            >
              Save
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </UDashboardPanel>
</template>
