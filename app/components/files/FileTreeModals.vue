<script setup lang="ts">
import type { TreeItem } from '~/composables/useFileTree'

const showNewFile = defineModel<boolean>('showNewFile', { required: true })
const showNewFolder = defineModel<boolean>('showNewFolder', { required: true })
const showRename = defineModel<boolean>('showRename', { required: true })
const showDelete = defineModel<boolean>('showDelete', { required: true })

const props = defineProps<{
  contextTarget: TreeItem | null
}>()

const emit = defineEmits<{
  createFile: [name: string]
  createFolder: [name: string]
  rename: [name: string]
  delete: []
}>()

const newItemName = ref('')

// Pre-fill name when rename opens
watch(showRename, (open) => {
  if (open && props.contextTarget)
    newItemName.value = props.contextTarget.label
})

// Clear name when new file/folder opens
watch(showNewFile, (open) => {
  if (open) newItemName.value = ''
})
watch(showNewFolder, (open) => {
  if (open) newItemName.value = ''
})

function handleCreateFile() {
  if (!newItemName.value.trim()) return
  emit('createFile', newItemName.value.trim())
  showNewFile.value = false
  newItemName.value = ''
}

function handleCreateFolder() {
  if (!newItemName.value.trim()) return
  emit('createFolder', newItemName.value.trim())
  showNewFolder.value = false
  newItemName.value = ''
}

function handleRename() {
  if (!newItemName.value.trim()) return
  emit('rename', newItemName.value.trim())
  showRename.value = false
  newItemName.value = ''
}

function handleDelete() {
  emit('delete')
  showDelete.value = false
}
</script>

<template>
  <!-- New File Modal -->
  <UModal v-model:open="showNewFile">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-plus"
              class="size-5"
            />
            <span class="font-semibold">New File</span>
          </div>
        </template>

        <UInput
          v-model="newItemName"
          placeholder="filename.md"
          autofocus
          @keyup.enter="handleCreateFile"
        />

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showNewFile = false"
            >
              Cancel
            </UButton>
            <UButton @click="handleCreateFile">
              Create
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- New Folder Modal -->
  <UModal v-model:open="showNewFolder">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-folder-plus"
              class="size-5"
            />
            <span class="font-semibold">New Folder</span>
          </div>
        </template>

        <UInput
          v-model="newItemName"
          placeholder="folder-name"
          autofocus
          @keyup.enter="handleCreateFolder"
        />

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showNewFolder = false"
            >
              Cancel
            </UButton>
            <UButton @click="handleCreateFolder">
              Create
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- Rename Modal -->
  <UModal v-model:open="showRename">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-pencil"
              class="size-5"
            />
            <span class="font-semibold">Rename</span>
          </div>
        </template>

        <UInput
          v-model="newItemName"
          placeholder="new-name"
          autofocus
          @keyup.enter="handleRename"
        />

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showRename = false"
            >
              Cancel
            </UButton>
            <UButton @click="handleRename">
              Rename
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>

  <!-- Delete Confirmation -->
  <UModal v-model:open="showDelete">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-2 text-error">
            <UIcon
              name="i-lucide-trash-2"
              class="size-5"
            />
            <span class="font-semibold">Delete</span>
          </div>
        </template>

        <p>
          Are you sure you want to delete
          <strong>{{ contextTarget?.label }}</strong>?
        </p>
        <p
          v-if="contextTarget?.type === 'directory'"
          class="text-sm text-dimmed mt-1"
        >
          This will delete all files and folders inside.
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showDelete = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              @click="handleDelete"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
