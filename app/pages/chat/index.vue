<script setup lang="ts">
import type { InstalledAgent } from '~~/shared/types'

const toast = useToast()
const loading = ref(false)

const refreshConversations = inject<() => Promise<void>>('refreshConversations')

const { data: agents } = await useFetch('/api/agents', {
  transform: (res: { data: InstalledAgent[] }) => res.data
})

const selectedAgentId = ref<string | null>(null)

// Pre-select default built-in agent
watchEffect(() => {
  if (agents.value?.length && !selectedAgentId.value) {
    const defaultAgent = agents.value.find(a => a.builtIn)
    selectedAgentId.value = defaultAgent?.id || agents.value[0]?.id || null
  }
})

async function onSend(text: string) {
  if (loading.value) return

  loading.value = true
  try {
    const { data: conversation } = await $fetch<{ data: { id: string } }>('/api/conversations', {
      method: 'POST',
      body: { agentId: selectedAgentId.value }
    })

    await refreshConversations?.()
    await navigateTo(`/chat/${conversation.id}?firstMessage=${encodeURIComponent(text)}`)
  } catch {
    toast.add({ title: 'Error', description: 'Failed to create conversation', color: 'error' })
    loading.value = false
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-2xl space-y-6">
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-bold">
          How can I help you today?
        </h1>
        <p class="text-sm text-muted">
          Start a conversation with an AI agent
        </p>
      </div>

      <div
        v-if="agents?.length"
        class="flex justify-center"
      >
        <ChatAgentSelect
          v-model="selectedAgentId"
          :agents="agents"
        />
      </div>

      <ChatInput
        :disabled="loading"
        @send="onSend"
      />
    </div>
  </div>
</template>
