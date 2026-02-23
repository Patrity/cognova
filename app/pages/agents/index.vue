<script setup lang="ts">
import type { CronAgent, CreateAgentInput, UpdateAgentInput, StatsPeriod, AgentGlobalStats } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const toast = useToast()
const router = useRouter()
const { agents, loading, fetchAgents, createAgent, updateAgent, toggleEnabled, runAgent, cancelAgent, fetchGlobalStats } = useAgents()
const { isAgentRunning } = useNotificationBus()

// Stats state with persisted period preference
const { agentStatsPeriod } = usePreferences()
const period = ref<StatsPeriod>(agentStatsPeriod.value)
const stats = ref<AgentGlobalStats | null>(null)
const statsLoading = ref(false)

// Check if agent is running (from WebSocket OR from stats)
function checkAgentRunning(agentId: string): boolean {
  // Check WebSocket notification state
  if (isAgentRunning(agentId)) return true
  // Also check stats for running agent IDs
  return stats.value?.runningAgentIds?.includes(agentId) ?? false
}

// Slideover state
const showForm = ref(false)
const editingAgent = ref<CronAgent | null>(null)

// Period options
const periodOptions = [
  { label: '24h', value: '24h' as StatsPeriod },
  { label: '7d', value: '7d' as StatsPeriod },
  { label: '30d', value: '30d' as StatsPeriod }
]

// Open form for new agent
function openNewAgentForm() {
  editingAgent.value = null
  showForm.value = true
}

// Open form for editing
function openEditForm(agent: CronAgent, event: Event) {
  event.stopPropagation()
  editingAgent.value = agent
  showForm.value = true
}

// Navigate to agent detail
function navigateToAgent(agent: CronAgent) {
  router.push(`/agents/${agent.id}`)
}

// Handle form submission
async function handleSubmit(data: CreateAgentInput | UpdateAgentInput) {
  try {
    if (editingAgent.value) {
      await updateAgent(editingAgent.value.id, data as UpdateAgentInput)
      toast.add({
        title: 'Agent updated',
        color: 'success',
        icon: 'i-lucide-check'
      })
    } else {
      await createAgent(data as CreateAgentInput)
      toast.add({
        title: 'Agent created',
        color: 'success',
        icon: 'i-lucide-check'
      })
      // Refresh stats after creating
      loadStats()
    }
    showForm.value = false
    editingAgent.value = null
  } catch (e) {
    toast.add({
      title: 'Failed to save agent',
      description: e instanceof Error ? e.message : 'An unexpected error occurred',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle toggle enabled
async function handleToggle(id: string) {
  try {
    await toggleEnabled(id)
  } catch {
    toast.add({
      title: 'Failed to toggle agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle run agent
async function handleRun(id: string, event: Event) {
  event.stopPropagation()
  try {
    await runAgent(id)
  } catch {
    toast.add({
      title: 'Failed to run agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Handle cancel agent
async function handleCancel(id: string, event: Event) {
  event.stopPropagation()
  try {
    await cancelAgent(id)
    toast.add({
      title: 'Agent cancelled',
      color: 'warning',
      icon: 'i-lucide-x-circle'
    })
  } catch {
    toast.add({
      title: 'Failed to cancel agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Load stats
async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await fetchGlobalStats(period.value)
  } catch {
    // Silently fail stats loading
  } finally {
    statsLoading.value = false
  }
}

// Watch period changes and persist preference
watch(period, (value) => {
  agentStatsPeriod.value = value
  loadStats()
})

// Load data on mount
onMounted(async () => {
  await fetchAgents()
  loadStats()
})
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="agents"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Scheduled Agents">
          <template #right>
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
            <UButton
              icon="i-lucide-plus"
              label="New Agent"
              @click="openNewAgentForm"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4 space-y-6">
          <!-- Stats Cards -->
          <AgentsAgentStatsCards
            :stats="stats"
            :loading="statsLoading"
            variant="global"
          />

          <!-- Activity Chart -->
          <AgentsAgentActivityChart
            v-if="stats && stats.dailyRuns.length > 0"
            :data="stats.dailyRuns"
            title="Run Activity"
          />

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

          <!-- Empty state -->
          <div
            v-else-if="agents.length === 0"
            class="flex flex-col items-center justify-center h-64 text-neutral-500"
          >
            <UIcon
              name="i-lucide-bot"
              class="w-12 h-12 mb-4"
            />
            <p class="text-lg font-medium">
              No agents yet
            </p>
            <p class="text-sm">
              Create your first scheduled agent to automate tasks
            </p>
            <UButton
              class="mt-4"
              icon="i-lucide-plus"
              label="Create Agent"
              @click="openNewAgentForm"
            />
          </div>

          <!-- Agent Cards -->
          <div
            v-else
            class="space-y-4"
          >
            <h2 class="text-lg font-semibold">
              Agents
            </h2>
            <AgentsAgentCard
              v-for="agent in agents"
              :key="agent.id"
              :agent="agent"
              :running="checkAgentRunning(agent.id)"
              @toggle="handleToggle"
              @run="handleRun"
              @cancel="handleCancel"
              @edit="openEditForm"
              @navigate="navigateToAgent"
            />
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <!-- Agent Form Slideover -->
    <USlideover v-model:open="showForm">
      <template #title>
        {{ editingAgent ? 'Edit Agent' : 'New Agent' }}
      </template>

      <template #body>
        <AgentsAgentForm
          :agent="editingAgent"
          @submit="handleSubmit"
          @cancel="showForm = false"
        />
      </template>
    </USlideover>
  </div>
</template>
