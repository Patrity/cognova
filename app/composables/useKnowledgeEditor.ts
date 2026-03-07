import { useDebounceFn } from '@vueuse/core'
import type { SaveStatus } from '~~/shared/types'

export function useKnowledgeEditor() {
  const content = ref('')
  const filePath = ref<string | null>(null)
  const loading = ref(false)
  const saveStatus = ref<SaveStatus>('idle')
  const isDirty = ref(false)

  const debouncedSave = useDebounceFn(async () => {
    if (!filePath.value || !isDirty.value) return

    saveStatus.value = 'saving'
    try {
      await $fetch('/api/knowledge/file', {
        method: 'PUT',
        body: { path: filePath.value, content: content.value }
      })
      saveStatus.value = 'saved'
      isDirty.value = false

      setTimeout(() => {
        if (saveStatus.value === 'saved')
          saveStatus.value = 'idle'
      }, 2000)
    } catch (e) {
      console.error('Failed to save:', e)
      saveStatus.value = 'error'
    }
  }, 2000)

  async function loadFile(path: string) {
    loading.value = true
    filePath.value = path
    isDirty.value = false
    saveStatus.value = 'idle'

    try {
      const response = await $fetch<{ data: { content: string } }>('/api/knowledge/file', {
        query: { path }
      })
      content.value = response.data.content
    } catch (e) {
      console.error('Failed to load file:', e)
      content.value = ''
    } finally {
      loading.value = false
    }
  }

  function updateContent(newContent: string) {
    if (content.value !== newContent) {
      content.value = newContent
      isDirty.value = true
      debouncedSave()
    }
  }

  async function saveNow() {
    if (!filePath.value || !isDirty.value) return

    saveStatus.value = 'saving'
    try {
      await $fetch('/api/knowledge/file', {
        method: 'PUT',
        body: { path: filePath.value, content: content.value }
      })
      saveStatus.value = 'saved'
      isDirty.value = false

      setTimeout(() => {
        if (saveStatus.value === 'saved')
          saveStatus.value = 'idle'
      }, 2000)
    } catch (e) {
      console.error('Failed to save:', e)
      saveStatus.value = 'error'
    }
  }

  function closeFile() {
    content.value = ''
    filePath.value = null
    isDirty.value = false
    saveStatus.value = 'idle'
  }

  return {
    content,
    filePath,
    loading,
    saveStatus,
    isDirty,
    loadFile,
    updateContent,
    saveNow,
    closeFile
  }
}
