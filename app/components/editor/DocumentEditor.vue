<script setup lang="ts">
import type { EditorToolbarItem } from '@nuxt/ui'
import type { Document, DocumentMetadata, Project } from '~~/shared/types'

const props = defineProps<{
  document: Document
  body: string
  metadata: DocumentMetadata
  filePath: string
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  isDirty: boolean
  metadataDirty: boolean
}>()

const emit = defineEmits<{
  'update:body': [value: string]
  'update:metadata': [updates: Partial<DocumentMetadata>]
  'save': []
}>()

// Fetch projects for the dropdown
const { data: projectsData } = await useFetch<{ data: Project[] }>('/api/projects')
const projects = computed(() => projectsData.value?.data || [])

const showMetadata = ref(true)

const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'heading', level: 1, icon: 'i-lucide-heading-1' },
    { kind: 'heading', level: 2, icon: 'i-lucide-heading-2' },
    { kind: 'heading', level: 3, icon: 'i-lucide-heading-3' }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code' }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide-quote' }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link' },
    { kind: 'codeBlock', icon: 'i-lucide-file-code' },
    { kind: 'horizontalRule', icon: 'i-lucide-minus' }
  ],
  [
    { kind: 'undo', icon: 'i-lucide-undo' },
    { kind: 'redo', icon: 'i-lucide-redo' }
  ]
]

const saveStatusIcon = computed(() => {
  switch (props.saveStatus) {
    case 'saving': return 'i-lucide-loader-2'
    case 'saved': return 'i-lucide-check'
    case 'error': return 'i-lucide-alert-circle'
    default: return (props.isDirty || props.metadataDirty) ? 'i-lucide-circle-dot' : null
  }
})

const saveStatusText = computed(() => {
  switch (props.saveStatus) {
    case 'saving': return 'Saving...'
    case 'saved': return 'Saved'
    case 'error': return 'Error saving'
    default: return (props.isDirty || props.metadataDirty) ? 'Unsaved changes' : ''
  }
})

const editorContent = computed(() => props.body || undefined)

function handleBodyUpdate(value: string) {
  emit('update:body', value)
}

function handleMetadataUpdate(updates: Partial<DocumentMetadata>) {
  emit('update:metadata', updates)
}

function handleKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    emit('save')
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

// Share link functionality
const toast = useToast()
const shareUrl = computed(() => {
  if (!props.document?.id) return ''
  return `${window.location.origin}/view/${props.document.id}`
})

const linkCopied = ref(false)
const showShareModal = ref(false)

function handleShareClick() {
  if (props.metadata.shared) {
    copyShareLink()
  } else {
    showShareModal.value = true
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    linkCopied.value = true
    toast.add({ title: 'Link copied!', icon: 'i-lucide-check', color: 'success' })
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch {
    toast.add({ title: 'Failed to copy link', icon: 'i-lucide-x', color: 'error' })
  }
}

function setVisibility(shared: boolean, shareType: 'public' | 'private' | null) {
  emit('update:metadata', { shared, shareType: shareType ?? undefined })
  showShareModal.value = false
  if (shared) {
    // Copy link after enabling sharing
    setTimeout(() => copyShareLink(), 100)
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="border-b border-default px-4 py-2 flex items-center justify-between">
      <div class="flex items-center gap-2 text-sm text-dimmed min-w-0">
        <UIcon
          name="i-lucide-file-text"
          class="size-4 shrink-0"
        />
        <span class="truncate">{{ filePath }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :icon="linkCopied ? 'i-lucide-check' : 'i-lucide-share'"
          size="xs"
          variant="ghost"
          class="rounded-full"
          @click="handleShareClick"
        />
        <UButton
          :icon="showMetadata ? 'i-lucide-panel-top-close' : 'i-lucide-panel-top-open'"
          size="xs"
          variant="ghost"
          class="rounded-full"
          @click="showMetadata = !showMetadata"
        />
        <div
          v-if="saveStatusIcon"
          class="flex items-center gap-1 text-sm text-dimmed"
        >
          <UIcon
            :name="saveStatusIcon"
            :class="[
              'size-4',
              saveStatus === 'saving' && 'animate-spin',
              saveStatus === 'error' && 'text-error'
            ]"
          />
          <span>{{ saveStatusText }}</span>
        </div>
      </div>
    </div>

    <EditorDocumentMetadata
      v-if="showMetadata"
      :metadata="metadata"
      :projects="projects"
      @update:metadata="handleMetadataUpdate"
    />

    <UEditor
      v-slot="{ editor }"
      :model-value="editorContent"
      content-type="markdown"
      placeholder="Start writing..."
      class="markdown-editor w-full min-h-64 flex-1"
      @update:model-value="handleBodyUpdate"
    >
      <UEditorToolbar
        :editor="editor"
        :items="toolbarItems"
        class="border-b border-default"
      />
    </UEditor>

    <!-- Share visibility modal -->
    <UModal
      v-model:open="showShareModal"
      title="Share Document"
      description="Choose how you want to share this document"
    >
      <template #body>
        <div class="space-y-4">
          <!-- Hidden option -->
          <div
            class="p-4 border border-default rounded-lg cursor-pointer hover:bg-elevated transition-colors"
            :class="{ 'border-primary bg-elevated': !metadata.shared }"
            @click="setVisibility(false, null)"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-eye-off"
                class="size-5 text-dimmed"
              />
              <div>
                <div class="font-medium">
                  Hidden
                </div>
                <div class="text-sm text-dimmed">
                  Only you can view this document. Not accessible via link.
                </div>
              </div>
            </div>
          </div>

          <!-- Private (link only) option -->
          <div
            class="p-4 border border-default rounded-lg cursor-pointer hover:bg-elevated transition-colors"
            :class="{ 'border-primary bg-elevated': metadata.shared && metadata.shareType === 'private' }"
            @click="setVisibility(true, 'private')"
          >
            <div class="flex items-center gap-3">
              <UIcon
                name="i-lucide-link"
                class="size-5 text-dimmed"
              />
              <div>
                <div class="font-medium">
                  Private (Link Only)
                </div>
                <div class="text-sm text-dimmed">
                  Anyone with the link can view. Not indexed by search engines.
                </div>
              </div>
            </div>
          </div>

          <!-- Public option -->
          <div
            class="p-4 border border-default rounded-lg cursor-pointer hover:bg-elevated transition-colors"
            :class="{ 'border-primary bg-elevated': metadata.shared && metadata.shareType === 'public' }"
            @click="setVisibility(true, 'public')"
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
                  Visible to everyone. Indexed by search engines.
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style>
.markdown-editor [data-slot="content"] {
  flex: 1;
  overflow: auto;
}
.markdown-editor .tiptap {
  min-height: 100%;
}
</style>
