<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const {
  content,
  filePath,
  loading,
  saveStatus,
  isDirty,
  loadFile,
  updateContent,
  saveNow
} = useEditor()

async function handleFileSelect(path: string) {
  await loadFile(path)
}
</script>

<template>
  <UDashboardPanel
    id="docs-filetree"
    collapsible
    resizable
    :min-size="12"
    :default-size="16"
    :max-size="24"
    class="hidden lg:flex"
  >
    <template #header>
      <UDashboardNavbar title="Files" />
    </template>

    <template #default>
      <FilesFileTree @select="handleFileSelect" class="h-full" />
    </template>
  </UDashboardPanel>

  <UDashboardPanel id="docs-editor" grow>
    <template #header>
      <UDashboardNavbar title="Editor">
        <template #right>
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #default>
      <div v-if="loading" class="flex-1 flex items-center justify-center h-full">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-dimmed" />
      </div>
      <div v-else-if="!filePath" class="flex-1 flex items-center justify-center h-full text-dimmed">
        <div class="text-center">
          <UIcon name="i-lucide-file-text" class="size-32 mx-auto mb-4 opacity-50" />
          <p>Select a file to edit</p>
        </div>
      </div>
      <EditorMarkdownEditor
        v-else
        :key="filePath"
        :model-value="content"
        :file-path="filePath"
        :save-status="saveStatus"
        :is-dirty="isDirty"
        class="h-full"
        @update:model-value="updateContent"
        @save="saveNow"
      />
    </template>
  </UDashboardPanel>
</template>
