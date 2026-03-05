<script setup lang="ts">
const toast = useToast()
const loading = ref(false)

interface SecretEntry {
  id: string
  key: string
  createdAt: string
  updatedAt: string
}

const secrets = ref<SecretEntry[]>([])
const showAddModal = ref(false)
const showDeleteModal = ref(false)
const editingKey = ref<string | null>(null)
const deletingSecret = ref<SecretEntry | null>(null)
const saving = ref(false)

const addForm = reactive({
  key: '',
  value: ''
})

async function fetchSecrets() {
  loading.value = true
  try {
    const { data } = await $fetch<{ data: SecretEntry[] }>('/api/secrets')
    secrets.value = data
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editingKey.value = null
  addForm.key = ''
  addForm.value = ''
  showAddModal.value = true
}

function openEdit(secret: SecretEntry) {
  editingKey.value = secret.key
  addForm.key = secret.key
  addForm.value = ''
  showAddModal.value = true
}

function openDelete(secret: SecretEntry) {
  deletingSecret.value = secret
  showDeleteModal.value = true
}

async function handleSave() {
  if (!addForm.key) {
    toast.add({ title: 'Key is required', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }
  if (!addForm.value) {
    toast.add({ title: 'Value is required', color: 'error', icon: 'i-lucide-alert-circle' })
    return
  }

  saving.value = true
  try {
    if (editingKey.value) {
      await $fetch(`/api/secrets/${editingKey.value}`, {
        method: 'PUT',
        body: { value: addForm.value }
      })
      toast.add({ title: 'Secret updated', color: 'success', icon: 'i-lucide-check' })
    } else {
      await $fetch('/api/secrets', {
        method: 'POST',
        body: { key: addForm.key, value: addForm.value }
      })
      toast.add({ title: 'Secret created', color: 'success', icon: 'i-lucide-check' })
    }
    showAddModal.value = false
    await fetchSecrets()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Operation failed'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!deletingSecret.value)
    return
  try {
    await $fetch(`/api/secrets/${deletingSecret.value.key}`, { method: 'DELETE' })
    secrets.value = secrets.value.filter(s => s.id !== deletingSecret.value!.id)
    toast.add({ title: 'Secret deleted', color: 'success', icon: 'i-lucide-check' })
    showDeleteModal.value = false
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString()
}

onMounted(fetchSecrets)
</script>

<template>
  <div>
    <UPageCard
      title="Secrets"
      description="Encrypted key-value store for API keys and tokens."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Add Secret"
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
        v-else-if="!secrets.length"
        class="text-center py-8"
      >
        <UIcon
          name="i-lucide-key-round"
          class="size-8 text-muted mx-auto mb-2"
        />
        <p class="text-sm text-muted">
          No secrets stored yet.
        </p>
        <UButton
          label="Add your first secret"
          variant="link"
          class="mt-2"
          @click="openAdd"
        />
      </div>

      <template v-else>
        <div
          v-for="(secret, index) in secrets"
          :key="secret.id"
        >
          <USeparator v-if="index > 0" />
          <div class="flex items-center justify-between gap-4 py-1">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-mono font-medium truncate">
                {{ secret.key }}
              </p>
              <p class="text-xs text-muted">
                Updated {{ formatDate(secret.updatedAt) }}
              </p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <UButton
                icon="i-lucide-pencil"
                variant="ghost"
                color="neutral"
                size="xs"
                @click="openEdit(secret)"
              />
              <UButton
                icon="i-lucide-trash-2"
                variant="ghost"
                color="error"
                size="xs"
                @click="openDelete(secret)"
              />
            </div>
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
                {{ editingKey ? 'Update Secret' : 'Add Secret' }}
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
              <label class="block text-sm font-medium mb-1">Key <span class="text-error">*</span></label>
              <UInput
                v-model="addForm.key"
                placeholder="MY_API_KEY"
                :disabled="!!editingKey"
                class="font-mono"
              />
              <p
                v-if="!editingKey"
                class="text-xs text-muted mt-1"
              >
                Must be SCREAMING_SNAKE_CASE
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Value <span class="text-error">*</span></label>
              <UInput
                v-model="addForm.value"
                type="password"
                :placeholder="editingKey ? 'Enter new value' : 'Secret value'"
              />
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
                :label="editingKey ? 'Update' : 'Add Secret'"
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
              Delete Secret
            </h3>
          </template>
          <p class="text-sm">
            Are you sure you want to delete <strong class="font-mono">{{ deletingSecret?.key }}</strong>?
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
