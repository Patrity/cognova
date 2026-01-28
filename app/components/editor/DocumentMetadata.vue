<script setup lang="ts">
import type { DocumentMetadata } from '~~/shared/types'

const props = defineProps<{
  metadata: DocumentMetadata
  projects: Array<{ id: string, name: string, color: string }>
}>()

const emit = defineEmits<{
  'update:metadata': [updates: Partial<DocumentMetadata>]
}>()

// Visibility options with descriptions
const visibilityOptions = [
  {
    label: 'Hidden',
    value: 'hidden',
    icon: 'i-lucide-lock',
    description: 'Hidden behind authentication and never viewable by the public'
  },
  {
    label: 'Private',
    value: 'private',
    icon: 'i-lucide-eye-off',
    description: 'Viewable by anyone with the link, but will not be indexed by search engines'
  },
  {
    label: 'Public',
    value: 'public',
    icon: 'i-lucide-eye',
    description: 'Viewable to the public and indexed by search engines'
  }
]

// Computed visibility value from shared/shareType
const visibility = computed(() => {
  if (!props.metadata.shared) return 'hidden'
  return props.metadata.shareType || 'private'
})

const selectedVisibility = computed(() =>
  visibilityOptions.find(o => o.value === visibility.value)
)

// Local tags model for UInputTags
const localTags = computed({
  get: () => props.metadata.tags || [],
  set: (value: string[]) => emit('update:metadata', { tags: value })
})

function handleProjectChange(projectId: string | undefined) {
  emit('update:metadata', { projectId: projectId || undefined })
}

function handleVisibilityChange(value: string) {
  if (value === 'hidden') {
    emit('update:metadata', { shared: false, shareType: undefined })
  } else {
    emit('update:metadata', { shared: true, shareType: value as 'public' | 'private' })
  }
}

const projectOptions = computed(() => [
  { label: 'None', value: undefined },
  ...props.projects.map(p => ({ label: p.name, value: p.id }))
])
</script>

<template>
  <div class="border-b border-default px-4 py-3 bg-elevated/50">
    <div class="flex flex-wrap items-start gap-3">
      <!-- Project -->
      <UFormField
        label="Project"
        class="w-40"
      >
        <USelectMenu
          :model-value="metadata.projectId"
          :items="projectOptions"
          value-key="value"
          placeholder="None"
          class="w-full"
          :search-input="false"
          @update:model-value="handleProjectChange"
        />
      </UFormField>

      <!-- Visibility -->
      <UFormField
        label="Visibility"
        class="w-44"
      >
        <USelectMenu
          :model-value="visibility"
          :items="visibilityOptions"
          value-key="value"
          class="w-full"
          :search-input="false"
          @update:model-value="handleVisibilityChange"
        >
          <template #leading>
            <UIcon
              v-if="selectedVisibility"
              :name="selectedVisibility.icon"
              class="size-4 text-dimmed"
            />
          </template>
          <template #item="{ item }">
            <div class="flex items-start gap-2 py-0.5">
              <UIcon
                :name="item.icon"
                class="size-4 mt-0.5 shrink-0"
              />
              <div class="min-w-0">
                <div class="font-medium">
                  {{ item.label }}
                </div>
                <div class="text-xs text-dimmed truncate">
                  {{ item.description }}
                </div>
              </div>
            </div>
          </template>
        </USelectMenu>
      </UFormField>

      <!-- Tags -->
      <UFormField
        label="Tags"
        class="flex-1 min-w-48"
      >
        <UInputTags
          v-model="localTags"
          placeholder="Add tags..."
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
