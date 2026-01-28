<script setup lang="ts">
definePageMeta({
  layout: 'view'
})

const { isAuthenticated, isPending } = useAuth()

// Redirect authenticated users to dashboard
watch([isAuthenticated, isPending], ([authenticated, pending]) => {
  if (!pending && authenticated)
    navigateTo('/dashboard')
}, { immediate: true })

// Fetch home page content
const { data } = await useFetch<{ data: { hasCustomHome: boolean, content: string | null } }>('/api/home')

const hasCustomContent = computed(() => data.value?.data?.hasCustomHome ?? false)
const customContent = computed(() => data.value?.data?.content ?? '')

// Hero links
const heroLinks = [
  {
    label: 'Get Started',
    to: '/login',
    icon: 'i-lucide-log-in'
  },
  {
    label: 'View on GitHub',
    to: 'https://github.com/patrity/second-brain',
    target: '_blank',
    color: 'neutral' as const,
    variant: 'subtle' as const,
    icon: 'i-simple-icons-github'
  }
]

// Core features
const coreFeatures = [
  {
    title: 'Terminal Integration',
    description: 'Native terminal support with node-pty for running commands directly in your workflow.',
    icon: 'i-lucide-terminal'
  },
  {
    title: 'Claude Code Support',
    description: 'Built-in integration with Claude Code for AI-assisted development and knowledge management.',
    icon: 'i-lucide-bot'
  },
  {
    title: 'Custom Skills',
    description: 'Extend functionality with custom skills that automate common tasks and workflows.',
    icon: 'i-lucide-sparkles'
  },
  {
    title: 'Task Management',
    description: 'Track tasks across projects with priorities, due dates, and smart filtering.',
    icon: 'i-lucide-check-square'
  }
]

// Additional features for the grid
const additionalFeatures = [
  {
    title: 'Markdown Editor',
    description: 'Full-featured markdown editor with live preview, syntax highlighting, and frontmatter support.',
    icon: 'i-lucide-file-text'
  },
  {
    title: 'Document Sharing',
    description: 'Share documents publicly or with private links. Control visibility per document.',
    icon: 'i-lucide-share-2'
  },
  {
    title: 'Scheduled Reminders',
    description: 'Set reminders and scheduled tasks that notify you at the right time.',
    icon: 'i-lucide-bell'
  },
  {
    title: 'File Sync',
    description: 'Automatic synchronization between your local vault and the database.',
    icon: 'i-lucide-refresh-cw'
  },
  {
    title: 'Self-Hosted',
    description: 'Own your data. Deploy anywhere with Docker or your preferred platform.',
    icon: 'i-lucide-server'
  },
  {
    title: 'Dark Mode',
    description: 'Beautiful light and dark themes that respect your system preferences.',
    icon: 'i-lucide-moon'
  }
]

// Tech stack for carousel
const techStack = [
  { name: 'Nuxt', icon: 'i-simple-icons-nuxtdotjs' },
  { name: 'Vue', icon: 'i-simple-icons-vuedotjs' },
  { name: 'TypeScript', icon: 'i-simple-icons-typescript' },
  { name: 'Tailwind CSS', icon: 'i-simple-icons-tailwindcss' },
  { name: 'PostgreSQL', icon: 'i-simple-icons-postgresql' },
  { name: 'Docker', icon: 'i-simple-icons-docker' },
  { name: 'Drizzle', icon: 'i-simple-icons-drizzle' },
  { name: 'Claude', icon: 'i-simple-icons-anthropic' }
]

// CTA links
const ctaLinks = [
  {
    label: 'Get Started',
    to: '/login',
    color: 'neutral' as const
  },
  {
    label: 'Read the Docs',
    to: 'https://github.com/patrity/second-brain#readme',
    target: '_blank',
    color: 'neutral' as const,
    variant: 'subtle' as const,
    trailingIcon: 'i-lucide-arrow-right'
  }
]
</script>

<template>
  <!-- Custom home page from index.md -->
  <UContainer
    v-if="hasCustomContent"
    class="py-12"
  >
    <div class="prose prose-primary dark:prose-invert max-w-none">
      <MDC :value="customContent" />
    </div>
  </UContainer>

  <!-- Default home page -->
  <div v-else>
    <!-- Hero Section -->
    <UPageHero
      title="Your Personal Knowledge System"
      description="A self-hosted knowledge management platform for capturing thoughts, organizing tasks, and building your digital brain. Powered by Claude Code integration."
      :links="heroLinks"
    >
      <template #top>
        <div class="flex justify-center mt-16 -mb-24">
          <div class="p-4 rounded-full bg-primary/10">
            <UIcon
              name="i-lucide-brain"
              class="size-24 text-primary"
            />
          </div>
        </div>
      </template>
    </UPageHero>

    <!-- Core Features Section -->
    <UPageSection
      headline="Features"
      title="Everything you need for knowledge management"
      description="Second Brain combines powerful tools for note-taking, task management, and AI-assisted workflows in one self-hosted solution."
      :features="coreFeatures"
    />

    <USeparator />

    <!-- Additional Features Grid -->
    <UPageSection
      title="And much more..."
      description="Built with modern technologies and extensible architecture."
    >
      <UPageGrid>
        <UPageCard
          v-for="feature in additionalFeatures"
          :key="feature.title"
          :title="feature.title"
          :description="feature.description"
          :icon="feature.icon"
          variant="subtle"
          spotlight
        />
      </UPageGrid>
    </UPageSection>

    <USeparator />

    <!-- Tech Stack Section -->
    <UPageSection
      headline="Built With"
      title="Modern, battle-tested technologies"
      description="Second Brain is built on a solid foundation of open-source tools."
    >
      <UCarousel
        :items="techStack"
        :ui="{
          item: 'basis-1/3 md:basis-1/4 lg:basis-1/6'
        }"
        class="w-full"
        arrows
        loop
        :autoplay="{ delay: 2000 }"
      >
        <template #default="{ item }">
          <div class="flex flex-col items-center gap-3 p-6">
            <div class="p-4 rounded-xl bg-default border border-default">
              <UIcon
                :name="item.icon"
                class="size-10 text-muted"
              />
            </div>
            <span class="text-sm font-medium text-muted">{{ item.name }}</span>
          </div>
        </template>
      </UCarousel>
    </UPageSection>

    <USeparator />

    <!-- CTA Section -->
    <UPageCTA
      title="Ready to build your second brain?"
      description="Get started in minutes. Self-host with Docker or deploy to your favorite cloud platform."
      :links="ctaLinks"
      variant="subtle"
    />
  </div>
</template>
