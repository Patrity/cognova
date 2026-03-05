<script setup lang="ts">
import type { InstalledAgent } from '~~/shared/types'

const props = defineProps<{
  agents: InstalledAgent[]
  modelValue: string | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const items = computed(() => props.agents
  .filter(a => a.enabled)
  .map(a => ({
    label: a.name,
    value: a.id
  }))
)
</script>

<template>
  <USelect
    :model-value="modelValue ?? undefined"
    :items="items"
    placeholder="Select an agent"
    icon="i-lucide-bot"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
