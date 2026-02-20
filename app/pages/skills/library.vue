<script setup lang="ts">
import type { SkillCatalogItem } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const skills = ref<SkillCatalogItem[]>([])
const loading = ref(true)
const installing = ref<string | null>(null)
const search = ref('')
const activeTag = ref<string | null>(null)

// Collect all unique tags across skills
const allTags = computed(() => {
  const tagSet = new Set<string>()
  for (const s of skills.value) {
    for (const t of s.tags) tagSet.add(t)
  }
  return [...tagSet].sort()
})

const filteredSkills = computed(() => {
  let result = skills.value

  if (activeTag.value) {
    result = result.filter(s => s.tags.includes(activeTag.value!))
  }

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(q)
      || s.description.toLowerCase().includes(q)
      || s.author.toLowerCase().includes(q)
    )
  }

  return result
})

function toggleTag(tag: string) {
  activeTag.value = activeTag.value === tag ? null : tag
}

async function loadLibrary() {
  loading.value = true
  try {
    const res = await $fetch<{ data: SkillCatalogItem[] }>('/api/skills/library')
    skills.value = res.data
  } catch {
    toast.add({ title: 'Failed to load skills library', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function handleInstall(name: string) {
  installing.value = name
  try {
    await $fetch('/api/skills/library/install', {
      method: 'POST',
      body: { name }
    })
    toast.add({ title: `Installed ${name}`, color: 'success' })
    await loadLibrary()
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to install skill'
    toast.add({ title: message, color: 'error' })
  } finally {
    installing.value = null
  }
}

async function handleUpdate(name: string) {
  installing.value = name
  try {
    // Remove existing first
    await $fetch(`/api/skills/${name}/files/delete`, {
      method: 'POST',
      body: { path: '.' }
    }).catch(() => {})

    await $fetch('/api/skills/library/install', {
      method: 'POST',
      body: { name }
    })
    toast.add({ title: `Updated ${name}`, color: 'success' })
    await loadLibrary()
  } catch {
    toast.add({ title: `Failed to update ${name}`, color: 'error' })
  } finally {
    installing.value = null
  }
}

onMounted(async () => {
  await loadLibrary()

  // Handle ?install= query param from docs site redirect
  const installName = route.query.install as string | undefined
  if (installName) {
    router.replace({ query: {} })
    const found = skills.value.find(s => s.name === installName)
    if (found && !found.installed) {
      toast.add({ title: `Installing ${installName} from docs...`, color: 'info' })
      await handleInstall(installName)
    } else if (found?.installed) {
      toast.add({ title: `${installName} is already installed`, color: 'neutral' })
    } else {
      toast.add({ title: `Skill "${installName}" not found in library`, color: 'warning' })
    }
  }
})
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <UDashboardPanel
      id="skills-library"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Skills Library">
          <template #right>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search library..."
              size="sm"
              class="w-48"
            />
            <NuxtLink to="/skills">
              <UButton
                icon="i-lucide-arrow-left"
                variant="ghost"
                color="neutral"
                size="sm"
              >
                My Skills
              </UButton>
            </NuxtLink>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4">
          <!-- Tag filter bar -->
          <div
            v-if="allTags.length > 0 && !loading"
            class="flex flex-wrap gap-1.5 mb-4"
          >
            <UButton
              v-for="tag in allTags"
              :key="tag"
              size="xs"
              :variant="activeTag === tag ? 'solid' : 'outline'"
              :color="tag === 'official' ? 'primary' : 'neutral'"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </UButton>
          </div>

          <!-- Loading -->
          <div
            v-if="loading"
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div
              v-for="i in 6"
              :key="i"
              class="p-4 rounded-lg border border-default bg-elevated/50"
            >
              <USkeleton class="h-4 w-24 mb-2" />
              <USkeleton class="h-3 w-full mb-1" />
              <USkeleton class="h-3 w-2/3" />
            </div>
          </div>

          <!-- Empty -->
          <div
            v-else-if="skills.length === 0"
            class="flex flex-col items-center justify-center py-16 text-dimmed"
          >
            <UIcon
              name="i-lucide-library"
              class="size-12 mb-4"
            />
            <p class="text-lg font-medium">
              No community skills available
            </p>
            <p class="text-sm mt-1">
              The skills registry is empty or hasn't synced yet.
            </p>
          </div>

          <!-- No results -->
          <div
            v-else-if="filteredSkills.length === 0"
            class="text-center py-12 text-muted text-sm"
          >
            No skills matching {{ activeTag ? `"${activeTag}"` : '' }} {{ search ? `"${search}"` : '' }}
          </div>

          <!-- Grid -->
          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <SkillsLibraryCard
              v-for="skill in filteredSkills"
              :key="skill.name"
              :skill="skill"
              @install="handleInstall"
              @update="handleUpdate"
            />
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </div>
</template>
