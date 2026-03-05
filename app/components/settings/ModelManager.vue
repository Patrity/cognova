<script setup lang="ts">
import type { Model } from '~~/shared/types'

const props = defineProps<{
  providerId: string
}>()

const toast = useToast()
const models = ref<Model[]>([])
const loading = ref(false)
const showAddModal = ref(false)
const saving = ref(false)

interface CatalogData {
  suggestions: { modelId: string, displayName: string, suggestedTags: string[] }[]
  tagSuggestions: string[]
}

const catalog = ref<CatalogData>({ suggestions: [], tagSuggestions: [] })

const addForm = reactive({
  modelId: '',
  displayName: '',
  tags: [] as string[],
  customTag: ''
})

async function fetchModels() {
  loading.value = true
  try {
    const { data } = await $fetch<{ data: Model[] }>(`/api/providers/${props.providerId}/models`)
    models.value = data
  } finally {
    loading.value = false
  }
}

async function fetchCatalog() {
  try {
    const { data } = await $fetch<{ data: CatalogData }>(`/api/providers/${props.providerId}/models/catalog`)
    catalog.value = data
  } catch {
    // Catalog fetch is optional
  }
}

function openAdd() {
  addForm.modelId = ''
  addForm.displayName = ''
  addForm.tags = []
  addForm.customTag = ''
  showAddModal.value = true
}

function selectSuggestion(suggestion: { modelId: string, displayName: string, suggestedTags: string[] }) {
  addForm.modelId = suggestion.modelId
  addForm.displayName = suggestion.displayName
  addForm.tags = [...suggestion.suggestedTags]
}

function toggleTag(tag: string) {
  const idx = addForm.tags.indexOf(tag)
  if (idx >= 0)
    addForm.tags.splice(idx, 1)
  else
    addForm.tags.push(tag)
}

function addCustomTag() {
  const tag = addForm.customTag.trim().toLowerCase()
  if (tag && !addForm.tags.includes(tag)) {
    addForm.tags.push(tag)
    addForm.customTag = ''
  }
}

async function handleAdd() {
  if (!addForm.modelId || !addForm.displayName) {
    toast.add({ title: 'Missing fields', description: 'Model ID and display name are required.', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/providers/${props.providerId}/models`, {
      method: 'POST',
      body: { modelId: addForm.modelId, displayName: addForm.displayName, tags: addForm.tags }
    })
    toast.add({ title: 'Model added', color: 'success', icon: 'i-lucide-check' })
    showAddModal.value = false
    await fetchModels()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add model'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

async function handleDelete(model: Model) {
  try {
    await $fetch(`/api/providers/${props.providerId}/models/${model.id}`, { method: 'DELETE' })
    models.value = models.value.filter(m => m.id !== model.id)
    toast.add({ title: 'Model removed', color: 'success', icon: 'i-lucide-check' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove model'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

onMounted(async () => {
  await Promise.all([fetchModels(), fetchCatalog()])
})

watch(() => props.providerId, async () => {
  await Promise.all([fetchModels(), fetchCatalog()])
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium">
        Models
      </h4>
      <UButton
        label="Add Model"
        icon="i-lucide-plus"
        size="xs"
        variant="outline"
        color="neutral"
        @click="openAdd"
      />
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-4"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-4 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="!models.length"
      class="text-center py-4"
    >
      <p class="text-xs text-muted">
        No models added yet.
      </p>
    </div>

    <div
      v-else
      class="flex flex-col gap-2"
    >
      <div
        v-for="model in models"
        :key="model.id"
        class="flex items-center justify-between gap-2 p-2 rounded-md bg-elevated/50"
      >
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate">
            {{ model.displayName }}
          </p>
          <p class="text-xs text-muted truncate">
            {{ model.modelId }}
          </p>
          <div
            v-if="model.tags?.length"
            class="flex gap-1 mt-1"
          >
            <UBadge
              v-for="tag in model.tags"
              :key="tag"
              :label="tag"
              size="xs"
              variant="subtle"
              color="neutral"
            />
          </div>
        </div>
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="error"
          size="xs"
          @click="handleDelete(model)"
        />
      </div>
    </div>

    <UModal v-model:open="showAddModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                Add Model
              </h3>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="showAddModal = false"
              />
            </div>
          </template>

          <div class="flex flex-col gap-4">
            <div
              v-if="catalog.suggestions.length"
              class="flex flex-wrap gap-2"
            >
              <UButton
                v-for="suggestion in catalog.suggestions"
                :key="suggestion.modelId"
                :label="suggestion.displayName"
                size="xs"
                :variant="addForm.modelId === suggestion.modelId ? 'solid' : 'outline'"
                color="neutral"
                @click="selectSuggestion(suggestion)"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Model ID <span class="text-error">*</span></label>
              <UInput
                v-model="addForm.modelId"
                placeholder="e.g. claude-sonnet-4-5-20250929"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Display Name <span class="text-error">*</span></label>
              <UInput
                v-model="addForm.displayName"
                placeholder="e.g. Claude Sonnet 4.5"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Tags</label>
              <div class="flex flex-wrap gap-1 mb-2">
                <UButton
                  v-for="tag in catalog.tagSuggestions"
                  :key="tag"
                  :label="tag"
                  size="xs"
                  :variant="addForm.tags.includes(tag) ? 'solid' : 'outline'"
                  color="neutral"
                  @click="toggleTag(tag)"
                />
              </div>
              <div class="flex gap-2">
                <UInput
                  v-model="addForm.customTag"
                  placeholder="Custom tag"
                  size="xs"
                  class="flex-1"
                  @keydown.enter.prevent="addCustomTag"
                />
                <UButton
                  label="Add"
                  size="xs"
                  variant="outline"
                  color="neutral"
                  @click="addCustomTag"
                />
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                @click="showAddModal = false"
              />
              <UButton
                label="Add Model"
                :loading="saving"
                @click="handleAdd"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
