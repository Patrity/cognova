<script setup lang="ts">
const props = defineProps<{
  toolName: string
  result?: string
  isError?: boolean
  pending?: boolean
}>()

const open = ref(false)

const iconMap: Record<string, string> = {
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

const truncatedResult = computed(() => {
  if (!props.result) return ''
  return props.result.length > 500 ? props.result.slice(0, 500) + '...' : props.result
})
</script>

<template>
  <div class="border border-default rounded-lg my-2 overflow-hidden">
    <button
      class="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted hover:bg-elevated/50 transition-colors"
      @click="open = !open"
    >
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
      <UIcon
        :name="open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        class="size-4 ms-auto"
      />
    </button>
    <div
      v-if="open && result"
      class="border-t border-default px-3 py-2 text-xs font-mono bg-elevated/25 max-h-64 overflow-auto whitespace-pre-wrap"
      :class="{ 'text-error': isError }"
    >
      {{ truncatedResult }}
    </div>
  </div>
</template>
