<script setup lang="ts">
const props = defineProps<{
  open: boolean
  currentName: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'renamed': [newName: string]
}>()

const toast = useToast()
const newName = ref(props.currentName)
const loading = ref(false)

watch(() => props.currentName, (val) => {
  newName.value = val
})

function close() {
  emit('update:open', false)
}

async function handleRename() {
  if (!newName.value.trim() || newName.value.trim() === props.currentName) return

  loading.value = true
  try {
    await $fetch(`/api/skills/${props.currentName}/rename`, {
      method: 'POST',
      body: { newName: newName.value.trim() }
    })
    toast.add({ title: `Skill renamed to '${newName.value.trim()}'`, color: 'success' })
    emit('renamed', newName.value.trim())
    close()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to rename skill'
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
      <span class="font-semibold">Rename Skill</span>
    </template>

    <template #body>
      <UFormField label="New Name">
        <UInput
          v-model="newName"
          placeholder="my-skill"
          :disabled="loading"
        />
      </UFormField>
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
          :disabled="!newName.trim() || newName.trim() === currentName"
          @click="handleRename"
        >
          Rename
        </UButton>
      </div>
    </template>
  </UModal>
</template>
