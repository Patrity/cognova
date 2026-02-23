<script setup lang="ts">
import type { CronAgent, CronAgentRun, AgentDetailStats, StatsPeriod, CreateAgentInput, UpdateAgentInput } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchAgentStats, fetchRuns, updateAgent, deleteAgent, toggleEnabled, runAgent, cancelAgent } = useAgents()
const { isAgentRunning } = useNotificationBus()

const agentId = computed(() => route.params.id as string)

// Fetch agent data with SSR support
const { data: agentData, status: agentStatus, error: agentError, refresh: refreshAgent } = await useFetch<{ data: CronAgent }>(
  () => `/api/agents/${agentId.value}`,
  { key: `agent-${agentId.value}` }
)

// Computed agent from response
const agent = computed(() => agentData.value?.data ?? null)
const loading = computed(() => agentStatus.value === 'pending')

// Handle agent not found
if (agentError.value) {
  throw createError({
    statusCode: agentError.value.statusCode || 404,
    message: agentError.value.message || 'Agent not found'
  })
}

// Data state for stats and runs (client-side)
const stats = ref<AgentDetailStats | null>(null)
const runs = ref<CronAgentRun[]>([])
const statsLoading = ref(false)
const runsLoading = ref(false)

// Check if agent is running (from WebSocket OR from runs list)
const agentRunning = computed(() => {
  if (!agent.value) return false
  // Check WebSocket notification state
  if (isAgentRunning(agent.value.id)) return true
  // Also check if any run in the list has 'running' status
  return runs.value.some(r => r.status === 'running')
})

// Period state
const period = ref<StatsPeriod>('7d')
const periodOptions = [
  { label: '24h', value: '24h' as StatsPeriod },
  { label: '7d', value: '7d' as StatsPeriod },
  { label: '30d', value: '30d' as StatsPeriod }
]

// UI state
const showEditForm = ref(false)
const showDeleteConfirm = ref(false)
const selectedRun = ref<CronAgentRun | null>(null)
const showRunModal = ref(false)

// Load stats
async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await fetchAgentStats(agentId.value, period.value)
  } catch {
    // Silently fail
  } finally {
    statsLoading.value = false
  }
}

// Load runs
async function loadRuns() {
  runsLoading.value = true
  try {
    runs.value = await fetchRuns(agentId.value, period.value)
  } catch {
    // Silently fail
  } finally {
    runsLoading.value = false
  }
}

