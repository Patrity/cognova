<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()

const {
  document,
  metadata,
  body,
  filePath,
  loading,
  saveStatus,
  isDirty,
  metadataDirty,
  loadDocument,
  updateBody,
  updateMetadata,
  saveNow
} = useDocument()

async function handleFileSelect(path: string) {
  await loadDocument(path)
}

// Load document from query parameter on mount
onMounted(async () => {
  const pathParam = route.query.path as string | undefined
  if (pathParam)
    await loadDocument(pathParam)
})
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <UDashboardPanel
      id="docs-filetree"
      collapsible
      resizable
      :min-size="12"
      :default-size="16"
      :max-size="24"
      class="hidden lg:flex"
    >
      <template #body>
        <FilesFileTree
          class="h-full"
          @select="handleFileSelect"
        />
      </template>
    </UDashboardPanel>

    <UDashboardPanel
      id="docs-editor"
      grow
      :ui="{ body: 'sm:py-0' }"
    >
      <template #header>
        <UDashboardNavbar title="Editor">
          <template #right>
            <UColorModeButton />
            <UDrawer>
              <UButton
                icon="i-lucide-folder-tree"
                class="block lg:hidden"
              />
              <template #content>
                <FilesFileTree
                  class="h-full"
                  @select="handleFileSelect"
                />
              </template>
            </UDrawer>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-if="loading"
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
              name="i-lucide-file-text"
              class="size-32 mx-auto mb-4 opacity-50"
            />
            <p>Select a file to edit</p>
          </div>
        </div>
        <EditorDocumentEditor
          v-else-if="metadata && document"
          :key="filePath"
          :document="document"
          :body="body"
          :metadata="metadata"
          :file-path="filePath"
          :save-status="saveStatus"
          :is-dirty="isDirty"
          :metadata-dirty="metadataDirty"
          class="h-full"
          @update:body="updateBody"
          @update:metadata="updateMetadata"
          @save="saveNow"
        />
      </template>
    </UDashboardPanel>
  </div>
</template>
