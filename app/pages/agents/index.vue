<script setup lang="ts">
const toast = useToast()
const { agents, loading, fetchAgents, toggleAgent, uninstallAgent, installAgent } = useAgents()

const search = ref('')
const deleteTarget = ref('')
const deleting = ref(false)
const showInstallModal = ref(false)
const installPath = ref('')
const installing = ref(false)

const filteredAgents = computed(() => {
  if (!search.value.trim()) return agents.value
  const q = search.value.toLowerCase()
  return agents.value.filter((a) => {
    const manifest = a.manifestJson as Record<string, unknown>
    return a.name.toLowerCase().includes(q)
      || (manifest.description as string || '').toLowerCase().includes(q)
  })
})

async function handleToggle(id: string, enabled: boolean) {
  try {
    await toggleAgent(id, enabled)
    const agent = agents.value.find(a => a.id === id)
    toast.add({
      title: `${agent?.name || 'Agent'} ${enabled ? 'enabled' : 'disabled'}`,
      color: 'success'
    })
  } catch {
    toast.add({ title: 'Failed to toggle agent', color: 'error' })
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    const agent = agents.value.find(a => a.id === deleteTarget.value)
    await uninstallAgent(deleteTarget.value)
    toast.add({ title: `Uninstalled ${agent?.name || 'agent'}`, color: 'success' })
    deleteTarget.value = ''
  } catch {
    toast.add({ title: 'Failed to uninstall agent', color: 'error' })
  } finally {
    deleting.value = false
  }
}

async function handleInstall() {
  if (!installPath.value.trim()) return
  installing.value = true
  try {
    await installAgent(installPath.value.trim())
    toast.add({ title: 'Agent installed', color: 'success' })
    showInstallModal.value = false
    installPath.value = ''
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Install failed'
    toast.add({ title: 'Install failed', description: message, color: 'error' })
  } finally {
    installing.value = false
  }
}

onMounted(() => fetchAgents(true))
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <UDashboardPanel
      id="agents-main"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Agents">
          <template #right>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search agents..."
              size="sm"
              class="w-48"
            />
            <UButton
              icon="i-lucide-plus"
              size="sm"
              @click="showInstallModal = true"
            >
              Install Agent
            </UButton>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4">
          <!-- Loading -->
          <div
            v-if="loading"
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div
              v-for="i in 3"
              :key="i"
              class="p-4 rounded-lg border border-default bg-elevated/50"
            >
              <USkeleton class="h-4 w-24 mb-2" />
              <USkeleton class="h-3 w-full mb-1" />
              <USkeleton class="h-3 w-2/3" />
            </div>
          </div>

          <!-- Empty -->
          <div
            v-else-if="agents.length === 0"
            class="flex flex-col items-center justify-center py-16 text-dimmed"
          >
            <UIcon
              name="i-lucide-bot"
              class="size-12 mb-4"
            />
            <p class="text-lg font-medium">
              No agents installed
            </p>
            <p class="text-sm mt-1">
              Install an agent from a local directory.
            </p>
          </div>

          <!-- No results -->
          <div
            v-else-if="filteredAgents.length === 0"
            class="text-center py-12 text-muted text-sm"
          >
            No agents matching "{{ search }}"
          </div>

          <!-- Grid -->
          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AgentsCard
              v-for="agent in filteredAgents"
              :key="agent.id"
              :agent="agent"
              @toggle="handleToggle"
              @delete="deleteTarget = $event"
            />
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <!-- Install Modal -->
    <UModal v-model:open="showInstallModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-folder-input"
                class="size-5"
              />
              <span class="font-semibold">Install Agent</span>
            </div>
          </template>

          <div class="flex flex-col gap-3">
            <label class="block text-sm font-medium">Local Path</label>
            <UInput
              v-model="installPath"
              placeholder="/path/to/agent-directory"
              autofocus
              @keyup.enter="handleInstall"
            />
            <p class="text-xs text-muted">
              The directory must contain a <code>manifest.yaml</code> file.
            </p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="showInstallModal = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="installing"
                @click="handleInstall"
              >
                Install
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirmation -->
    <UModal
      :open="!!deleteTarget"
      @update:open="!$event && (deleteTarget = '')"
    >
      <template #content>
        <UCard>
          <template #header>
            <span class="font-semibold">Uninstall Agent</span>
          </template>

          <p class="text-sm text-muted">
            Are you sure you want to uninstall this agent? This will remove its configuration but preserve knowledge files.
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                :disabled="deleting"
                @click="deleteTarget = ''"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :loading="deleting"
                @click="confirmDelete"
              >
                Uninstall
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
