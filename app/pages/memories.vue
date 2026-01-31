<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { useDebounceFn } from '@vueuse/core'
import type { MemoryChunkType } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const toast = useToast()
const { memories, loading, filters, stats, fetchMemories, deleteMemory } = useMemories()

// Delete confirmation
const showDeleteModal = ref(false)
const memoryToDelete = ref<string | null>(null)
const deleteLoading = ref(false)

// Type filter options
const ALL_VALUE = '__all__'
const typeOptions = [
  { value: ALL_VALUE, label: 'All Types' },
  { value: 'decision', label: 'Decisions' },
  { value: 'fact', label: 'Facts' },
  { value: 'solution', label: 'Solutions' },
  { value: 'pattern', label: 'Patterns' },
  { value: 'preference', label: 'Preferences' },
  { value: 'summary', label: 'Summaries' }
]

const typeFilter = ref(ALL_VALUE)
const searchQuery = ref('')

// Watch filters
watch(typeFilter, (value) => {
  filters.chunkType = value === ALL_VALUE ? 'all' : value as MemoryChunkType
  fetchMemories()
})

// Debounced search
const debouncedFetch = useDebounceFn(() => {
  filters.query = searchQuery.value || undefined
  fetchMemories()
}, 300)

watch(searchQuery, debouncedFetch)

// Delete handlers
function confirmDelete(id: string) {
  memoryToDelete.value = id
  showDeleteModal.value = true
}

async function handleDeleteConfirm() {
  if (!memoryToDelete.value) return

  deleteLoading.value = true
  try {
    await deleteMemory(memoryToDelete.value)
    toast.add({ title: 'Memory deleted', color: 'success' })
    showDeleteModal.value = false
  } catch {
    toast.add({ title: 'Failed to delete memory', color: 'error' })
  } finally {
    deleteLoading.value = false
    memoryToDelete.value = null
  }
}

// Type badge colors
function getTypeColor(type: string): 'primary' | 'success' | 'warning' | 'info' | 'neutral' {
  switch (type) {
    case 'decision': return 'primary'
    case 'fact': return 'info'
    case 'solution': return 'success'
    case 'pattern': return 'warning'
    case 'preference': return 'neutral'
    case 'summary': return 'neutral'
    default: return 'neutral'
  }
}

// Type icons
function getTypeIcon(type: string): string {
  switch (type) {
    case 'decision': return 'i-lucide-git-branch'
    case 'fact': return 'i-lucide-info'
    case 'solution': return 'i-lucide-check-circle'
    case 'pattern': return 'i-lucide-repeat'
    case 'preference': return 'i-lucide-settings'
    case 'summary': return 'i-lucide-file-text'
    default: return 'i-lucide-circle'
  }
}

// Format date
function formatTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Table columns
const columns = [
  { accessorKey: 'chunkType', header: 'Type' },
  { accessorKey: 'content', header: 'Content' },
  { accessorKey: 'relevanceScore', header: 'Relevance' },
  { accessorKey: 'accessCount', header: 'Accessed' },
  { accessorKey: 'createdAt', header: 'Created' },
  { accessorKey: 'actions', header: '' }
]

// Menu items for row actions
function getRowMenuItems(id: string) {
  return [[{
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => confirmDelete(id)
  }]]
}

// Load on mount
onMounted(() => {
  fetchMemories()
})
</script>

<template>
  <div class="contents">
    <UDashboardPanel
      id="memories"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Memories">
          <template #leading>
            <UBadge
              v-if="stats.total > 0"
              color="neutral"
              variant="subtle"
              class="ml-2"
            >
              {{ stats.total }}
            </UBadge>
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <template #left>
            <USelect
              v-model="typeFilter"
              :items="typeOptions"
              value-key="value"
              class="w-40"
            />
          </template>
          <template #right>
            <UInput
              v-model="searchQuery"
              placeholder="Search memories..."
              icon="i-lucide-search"
              class="w-64"
            />
          </template>
        </UDashboardToolbar>
      </template>

      <template #body>
        <div class="p-4">
          <!-- Loading -->
          <div
            v-if="loading"
            class="space-y-3"
          >
            <USkeleton
              v-for="i in 10"
              :key="i"
              class="h-12 w-full"
            />
          </div>

          <!-- Empty state -->
          <div
            v-else-if="memories.length === 0"
            class="flex flex-col items-center justify-center h-64 text-neutral-500"
          >
            <UIcon
              name="i-lucide-brain"
              class="w-12 h-12 mb-4"
            />
            <p class="text-lg font-medium">
              No memories yet
            </p>
            <p class="text-sm text-center max-w-md mt-2">
              Memories are automatically extracted from your Claude conversations.
              They will appear here once extraction hooks are triggered.
            </p>
          </div>

          <!-- Table -->
          <UTable
            v-else
            :data="memories"
            :columns="columns"
          >
            <template #chunkType-cell="{ row }">
              <UBadge
                :color="getTypeColor(row.original.chunkType)"
                variant="subtle"
                size="sm"
              >
                <UIcon
                  :name="getTypeIcon(row.original.chunkType)"
                  class="w-3 h-3 mr-1"
                />
                {{ row.original.chunkType }}
              </UBadge>
            </template>

            <template #content-cell="{ row }">
              <span
                class="text-sm line-clamp-2"
                :title="row.original.content"
              >
                {{ row.original.content }}
              </span>
            </template>

            <template #relevanceScore-cell="{ row }">
              <div class="flex items-center gap-2">
                <div class="w-16 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-primary-500 rounded-full"
                    :style="{ width: `${row.original.relevanceScore * 100}%` }"
                  />
                </div>
                <span class="text-xs text-muted">
                  {{ (row.original.relevanceScore * 100).toFixed(0) }}%
                </span>
              </div>
            </template>

            <template #accessCount-cell="{ row }">
              <span class="text-sm text-muted">
                {{ row.original.accessCount }}x
              </span>
            </template>

            <template #createdAt-cell="{ row }">
              <span class="text-sm text-muted">
                {{ formatTime(row.original.createdAt) }}
              </span>
            </template>

            <template #actions-cell="{ row }">
              <UDropdownMenu :items="getRowMenuItems(row.original.id)">
                <UButton
                  icon="i-lucide-more-horizontal"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </UDropdownMenu>
            </template>
          </UTable>
        </div>
      </template>
    </UDashboardPanel>

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-model:open="showDeleteModal"
      title="Delete Memory"
      description="Are you sure you want to delete this memory? This action cannot be undone."
      confirm-label="Delete"
      confirm-color="error"
      icon="i-lucide-trash-2"
      :loading="deleteLoading"
      @confirm="handleDeleteConfirm"
      @cancel="memoryToDelete = null"
    />
  </div>
</template>
