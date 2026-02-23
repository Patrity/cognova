<script setup lang="ts">
import type { NotificationPreferences, NotificationResource, NotificationAction } from '~~/shared/types'
import { defaultNotificationPreferences } from '~~/shared/utils/notification-defaults'

const toast = useToast()
const { updatePreferences } = useNotificationBus()

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
      // Try update first, create if it doesn't exist
      try {
        await $fetch('/api/secrets/APP_URL', {
          method: 'PUT',
          body: { value: appUrl.value, description: 'Public URL for webhooks and auth callbacks' }
        })
      } catch {
        await $fetch('/api/secrets', {
          method: 'POST',
          body: { key: 'APP_URL', value: appUrl.value, description: 'Public URL for webhooks and auth callbacks' }
        })
      }
    } else {
      try {
        await $fetch('/api/secrets/APP_URL', { method: 'DELETE' })
      } catch {
        // Secret may not exist, ignore
      }
    }
    toast.add({ title: 'Public URL saved', description: 'Restart running integrations for changes to take effect.', color: 'success' })
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

onMounted(() => {
  loadAppUrl()
  loadNotificationPrefs()
})
</script>

<template>
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
