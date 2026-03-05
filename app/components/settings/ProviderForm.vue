<script setup lang="ts">
interface SchemaProperty {
  type: string
  title?: string
  format?: string
  default?: unknown
}

interface FlatJsonSchema {
  type: string
  properties: Record<string, SchemaProperty>
  required?: string[]
}

const props = defineProps<{
  schema: FlatJsonSchema | null
  modelValue: Record<string, unknown>
  editing?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const fields = computed(() => {
  if (!props.schema?.properties)
    return []
  return Object.entries(props.schema.properties).map(([key, schemaDef]) => ({
    key,
    label: schemaDef.title || key,
    type: schemaDef.format === 'password' ? 'password' : 'text',
    required: props.schema?.required?.includes(key) ?? false,
    defaultValue: schemaDef.default,
    isPassword: schemaDef.format === 'password'
  }))
})

function updateField(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="field in fields"
      :key="field.key"
    >
      <label class="block text-sm font-medium mb-1">
        {{ field.label }}
        <span
          v-if="field.required"
          class="text-error"
        >*</span>
      </label>
      <UInput
        :model-value="(modelValue[field.key] as string) || ''"
        :type="field.type"
        :placeholder="editing && field.isPassword ? 'Leave blank to keep current' : (field.defaultValue as string) || ''"
        autocomplete="off"
        data-lpignore="true"
        data-1p-ignore
        class="w-full"
        @update:model-value="updateField(field.key, $event)"
      />
    </div>
  </div>
</template>
