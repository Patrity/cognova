<script setup lang="ts">
interface SchemaProperty {
  'type': string
  'title'?: string
  'description'?: string
  'format'?: string
  'default'?: unknown
  'enum'?: string[]
  'x-cognova-group'?: string
}

interface FlatJsonSchema {
  type: string
  properties: Record<string, SchemaProperty>
  required?: string[]
}

interface FormField {
  key: string
  label: string
  description?: string
  inputType: 'text' | 'password' | 'number' | 'boolean' | 'select'
  required: boolean
  defaultValue: unknown
  isPassword: boolean
  options?: { label: string, value: string }[]
  group?: string
}

const props = defineProps<{
  schema: FlatJsonSchema | null
  modelValue: Record<string, unknown>
  editing?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

const fields = computed<FormField[]>(() => {
  if (!props.schema?.properties)
    return []
  return Object.entries(props.schema.properties).map(([key, schemaDef]) => {
    let inputType: FormField['inputType'] = 'text'
    if (schemaDef.format === 'password') inputType = 'password'
    else if (schemaDef.type === 'number' || schemaDef.type === 'integer') inputType = 'number'
    else if (schemaDef.type === 'boolean') inputType = 'boolean'
    else if (schemaDef.enum) inputType = 'select'

    return {
      key,
      label: schemaDef.title || key,
      description: schemaDef.description,
      inputType,
      required: props.schema?.required?.includes(key) ?? false,
      defaultValue: schemaDef.default,
      isPassword: schemaDef.format === 'password',
      options: schemaDef.enum?.map(v => ({ label: v, value: v })),
      group: schemaDef['x-cognova-group']
    }
  })
})

// Group fields by x-cognova-group
const groupedFields = computed(() => {
  const groups: { label: string | null, fields: FormField[] }[] = []
  let currentGroup: string | null = null

  for (const field of fields.value) {
    const group = field.group || null
    if (group !== currentGroup) {
      groups.push({ label: group, fields: [field] })
      currentGroup = group
    } else {
      groups[groups.length - 1]!.fields.push(field)
    }
  }

  return groups
})

function updateField(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template
      v-for="group in groupedFields"
      :key="group.label"
    >
      <h4
        v-if="group.label"
        class="text-sm font-semibold text-muted mt-2"
      >
        {{ group.label }}
      </h4>

      <div
        v-for="field in group.fields"
        :key="field.key"
      >
        <label class="block text-sm font-medium mb-1">
          {{ field.label }}
          <span
            v-if="field.required"
            class="text-error"
          >*</span>
        </label>
        <p
          v-if="field.description"
          class="text-xs text-muted mb-1"
        >
          {{ field.description }}
        </p>

        <!-- Boolean: USwitch -->
        <USwitch
          v-if="field.inputType === 'boolean'"
          :model-value="!!modelValue[field.key]"
          @update:model-value="updateField(field.key, $event)"
        />

        <!-- Enum: USelect -->
        <USelect
          v-else-if="field.inputType === 'select'"
          :model-value="(modelValue[field.key] as string) || ''"
          :items="field.options || []"
          class="w-full"
          @update:model-value="updateField(field.key, $event)"
        />

        <!-- Number -->
        <UInput
          v-else-if="field.inputType === 'number'"
          :model-value="(modelValue[field.key] as number) ?? (field.defaultValue as number) ?? ''"
          type="number"
          class="w-full"
          @update:model-value="updateField(field.key, Number($event))"
        />

        <!-- Text / Password -->
        <UInput
          v-else
          :model-value="(modelValue[field.key] as string) || ''"
          :type="field.inputType"
          :placeholder="editing && field.isPassword ? 'Leave blank to keep current' : (field.defaultValue as string) || ''"
          autocomplete="off"
          data-lpignore="true"
          data-1p-ignore
          class="w-full"
          @update:model-value="updateField(field.key, $event)"
        />
      </div>
    </template>
  </div>
</template>
