<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'

const props = defineProps<{
  modelValue: string
  filePath: string | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  isDirty: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'save': []
}>()

const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'heading', level: 1, icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, icon: 'i-lucide-heading-3' }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code' }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide-quote' }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link' },
    { kind: 'codeBlock', icon: 'i-lucide-file-code' },
    { kind: 'horizontalRule', icon: 'i-lucide-minus' }
  ],
  [
    { kind: 'undo', icon: 'i-lucide-undo' },
    { kind: 'redo', icon: 'i-lucide-redo' }
  ]
]

const saveStatusIcon = computed(() => {
  switch (props.saveStatus) {
    case 'saving':
      return 'i-lucide-loader-2'
    case 'saved':
      return 'i-lucide-check'
    case 'error':
      return 'i-lucide-alert-circle'
    default:
      return props.isDirty ? 'i-lucide-circle-dot' : null
  }
})

const saveStatusText = computed(() => {
  switch (props.saveStatus) {
    case 'saving':
      return 'Saving...'
    case 'saved':
      return 'Saved'
    case 'error':
      return 'Error saving'
    default:
      return props.isDirty ? 'Unsaved changes' : ''
  }
})

// Use undefined instead of empty string for proper TipTap initialization
const editorContent = computed(() => props.modelValue || undefined)

function handleUpdate(value: string) {
  emit('update:modelValue', value)
}

// Handle Cmd+S / Ctrl+S
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    emit('save')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-default px-4 py-2 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-dimmed min-w-0">
        <UIcon
          name="i-lucide-file-text"
          class="size-4 shrink-0"
        />
        <span class="truncate">{{ filePath || 'No file selected' }}</span>
      </div>
      <div
        v-if="saveStatusIcon"
        class="flex items-center gap-1 text-sm text-dimmed"
      >
        <UIcon
          :name="saveStatusIcon"
          :class="[
            'size-4',
            saveStatus === 'saving' && 'animate-spin',
            saveStatus === 'error' && 'text-error'
          ]"
        />
        <span>{{ saveStatusText }}</span>
      </div>
    </div>

    <UEditor
      v-slot="{ editor }"
      :model-value="editorContent"
      content-type="markdown"
      placeholder="Start writing..."
      class="markdown-editor w-full min-h-64 flex-1"
      @update:model-value="handleUpdate"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        class="border-b border-default"
      />
    </UEditor>
  </div>
</template>

<style>
/* Make the editor content area fill available height for better click targeting */
.markdown-editor [data-slot="content"] {
  flex: 1;
  overflow: auto;
}

.markdown-editor .tiptap {
  min-height: 100%;
}
</style>
