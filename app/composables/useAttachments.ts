import type { ChatImageBlock, ChatImageMediaType, ChatDocumentBlock } from '~~/shared/types'

const IMAGE_TYPES: ChatImageMediaType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const TEXT_MIME_TYPES = new Set([
  'application/json',
  'application/javascript',
  'application/typescript',
  'application/xml',
  'application/x-yaml',
  'application/x-sh',
  'application/sql',
  'application/toml',
  'application/x-httpd-php'
])

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export interface PendingImageAttachment {
  id: string
  kind: 'image'
  previewUrl: string
  base64: string
  mediaType: ChatImageMediaType
  name: string
}

export interface PendingDocumentAttachment {
  id: string
  kind: 'document'
  data: string
  sourceType: 'base64' | 'text'
  name: string
}

export type PendingAttachment = PendingImageAttachment | PendingDocumentAttachment

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
      const base64 = result.split(',')[1]
      if (base64) resolve(base64)
      else reject(new Error('Failed to read file as base64'))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function isImageType(mime: string): mime is ChatImageMediaType {
  return IMAGE_TYPES.includes(mime as ChatImageMediaType)
}

function isTextType(mime: string): boolean {
  return mime.startsWith('text/') || TEXT_MIME_TYPES.has(mime)
}

function isPdfType(mime: string): boolean {
  return mime === 'application/pdf'
}

export function useAttachments() {
  const attachments = ref<PendingAttachment[]>([])
  const toast = useToast()

  async function addFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.add({ title: 'File too large', description: `${file.name} exceeds 20MB limit`, color: 'error' })
        continue
      }

      const mime = file.type || ''

      try {
        if (isImageType(mime)) {
          const base64 = await readFileAsBase64(file)
          const previewUrl = URL.createObjectURL(file)
          attachments.value.push({
            id: generateId(),
            kind: 'image',
            previewUrl,
            base64,
            mediaType: mime,
            name: file.name
          })
        } else if (isPdfType(mime)) {
          const base64 = await readFileAsBase64(file)
          attachments.value.push({
            id: generateId(),
            kind: 'document',
            data: base64,
            sourceType: 'base64',
            name: file.name
          })
        } else if (isTextType(mime) || isLikelyTextFile(file.name)) {
          const text = await readFileAsText(file)
          attachments.value.push({
            id: generateId(),
            kind: 'document',
            data: text,
            sourceType: 'text',
            name: file.name
          })
        } else {
          toast.add({ title: 'Unsupported file type', description: `${file.name} (${mime || 'unknown type'})`, color: 'error' })
        }
      } catch {
        toast.add({ title: 'Failed to read file', description: file.name, color: 'error' })
      }
    }
  }

  function removeAttachment(id: string) {
    const idx = attachments.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      const att = attachments.value[idx]!
      if (att.kind === 'image') URL.revokeObjectURL(att.previewUrl)
      attachments.value.splice(idx, 1)
    }
  }

  function clearAttachments() {
    for (const att of attachments.value)
      if (att.kind === 'image') URL.revokeObjectURL(att.previewUrl)
    attachments.value = []
  }

  function toImageBlocks(): ChatImageBlock[] {
    return attachments.value
      .filter((a): a is PendingImageAttachment => a.kind === 'image')
      .map(att => ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: att.mediaType,
          data: att.base64
        }
      }))
  }

  function toDocumentBlocks(): ChatDocumentBlock[] {
    return attachments.value
      .filter((a): a is PendingDocumentAttachment => a.kind === 'document')
      .map(att => ({
        type: 'document' as const,
        source: att.sourceType === 'base64'
          ? { type: 'base64' as const, media_type: 'application/pdf' as const, data: att.data }
          : { type: 'text' as const, media_type: 'text/plain' as const, data: att.data },
        title: att.name
      }))
  }

  return {
    attachments: readonly(attachments),
    addFiles,
    removeAttachment,
    clearAttachments,
    toImageBlocks,
    toDocumentBlocks
  }
}

/** Fallback for files with empty MIME but recognizable extensions */
function isLikelyTextFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase()
  if (!ext) return false
  const textExtensions = new Set([
    'txt', 'md', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'rs', 'go',
    'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'swift', 'kt', 'scala',
    'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf',
    'xml', 'html', 'htm', 'css', 'scss', 'sass', 'less',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd',
    'sql', 'graphql', 'gql', 'proto',
    'csv', 'tsv', 'log', 'env', 'gitignore', 'dockerignore',
    'vue', 'svelte', 'astro', 'prisma', 'tf', 'r', 'lua', 'dart'
  ])
  return textExtensions.has(ext)
}
