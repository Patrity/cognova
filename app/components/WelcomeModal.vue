<script setup lang="ts">
const { onboardingDismissed } = usePreferences()
const { public: { agentName, agentTone } } = useRuntimeConfig()

const open = ref(false)
const loading = ref(true)

interface WelcomeMessage {
  greeting: string
  body: string
  cta: string
}

const welcomeMessages: Record<string, WelcomeMessage> = {
  formal: {
    greeting: `Good day. I am ${agentName}.`,
    body: `It is a pleasure to make your acquaintance. I am your personal knowledge management assistant, here to help you organize documents, track tasks, and retain important information across sessions. To serve you most effectively, I would like to learn a bit about you — your work, your projects, and how you prefer to operate. Shall we have a brief introductory conversation?`,
    cta: 'Begin Introduction'
  },
  casual: {
    greeting: `Hey there! I'm ${agentName}!`,
    body: `Super excited to meet you! I'm your personal assistant — I'll help you keep your notes organized, track your tasks, and remember the important stuff so you never have to repeat yourself. But first, let's have a quick chat so I can get to know you a little. What you do, what kind of projects you work on, that sort of thing. It'll only take a minute!`,
    cta: `Let's Chat!`
  },
  concise: {
    greeting: `Hi, I'm ${agentName}.`,
    body: `I'm your knowledge management assistant. I handle documents, tasks, and memory across sessions. A quick intro chat will help me understand your work and preferences so I can be more useful from the start.`,
    cta: 'Start Chat'
  }
}

const message = computed((): WelcomeMessage => {
  return welcomeMessages[agentTone] ?? welcomeMessages.casual!
})

onMounted(async () => {
  if (onboardingDismissed.value) {
    loading.value = false
    return
  }

  try {
    const response = await $fetch<{ data: unknown[] }>('/api/memory/search', {
      query: { limit: '1' }
    })

    if (!response.data?.length)
      open.value = true
  } catch {
    // If memory API fails, don't block the user
  } finally {
    loading.value = false
  }
})

function goToChat() {
  onboardingDismissed.value = true
  open.value = false
  navigateTo('/chat?onboarding=true')
}

function dismiss() {
  onboardingDismissed.value = true
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    class="sm:max-w-lg"
  >
    <template #content>
      <div class="p-8 text-center">
        <div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <UIcon
            name="i-lucide-sparkles"
            class="size-8 text-primary"
          />
        </div>

        <h2 class="text-2xl font-bold text-default">
          {{ message.greeting }}
        </h2>

        <p class="mt-4 text-sm leading-relaxed text-muted">
          {{ message.body }}
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <UButton
            size="lg"
            icon="i-lucide-message-square"
            @click="goToChat"
          >
            {{ message.cta }}
          </UButton>
          <UButton
            size="lg"
            color="neutral"
            variant="ghost"
            @click="dismiss"
          >
            Maybe Later
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
