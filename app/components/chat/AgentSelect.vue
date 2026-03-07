<script setup lang="ts">
import type { InstalledAgent, AgentManifest } from '~~/shared/types'

const props = defineProps<{
  agents: InstalledAgent[]
  modelValue: string | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const items = computed(() => props.agents
  .filter(a => a.enabled)
  .map((a) => {
    const manifest = a.manifestJson as AgentManifest
    return {
      label: a.name,
      value: a.id,
      icon: a.builtIn ? 'i-lucide-bot' : 'i-lucide-puzzle',
      description: manifest.description
    }
  })
)

const selectedValue = computed(() => props.modelValue ?? undefined)
</script>

<template>
  <USelectMenu
    :model-value="selectedValue"
    :items="items"
    placeholder="Select an agent"
    value-key="value"
    class="w-48"
    @update:model-value="emit('update:modelValue', $event as string)"
  >
    <template #item="{ item }">
      <div class="flex items-center gap-2">
        <UIcon
          v-if="item.icon"
          :name="item.icon"
          class="size-4 shrink-0 text-dimmed"
        />
        <div class="min-w-0">
          <p class="text-sm truncate">
            {{ item.label }}
          </p>
          <p
            v-if="item.description"
            class="text-xs text-muted truncate"
          >
            {{ item.description }}
          </p>
        </div>
      </div>
    </template>
  </USelectMenu>
</template>
