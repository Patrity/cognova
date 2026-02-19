<script setup lang="ts">
import type { SkillCatalogItem } from '~~/shared/types'

defineProps<{
  skill: SkillCatalogItem
}>()

const emit = defineEmits<{
  install: [name: string]
  update: [name: string]
}>()
</script>

<template>
  <div class="p-4 rounded-lg border border-default bg-elevated/50 hover:bg-elevated transition-colors">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon
          name="i-lucide-puzzle"
          class="size-4 shrink-0 text-primary"
        />
        <span class="font-medium truncate">{{ skill.name }}</span>
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        <UBadge
          v-if="skill.installed && !skill.hasUpdate"
          variant="subtle"
          color="success"
          size="xs"
        >
          Installed
        </UBadge>
        <UBadge
          v-if="skill.hasUpdate"
          variant="subtle"
          color="warning"
          size="xs"
        >
          Update available
        </UBadge>
        <UBadge
          variant="subtle"
          color="neutral"
          size="xs"
        >
          v{{ skill.version }}
        </UBadge>
      </div>
    </div>

    <p class="text-sm text-muted line-clamp-2 mb-3">
      {{ skill.description }}
    </p>

    <div
      v-if="skill.tags.length > 0"
      class="flex flex-wrap gap-1 mb-3"
    >
      <UBadge
        v-for="tag in skill.tags"
        :key="tag"
        variant="subtle"
        :color="tag === 'official' ? 'primary' : 'neutral'"
        size="xs"
      >
        {{ tag }}
      </UBadge>
    </div>

    <div
      v-if="skill.requiresSecrets.length > 0"
      class="flex items-center gap-1 mb-3 text-xs text-dimmed"
    >
      <UIcon
        name="i-lucide-key-round"
        class="size-3 shrink-0"
      />
      <span>Requires: {{ skill.requiresSecrets.join(', ') }}</span>
    </div>

    <div class="flex items-center justify-between">
      <span
        v-if="skill.author"
        class="text-xs text-dimmed"
      >
        by {{ skill.author }}
      </span>
      <span v-else />

      <div class="flex items-center gap-1.5">
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="i-lucide-external-link"
          :to="`https://github.com/Patrity/cognova-skills/tree/main/${skill.name}`"
          target="_blank"
        >
          View
        </UButton>
        <UButton
          v-if="!skill.installed"
          size="xs"
          icon="i-lucide-download"
          @click="emit('install', skill.name)"
        >
          Install
        </UButton>
        <UButton
          v-else-if="skill.hasUpdate"
          size="xs"
          color="warning"
          variant="soft"
          icon="i-lucide-refresh-cw"
          @click="emit('update', skill.name)"
        >
          Update
        </UButton>
      </div>
    </div>
  </div>
</template>
