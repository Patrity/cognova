<script setup lang="ts">
import { formatDate } from '~~/shared/utils/formatting'

definePageMeta({
  path: '/settings/secrets'
})

interface Secret {
  id: string
  key: string
  description: string | null
  createdAt: string
  updatedAt: string
}

const toast = useToast()

// Secrets state
const secretsData = ref<Secret[]>([])
const secretsLoading = ref(false)
const secretModal = ref(false)
const secretDeleteConfirm = ref(false)
const secretToDelete = ref<Secret | null>(null)
const secretSaving = ref(false)
const editingSecret = ref<Secret | null>(null)

const secretForm = reactive({
  key: '',
  value: '',
  description: ''
})

const secretColumns = [
  { accessorKey: 'key', header: 'Key' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'updatedAt', header: 'Last Updated' },
  { accessorKey: 'actions', header: '' }
]

async function fetchSecrets() {
  secretsLoading.value = true
  try {
    const { data } = await $fetch<{ data: Secret[] }>('/api/secrets')
    secretsData.value = data
  } catch {
    toast.add({ title: 'Failed to load secrets', color: 'error' })
  }
  secretsLoading.value = false
}

function openCreateSecret() {
  editingSecret.value = null
  secretForm.key = ''
  secretForm.value = ''
  secretForm.description = ''
  secretModal.value = true
}

function openEditSecret(secret: Secret) {
  editingSecret.value = secret
  secretForm.key = secret.key
  secretForm.value = ''
  secretForm.description = secret.description || ''
  secretModal.value = true
}

function confirmDeleteSecret(secret: Secret) {
  secretToDelete.value = secret
  secretDeleteConfirm.value = true
}

async function handleSecretSubmit() {
  if (!secretForm.key || (!editingSecret.value && !secretForm.value)) {
    toast.add({
      title: 'Missing fields',
      description: editingSecret.value ? 'Key is required.' : 'Key and value are required.',
      color: 'error'
    })
    return
  }

  secretSaving.value = true
  try {
    if (editingSecret.value) {
      await $fetch(`/api/secrets/${editingSecret.value.key}`, {
        method: 'PUT',
        body: {
          value: secretForm.value || undefined,
          description: secretForm.description || undefined
        }
      })
      toast.add({ title: 'Secret updated', color: 'success' })
    } else {
      await $fetch('/api/secrets', {
        method: 'POST',
        body: {
          key: secretForm.key,
          value: secretForm.value,
          description: secretForm.description || undefined
        }
      })
      toast.add({ title: 'Secret created', color: 'success' })
    }
    secretModal.value = false
    await fetchSecrets()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({
      title: editingSecret.value ? 'Failed to update secret' : 'Failed to create secret',
      description: error.data?.message || 'An error occurred',
      color: 'error'
    })
  }
  secretSaving.value = false
}

async function handleDeleteSecret() {
  if (!secretToDelete.value) return

  try {
    await $fetch(`/api/secrets/${secretToDelete.value.key}`, { method: 'DELETE' })
    toast.add({ title: 'Secret deleted', color: 'success' })
    secretDeleteConfirm.value = false
    secretToDelete.value = null
    await fetchSecrets()
  } catch {
    toast.add({ title: 'Failed to delete secret', color: 'error' })
  }
}

onMounted(() => {
  fetchSecrets()
})
</script>

<template>
  <div class="py-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-lg font-semibold">
          Secrets
        </h3>
        <p class="text-sm text-dimmed">
          Encrypted key-value store for skills and integrations.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreateSecret"
      >
        Add Secret
      </UButton>
    </div>

    <UTable
      :columns="secretColumns"
      :data="secretsData"
      :loading="secretsLoading"
    >
      <template #key-cell="{ row }">
        <code class="text-sm bg-elevated px-2 py-0.5 rounded">{{ row.original.key }}</code>
      </template>
      <template #description-cell="{ row }">
        <span class="text-dimmed">{{ row.original.description || '\u2014' }}</span>
      </template>
      <template #updatedAt-cell="{ row }">
        <span class="text-dimmed text-sm">{{ formatDate(row.original.updatedAt) }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex gap-2 justify-end">
          <UButton
            variant="ghost"
            icon="i-lucide-pencil"
            size="xs"
            @click="openEditSecret(row.original)"
          />
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            size="xs"
            @click="confirmDeleteSecret(row.original)"
          />
        </div>
      </template>
      <template #empty>
        <div class="py-12 text-center">
          <UIcon
            name="i-lucide-key"
            class="size-12 mx-auto mb-4 text-dimmed"
          />
          <p class="text-dimmed">
            No secrets yet. Add one to get started.
          </p>
        </div>
      </template>
    </UTable>

    <!-- Secret Create/Edit Modal -->
    <UModal v-model:open="secretModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ editingSecret ? 'Edit Secret' : 'Add Secret' }}
        </h3>
      </template>
      <template #body>
        <UForm
          :state="secretForm"
          class="space-y-4"
          @submit="handleSecretSubmit"
        >
          <UFormField
            label="Key"
            name="key"
            :hint="editingSecret ? '' : 'SCREAMING_SNAKE_CASE'"
          >
            <UInput
              v-model="secretForm.key"
              :disabled="!!editingSecret"
              placeholder="MY_API_KEY"
              class="w-full font-mono"
            />
          </UFormField>
          <UFormField
            label="Value"
            name="value"
            :hint="editingSecret ? 'Leave empty to keep current value' : ''"
          >
            <UInput
              v-model="secretForm.value"
              type="password"
              :placeholder="editingSecret ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'Secret value'"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Description"
            name="description"
          >
            <UInput
              v-model="secretForm.description"
              placeholder="Optional description"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2 pt-4">
            <UButton
              variant="ghost"
              @click="secretModal = false"
            >
              Cancel
            </UButton>
            <UButton
              type="submit"
              :loading="secretSaving"
            >
              {{ editingSecret ? 'Update' : 'Create' }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="secretDeleteConfirm">
      <template #header>
        <h3 class="text-lg font-semibold">
          Delete Secret
        </h3>
      </template>
      <template #body>
        <p class="mb-4">
          Are you sure you want to delete <code class="bg-elevated px-2 py-0.5 rounded">{{ secretToDelete?.key }}</code>?
        </p>
        <p class="text-sm text-dimmed">
          This action cannot be undone. Any skills using this secret will stop working.
        </p>
        <div class="flex justify-end gap-2 pt-6">
          <UButton
            variant="ghost"
            @click="secretDeleteConfirm = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            @click="handleDeleteSecret"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
