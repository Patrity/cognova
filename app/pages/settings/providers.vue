<script setup lang="ts">
import type { ProviderWithType } from '~~/shared/types'

const {
  providers,
  providerTypes,
  loading,
  fetchProviders,
  fetchProviderTypes,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider
} = useProviders()

const toast = useToast()

const showAddModal = ref(false)
const showDeleteModal = ref(false)
const editingProvider = ref<ProviderWithType | null>(null)
const deletingProvider = ref<ProviderWithType | null>(null)
const expandedProvider = ref<string | null>(null)
const saving = ref(false)
const testing = ref<string | null>(null)

function toggleExpand(providerId: string) {
  expandedProvider.value = expandedProvider.value === providerId ? null : providerId
}

const form = reactive({
  name: '',
  typeId: '',
  configJson: {} as Record<string, unknown>
})

const selectedType = computed(() =>
  providerTypes.value.find(t => t.id === form.typeId)
)

const typeOptions = computed(() =>
  providerTypes.value.map(t => ({ label: t.name, value: t.id }))
)

function openAdd() {
  editingProvider.value = null
  form.name = ''
  form.typeId = ''
  form.configJson = {}
  showAddModal.value = true
}

function openEdit(provider: ProviderWithType) {
  editingProvider.value = provider
  form.name = provider.name
  form.typeId = provider.typeId
  form.configJson = { ...provider.configJson }
  showAddModal.value = true
}

function openDelete(provider: ProviderWithType) {
  deletingProvider.value = provider
  showDeleteModal.value = true
}

async function handleSave() {
  if (!form.name || !form.typeId) {
    toast.add({ title: 'Missing fields', description: 'Name and type are required.', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }

  saving.value = true
  try {
    if (editingProvider.value) {
      const updates: Record<string, unknown> = { name: form.name }
      // Only send configJson if any field has a non-empty value (skip blank password fields when editing)
      const hasValues = Object.values(form.configJson).some(v => v !== '' && v !== undefined)
      if (hasValues)
        updates.configJson = form.configJson
      await updateProvider(editingProvider.value.id, updates)
      toast.add({ title: 'Provider updated', color: 'success', icon: 'i-lucide-check' })
    } else {
      await createProvider({ name: form.name, typeId: form.typeId, configJson: form.configJson })
      toast.add({ title: 'Provider added', color: 'success', icon: 'i-lucide-check' })
    }
    showAddModal.value = false
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingProvider.value)
    return
  try {
    await deleteProvider(deletingProvider.value.id)
    toast.add({ title: 'Provider deleted', color: 'success', icon: 'i-lucide-check' })
    showDeleteModal.value = false
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

async function handleTest(provider: ProviderWithType) {
  testing.value = provider.id
  try {
    await testProvider(provider.id)
    toast.add({ title: 'Connection successful', description: `${provider.name} is working.`, color: 'success', icon: 'i-lucide-check' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Test failed'
    toast.add({ title: 'Connection failed', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    testing.value = null
  }
}

onMounted(async () => {
  await Promise.all([fetchProviders(), fetchProviderTypes()])
})
</script>

<template>
  <div>
    <UPageCard
      title="AI Providers"
      description="Configure your AI provider connections."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Add Provider"
        icon="i-lucide-plus"
        color="neutral"
        @click="openAdd"
      />
    </UPageCard>

    <UPageCard variant="subtle">
      <div
        v-if="loading"
        class="flex items-center justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-5 animate-spin text-muted"
        />
      </div>

      <div
        v-else-if="!providers.length"
        class="text-center py-8"
      >
        <UIcon
          name="i-lucide-cpu"
          class="size-8 text-muted mx-auto mb-2"
        />
        <p class="text-sm text-muted">
          No providers configured yet.
        </p>
        <UButton
          label="Add your first provider"
          variant="link"
          class="mt-2"
          @click="openAdd"
        />
      </div>

      <template v-else>
        <div
          v-for="(provider, index) in providers"
          :key="provider.id"
        >
          <USeparator v-if="index > 0" />
          <div class="flex items-center justify-between gap-4 py-1">
            <div
              class="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              @click="toggleExpand(provider.id)"
            >
              <UIcon
                :name="expandedProvider === provider.id ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="size-4 text-muted shrink-0"
              />
              <div>
                <p class="text-sm font-medium truncate">
                  {{ provider.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ provider.type.name }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                icon="i-lucide-activity"
                variant="ghost"
                color="neutral"
                size="xs"
                :loading="testing === provider.id"
                @click="handleTest(provider)"
              />
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="openEdit(provider)"
              />
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click="openDelete(provider)"
              />
            </div>
          </div>
          <div
            v-if="expandedProvider === provider.id"
            class="pl-8 pb-3 pt-1"
          >
            <SettingsModelManager :provider-id="provider.id" />
          </div>
        </div>
      </template>
    </UPageCard>

    <UModal v-model:open="showAddModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ editingProvider ? 'Edit Provider' : 'Add Provider' }}
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
            <div>
              <label class="block text-sm font-medium mb-1">Name <span class="text-error">*</span></label>
              <UInput
                v-model="form.name"
                placeholder="e.g. My Anthropic"
                class="w-full"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-1">Type <span class="text-error">*</span></label>
              <USelect
                v-model="form.typeId"
                :items="typeOptions"
                placeholder="Select provider type"
                :disabled="!!editingProvider"
                class="w-full"
              />
            </div>

            <SettingsProviderForm
              v-if="selectedType?.configSchema"
              v-model="form.configJson"
              :schema="selectedType.configSchema as any"
              :editing="!!editingProvider"
            />
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
                :label="editingProvider ? 'Save Changes' : 'Add Provider'"
                :loading="saving"
                @click="handleSave"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="showDeleteModal">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Delete Provider
            </h3>
          </template>
          <p class="text-sm">
            Are you sure you want to delete <strong>{{ deletingProvider?.name }}</strong>? This will also remove all associated models.
          </p>
          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                label="Cancel"
                color="neutral"
                variant="outline"
                @click="showDeleteModal = false"
              />
              <UButton
                label="Delete"
                color="error"
                @click="handleDelete"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
