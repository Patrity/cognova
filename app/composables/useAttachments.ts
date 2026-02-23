import type { ChatImageBlock, ChatImageMediaType } from '~~/shared/types'

const ALLOWED_IMAGE_TYPES: ChatImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export interface PendingAttachment {
  id: string
  previewUrl: string
  base64: string
  mediaType: ChatImageMediaType
  name: string
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID()
  return Math.random().toString(36).slice(2)
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the data:...;base64, prefix
      const base64 = result.split(',')[1]
      if (base64) resolve(base64)
      else reject(new Error('Failed to read file as base64'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function useAttachments() {
  const attachments = ref<PendingAttachment[]>([])
  const toast = useToast()

  async function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as ChatImageMediaType)) {
        toast.add({ title: 'Unsupported file type', description: `${file.name} is not a supported image format`, color: 'error' })
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.add({ title: 'File too large', description: `${file.name} exceeds 20MB limit`, color: 'error' })
        continue
      }

      try {
        const base64 = await readFileAsBase64(file)
        const previewUrl = URL.createObjectURL(file)
        attachments.value.push({
          id: generateId(),
          previewUrl,
          base64,
          mediaType: file.type as ChatImageMediaType,
          name: file.name
        })
      } catch {
        toast.add({ title: 'Failed to read file', description: file.name, color: 'error' })
      }
    }
  }

  function removeAttachment(id: string) {
    const idx = attachments.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      URL.revokeObjectURL(attachments.value[idx]!.previewUrl)
      attachments.value.splice(idx, 1)
    }
  }

  function clearAttachments() {
    for (const att of attachments.value)
      URL.revokeObjectURL(att.previewUrl)
    attachments.value = []
  }

  function toImageBlocks(): ChatImageBlock[] {
    return attachments.value.map(att => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: att.mediaType,
        data: att.base64
      }
    }))
  }

  return {
    attachments: readonly(attachments),
    addFiles,
    removeAttachment,
    clearAttachments,
    toImageBlocks
  }
}
