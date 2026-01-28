import { useDebounceFn } from '@vueuse/core'
import type { Document, DocumentMetadata, DocumentWithContent, UpdateDocumentInput, SaveStatus } from '~~/shared/types'

export function useDocument() {
  const document = ref<Document | null>(null)
  const metadata = ref<DocumentMetadata | null>(null)
  const body = ref('')
  const filePath = ref<string | null>(null)
  const loading = ref(false)
  const saveStatus = ref<SaveStatus>('idle')
  const isDirty = ref(false)
  const metadataDirty = ref(false)

  const debouncedSaveBody = useDebounceFn(async () => {
    if (!document.value || !isDirty.value) return
    await saveDocument({ body: body.value })
  }, 2000)

  async function loadDocument(path: string) {
    loading.value = true
    filePath.value = path
    isDirty.value = false
    metadataDirty.value = false
    saveStatus.value = 'idle'

    try {
      const response = await $fetch<{ data: DocumentWithContent }>('/api/documents/by-path', {
        method: 'POST',
        body: { path }
      })

      document.value = response.data.document
      metadata.value = response.data.metadata
      body.value = response.data.body || ''
    } catch (e) {
      console.error('Failed to load document:', e)
      document.value = null
      metadata.value = null
      body.value = ''
    } finally {
      loading.value = false
    }
  }

  function updateBody(newBody: string) {
    if (body.value !== newBody) {
      body.value = newBody
      isDirty.value = true
      debouncedSaveBody()
    }
  }

  function updateMetadata(updates: Partial<DocumentMetadata>) {
    if (!metadata.value) return

    metadata.value = { ...metadata.value, ...updates }
    metadataDirty.value = true
  }

  async function saveDocument(updates: UpdateDocumentInput = {}) {
    if (!document.value) return

    saveStatus.value = 'saving'

    try {
      const payload: UpdateDocumentInput = { ...updates }

      // Include metadata if dirty
      if (metadataDirty.value && metadata.value) {
        payload.title = metadata.value.title
        payload.tags = metadata.value.tags
        payload.projectId = metadata.value.projectId
        payload.shared = metadata.value.shared
        payload.shareType = metadata.value.shareType
      }

      // Include body if dirty and not already in updates
      if (isDirty.value && updates.body === undefined)
        payload.body = body.value

      const response = await $fetch<{ data: DocumentWithContent }>(`/api/documents/${document.value.id}`, {
        method: 'PUT',
        body: payload
      })

      document.value = response.data.document
      metadata.value = response.data.metadata
      body.value = response.data.body || ''

      isDirty.value = false
      metadataDirty.value = false
      saveStatus.value = 'saved'

      setTimeout(() => {
        if (saveStatus.value === 'saved')
          saveStatus.value = 'idle'
      }, 2000)
    } catch (e) {
      console.error('Failed to save document:', e)
      saveStatus.value = 'error'
    }
  }

  async function saveNow() {
    if (!isDirty.value && !metadataDirty.value) return
    await saveDocument({ body: body.value })
  }

  function closeDocument() {
    document.value = null
    metadata.value = null
    body.value = ''
    filePath.value = null
    isDirty.value = false
    metadataDirty.value = false
    saveStatus.value = 'idle'
  }

  return {
    document,
    metadata,
    body,
    filePath,
    loading,
    saveStatus,
    isDirty,
    metadataDirty,
    loadDocument,
    updateBody,
    updateMetadata,
    saveDocument,
    saveNow,
    closeDocument
  }
}
