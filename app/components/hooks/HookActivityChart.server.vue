<script setup lang="ts">
import type { HookDailyData } from '~~/shared/types'

defineProps<{
  data: HookDailyData[]
  title?: string
  height?: string
}>()
</script>

<template>
  <UCard>
    <template
      v-if="title"
      #header
    >
      <p class="text-sm font-medium">
        {{ title }}
      </p>
    </template>
    <div class="flex items-center justify-center h-48 text-muted">
      <USkeleton class="w-full h-full" />
    </div>
  </UCard>
</template>
