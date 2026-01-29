<script setup lang="ts">
import type { CronAgent, CronAgentRun, CreateAgentInput, UpdateAgentInput } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const toast = useToast()
const { agents, loading, fetchAgents, createAgent, updateAgent, deleteAgent, toggleEnabled, runAgent, fetchRuns } = useAgents()

// Slideover state
const showForm = ref(false)
const editingAgent = ref<CronAgent | null>(null)

// Runs modal state
const showRunsModal = ref(false)
const selectedAgent = ref<CronAgent | null>(null)
const runs = ref<CronAgentRun[]>([])
const runsLoading = ref(false)

// Delete confirmation modal
const showDeleteModal = ref(false)
const agentToDelete = ref<string | null>(null)
const deleteLoading = ref(false)

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

// Format duration
function formatDuration(ms?: number) {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
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
function openEditForm(agent: CronAgent) {
  editingAgent.value = agent
  showForm.value = true
}

// View runs history
async function viewRuns(agent: CronAgent) {
  selectedAgent.value = agent
  runsLoading.value = true
  showRunsModal.value = true

  try {
    runs.value = await fetchRuns(agent.id)
  } catch {
    toast.add({
      title: 'Failed to load runs',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    runsLoading.value = false
  }
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
async function handleRun(id: string) {
  try {
    await runAgent(id)
    toast.add({
      title: 'Agent started',
      description: 'The agent is now running in the background',
      color: 'success',
      icon: 'i-lucide-play'
    })
  } catch {
    toast.add({
      title: 'Failed to run agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Open delete confirmation
function confirmDelete(id: string) {
  agentToDelete.value = id
  showDeleteModal.value = true
}

// Handle confirmed delete
async function handleDeleteConfirm() {
  if (!agentToDelete.value) return

  deleteLoading.value = true
  try {
    await deleteAgent(agentToDelete.value)
    toast.add({
      title: 'Agent deleted',
      color: 'success',
      icon: 'i-lucide-trash'
    })
    showDeleteModal.value = false
    agentToDelete.value = null
  } catch {
    toast.add({
      title: 'Failed to delete agent',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    deleteLoading.value = false
  }
}

// Status badge color
function getStatusColor(status?: string) {
  switch (status) {
    case 'success': return 'success'
    case 'error': return 'error'
    case 'budget_exceeded': return 'warning'
    case 'running': return 'info'
    default: return 'neutral'
  }
}

// Load data on mount
onMounted(() => {
  fetchAgents()
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
          <template #left>
            <div class="flex items-center gap-2 text-sm">
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ agents.length }} agents
              </UBadge>
              <UBadge
                v-if="agents.filter(a => a.enabled).length > 0"
                color="success"
                variant="subtle"
              >
                {{ agents.filter(a => a.enabled).length }} active
              </UBadge>
            </div>
          </template>

          <template #right>
            <UButton
              icon="i-lucide-plus"
              label="New Agent"
              @click="openNewAgentForm"
            />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
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

        <div
          v-else
          class="p-4 space-y-4"
        >
          <UCard
            v-for="agent in agents"
            :key="agent.id"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="font-medium truncate">
                    {{ agent.name }}
                  </h3>
                  <UBadge
                    v-if="agent.lastStatus"
                    :color="getStatusColor(agent.lastStatus)"
                    size="sm"
                  >
                    {{ agent.lastStatus }}
                  </UBadge>
                </div>

                <p
                  v-if="agent.description"
                  class="text-sm text-neutral-500 truncate mt-1"
                >
                  {{ agent.description }}
                </p>

                <div class="flex items-center gap-4 mt-2 text-sm text-neutral-500">
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
                  @update:model-value="handleToggle(agent.id)"
                />
                <UButton
                  icon="i-lucide-play"
                  variant="ghost"
                  size="sm"
                  :disabled="!agent.enabled"
                  @click="handleRun(agent.id)"
                />
                <UButton
                  icon="i-lucide-history"
                  variant="ghost"
                  size="sm"
                  @click="viewRuns(agent)"
                />
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  size="sm"
                  @click="openEditForm(agent)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  size="sm"
                  color="error"
                  @click="confirmDelete(agent.id)"
                />
              </div>
            </div>
          </UCard>
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

    <!-- Runs History Modal -->
    <UModal
      v-model:open="showRunsModal"
      :title="selectedAgent ? `Runs: ${selectedAgent.name}` : 'Run History'"
    >
      <template #content>
        <div class="p-4">
          <div
            v-if="runsLoading"
            class="flex items-center justify-center h-32"
          >
            <UIcon
              name="i-lucide-loader-2"
              class="w-6 h-6 animate-spin"
            />
          </div>

          <div
            v-else-if="runs.length === 0"
            class="text-center text-neutral-500 py-8"
          >
            No runs yet
          </div>

          <div
            v-else
            class="space-y-3 max-h-96 overflow-y-auto"
          >
            <div
              v-for="run in runs"
              :key="run.id"
              class="border rounded-lg p-3"
            >
              <div class="flex items-center justify-between">
                <UBadge
                  :color="getStatusColor(run.status)"
                  size="sm"
                >
                  {{ run.status }}
                </UBadge>
                <span class="text-xs text-neutral-500">
                  {{ formatRelativeTime(run.startedAt) }}
                </span>
              </div>

              <div class="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                <span v-if="run.durationMs">
                  {{ formatDuration(run.durationMs) }}
                </span>
                <span v-if="run.costUsd">
                  ${{ run.costUsd.toFixed(4) }}
                </span>
                <span v-if="run.inputTokens">
                  {{ run.inputTokens.toLocaleString() }} in
                </span>
                <span v-if="run.outputTokens">
                  {{ run.outputTokens.toLocaleString() }} out
                </span>
              </div>

              <p
                v-if="run.error"
                class="mt-2 text-sm text-error-500 line-clamp-2"
              >
                {{ run.error }}
              </p>

              <p
                v-else-if="run.output"
                class="mt-2 text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3"
              >
                {{ run.output }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model:open="showDeleteModal"
      title="Delete Agent"
      description="Are you sure you want to delete this agent? All run history will also be deleted."
      confirm-label="Delete"
      confirm-color="error"
      icon="i-lucide-trash-2"
      :loading="deleteLoading"
      @confirm="handleDeleteConfirm"
      @cancel="agentToDelete = null"
    />
  </div>
</template>
