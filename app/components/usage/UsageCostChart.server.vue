<script setup lang="ts">
defineProps<{
  data?: unknown[]
  title?: string
  granularity?: string
}>()
</script>

<template>
  <UCard :ui="{ body: '!p-0' }">
    <template
      v-if="title"
      #header
    >
      <p class="text-sm font-medium">
        {{ title }}
      </p>
    </template>

    <div class="h-64 bg-muted/5 rounded animate-pulse" />
  </UCard>
</template>
