<script setup lang="ts">
import type { InstalledAgent, AgentManifest } from '~~/shared/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { toggleAgent, reimportAgent, getConfig, saveConfig } = useAgents()

const agentId = computed(() => route.params.id as string)
const agent = ref<InstalledAgent | null>(null)
const configJson = ref<Record<string, unknown>>({})
const loading = ref(true)
const saving = ref(false)

const manifest = computed(() => (agent.value?.manifestJson as AgentManifest) || null)
const configSchema = computed(() => agent.value?.configSchemaJson as Record<string, unknown> | null)

async function loadAgent() {
  loading.value = true
  try {
    const { data } = await $fetch<{ data: InstalledAgent }>(`/api/agents/${agentId.value}`)
    agent.value = data

    // Load user config
    configJson.value = await getConfig(agentId.value)
  } catch {
    toast.add({ title: 'Agent not found', color: 'error' })
    router.push('/agents')
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await saveConfig(agentId.value, configJson.value)
    toast.add({ title: 'Configuration saved', color: 'success', icon: 'i-lucide-check' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function handleToggle() {
  if (!agent.value || agent.value.builtIn) return
  try {
    const enabled = !agent.value.enabled
    await toggleAgent(agentId.value, enabled)
    agent.value.enabled = enabled
    toast.add({
      title: `${agent.value.name} ${enabled ? 'enabled' : 'disabled'}`,
      color: 'success'
    })
  } catch {
    toast.add({ title: 'Failed to toggle agent', color: 'error' })
  }
}

const reimporting = ref(false)

async function handleReimport() {
  reimporting.value = true
  try {
    await reimportAgent(agentId.value)
    await loadAgent()
    toast.add({ title: 'Agent reimported', color: 'success', icon: 'i-lucide-check' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reimport failed'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    reimporting.value = false
  }
}

onMounted(() => loadAgent())
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <UDashboardPanel
      id="agent-detail"
      grow
    >
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <NuxtLink
              to="/agents"
              class="text-muted hover:text-default transition-colors"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-4"
              />
            </NuxtLink>
            <span class="font-medium">{{ agent?.name || 'Agent' }}</span>
            <UBadge
              v-if="agent?.builtIn"
              variant="subtle"
              color="primary"
              size="xs"
            >
              Built-in
            </UBadge>
            <UBadge
              v-if="agent && !agent.enabled"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              Disabled
            </UBadge>
          </template>
          <template #right>
            <UButton
              v-if="agent && !agent.builtIn"
              icon="i-lucide-refresh-cw"
              variant="ghost"
              size="sm"
              :loading="reimporting"
              @click="handleReimport"
            >
              Reimport
            </UButton>
            <USwitch
              v-if="agent && !agent.builtIn"
              :model-value="agent.enabled"
              size="sm"
              @update:model-value="handleToggle"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-if="loading"
          class="p-6 space-y-4"
        >
          <USkeleton class="h-8 w-48" />
          <USkeleton class="h-4 w-full" />
          <USkeleton class="h-4 w-2/3" />
        </div>

        <div
          v-else-if="agent"
          class="p-6 w-full lg:max-w-2xl mx-auto"
        >
          <!-- Agent Info -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-2">
              <UIcon
                :name="agent.builtIn ? 'i-lucide-bot' : 'i-lucide-puzzle'"
                class="size-6 text-primary"
              />
              <h2 class="text-xl font-semibold">
                {{ manifest?.name || agent.name }}
              </h2>
            </div>
            <p
              v-if="manifest?.description"
              class="text-muted mb-3"
            >
              {{ manifest.description }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-if="manifest?.version"
                variant="soft"
                color="neutral"
              >
                v{{ manifest.version }}
              </UBadge>
              <UBadge
                v-for="cap in manifest?.capabilities"
                :key="cap"
                variant="soft"
                color="primary"
              >
                {{ cap }}
              </UBadge>
            </div>
          </div>

          <!-- Config Form -->
          <div v-if="configSchema">
            <h3 class="text-lg font-medium mb-4">
              Configuration
            </h3>
            <AgentsConfigForm
              v-model="configJson"
              :schema="configSchema as any"
              :editing="true"
            />
            <div class="mt-6">
              <UButton
                :loading="saving"
                @click="handleSave"
              >
                Save Configuration
              </UButton>
            </div>
          </div>

          <div
            v-else
            class="text-center py-8 text-muted"
          >
            <UIcon
              name="i-lucide-settings"
              class="size-8 mx-auto mb-2 opacity-50"
            />
            <p class="text-sm">
              No configuration options for this agent.
            </p>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
