<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import type { DashboardOverview } from '~~/shared/types'

defineProps<{
  documents: DashboardOverview['documents']
  loading?: boolean
}>()

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-file-text"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium">Recent Docs</span>
        </div>
        <UButton
          to="/docs"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-arrow-right"
        >
          View all
        </UButton>
      </div>
    </template>

    <div
      v-if="loading"
      class="space-y-3"
    >
      <div
        v-for="i in 3"
        :key="i"
        class="flex items-center gap-3"
      >
        <USkeleton class="size-8 rounded" />
        <div class="flex-1">
          <USkeleton class="h-4 w-32 mb-1" />
          <USkeleton class="h-3 w-20" />
        </div>
      </div>
    </div>

    <div
      v-else-if="documents.length === 0"
      class="text-center py-4 text-muted text-sm"
    >
      No documents yet
    </div>

    <div
      v-else
      class="space-y-2"
    >
      <NuxtLink
        v-for="doc in documents"
        :key="doc.id"
        :to="{ path: '/docs', query: { path: doc.path } }"
        class="flex items-center gap-3 p-2 -mx-2 rounded-md hover:bg-elevated transition-colors"
      >
        <div class="flex items-center justify-center size-8 rounded bg-primary/10">
          <UIcon
            name="i-lucide-file-text"
            class="size-4 text-primary"
          />
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">
            {{ doc.title }}
          </p>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="doc.projectName"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              <span
                class="inline-block size-2 rounded-full mr-1"
                :style="{ background: doc.projectColor || 'var(--ui-primary)' }"
              />
              {{ doc.projectName }}
            </UBadge>
          </div>
        </div>

        <span
          v-if="doc.modifiedAt"
          class="text-xs text-muted whitespace-nowrap"
        >
          {{ relativeTime(doc.modifiedAt) }}
        </span>
      </NuxtLink>
    </div>
  </UCard>
</template>
