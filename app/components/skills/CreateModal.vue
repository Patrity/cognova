<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': [name: string]
}>()

const router = useRouter()
const toast = useToast()

const mode = ref<'blank' | 'generate'>('blank')
const name = ref('')
const description = ref('')
const loading = ref(false)

function resetForm() {
  mode.value = 'blank'
  name.value = ''
  description.value = ''
  loading.value = false
}

function close() {
  emit('update:open', false)
  resetForm()
}

async function handleCreate() {
  if (!name.value.trim()) return

  loading.value = true
  try {
    if (mode.value === 'blank') {
      await $fetch('/api/skills/create', {
        method: 'POST',
        body: { name: name.value.trim(), description: description.value.trim() || undefined }
      })
      toast.add({ title: `Skill '${name.value}' created`, color: 'success' })
      emit('created', name.value.trim())
      close()
      router.push(`/skills/${name.value.trim()}`)
    } else {
      if (!description.value.trim()) {
        toast.add({ title: 'Description is required for AI generation', color: 'warning' })
        loading.value = false
        return
      }
      const res = await $fetch<{ data: { name: string, costUsd: number } }>('/api/skills/generate', {
        method: 'POST',
        body: { name: name.value.trim(), description: description.value.trim() }
      })
      toast.add({
        title: `Skill '${name.value}' generated`,
        description: `Cost: $${res.data.costUsd.toFixed(4)} — created in inactive state for review`,
        color: 'success'
      })
      emit('created', name.value.trim())
      close()
      router.push(`/skills/${name.value.trim()}`)
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to create skill'
    toast.add({ title: message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    :open="props.open"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <span class="font-semibold">Create Skill</span>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="flex gap-2">
          <UButton
            :variant="mode === 'blank' ? 'solid' : 'outline'"
            color="neutral"
            size="sm"
            icon="i-lucide-file-plus"
            @click="mode = 'blank'"
          >
            Blank Skill
          </UButton>
          <UButton
            :variant="mode === 'generate' ? 'solid' : 'outline'"
            color="neutral"
            size="sm"
            icon="i-lucide-sparkles"
            @click="mode = 'generate'"
          >
            AI Generate
          </UButton>
        </div>

        <UFormField label="Name">
          <UInput
            v-model="name"
            placeholder="my-skill"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Description"
          :required="mode === 'generate'"
        >
          <UTextarea
            v-model="description"
            :placeholder="mode === 'generate' ? 'Describe what this skill should do...' : 'Optional description'"
            :rows="3"
            :disabled="loading"
            class="w-full"
          />
        </UFormField>

        <p
          v-if="mode === 'generate'"
          class="text-xs text-muted"
        >
          AI-generated skills are created in an inactive state so you can review them before enabling.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          :disabled="loading"
          @click="close"
        >
          Cancel
        </UButton>
        <UButton
          :loading="loading"
          :disabled="!name.trim()"
          @click="handleCreate"
        >
          {{ mode === 'generate' ? 'Generate' : 'Create' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
