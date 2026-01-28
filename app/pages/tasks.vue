<script setup lang="ts">
import type { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard'
})

const toast = useToast()
const { filteredTasks, loading, filters, taskCounts, fetchTasks, createTask, updateTask, deleteTask, toggleComplete } = useTasks()
const { projects, fetchProjects } = useProjects()

// Slideover state
const showForm = ref(false)
const editingTask = ref<Task | null>(null)

// Task detail modal
const showDetailModal = ref(false)
const selectedTask = ref<Task | null>(null)

// Delete confirmation modal
const showDeleteModal = ref(false)
const taskToDelete = ref<string | null>(null)
const deleteLoading = ref(false)

const ALL_VALUE = '__all__'

// Status filter options
const statusOptions = [
  { value: ALL_VALUE, label: 'All Status' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' }
]

// Project filter options
const projectOptions = computed(() => [
  { value: ALL_VALUE, label: 'All Projects' },
  ...projects.value
    .filter(p => !p.deletedAt)
    .map(p => ({ value: p.id, label: p.name }))
])

// Filter values for selects
const statusFilter = ref(ALL_VALUE)
const projectFilter = ref(ALL_VALUE)
const searchQuery = ref('')

// Sync filter changes
watch(statusFilter, (value) => {
  filters.status = value === ALL_VALUE ? undefined : value as TaskStatus
})

watch(projectFilter, (value) => {
  filters.projectId = value === ALL_VALUE ? undefined : value
})

watch(searchQuery, (value) => {
  filters.search = value || undefined
})

// Open form for new task
function openNewTaskForm() {
  editingTask.value = null
  showForm.value = true
}

// Open form for editing
function openEditForm(task: Task) {
  editingTask.value = task
  showForm.value = true
}

// View task details
function viewTaskDetails(task: Task) {
  selectedTask.value = task
  showDetailModal.value = true
}

// Handle form submission
async function handleSubmit(data: CreateTaskInput | UpdateTaskInput) {
  try {
    if (editingTask.value) {
      await updateTask(editingTask.value.id, data)
      toast.add({
        title: 'Task updated',
        color: 'success',
        icon: 'i-lucide-check'
      })
    } else {
      await createTask(data as CreateTaskInput)
      toast.add({
        title: 'Task created',
        color: 'success',
        icon: 'i-lucide-check'
      })
    }
    editingTask.value = null
  } catch (e) {
    toast.add({
      title: 'Failed to save task',
      description: e instanceof Error ? e.message : 'An unexpected error occurred',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Open delete confirmation
function confirmDelete(id: string) {
  taskToDelete.value = id
  showDeleteModal.value = true
}

// Handle confirmed delete
async function handleDeleteConfirm() {
  if (!taskToDelete.value) return

  deleteLoading.value = true
  try {
    await deleteTask(taskToDelete.value)
    toast.add({
      title: 'Task deleted',
      color: 'success',
      icon: 'i-lucide-trash'
    })
    showDeleteModal.value = false
    taskToDelete.value = null
  } catch (e) {
    toast.add({
      title: 'Failed to delete task',
      description: e instanceof Error ? e.message : 'An unexpected error occurred',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    deleteLoading.value = false
  }
}

// Handle toggle complete
async function handleToggle(id: string) {
  try {
    await toggleComplete(id)
  } catch (e) {
    toast.add({
      title: 'Failed to update task',
      description: e instanceof Error ? e.message : 'An unexpected error occurred',
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  }
}

// Load data on mount
onMounted(async () => {
  await Promise.all([
    fetchTasks(),
    fetchProjects()
  ])
})
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="tasks"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Tasks">
          <template #left>
            <div class="flex items-center gap-2 text-sm">
              <UBadge
                color="neutral"
                variant="subtle"
              >
                {{ taskCounts.total }} total
              </UBadge>
              <UBadge
                v-if="taskCounts.done > 0"
                color="success"
                variant="subtle"
              >
                {{ taskCounts.done }} done
              </UBadge>
            </div>
          </template>

          <template #right>
            <UButton
              icon="i-lucide-plus"
              label="Add Task"
              @click="openNewTaskForm"
            />
            <UColorModeButton />
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <template #left>
            <USelect
              v-model="statusFilter"
              :items="statusOptions"
              value-key="value"
              class="w-36"
            />

            <USelect
              v-model="projectFilter"
              :items="projectOptions"
              value-key="value"
              class="w-40"
            />
          </template>

          <template #right>
            <UInput
              v-model="searchQuery"
              placeholder="Search tasks..."
              icon="i-lucide-search"
              class="w-64"
            />
          </template>
        </UDashboardToolbar>
      </template>

      <template #body>
        <TasksTaskList
          :tasks="filteredTasks"
          :loading="loading"
          @toggle="handleToggle"
          @edit="openEditForm"
          @delete="confirmDelete"
          @create="openNewTaskForm"
          @view="viewTaskDetails"
        />
      </template>
    </UDashboardPanel>

    <!-- Task Form Slideover -->
    <TasksTaskForm
      v-model:open="showForm"
      :task="editingTask"
      :projects="projects"
      @submit="handleSubmit"
    />

    <!-- Task Detail Modal -->
    <UModal
      v-model:open="showDetailModal"
      :title="selectedTask?.title"
    >
      <template #content>
        <TasksTaskDetail
          v-if="selectedTask"
          :task="selectedTask"
          @edit="openEditForm(selectedTask); showDetailModal = false"
          @close="showDetailModal = false"
          @toggle="handleToggle(selectedTask.id); showDetailModal = false"
        />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model:open="showDeleteModal"
      title="Delete Task"
      description="Are you sure you want to delete this task? This action cannot be undone."
      confirm-label="Delete"
      confirm-color="error"
      icon="i-lucide-trash-2"
      :loading="deleteLoading"
      @confirm="handleDeleteConfirm"
      @cancel="taskToDelete = null"
    />
  </div>
</template>
