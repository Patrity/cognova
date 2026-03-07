<script setup lang="ts">
import type { FileTreeEntry, SharedDocument } from '~~/shared/types'

definePageMeta({
  middleware: 'auth'
})

const toast = useToast()
const { lastKnowledgePath } = usePreferences()
const { content, filePath, loading: editorLoading, saveStatus, isDirty, loadFile, updateContent, saveNow } = useKnowledgeEditor()

const files = ref<FileTreeEntry[]>([])
const treeLoading = ref(true)

async function loadTree() {
  treeLoading.value = true
  try {
    const res = await $fetch<{ data: FileTreeEntry[] }>('/api/knowledge/tree')
    files.value = res.data
  } catch {
    toast.add({ title: 'Failed to load knowledge files', color: 'error' })
  } finally {
    treeLoading.value = false
  }
}

function findFirstFile(entries: FileTreeEntry[]): string | null {
  for (const entry of entries) {
    if (entry.type === 'file' && entry.name.endsWith('.md'))
      return entry.path
    if (entry.type === 'directory' && entry.children) {
      const found = findFirstFile(entry.children)
      if (found) return found
    }
  }
  for (const entry of entries) {
    if (entry.type === 'file')
      return entry.path
    if (entry.type === 'directory' && entry.children) {
      const found = findFirstFile(entry.children)
      if (found) return found
    }
  }
  return null
}

async function handleSelect(path: string) {
  await loadFile(path)
  lastKnowledgePath.value = path
}

function handleRefresh() {
  loadTree()
}

// Share functionality
const showShareModal = ref(false)
const shareStatus = ref<SharedDocument | null>(null)
const shareLoading = ref(false)

async function handleShare() {
  if (!filePath.value) return

  // Check current share status
  shareLoading.value = true
  try {
    const res = await $fetch<{ data: SharedDocument | null }>('/api/knowledge/share-status', {
      query: { path: filePath.value }
    })
    shareStatus.value = res.data
  } catch {
    shareStatus.value = null
  } finally {
    shareLoading.value = false
  }

  showShareModal.value = true
}

async function toggleShare(enable: boolean) {
  if (!filePath.value) return

  try {
    const res = await $fetch<{ data: { isPublic: boolean, publicSlug: string | null } }>('/api/knowledge/share', {
      method: 'POST',
      body: { path: filePath.value, enable }
    })

    if (enable && res.data.publicSlug) {
      const url = `${window.location.origin}/view/${res.data.publicSlug}`
      await navigator.clipboard.writeText(url)
      toast.add({ title: 'Link copied!', color: 'success', icon: 'i-lucide-check' })
    } else {
      toast.add({ title: 'Sharing disabled', color: 'neutral' })
    }
    showShareModal.value = false
  } catch {
    toast.add({ title: 'Failed to update sharing', color: 'error' })
  }
}

onMounted(async () => {
  await loadTree()

  // Auto-select last file or first .md
  const target = lastKnowledgePath.value || findFirstFile(files.value)
  if (target)
    handleSelect(target)
})
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <!-- File tree sidebar -->
    <UDashboardPanel
      id="knowledge-filetree"
      collapsible
      resizable
      :min-size="12"
      :default-size="16"
      :max-size="24"
      class="hidden lg:flex"
    >
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <span class="text-sm font-medium truncate">Files</span>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-if="treeLoading"
          class="p-4 space-y-2"
        >
          <USkeleton
            v-for="i in 4"
            :key="i"
            class="h-6 w-full"
          />
        </div>
        <KnowledgeFileTree
          v-else
          :files="files"
          :selected-path="filePath ?? undefined"
          @select="handleSelect"
          @refresh="handleRefresh"
        />
      </template>
    </UDashboardPanel>

    <!-- Editor panel -->
    <UDashboardPanel
      id="knowledge-editor"
      grow
      :ui="{ body: '!p-0' }"
    >
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <NuxtLink
              to="/"
              class="text-muted hover:text-default transition-colors"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-4"
              />
            </NuxtLink>
            <span class="font-medium">Knowledge</span>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-if="editorLoading"
          class="flex-1 flex items-center justify-center h-full"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 animate-spin text-dimmed"
          />
        </div>
        <div
          v-else-if="!filePath"
          class="flex-1 flex items-center justify-center h-full text-dimmed"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-file-code"
              class="size-12 mx-auto mb-4 opacity-50"
            />
            <p>Select a file to edit</p>
          </div>
        </div>
        <KnowledgeEditor
          v-else
          :key="filePath"
          :file-path="filePath"
          :content="content"
          :save-status="saveStatus"
          :is-dirty="isDirty"
          @update:content="updateContent"
          @save="saveNow"
          @share="handleShare"
        />
      </template>
    </UDashboardPanel>

    <!-- Share Modal -->
    <UModal v-model:open="showShareModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Share Document
            </h3>
          </template>

          <div class="space-y-3">
            <div
              class="p-4 border border-default rounded-lg cursor-pointer hover:bg-elevated transition-colors"
              :class="{ 'border-primary bg-elevated': !shareStatus?.isPublic }"
              @click="toggleShare(false)"
            >
              <div class="flex items-center gap-3">
                <UIcon
                  name="i-lucide-eye-off"
                  class="size-5 text-dimmed"
                />
                <div>
                  <div class="font-medium">
                    Private
                  </div>
                  <div class="text-sm text-dimmed">
                    Only you can view this document.
                  </div>
                </div>
              </div>
            </div>

            <div
              class="p-4 border border-default rounded-lg cursor-pointer hover:bg-elevated transition-colors"
              :class="{ 'border-primary bg-elevated': shareStatus?.isPublic }"
              @click="toggleShare(true)"
            >
              <div class="flex items-center gap-3">
                <UIcon
                  name="i-lucide-globe"
                  class="size-5 text-dimmed"
                />
                <div>
                  <div class="font-medium">
                    Public
                  </div>
                  <div class="text-sm text-dimmed">
                    Anyone with the link can view. Link will be copied automatically.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton
                color="neutral"
                variant="outline"
                @click="showShareModal = false"
              >
                Cancel
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
