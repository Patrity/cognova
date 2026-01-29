<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'
import type { CronAgent, CreateAgentInput, UpdateAgentInput } from '~~/shared/types'

const props = defineProps<{
  agent?: CronAgent | null
}>()

const emit = defineEmits<{
  submit: [data: CreateAgentInput | UpdateAgentInput]
  cancel: []
}>()

// Form state
const name = ref('')
const description = ref('')
const schedule = ref('0 8 * * *')
const prompt = ref('')
const enabled = ref(true)
const maxTurns = ref<number | undefined>(50)
const maxBudgetUsd = ref<number | undefined>(undefined)

// Common schedule presets
const schedulePresets = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 8am', value: '0 8 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekly (Sunday midnight)', value: '0 0 * * 0' },
  { label: 'Custom', value: 'custom' }
]

const selectedPreset = ref('0 8 * * *')
const customSchedule = ref('')

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
    { kind: 'codeBlock', icon: 'i-lucide-square-code' }
  ]
]

// Editor content (use undefined for empty to avoid TipTap issues)
const editorContent = computed(() => prompt.value || undefined)

// Watch preset selection
watch(selectedPreset, (value) => {
  if (value !== 'custom') {
    schedule.value = value
  }
})

watch(customSchedule, (value) => {
  if (selectedPreset.value === 'custom' && value) {
    schedule.value = value
  }
})

// Initialize form when agent prop changes
watch(() => props.agent, (agent) => {
  if (agent) {
    name.value = agent.name
    description.value = agent.description || ''
    schedule.value = agent.schedule
    prompt.value = agent.prompt
    enabled.value = agent.enabled
    maxTurns.value = agent.maxTurns ?? 50
    maxBudgetUsd.value = agent.maxBudgetUsd ?? undefined

    // Check if schedule matches a preset
    const preset = schedulePresets.find(p => p.value === agent.schedule)
    if (preset) {
      selectedPreset.value = agent.schedule
    } else {
      selectedPreset.value = 'custom'
      customSchedule.value = agent.schedule
    }
  } else {
    // Reset form for new agent
    name.value = ''
    description.value = ''
    schedule.value = '0 8 * * *'
    selectedPreset.value = '0 8 * * *'
    customSchedule.value = ''
    prompt.value = ''
    enabled.value = true
    maxTurns.value = 50
    maxBudgetUsd.value = undefined
  }
}, { immediate: true })

// Validation
const isValid = computed(() => {
  return name.value.trim() && schedule.value.trim() && prompt.value.trim()
})

function handleSubmit() {
  if (!isValid.value) return

  const data: CreateAgentInput | UpdateAgentInput = {
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    schedule: schedule.value.trim(),
    prompt: prompt.value.trim(),
    enabled: enabled.value,
    maxTurns: maxTurns.value,
    maxBudgetUsd: maxBudgetUsd.value
  }

  emit('submit', data)
}
</script>

<template>
  <div class="agent-form-body">
    <!-- Name -->
    <UFormField
      label="Name"
      required
    >
      <UInput
        v-model="name"
        placeholder="Email Digest Agent"
        class="w-full"
      />
    </UFormField>

    <!-- Description -->
    <UFormField label="Description">
      <UInput
        v-model="description"
        placeholder="Scans emails and surfaces important items"
        class="w-full"
      />
    </UFormField>

    <!-- Schedule -->
    <UFormField
      label="Schedule"
      required
    >
      <USelect
        v-model="selectedPreset"
        :items="schedulePresets"
        value-key="value"
        class="w-full"
      />
    </UFormField>

    <!-- Custom cron expression -->
    <UFormField
      v-if="selectedPreset === 'custom'"
      label="Custom Cron Expression"
    >
      <UInput
        v-model="customSchedule"
        placeholder="0 4 * * *"
        class="w-full"
      />
      <template #hint>
        <span class="text-xs text-neutral-500">
          Format: minute hour day-of-month month day-of-week
        </span>
      </template>
    </UFormField>

    <!-- Prompt - grows to fill available space -->
    <div class="agent-form-prompt">
      <label class="block text-sm font-medium text-default mb-1.5">
        Prompt <span class="text-error-500">*</span>
      </label>
      <UEditor
        v-slot="{ editor }"
        :model-value="editorContent"
        content-type="markdown"
        placeholder="You are an email scanning agent..."
        class="agent-editor"
        @update:model-value="prompt = $event"
      >
        <UEditorToolbar
          :editor="editor"
          :items="editorToolbar"
          class="border-b border-default"
        />
      </UEditor>
    </div>

    <!-- Other fields -->
    <div class="agent-form-fields">
      <!-- Max Turns & Budget -->
      <div class="grid grid-cols-2 gap-4">
        <UFormField label="Max Turns">
          <UInput
            v-model.number="maxTurns"
            type="number"
            :min="1"
            :max="200"
            placeholder="50"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Max Budget (USD)">
          <UInput
            v-model.number="maxBudgetUsd"
            type="number"
            :min="0.01"
            :step="0.01"
            placeholder="No limit"
            class="w-full"
          />
        </UFormField>
      </div>

      <!-- Enabled toggle -->
      <UFormField>
        <div class="flex items-center gap-2">
          <USwitch v-model="enabled" />
          <span class="text-sm">Enabled</span>
        </div>
      </UFormField>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-4">
      <UButton
        color="neutral"
        variant="ghost"
        @click="emit('cancel')"
      >
        Cancel
      </UButton>
      <UButton
        :disabled="!isValid"
        @click="handleSubmit"
      >
        {{ agent ? 'Update Agent' : 'Create Agent' }}
      </UButton>
    </div>
  </div>
</template>

<style>
/* Body fills available space with flex layout */
.agent-form-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

/* Prompt section - grows to fill available space */
.agent-form-prompt {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 12rem;
  overflow: hidden;
}

/* Other form fields - fixed height */
.agent-form-fields {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Editor fills available space in prompt */
.agent-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid var(--ui-border);
  border-radius: 0.375rem;
}

.agent-editor [data-slot="content"] {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.agent-editor .tiptap {
  min-height: 100%;
  padding: 0.75rem;
}

.agent-editor .tiptap:focus {
  outline: none;
}
</style>
