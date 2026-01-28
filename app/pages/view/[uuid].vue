<script setup lang="ts">
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import type { TocLink, PublicDocumentResponse } from '~~/shared/types'

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
const notMarkdown = computed(() =>
  data.value?.data?.document?.fileType !== 'markdown'
)

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

    <!-- Error: Not Markdown -->
    <div
      v-else-if="notMarkdown && data?.data"
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
        Only markdown content is supported for now.<br>
        Other file types coming soon! 🚀
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

    <!-- Success: Document View -->
    <template v-else-if="data?.data?.content">
      <!-- Document header with title and edit button -->
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">
          {{ data.data.document.title }}
        </h1>
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

      <UPage>
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
