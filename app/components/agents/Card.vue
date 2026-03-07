<script setup lang="ts">
import type { InstalledAgent, AgentManifest } from '~~/shared/types'

const props = defineProps<{
  agent: InstalledAgent
}>()

const emit = defineEmits<{
  toggle: [id: string, enabled: boolean]
  delete: [id: string]
}>()

const manifest = computed(() => props.agent.manifestJson as AgentManifest)
const toggling = ref(false)

async function handleToggle() {
  toggling.value = true
  emit('toggle', props.agent.id, !props.agent.enabled)
  toggling.value = false
}
</script>

<template>
  <NuxtLink
    :to="`/agents/${agent.id}`"
    class="block p-4 rounded-lg border border-default bg-elevated/50 hover:bg-elevated transition-colors"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <UIcon
            :name="agent.builtIn ? 'i-lucide-bot' : 'i-lucide-puzzle'"
            class="size-4 shrink-0 text-dimmed"
          />
          <span class="font-medium text-sm truncate">{{ agent.name }}</span>
          <UBadge
            v-if="agent.builtIn"
            variant="subtle"
            color="primary"
            size="xs"
          >
            Built-in
          </UBadge>
          <UBadge
            v-if="!agent.enabled"
            variant="subtle"
            color="neutral"
            size="xs"
          >
            Disabled
          </UBadge>
        </div>
        <p class="text-xs text-muted line-clamp-2">
          {{ manifest.description || 'No description' }}
        </p>
      </div>

      <USwitch
        v-if="!agent.builtIn"
        :model-value="agent.enabled"
        size="sm"
        :loading="toggling"
        @update:model-value="handleToggle"
        @click.prevent.stop
      />
    </div>

    <div class="flex items-center gap-2 mt-3">
      <UBadge
        v-if="manifest.version"
        variant="soft"
        color="neutral"
        size="xs"
      >
        v{{ manifest.version }}
      </UBadge>
      <UBadge
        v-if="agent.localPath"
        variant="soft"
        color="neutral"
        size="xs"
      >
        Local
      </UBadge>
      <span
        v-if="manifest.capabilities?.length"
        class="text-xs text-dimmed ml-auto"
      >
        {{ manifest.capabilities.length }} capability{{ manifest.capabilities.length !== 1 ? 'ies' : '' }}
      </span>
      <UButton
        v-if="!agent.builtIn"
        icon="i-lucide-trash"
        color="error"
        variant="soft"
        size="xs"
        @click.prevent.stop="emit('delete', agent.id)"
      />
    </div>
  </NuxtLink>
</template>
