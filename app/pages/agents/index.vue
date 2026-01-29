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

// Format cron expression to human readable
function formatSchedule(schedule: string) {
  const parts = schedule.split(' ')
  if (parts.length !== 5) return schedule

  const min = parts[0]!
  const hour = parts[1]!
  const dayOfMonth = parts[2]!
  const month = parts[3]!
  const dayOfWeek = parts[4]!

  if (min === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*')
    return 'Every hour'
  if (min === '*/5' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*')
    return 'Every 5 minutes'
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && hour !== '*')
    return `Daily at ${hour}:${min.padStart(2, '0')}`
  if (dayOfWeek === '0' && dayOfMonth === '*' && month === '*')
    return `Weekly on Sunday at ${hour}:${min.padStart(2, '0')}`

  return schedule
}

// Format relative time
function formatRelativeTime(date?: Date | string) {
  if (!date) return 'Never'
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

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

// Status badge color
function getStatusColor(status?: string) {
  switch (status) {
    case 'success': return 'success'
    case 'error': return 'error'
    case 'budget_exceeded': return 'warning'
    case 'running': return 'info'
    case 'cancelled': return 'neutral'
    default: return 'neutral'
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
            <UCard
              v-for="agent in agents"
              :key="agent.id"
              class="cursor-pointer transition-all hover:ring-2 hover:ring-primary/50"
              @click="navigateToAgent(agent)"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <h3 class="font-medium truncate">
                      {{ agent.name }}
                    </h3>
                    <UBadge
                      v-if="checkAgentRunning(agent.id)"
                      color="info"
                      variant="subtle"
                      size="sm"
                    >
                      <UIcon
                        name="i-lucide-loader-2"
                        class="w-3 h-3 animate-spin mr-1"
                      />
                      Running
                    </UBadge>
                    <UBadge
                      v-else-if="agent.lastStatus"
                      :color="getStatusColor(agent.lastStatus)"
                      size="sm"
                    >
                      {{ agent.lastStatus }}
                    </UBadge>
                  </div>

                  <p
                    v-if="agent.description"
                    class="text-sm text-muted truncate mt-1"
                  >
                    {{ agent.description }}
                  </p>

                  <div class="flex items-center gap-4 mt-2 text-sm text-muted">
                    <span class="flex items-center gap-1">
                      <UIcon name="i-lucide-clock" />
                      {{ formatSchedule(agent.schedule) }}
                    </span>
                    <span
                      v-if="agent.lastRunAt"
                      class="flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-activity" />
                      {{ formatRelativeTime(agent.lastRunAt) }}
                    </span>
                    <span
                      v-if="agent.maxBudgetUsd"
                      class="flex items-center gap-1"
                    >
                      <UIcon name="i-lucide-dollar-sign" />
                      ${{ agent.maxBudgetUsd }} limit
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <USwitch
                    :model-value="agent.enabled"
                    @click.stop
                    @update:model-value="handleToggle(agent.id)"
                  />
                  <UButton
                    v-if="checkAgentRunning(agent.id)"
                    icon="i-lucide-square"
                    variant="ghost"
                    size="sm"
                    color="error"
                    @click.stop="handleCancel(agent.id, $event)"
                  />
                  <UButton
                    v-else
                    icon="i-lucide-play"
                    variant="ghost"
                    size="sm"
                    :disabled="!agent.enabled"
                    @click.stop="handleRun(agent.id, $event)"
                  />
                  <UButton
                    icon="i-lucide-pencil"
                    variant="ghost"
                    size="sm"
                    @click.stop="openEditForm(agent, $event)"
                  />
                </div>
              </div>
            </UCard>
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
