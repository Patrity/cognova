<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
  streaming?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
  stop: []
}>()

const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() =>
  !props.disabled
  && !props.streaming
  && inputText.value.trim().length > 0
)

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  if (!canSend.value) return
  emit('send', inputText.value.trim())
  inputText.value = ''
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = 'auto'
  })
}

function autoResize(e: Event) {
  const target = e.target as HTMLTextAreaElement
  target.style.height = 'auto'
  target.style.height = Math.min(target.scrollHeight, 200) + 'px'
}

// Expose focus method for parent
function focus() {
  textareaRef.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="p-4">
    <div class="flex items-start gap-2">
      <textarea
        ref="textareaRef"
        v-model="inputText"
        :disabled="disabled || streaming"
        placeholder="Send a message..."
        rows="1"
        class="flex-1 resize-none bg-elevated/50 border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        @keydown="handleKeydown"
        @input="autoResize"
      />

      <UButton
        v-if="streaming"
        icon="i-lucide-square"
        color="error"
        variant="soft"
        size="md"
        @click="emit('stop')"
      />
      <UButton
        v-else
        icon="i-lucide-send"
        color="primary"
        :disabled="!canSend"
        size="md"
        @click="handleSend"
      />
    </div>
  </div>
</template>
