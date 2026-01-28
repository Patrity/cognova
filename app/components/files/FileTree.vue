<script setup lang="ts">
import type { TreeItem } from '~/composables/useFileTree'

const emit = defineEmits<{
  select: [path: string]
}>()

const {
  filteredItems,
  selectedFile,
  loading,
  searchQuery,
  loadTree,
  createFile,
  createFolder,
  renameItem,
  deleteItem,
  moveItem
} = useFileTree()

const draggedItem = ref<TreeItem | null>(null)
const dropTarget = ref<TreeItem | null>(null)

function handleDragStart(event: DragEvent, item: TreeItem) {
  draggedItem.value = item
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.path)
  }
}

function handleDragOver(event: DragEvent, item: TreeItem) {
  if (!draggedItem.value) return
  if (item.type !== 'directory') return
  if (draggedItem.value.path === item.path) return
  // Prevent dropping a folder into itself or its children
  if (item.path.startsWith(draggedItem.value.path + '/')) return

  event.preventDefault()
  dropTarget.value = item
}

function handleDragLeave() {
  dropTarget.value = null
}

function handleDragEnd() {
  draggedItem.value = null
  dropTarget.value = null
}

async function handleDrop(event: DragEvent, item: TreeItem) {
  event.preventDefault()
  if (!draggedItem.value || item.type !== 'directory') return

  try {
    await moveItem(draggedItem.value.path, item.path)
  } catch {
    // Error handled in composable
  }

  draggedItem.value = null
  dropTarget.value = null
}

const contextMenuTarget = ref<TreeItem | null>(null)
const showNewFileModal = ref(false)
const showNewFolderModal = ref(false)
const showRenameModal = ref(false)
const showDeleteConfirm = ref(false)
const newItemName = ref('')

const contextMenuItems = computed(() => [
  [{
    label: 'New File',
    icon: 'i-lucide-file-plus',
    onSelect: () => {
      newItemName.value = ''
      showNewFileModal.value = true
    }
  }, {
    label: 'New Folder',
    icon: 'i-lucide-folder-plus',
    onSelect: () => {
      newItemName.value = ''
      showNewFolderModal.value = true
    }
  }],
  [{
    label: 'Rename',
    icon: 'i-lucide-pencil',
    onSelect: () => {
      if (contextMenuTarget.value) {
        newItemName.value = contextMenuTarget.value.label
        showRenameModal.value = true
      }
    }
  }, {
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => {
      showDeleteConfirm.value = true
    }
  }]
])

function handleSelect(item: TreeItem) {
  if (item.type === 'file') {
    selectedFile.value = item.path
    emit('select', item.path)
  }
}

async function handleCreateFile() {
  if (!newItemName.value.trim()) return

  const parentPath = contextMenuTarget.value?.type === 'directory'
    ? contextMenuTarget.value.path
    : '/'

  // Add .md extension if not present
  let filename = newItemName.value.trim()
  if (!filename.includes('.')) {
    filename += '.md'
  }

  try {
    const path = await createFile(parentPath, filename)
    selectedFile.value = path
    emit('select', path)
  } catch {
    // Error handled in composable
  }

  showNewFileModal.value = false
  newItemName.value = ''
}

async function handleCreateFolder() {
  if (!newItemName.value.trim()) return

  const parentPath = contextMenuTarget.value?.type === 'directory'
    ? contextMenuTarget.value.path
    : '/'

  try {
    await createFolder(parentPath, newItemName.value.trim())
  } catch {
    // Error handled in composable
  }

  showNewFolderModal.value = false
  newItemName.value = ''
}

async function handleRename() {
  if (!contextMenuTarget.value || !newItemName.value.trim()) return

  try {
    await renameItem(contextMenuTarget.value.path, newItemName.value.trim())
  } catch {
    // Error handled in composable
  }

  showRenameModal.value = false
  newItemName.value = ''
}

async function handleDelete() {
  if (!contextMenuTarget.value) return

  try {
    await deleteItem(contextMenuTarget.value.path)
  } catch {
    // Error handled in composable
  }

  showDeleteConfirm.value = false
}

onMounted(() => {
  loadTree()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="-mt-1 pb-2">
      <UInput
        v-model="searchQuery"
        placeholder="Search files..."
        icon="i-lucide-search"
        size="sm"
        class="w-full"
      />
    </div>
    <USeparator class="mt-2" />

    <UContextMenu
      :items="contextMenuItems"
      class="flex-1 h-full overflow-auto p-2"
      @contextmenu="contextMenuTarget = null"
    >
      <div
        v-if="loading"
        class="flex items-center justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-dimmed"
        />
      </div>

      <div
        v-else-if="filteredItems.length === 0"
        class="h-full min-h-32 flex flex-col items-center justify-center text-dimmed text-sm"
      >
        <UIcon
          name="i-lucide-folder-open"
          class="size-8 mx-auto mb-2 opacity-50"
        />
        <p>No files found</p>
        <p class="text-xs mt-1">
          Right-click to create a file
        </p>
      </div>

      <UTree
        v-else
        :items="filteredItems"
        :get-key="(item: TreeItem) => item.id"
        color="primary"
        expanded-icon="i-lucide-folder-open"
        collapsed-icon="i-lucide-folder"
        @select="(_e: unknown, item: TreeItem) => handleSelect(item)"
      >
        <template #item="{ item, expanded }">
          <div
            class="flex items-center gap-2 w-full"
            :class="{
              'bg-primary/10 rounded': dropTarget?.path === item.path
            }"
            draggable="true"
            @contextmenu="contextMenuTarget = item"
            @dragstart="handleDragStart($event, item)"
            @dragover="handleDragOver($event, item)"
            @dragleave="handleDragLeave"
            @dragend="handleDragEnd"
            @drop="handleDrop($event, item)"
          >
            <UIcon
              v-if="item.children?.length"
              :name="expanded ? 'i-lucide-folder-open' : 'i-lucide-folder'"
              class="size-4 shrink-0 text-dimmed"
            />
            <UIcon
              v-else-if="item.icon"
              :name="item.icon"
              class="size-4 shrink-0 text-dimmed"
            />
            <UIcon
              v-else
              name="i-lucide-file"
              class="size-4 shrink-0 text-dimmed"
            />
            <span class="truncate">{{ item.label }}</span>
          </div>
        </template>
      </UTree>
    </UContextMenu>

    <!-- New File Modal -->
    <UModal v-model:open="showNewFileModal">
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
                @click="showNewFileModal = false"
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
    <UModal v-model:open="showNewFolderModal">
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
                @click="showNewFolderModal = false"
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
    <UModal v-model:open="showRenameModal">
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
                @click="showRenameModal = false"
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
    <UModal v-model:open="showDeleteConfirm">
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
            <strong>{{ contextMenuTarget?.label }}</strong>?
          </p>
          <p
            v-if="contextMenuTarget?.type === 'directory'"
            class="text-sm text-dimmed mt-1"
          >
            This will delete all files and folders inside.
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="showDeleteConfirm = false"
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
  </div>
</template>
