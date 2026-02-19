<script setup lang="ts">
import type { CodeLanguage } from '~~/shared/types'

const props = defineProps<{
  skillName: string
  filePath: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()
const content = ref('')
const originalContent = ref('')
const loading = ref(true)
const saving = ref(false)

const isDirty = computed(() => content.value !== originalContent.value)

const language = computed<CodeLanguage>(() => {
  const ext = props.filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'py': return 'python'
    case 'md': return 'markdown'
    case 'json': return 'json'
    case 'ts': return 'typescript'
    case 'js': return 'javascript'
    case 'yaml':
    case 'yml': return 'yaml'
    case 'sh':
    case 'bash': return 'bash'
    default: return 'plaintext'
  }
})

async function loadFile() {
  loading.value = true
  try {
    const res = await $fetch<{ data: { content: string } }>(`/api/skills/${props.skillName}/files/read`, {
      method: 'POST',
      body: { path: props.filePath }
    })
    content.value = res.data.content
    originalContent.value = res.data.content
  } catch {
    toast.add({ title: 'Failed to load file', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/skills/${props.skillName}/files/write`, {
      method: 'POST',
      body: { path: props.filePath, content: content.value }
    })
    originalContent.value = content.value
    toast.add({ title: 'File saved', color: 'success' })
    emit('saved')
  } catch {
    toast.add({ title: 'Failed to save file', color: 'error' })
  } finally {
    saving.value = false
  }
}

// Ctrl+S / Cmd+S keyboard shortcut
function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    if (isDirty.value) save()
  }
}

onMounted(() => {
  loadFile()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

watch(() => props.filePath, () => loadFile())
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-2 border-b border-default">
      <div class="flex items-center gap-2 text-sm text-muted">
        <UIcon
          name="i-lucide-file-code"
          class="size-4"
        />
        <span>{{ filePath }}</span>
        <UBadge
          v-if="isDirty"
          variant="soft"
          color="warning"
          size="xs"
        >
          Modified
        </UBadge>
      </div>
      <UButton
        size="xs"
        :loading="saving"
        :disabled="!isDirty"
        @click="save"
      >
        Save
      </UButton>
    </div>

    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <EditorCodeEditor
      v-else
      v-model="content"
      :language="language"
      class="flex-1"
    />
  </div>
</template>
