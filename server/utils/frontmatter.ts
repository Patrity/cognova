import matter from 'gray-matter'
import { createHash } from 'crypto'

export interface ParsedDocument {
  metadata: Record<string, unknown>
  body: string
  raw: string
}

export function parseFrontmatter(content: string): ParsedDocument {
  const { data, content: body } = matter(content)
  return {
    metadata: data,
    body,
    raw: content
  }
}

export function stringifyFrontmatter(metadata: Record<string, unknown>, body: string): string {
  if (Object.keys(metadata).length === 0)
    return body

  return matter.stringify(body, metadata)
}

export function computeContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

export function extractTitle(metadata: Record<string, unknown>, body: string, filename: string): string {
  if (metadata.title && typeof metadata.title === 'string')
    return metadata.title

  const h1Match = body.match(/^#\s+(.+)$/m)
  if (h1Match?.[1])
    return h1Match[1].trim()

  return filename.replace(/\.[^.]+$/, '')
}

const binaryExtensions = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'tar', 'gz', 'rar', '7z',
  'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'flac',
  'ttf', 'otf', 'woff', 'woff2', 'eot'
])

export function isBinaryFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return binaryExtensions.has(ext)
}

const mimeTypes: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  bmp: 'image/bmp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  wav: 'audio/wav'
}

export function getMimeType(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? mimeTypes[ext] : undefined
}
