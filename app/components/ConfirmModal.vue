<script setup lang="ts">
withDefaults(defineProps<{
  open: boolean
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'neutral'
  icon?: string
  loading?: boolean
}>(), {
  title: 'Confirm Action',
  description: 'Are you sure you want to proceed?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  confirmColor: 'primary',
  icon: undefined,
  loading: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': []
  'cancel': []
}>()

function close() {
  emit('update:open', false)
  emit('cancel')
}

function confirm() {
  emit('confirm')
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6">
        <div class="flex items-start gap-4">
          <div
            v-if="icon"
            class="shrink-0 p-2 rounded-full bg-error/10"
          >
            <UIcon
              :name="icon"
              class="size-6 text-error"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-lg font-semibold text-default">
              {{ title }}
            </h3>
            <p class="mt-2 text-sm text-muted">
              {{ description }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="loading"
            @click="close"
          >
            {{ cancelLabel }}
          </UButton>
          <UButton
            :color="confirmColor"
            :loading="loading"
            @click="confirm"
          >
            {{ confirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
