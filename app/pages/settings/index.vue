<script setup lang="ts">
const toast = useToast()
const loading = ref(false)
const saving = ref(false)

const settings = reactive({
  appName: 'Cognova',
  defaultModelId: '',
  knowledgePath: ''
})

interface ModelOption {
  id: string
  modelId: string
  displayName: string
  providerName: string
}

const models = ref<ModelOption[]>([])

const modelOptions = computed(() =>
  models.value.map(m => ({
    label: `${m.displayName} (${m.providerName})`,
    value: m.id
  }))
)

async function fetchSettings() {
  loading.value = true
  try {
    const { data } = await $fetch<{ data: Record<string, unknown> }>('/api/settings')
    if (data.appName)
      settings.appName = data.appName as string
    if (data.defaultModelId)
      settings.defaultModelId = data.defaultModelId as string
    if (data.knowledgePath)
      settings.knowledgePath = data.knowledgePath as string
  } finally {
    loading.value = false
  }
}

async function fetchModels() {
  try {
    const { data } = await $fetch<{ data: ModelOption[] }>('/api/models')
    models.value = data
  } catch {
    // Models might not exist yet
  }
}

async function handleSave() {
  saving.value = true
  try {
    await $fetch('/api/settings', {
      method: 'PUT',
      body: {
        appName: settings.appName,
        defaultModelId: settings.defaultModelId || null
      }
    })
    toast.add({ title: 'Settings saved', color: 'success', icon: 'i-lucide-check' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save'
    toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchSettings(), fetchModels()])
})
</script>

<template>
  <div>
    <UPageCard
      title="General"
      description="Application-wide settings."
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        label="Save changes"
        color="neutral"
        :loading="saving"
        @click="handleSave"
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

      <template v-else>
        <div class="flex max-sm:flex-col justify-between items-start gap-4">
          <div>
            <p class="text-sm font-medium">
              App Name
            </p>
            <p class="text-sm text-muted">
              Display name for your instance.
            </p>
          </div>
          <UInput
            v-model="settings.appName"
            class="w-full sm:w-64"
          />
        </div>
        <USeparator />
        <div class="flex max-sm:flex-col justify-between items-start gap-4">
          <div>
            <p class="text-sm font-medium">
              Default Model
            </p>
            <p class="text-sm text-muted">
              Used when no specific model is requested.
            </p>
          </div>
          <USelect
            v-model="settings.defaultModelId"
            :items="modelOptions"
            placeholder="Select a model"
            class="w-full sm:w-64"
          />
        </div>
        <USeparator />
        <div class="flex max-sm:flex-col justify-between items-start gap-4">
          <div>
            <p class="text-sm font-medium">
              Knowledge Path
            </p>
            <p class="text-sm text-muted">
              Directory for knowledge files (read-only).
            </p>
          </div>
          <UInput
            :model-value="settings.knowledgePath"
            disabled
            class="w-full sm:w-64"
          />
        </div>
      </template>
    </UPageCard>
  </div>
</template>
