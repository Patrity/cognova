<script setup lang="ts">
import type { Project } from '~~/shared/types'

const props = defineProps<{
  modelValue?: string | null
  projects: Project[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const NONE_VALUE = '__none__'

const selectedId = computed({
  get: () => props.modelValue || NONE_VALUE,
  set: value => emit('update:modelValue', value === NONE_VALUE ? null : value)
})

const options = computed(() => [
  { value: NONE_VALUE, label: 'No Project' },
  ...props.projects
    .filter(p => !p.deletedAt)
    .map(p => ({ value: p.id, label: p.name }))
])
</script>

<template>
  <USelect
    v-model="selectedId"
    :items="options"
    value-key="value"
    class="w-full"
  />
</template>
