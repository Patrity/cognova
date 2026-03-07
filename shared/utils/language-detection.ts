import type { CodeLanguage } from '~~/shared/types'

const extensionToLanguage: Record<string, CodeLanguage> = {
  // Markdown
  md: 'markdown',
  mdx: 'markdown',

  // JavaScript/TypeScript
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',

  // Web
  json: 'json',
  jsonc: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  vue: 'vue',
  svelte: 'html',

  // Backend
  py: 'python',
  pyi: 'python',
  sql: 'sql',

  // Config
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'yaml',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',

  // Systems
  go: 'go',
  rs: 'rust',
  dockerfile: 'dockerfile',

  // Java
  java: 'java',

  // C/C++
  c: 'cpp',
  h: 'cpp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',

  // XML
  xml: 'xml',
  svg: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  plist: 'xml'
}

export function detectLanguage(filename: string): CodeLanguage {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const baseName = filename.toLowerCase()

  // Special case: Dockerfile has no extension
  if (baseName === 'dockerfile' || baseName.endsWith('/dockerfile'))
    return 'dockerfile'

  // Special case: Makefile
  if (baseName === 'makefile' || baseName.endsWith('/makefile'))
    return 'bash'

  return extensionToLanguage[ext] || 'plaintext'
}

export function isMarkdownFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext === 'md' || ext === 'mdx'
}
