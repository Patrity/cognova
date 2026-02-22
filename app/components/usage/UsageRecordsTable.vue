<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { useDebounceFn } from '@vueuse/core'
import type { TokenUsageSource, TokenUsageRecord, StatsPeriod } from '~~/shared/types'

const props = defineProps<{
  period: StatsPeriod
}>()

const sourceLabels: Record<TokenUsageSource, string> = {
  chat: 'Chat',
  agent: 'Agent',
  memory_extraction: 'Memory',
  bridge: 'Bridge'
}

const sourceColors = {
  chat: 'primary',
  agent: 'warning',
  memory_extraction: 'info',
  bridge: 'success'
} as const

// Filter state
const ALL_VALUE = '__all__'
const sourceFilter = ref(ALL_VALUE)
const searchQuery = ref('')
const page = ref(1)
const limit = 20

// Data state
const records = ref<TokenUsageRecord[]>([])
const total = ref(0)
const totalPages = ref(0)
const loading = ref(false)

const sourceOptions = [
  { value: ALL_VALUE, label: 'All Sources' },
  { value: 'chat', label: 'Chat' },
  { value: 'agent', label: 'Agents' },
  { value: 'memory_extraction', label: 'Memory' }
]

const columns = [
  { accessorKey: 'source', header: 'Source' },
  { accessorKey: 'sourceName', header: 'Name' },
  { accessorKey: 'inputTokens', header: 'Input' },
  { accessorKey: 'outputTokens', header: 'Output' },
  { accessorKey: 'costUsd', header: 'Cost' },
  { accessorKey: 'durationMs', header: 'Duration' },
  { accessorKey: 'createdAt', header: 'Time' }
]

async function fetchRecords() {
  loading.value = true
  try {
    const query: Record<string, string | number> = {
      period: props.period,
      page: page.value,
      limit
    }
    if (sourceFilter.value !== ALL_VALUE)
      query.source = sourceFilter.value
    if (searchQuery.value.trim())
      query.search = searchQuery.value.trim()

    const res = await $fetch<{
      data: TokenUsageRecord[]
      pagination: { page: number, total: number, totalPages: number }
    }>('/api/usage', { query })

    records.value = res.data
    total.value = res.pagination.total
    totalPages.value = res.pagination.totalPages
  } catch {
    // Silently fail
  } finally {
    loading.value = false
  }
}

// Debounced search
const debouncedFetch = useDebounceFn(() => {
  page.value = 1
  fetchRecords()
}, 300)

watch(sourceFilter, () => {
  page.value = 1
  fetchRecords()
})

watch(searchQuery, debouncedFetch)

watch(page, fetchRecords)

watch(() => props.period, () => {
  page.value = 1
  fetchRecords()
})

function formatCost(value: number): string {
  if (value < 0.0001 && value > 0) return '<$0.0001'
  return `$${value.toFixed(4)}`
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function formatDuration(ms?: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function formatTime(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

onMounted(fetchRecords)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium">
            Usage Records
          </p>
          <UBadge
            v-if="total > 0"
            color="neutral"
            variant="subtle"
          >
            {{ total }}
          </UBadge>
        </div>

        <div class="flex items-center gap-2">
          <USelect
            v-model="sourceFilter"
            :items="sourceOptions"
            value-key="value"
            class="w-36"
            size="sm"
          />
          <UInput
            v-model="searchQuery"
            placeholder="Search name..."
            icon="i-lucide-search"
            class="w-48"
            size="sm"
          />
        </div>
      </div>
    </template>

    <div v-if="loading && records.length === 0">
      <USkeleton
        v-for="i in 5"
        :key="i"
        class="h-10 w-full mb-2"
      />
    </div>

    <div
      v-else-if="records.length === 0"
      class="flex flex-col items-center justify-center h-32 text-muted"
    >
      <p class="text-sm">
        No records found
      </p>
    </div>

    <UTable
      v-else
      :data="records"
      :columns="columns"
      :loading="loading"
    >
      <template #source-cell="{ row }">
        <UBadge
          :color="sourceColors[row.original.source as TokenUsageSource]"
          variant="subtle"
          size="sm"
        >
          {{ sourceLabels[row.original.source as TokenUsageSource] || row.original.source }}
        </UBadge>
      </template>

      <template #sourceName-cell="{ row }">
        <span
          class="text-sm truncate max-w-48 inline-block"
          :title="row.original.sourceName"
        >
          {{ row.original.sourceName || '-' }}
        </span>
      </template>

      <template #inputTokens-cell="{ row }">
        <span class="text-sm text-muted">
          {{ formatTokenCount(row.original.inputTokens) }}
        </span>
      </template>

      <template #outputTokens-cell="{ row }">
        <span class="text-sm text-muted">
          {{ formatTokenCount(row.original.outputTokens) }}
        </span>
      </template>

      <template #costUsd-cell="{ row }">
        <span class="text-sm font-medium">
          {{ formatCost(row.original.costUsd) }}
        </span>
      </template>

      <template #durationMs-cell="{ row }">
        <span class="text-sm text-muted">
          {{ formatDuration(row.original.durationMs) }}
        </span>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">
          {{ formatTime(row.original.createdAt) }}
        </span>
      </template>
    </UTable>

    <template
      v-if="totalPages > 1"
      #footer
    >
      <div class="flex justify-center">
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="limit"
          :sibling-count="1"
          show-edges
        />
      </div>
    </template>
  </UCard>
</template>
