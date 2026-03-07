<script setup lang="ts">
import { detectLanguage, isMarkdownFile } from '~~/shared/utils/language-detection'

definePageMeta({
  layout: 'view'
})

interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data, error, status } = await useFetch<{
  data: {
    document: { title: string, filePath: string, createdAt: string, updatedAt: string }
    content: string
  }
}>(`/api/view/${slug.value}`)

const notFound = computed(() => error.value?.statusCode === 404)
const isMarkdown = computed(() => isMarkdownFile(data.value?.data?.document?.filePath || ''))
const codeLanguage = computed(() => detectLanguage(data.value?.data?.document?.filePath || ''))

const tocLinks = ref<TocLink[]>([])
const proseRef = ref<HTMLElement | null>(null)

function extractTocFromDom() {
  if (!proseRef.value) return
  const headings = proseRef.value.querySelectorAll('h1[id], h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')
  const flat: TocLink[] = []
  headings.forEach((el) => {
    flat.push({
      id: el.id,
      text: el.textContent?.trim() || '',
      depth: Number(el.tagName.charAt(1))
    })
  })
  // Nest: treat the shallowest depth as top-level
  const minDepth = flat.length ? Math.min(...flat.map(l => l.depth)) : 1
  const nested: TocLink[] = []
  let parent: TocLink | null = null
  for (const link of flat) {
    if (link.depth <= minDepth) {
      link.children = []
      parent = link
      nested.push(link)
    } else if (parent) {
      parent.children = parent.children || []
      parent.children.push(link)
    } else {
      nested.push(link)
    }
  }
  tocLinks.value = nested
}

// Watch for proseRef becoming available (it's inside v-else conditional)
let tocObserver: MutationObserver | null = null

watch(proseRef, (el) => {
  tocObserver?.disconnect()
  tocObserver = null
  if (!el || !isMarkdown.value) return

  // If headings already rendered, extract immediately
  if (el.querySelector('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')) {
    extractTocFromDom()
    return
  }

  // MDC renders async — observe DOM until headings appear
  tocObserver = new MutationObserver(() => {
    if (el.querySelector('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')) {
      extractTocFromDom()
      tocObserver?.disconnect()
      tocObserver = null
    }
  })
  tocObserver.observe(el, { childList: true, subtree: true })
})

onUnmounted(() => {
  tocObserver?.disconnect()
})

useSeoMeta({
  title: () => data.value?.data?.document?.title || 'Document',
  description: 'Shared document from Cognova',
  robots: 'noindex, nofollow'
})

const { viewSourceMode } = usePreferences()
const viewSource = ref(viewSourceMode.value)
watch(viewSource, v => viewSourceMode.value = v)

const toast = useToast()

async function copyContent() {
  const content = data.value?.data?.content
  if (!content) return
  try {
    await navigator.clipboard.writeText(content)
    toast.add({ title: 'Copied to clipboard', color: 'success', icon: 'i-lucide-check' })
  } catch {
    toast.add({ title: 'Failed to copy', color: 'error' })
  }
}

function downloadContent() {
  const content = data.value?.data?.content
  const filePath = data.value?.data?.document?.filePath
  if (!content || !filePath) return

  const filename = filePath.split('/').pop() || 'document.txt'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Not Found -->
    <div
      v-if="notFound"
      class="py-24 text-center"
    >
      <UIcon
        name="i-lucide-file-x"
        class="size-16 mx-auto mb-4 text-dimmed"
      />
      <h1 class="text-2xl font-bold mb-2">
        Document Not Found
      </h1>
      <p class="text-dimmed mb-6">
        This document doesn't exist or has been deleted.
      </p>
      <UButton
        to="/"
        variant="soft"
      >
        Go Home
      </UButton>
    </div>

    <!-- Loading -->
    <div
      v-else-if="status === 'pending'"
      class="py-24 text-center"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 mx-auto animate-spin text-dimmed"
      />
    </div>

    <!-- Markdown View -->
    <template v-else-if="isMarkdown && data?.data?.content">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">
          {{ data.data.document.title }}
        </h1>
        <div class="flex items-center gap-2">
          <UButton
            :icon="viewSource ? 'i-lucide-eye' : 'i-lucide-code'"
            variant="ghost"
            size="sm"
            @click="viewSource = !viewSource"
          >
            {{ viewSource ? 'Preview' : 'Source' }}
          </UButton>
          <UButton
            icon="i-lucide-copy"
            variant="ghost"
            size="sm"
            @click="copyContent"
          >
            Copy
          </UButton>
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            size="sm"
            @click="downloadContent"
          >
            Download
          </UButton>
        </div>
      </div>

      <!-- Source view: CodeMirror -->
      <div
        v-if="viewSource"
        class="border border-default rounded-lg overflow-hidden"
      >
        <ClientOnly>
          <EditorCodeEditor
            :model-value="data.data.content"
            language="markdown"
            :read-only="true"
            class="max-h-[80vh]"
          />
          <template #fallback>
            <EditorCodeEditorFallback class="h-96" />
          </template>
        </ClientOnly>
      </div>

      <!-- Preview: Rendered markdown with TOC sidebar -->
      <div
        v-else
        class="flex gap-8"
      >
        <div class="flex-1 min-w-0">
          <div
            ref="proseRef"
            class="prose prose-primary max-w-none"
          >
            <MDC :value="data.data.content" />
          </div>
        </div>
        <aside class="hidden lg:block w-56 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-auto">
          <ViewToc :links="tocLinks" />
        </aside>
      </div>
    </template>

    <!-- Non-markdown file: CodeMirror view -->
    <template v-else-if="data?.data?.content">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">
          {{ data.data.document.title }}
        </h1>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-copy"
            variant="ghost"
            size="sm"
            @click="copyContent"
          >
            Copy
          </UButton>
          <UButton
            icon="i-lucide-download"
            variant="ghost"
            size="sm"
            @click="downloadContent"
          >
            Download
          </UButton>
        </div>
      </div>

      <div class="border border-default rounded-lg overflow-hidden">
        <ClientOnly>
          <EditorCodeEditor
            :model-value="data.data.content"
            :language="codeLanguage"
            :read-only="true"
            class="max-h-[80vh]"
          />
          <template #fallback>
            <EditorCodeEditorFallback class="h-96" />
          </template>
        </ClientOnly>
      </div>
    </template>
  </UContainer>
</template>
