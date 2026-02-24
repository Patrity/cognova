<script setup lang="ts">
import type { Bridge, BridgePlatform } from '~~/shared/types'

const toast = useToast()

// Bridges state
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

// Secrets for validation
const secretKeys = ref<string[]>([])

async function fetchSecretKeys() {
  try {
    const { data } = await $fetch<{ data: { key: string }[] }>('/api/secrets')
    secretKeys.value = data.map(s => s.key)
  } catch {
    // Silently fail
  }
}

const discordListenModeOptions = [
  { value: 'mentions', label: 'Mentions & DMs' },
  { value: 'dm', label: 'DMs only' },
  { value: 'all', label: 'All messages' }
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
  const existing = new Set(secretKeys.value)
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

onMounted(() => {
  fetchBridges()
  fetchSecretKeys()
})
</script>

<template>
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

          <!-- iMessage (BlueBubbles) -->
          <template v-if="editingBridge?.platform === 'imessage'">
            <div
              v-if="!secretKeys.includes('BLUEBUBBLES_PASSWORD')"
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
  </div>
</template>
