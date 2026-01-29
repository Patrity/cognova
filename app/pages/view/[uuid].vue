<script setup lang="ts">
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { TocLink, PublicDocumentResponse } from '~~/shared/types'
import { detectLanguage } from '~~/shared/utils/language-detection'

definePageMeta({
  layout: 'view'
})

const route = useRoute()
const uuid = computed(() => route.params.uuid as string)

// Fetch document from public API
const { data, error, status } = await useFetch<{ data: PublicDocumentResponse }>(
  `/api/documents/${uuid.value}/public`
)

// Parse markdown for TOC generation
const tocLinks = ref<TocLink[]>([])

watch(() => data.value?.data?.content, async (content) => {
  if (content) {
    try {
      const parsed = await parseMarkdown(content)
      tocLinks.value = (parsed.toc?.links as TocLink[]) || []
    } catch (e) {
      console.error('Failed to parse markdown for TOC:', e)
      tocLinks.value = []
    }
  }
}, { immediate: true })

// Error state helpers
const notFound = computed(() => error.value?.statusCode === 404)
const forbidden = computed(() => error.value?.statusCode === 403)

// File type helpers
const isMarkdown = computed(() => data.value?.data?.document?.fileType === 'markdown')
const isTextFile = computed(() => data.value?.data?.document?.fileType === 'text')
const isBinaryFile = computed(() => data.value?.data?.document?.fileType === 'binary')
const codeLanguage = computed(() => detectLanguage(data.value?.data?.document?.path || ''))

// SEO with robots control based on shareType
useSeoMeta({
  title: () => data.value?.data?.document?.title || 'Document',
  description: 'Shared document from Second Brain',
  robots: () => {
    const shareType = data.value?.data?.document?.shareType
    return shareType === 'public' ? 'index, follow' : 'noindex, nofollow'
  }
})

// Check if user is authenticated (show edit button for any authenticated user)
const { isAuthenticated } = useAuth()

// View source toggle for markdown files (persisted)
const { viewSourceMode } = usePreferences()
const viewSource = ref(viewSourceMode.value)
watch(viewSource, v => viewSourceMode.value = v)

// Copy content to clipboard
const toast = useToast()
async function copyContent() {
  const content = data.value?.data?.content
  if (!content) return

  try {
    await navigator.clipboard.writeText(content)
    toast.add({
      title: 'Copied to clipboard',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Failed to copy',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

// Download content as file
function downloadContent() {
  const content = data.value?.data?.content
  const path = data.value?.data?.document?.path
  if (!content || !path) return

  const filename = path.split('/').pop() || 'document.txt'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// Format dates for display
function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Error: Not Found -->
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

    <!-- Error: Forbidden -->
    <div
      v-else-if="forbidden"
      class="py-24 text-center"
    >
      <UIcon
        name="i-lucide-lock"
        class="size-16 mx-auto mb-4 text-dimmed"
      />
      <h1 class="text-2xl font-bold mb-2">
        Access Denied
      </h1>
      <p class="text-dimmed mb-6">
        This document is not publicly shared.
      </p>
      <UButton
        to="/login"
        variant="soft"
      >
        Sign In
      </UButton>
    </div>

    <!-- Error: Binary File -->
    <div
      v-else-if="isBinaryFile && data?.data"
      class="py-24 text-center"
    >
      <UIcon
        name="i-lucide-file-warning"
        class="size-16 mx-auto mb-4 text-dimmed"
      />
      <h1 class="text-2xl font-bold mb-2">
        Cannot Preview This File
      </h1>
      <p class="text-dimmed mb-6">
        Binary files cannot be previewed.
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

    <!-- Success: Text File View (CodeMirror) -->
    <template v-else-if="isTextFile && data?.data?.content">
      <!-- Document header with title and action buttons -->
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
          <UButton
            v-if="isAuthenticated"
            icon="i-lucide-pencil"
            variant="soft"
            size="sm"
            :to="`/docs?path=${encodeURIComponent(data.data.document.path)}`"
          >
            Edit
          </UButton>
        </div>
      </div>

      <!-- Code viewer -->
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

    <!-- Success: Markdown Document View -->
    <template v-else-if="isMarkdown && data?.data?.content">
      <!-- Document header with title and action buttons -->
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
          <UButton
            v-if="isAuthenticated"
            icon="i-lucide-pencil"
            variant="soft"
            size="sm"
            :to="`/docs?path=${encodeURIComponent(data.data.document.path)}`"
          >
            Edit
          </UButton>
        </div>
      </div>

      <!-- Document metadata -->
      <div class="flex flex-wrap items-center gap-4 text-sm text-dimmed mb-6">
        <div
          v-if="data.data.document.creatorName"
          class="flex items-center gap-1.5"
        >
          <UIcon
            name="i-lucide-user"
            class="size-4"
          />
          <span>{{ data.data.document.creatorName }}</span>
        </div>

        <div class="flex items-center gap-1.5">
          <UIcon
            name="i-lucide-calendar"
            class="size-4"
          />
          <span>{{ formatDate(data.data.document.createdAt) }}</span>
        </div>

        <div
          v-if="data.data.document.modifiedAt"
          class="flex items-center gap-1.5"
        >
          <UIcon
            name="i-lucide-pencil"
            class="size-4"
          />
          <span>Updated {{ formatDate(data.data.document.modifiedAt) }}</span>
        </div>

        <div
          v-if="data.data.document.tags?.length"
          class="flex items-center gap-1.5"
        >
          <UIcon
            name="i-lucide-tags"
            class="size-4"
          />
          <div class="flex gap-1">
            <UBadge
              v-for="tag in data.data.document.tags"
              :key="tag"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ tag }}
            </UBadge>
          </div>
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

      <!-- Preview: Rendered markdown -->
      <UPage v-else>
        <template #left>
          <UPageAside>
            <ViewToc :links="tocLinks" />
          </UPageAside>
        </template>

        <UPageBody>
          <div class="prose prose-primary dark:prose-invert max-w-none">
            <MDC :value="data.data.content" />
          </div>
        </UPageBody>
      </UPage>
    </template>
  </UContainer>
</template>
