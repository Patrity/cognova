<script setup lang="ts">
const props = defineProps<{
  toolName: string
  result?: string
  isError?: boolean
  pending?: boolean
}>()

const iconMap: Record<string, string> = {
  getWeather: 'i-lucide-cloud-sun',
  Read: 'i-lucide-file-text',
  Edit: 'i-lucide-pencil',
  Write: 'i-lucide-file-plus',
  Bash: 'i-lucide-terminal',
  Glob: 'i-lucide-search',
  Grep: 'i-lucide-text-search',
  Task: 'i-lucide-git-branch',
  WebFetch: 'i-lucide-globe',
  WebSearch: 'i-lucide-search'
}

const icon = computed(() => iconMap[props.toolName] || 'i-lucide-wrench')

// Parse JSON result into key-value entries for display
interface ResultEntry {
  key: string
  value: string
}

const parsedEntries = computed<ResultEntry[] | null>(() => {
  if (!props.result) return null
  try {
    const obj = JSON.parse(props.result)
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      return Object.entries(obj).map(([key, val]) => ({
        key: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
        value: typeof val === 'object' ? JSON.stringify(val) : String(val)
      }))
    }
  } catch {
    // not JSON
  }
  return null
})

const rawResult = computed(() => {
  if (!props.result) return ''
  return props.result.length > 500 ? props.result.slice(0, 500) + '...' : props.result
})
</script>

<template>
  <UCollapsible class="my-2">
    <UButton
      variant="soft"
      color="neutral"
      size="sm"
      block
      class="justify-start"
      :ui="{ trailingIcon: 'ms-auto' }"
      trailing-icon="i-lucide-chevron-down"
    >
      <template #leading>
        <UIcon
          v-if="pending"
          name="i-lucide-loader-2"
          class="size-4 animate-spin text-primary"
        />
        <UIcon
          v-else
          :name="icon"
          class="size-4"
        />
      </template>
      <span class="font-mono text-xs">{{ toolName }}</span>
      <UBadge
        v-if="isError"
        color="error"
        variant="subtle"
        size="xs"
      >
        error
      </UBadge>
      <UBadge
        v-else-if="pending"
        color="warning"
        variant="subtle"
        size="xs"
      >
        running
      </UBadge>
    </UButton>

    <template #content>
      <div
        v-if="result"
        class="mt-1 rounded-md border border-default bg-elevated/25 overflow-hidden"
      >
        <!-- Formatted key-value display for JSON objects -->
        <div
          v-if="parsedEntries"
          class="divide-y divide-default"
        >
          <div
            v-for="entry in parsedEntries"
            :key="entry.key"
            class="flex items-baseline gap-3 px-3 py-1.5 text-xs"
          >
            <span class="text-dimmed whitespace-nowrap">{{ entry.key }}</span>
            <span class="text-highlighted ml-auto text-right">{{ entry.value }}</span>
          </div>
        </div>

        <!-- Raw text fallback for non-JSON -->
        <div
          v-else
          class="px-3 py-2 text-xs font-mono max-h-64 overflow-auto whitespace-pre-wrap"
          :class="{ 'text-error': isError }"
        >
          {{ rawResult }}
        </div>
      </div>
    </template>
  </UCollapsible>
</template>
