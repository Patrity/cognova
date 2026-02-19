<script setup lang="ts">
import type { SkillListItem } from '~~/shared/types'

const props = defineProps<{
  skill: SkillListItem
}>()

const emit = defineEmits<{
  toggle: [name: string]
}>()

const toggling = ref(false)

async function handleToggle() {
  toggling.value = true
  emit('toggle', props.skill.name)
  toggling.value = false
}
</script>

<template>
  <NuxtLink
    :to="`/skills/${skill.name}`"
    class="block p-4 rounded-lg border border-default bg-elevated/50 hover:bg-elevated transition-colors"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="font-medium text-sm truncate">{{ skill.name }}</span>
          <UBadge
            v-if="skill.core"
            variant="subtle"
            color="primary"
            size="xs"
          >
            Core
          </UBadge>
          <UBadge
            v-if="!skill.active"
            variant="subtle"
            color="neutral"
            size="xs"
          >
            Disabled
          </UBadge>
        </div>
        <p class="text-xs text-muted line-clamp-2">
          {{ skill.description }}
        </p>
      </div>

      <USwitch
        v-if="!skill.core"
        :model-value="skill.active"
        size="sm"
        :loading="toggling"
        @update:model-value="handleToggle"
        @click.prevent.stop
      />
    </div>

    <div class="flex items-center gap-2 mt-3">
      <UBadge
        v-if="skill.version"
        variant="soft"
        color="neutral"
        size="xs"
      >
        v{{ skill.version }}
      </UBadge>
      <UBadge
        v-if="skill.author"
        variant="soft"
        color="neutral"
        size="xs"
      >
        {{ skill.author }}
      </UBadge>
      <span class="text-xs text-dimmed ml-auto">{{ skill.fileCount }} file{{ skill.fileCount !== 1 ? 's' : '' }}</span>
    </div>
  </NuxtLink>
</template>
