import { useDebounceFn } from '@vueuse/core'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useEditor() {
  const content = ref('')
  const filePath = ref<string | null>(null)
  const loading = ref(false)
  const saveStatus = ref<SaveStatus>('idle')
  const isDirty = ref(false)

  const { writeFile } = useFileTree()

  const debouncedSave = useDebounceFn(async () => {
    if (!filePath.value || !isDirty.value) return

    saveStatus.value = 'saving'
    try {
      await writeFile(filePath.value, content.value)
      saveStatus.value = 'saved'
      isDirty.value = false

      // Reset to idle after showing saved status
      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle'
        }
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
      const response = await $fetch<{ data: { content: string } }>('/api/fs/read', {
        method: 'POST',
        body: { path }
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
      await writeFile(filePath.value, content.value)
      saveStatus.value = 'saved'
      isDirty.value = false

      setTimeout(() => {
        if (saveStatus.value === 'saved') {
          saveStatus.value = 'idle'
        }
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
