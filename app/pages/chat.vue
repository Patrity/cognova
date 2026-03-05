<script setup lang="ts">
import type { Conversation } from '~~/shared/types'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const { data: conversations, refresh: refreshConversations } = await useFetch('/api/conversations', {
  key: 'conversations',
  transform: (res: { data: Conversation[] }) => res.data
})

const showDeleteModal = ref(false)
const deletingConversation = ref<Conversation | null>(null)

const conversationTitle = computed(() => {
  if (!route.params.id) return 'New Chat'
  const conv = conversations.value?.find(c => c.id === route.params.id)
  return conv?.title || 'Chat'
})

function confirmDelete(conv: Conversation) {
  deletingConversation.value = conv
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!deletingConversation.value)
    return
  try {
    await $fetch(`/api/conversations/${deletingConversation.value.id}`, { method: 'DELETE' })
    showDeleteModal.value = false
    await refreshConversations()
    if (route.params.id === deletingConversation.value.id)
      await navigateTo('/chat')
  } catch {
    toast.add({ title: 'Error', description: 'Failed to delete conversation', color: 'error' })
  }
}

// Expose refresh for child pages to call after creating conversations
provide('refreshConversations', refreshConversations)
</script>

<!-- eslint-disable vue/no-multiple-template-root -->
<template>
  <UDashboardPanel
    id="chat-sidebar"
    :default-size="25"
    :min-size="20"
    :max-size="30"
    resizable
    class="hidden lg:flex"
  >
    <UDashboardNavbar :title="conversationTitle">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #right>
        <UButton
          icon="i-lucide-plus"
          variant="ghost"
          color="neutral"
          @click="router.push('/chat')"
        />
      </template>
    </UDashboardNavbar>

    <ChatConversationList
      :conversations="conversations || []"
      :active-id="(route.params.id as string) || null"
      @select="(id: string) => router.push(`/chat/${id}`)"
      @delete="confirmDelete"
      @new="router.push('/chat')"
    />
  </UDashboardPanel>

  <div class="flex flex-col flex-1 min-h-0 min-w-0">
    <NuxtPage />
  </div>

  <!-- Delete confirmation modal -->
  <UModal v-model:open="showDeleteModal">
    <template #content>
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            Delete Conversation
          </h3>
        </template>
        <p class="text-sm">
          Are you sure you want to delete <strong>{{ deletingConversation?.title || 'this conversation' }}</strong>? This cannot be undone.
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
</template>
