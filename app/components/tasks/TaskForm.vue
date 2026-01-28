<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'
import type { Task, Project, CreateTaskInput, UpdateTaskInput, TaskStatus } from '~~/shared/types'

const props = defineProps<{
  open: boolean
  task?: Task | null
  projects: Project[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'submit': [data: CreateTaskInput | UpdateTaskInput]
}>()

const isEditing = computed(() => !!props.task?.id)
const title = computed(() => isEditing.value ? 'Edit Task' : 'Create Task')

// Form state
const formTitle = ref('')
const description = ref('')
const status = ref<TaskStatus>('todo')
const priority = ref(2)
const projectId = ref<string | null>(null)
const dueDate = ref('')
const tagsInput = ref('')

// Status options
const statusOptions = [
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' }
]

// Priority options
const priorityOptions = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' }
]

// Editor toolbar
const editorToolbar: EditorToolbarItem[][] = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code' }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link' }
  ]
]

// Editor content (use undefined for empty to avoid TipTap issues)
const editorContent = computed(() => description.value || undefined)

// Initialize form when task changes
watch(() => props.task, (task) => {
  if (task) {
    formTitle.value = task.title
    description.value = task.description || ''
    status.value = task.status
    priority.value = task.priority
    projectId.value = task.projectId || null
    dueDate.value = task.dueDate
      ? new Date(task.dueDate).toISOString().split('T')[0] || ''
      : ''
    tagsInput.value = task.tags?.join(', ') || ''
  } else {
    resetForm()
  }
}, { immediate: true })

// Reset form when closing
watch(() => props.open, (open) => {
  if (!open) resetForm()
})

function resetForm() {
  formTitle.value = ''
  description.value = ''
  status.value = 'todo'
  priority.value = 2
  projectId.value = null
  dueDate.value = ''
  tagsInput.value = ''
}

function close() {
  emit('update:open', false)
}

function handleSubmit() {
  if (!formTitle.value.trim()) return

  const tags = tagsInput.value
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const data: CreateTaskInput | UpdateTaskInput = {
    title: formTitle.value.trim(),
    description: description.value.trim() || undefined,
    status: status.value,
    priority: priority.value,
    projectId: projectId.value,
    dueDate: dueDate.value || undefined,
    tags
  }

  emit('submit', data)
  close()
}
</script>

<template>
  <USlideover
    :open="open"
    :title="title"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="task-form-body">
        <!-- Title -->
        <UFormField
          label="Title"
          required
        >
          <UInput
            v-model="formTitle"
            placeholder="Task title..."
            autofocus
            class="w-full"
          />
        </UFormField>

        <!-- Description - grows to fill available space -->
        <div class="task-form-description">
          <label class="block text-sm font-medium text-default mb-1.5">Description</label>
          <UEditor
            v-slot="{ editor }"
            :model-value="editorContent"
            content-type="markdown"
            placeholder="Add a description..."
            class="task-editor"
            @update:model-value="description = $event"
          >
            <UEditorToolbar
              :editor="editor"
              :items="editorToolbar"
              class="border-b border-default"
            />
          </UEditor>
        </div>

        <!-- Other fields -->
        <div class="task-form-fields">
          <!-- Status & Priority -->
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Status">
              <USelect
                v-model="status"
                :items="statusOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Priority">
              <USelect
                v-model="priority"
                :items="priorityOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>

          <!-- Project -->
          <UFormField label="Project">
            <TasksProjectSelect
              v-model="projectId"
              :projects="projects"
              class="w-full"
            />
          </UFormField>

          <!-- Due Date -->
          <UFormField label="Due Date">
            <UInput
              v-model="dueDate"
              type="date"
              class="w-full"
            />
          </UFormField>

          <!-- Tags -->
          <UFormField label="Tags">
            <UInput
              v-model="tagsInput"
              placeholder="work, urgent, review"
              class="w-full"
            />
            <template #hint>
              <span class="text-xs text-dimmed">Separate with commas</span>
            </template>
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          color="neutral"
          variant="ghost"
          @click="close"
        >
          Cancel
        </UButton>
        <UButton
          :disabled="!formTitle.trim()"
          @click="handleSubmit"
        >
          {{ isEditing ? 'Save Changes' : 'Create Task' }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<style>
/* Body fills available space with flex layout */
.task-form-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

/* Description section - grows to fill available space */
.task-form-description {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 8rem;
  overflow: hidden;
}

/* Other form fields - fixed height */
.task-form-fields {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Editor fills available space in description */
.task-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
}

.task-editor [data-slot="content"] {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.task-editor .tiptap {
  min-height: 100%;
  padding: 0.75rem;
}

.task-editor .tiptap:focus {
  outline: none;
}
</style>