// Handle toggle
async function handleToggle() {
  if (!agent.value) return
  try {
    await toggleEnabled(agent.value.id)
    await refreshAgent()
  } catch {
    toast.add({
      title: 'Failed to toggle agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle run
async function handleRun() {
  if (!agent.value) return
  try {
    await runAgent(agent.value.id)
    // Refresh runs after a short delay
    setTimeout(loadRuns, 1000)
  } catch {
    toast.add({
      title: 'Failed to run agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle cancel
async function handleCancel() {
  if (!agent.value) return
  try {
    await cancelAgent(agent.value.id)
    toast.add({
      title: 'Agent cancelled',
      color: 'warning',
      icon: 'i-lucide-x-circle'
    })
    // Refresh runs after a short delay
    setTimeout(() => {
      loadRuns()
      loadStats()
    }, 1000)
  } catch {
    toast.add({
      title: 'Failed to cancel agent',
      description: 'No running execution found',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle edit submit
async function handleEditSubmit(data: CreateAgentInput | UpdateAgentInput) {
  if (!agent.value) return
  try {
    await updateAgent(agent.value.id, data as UpdateAgentInput)
    toast.add({
      title: 'Agent updated',
      color: 'success',
      icon: 'i-lucide-check'
    })
    showEditForm.value = false
    refreshAgent()
    loadStats()
  } catch (e) {
    toast.add({
      title: 'Failed to update agent',
      description: e instanceof Error ? e.message : 'An unexpected error occurred',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle delete
async function handleDelete() {
  if (!agent.value) return
  try {
    await deleteAgent(agent.value.id)
    toast.add({
      title: 'Agent deleted',
      color: 'success',
      icon: 'i-lucide-check'
    })
    router.push('/agents')
  } catch {
    toast.add({
      title: 'Failed to delete agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Open run modal
function openRunModal(run: CronAgentRun) {
  selectedRun.value = run
  showRunModal.value = true
}

// Watch period changes
watch(period, () => {
  loadStats()
  loadRuns()
})

// Load stats and runs on mount (agent is already fetched via useFetch)
onMounted(() => {
  loadStats()
  loadRuns()
})
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="agent-detail"
      grow
    >
      <template #header>
        <UDashboardNavbar>
          <template #left>
            <div class="flex items-center gap-3">
              <UButton
                icon="i-lucide-arrow-left"
                variant="ghost"
                size="sm"
                @click="router.push('/agents')"
              />
              <template v-if="agent">
                <h1 class="font-semibold text-lg truncate">
                  {{ agent.name }}
                </h1>
                <UBadge
                  v-if="agentRunning"
                  color="info"
                  variant="subtle"
                >
                  <UIcon
                    name="i-lucide-loader-2"
                    class="w-3 h-3 animate-spin mr-1"
                  />
                  Running
                </UBadge>
                <UBadge
                  v-else-if="!agent.enabled"
                  color="neutral"
                  variant="subtle"
                >
                  Disabled
                </UBadge>
              </template>
              <USkeleton
                v-else
                class="h-6 w-32"
              />
            </div>
          </template>

          <template #right>
            <template v-if="agent">
              <USwitch
                :model-value="agent.enabled"
                @update:model-value="handleToggle"
              />
              <UButton
                v-if="agentRunning"
                icon="i-lucide-square"
                variant="ghost"
                color="error"
                @click="handleCancel"
              />
              <UButton
                v-else
                icon="i-lucide-play"
                variant="ghost"
                :disabled="!agent.enabled"
                @click="handleRun"
              />
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                @click="showEditForm = true"
              />
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                @click="showDeleteConfirm = true"
              />
            </template>
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <template #left>
            <UFieldGroup>
              <UButton
                v-for="opt in periodOptions"
                :key="opt.value"
                :color="period === opt.value ? 'primary' : 'neutral'"
                :variant="period === opt.value ? 'solid' : 'ghost'"
                size="sm"
                @click="period = opt.value"
              >
                {{ opt.label }}
              </UButton>
            </UFieldGroup>
          </template>
        </UDashboardToolbar>
      </template>

      <template #body>
        <!-- Loading state -->
        <div
          v-if="loading"
          class="flex items-center justify-center h-64"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="w-8 h-8 animate-spin text-neutral-400"
          />
        </div>

        <div
          v-else-if="agent"
          class="p-4 space-y-6"
        >
          <!-- Agent Info -->
          <AgentsAgentInfoCard :agent="agent" />

          <!-- Stats Cards -->
          <AgentsAgentStatsCards
            :stats="stats"
            :loading="statsLoading"
            variant="detail"
          />

          <!-- Activity Chart -->
          <AgentsAgentActivityChart
            v-if="stats && stats.dailyRuns.length > 0"
            :data="stats.dailyRuns"
            title="Run Activity"
          />

          <!-- Run History -->
          <AgentsAgentRunHistory
            :runs="runs"
            :loading="runsLoading"
            @select="openRunModal"
          />
        </div>
      </template>
    </UDashboardPanel>

    <!-- Edit Slideover -->
    <USlideover v-model:open="showEditForm">
      <template #title>
        Edit Agent
      </template>

      <template #body>
        <AgentsAgentForm
          :agent="agent"
          @submit="handleEditSubmit"
          @cancel="showEditForm = false"
        />
      </template>
    </USlideover>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <div class="p-4 space-y-4">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-full bg-error-500/10">
              <UIcon
                name="i-lucide-alert-triangle"
                class="w-6 h-6 text-error-500"
              />
            </div>
            <div>
              <h3 class="font-semibold">
                Delete Agent
              </h3>
              <p class="text-sm text-muted">
                Are you sure you want to delete "{{ agent?.name }}"? This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="showDeleteConfirm = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="handleDelete"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Run Detail Modal -->
    <AgentsAgentRunModal
      v-model:open="showRunModal"
      :run="selectedRun"
    />
  </div>
</template>
