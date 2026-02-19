<script setup lang="ts">
import type { TreeItem } from '~/composables/useFileTree'
import type { SkillFile } from '~~/shared/types'

const props = defineProps<{
  skillName: string
  files: SkillFile[]
  selectedPath?: string
}>()

const emit = defineEmits<{
  select: [path: string]
  refresh: []
}>()

const toast = useToast()

// Convert SkillFile[] to TreeItem[] for UTree
function toTreeItems(files: SkillFile[], parentPath = ''): TreeItem[] {
  return files.map((f) => {
    const fullPath = parentPath ? `${parentPath}/${f.path}` : f.path
    const item: TreeItem = {
      id: fullPath,
      label: f.name,
      path: fullPath,
      type: f.type,
      defaultExpanded: true
    }
    if (f.type === 'directory') {
      item.children = f.children ? toTreeItems(f.children, fullPath) : []
    } else {
      if (f.name.endsWith('.py')) item.icon = 'i-lucide-file-code'
      else if (f.name.endsWith('.md')) item.icon = 'i-lucide-file-text'
      else if (f.name.endsWith('.json')) item.icon = 'i-lucide-file-json'
      else item.icon = 'i-lucide-file'
    }
    return item
  })
}

const treeItems = computed(() => toTreeItems(props.files))

const contextMenuTarget = ref<TreeItem | null>(null)
const showNewFileModal = ref(false)
const showNewFolderModal = ref(false)
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
    label: 'Delete',
    icon: 'i-lucide-trash-2',
    color: 'error' as const,
    onSelect: () => {
      if (contextMenuTarget.value && contextMenuTarget.value.label !== 'SKILL.md')
        showDeleteConfirm.value = true
    }
  }]
])

function handleSelect(_e: unknown, item: TreeItem) {
  if (item.type === 'file') {
    emit('select', item.path)
  }
}

async function handleCreateFile() {
  if (!newItemName.value.trim()) return

  let filename = newItemName.value.trim()
  if (!filename.includes('.')) filename += '.py'

  const parentPath = contextMenuTarget.value?.type === 'directory'
    ? contextMenuTarget.value.path
    : ''

  const filePath = parentPath ? `${parentPath}/${filename}` : filename

  try {
    await $fetch(`/api/skills/${props.skillName}/files/create`, {
      method: 'POST',
      body: { path: filePath, type: 'file' }
    })
    emit('refresh')
    emit('select', filePath)
    toast.add({ title: `Created ${filename}`, color: 'success' })
  } catch {
    toast.add({ title: 'Failed to create file', color: 'error' })
  }

  showNewFileModal.value = false
  newItemName.value = ''
}

async function handleCreateFolder() {
  if (!newItemName.value.trim()) return

  const folderName = newItemName.value.trim()
  const parentPath = contextMenuTarget.value?.type === 'directory'
    ? contextMenuTarget.value.path
    : ''

  const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName

  try {
    await $fetch(`/api/skills/${props.skillName}/files/create`, {
      method: 'POST',
      body: { path: folderPath, type: 'directory' }
    })
    emit('refresh')
    toast.add({ title: `Created ${folderName}/`, color: 'success' })
  } catch {
    toast.add({ title: 'Failed to create folder', color: 'error' })
  }

  showNewFolderModal.value = false
  newItemName.value = ''
}

async function handleDelete() {
  if (!contextMenuTarget.value) return

  try {
    await $fetch(`/api/skills/${props.skillName}/files/delete`, {
      method: 'POST',
      body: { path: contextMenuTarget.value.path }
    })
    emit('refresh')
    toast.add({ title: `Deleted ${contextMenuTarget.value.label}`, color: 'success' })
  } catch {
    toast.add({ title: 'Failed to delete', color: 'error' })
  }

  showDeleteConfirm.value = false
}
</script>

<template>
  <div class="h-full flex flex-col">
    <UContextMenu
      :items="contextMenuItems"
    >
      <div
        class="flex-1 h-full overflow-auto p-2"
        @contextmenu.self="contextMenuTarget = null"
      >
        <div
          v-if="files.length === 0"
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
          :items="treeItems"
          :get-key="(item: TreeItem) => item.id"
          color="primary"
          expanded-icon="i-lucide-folder-open"
          collapsed-icon="i-lucide-folder"
          @select="handleSelect"
        >
          <template #item="{ item, expanded }">
            <div
              class="flex items-center gap-2 w-full"
              @contextmenu="contextMenuTarget = item"
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
      </div>
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
            placeholder="filename.py"
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
