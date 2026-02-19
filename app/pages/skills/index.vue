<script setup lang="ts">
import type { SkillListItem } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const toast = useToast()
const skills = ref<SkillListItem[]>([])
const loading = ref(true)
const search = ref('')
const createOpen = ref(false)

const filteredSkills = computed(() => {
  if (!search.value.trim()) return skills.value
  const q = search.value.toLowerCase()
  return skills.value.filter(s =>
    s.name.toLowerCase().includes(q)
    || s.description.toLowerCase().includes(q)
  )
})

async function loadSkills() {
  loading.value = true
  try {
    const res = await $fetch<{ data: SkillListItem[] }>('/api/skills')
    skills.value = res.data
  } catch {
    toast.add({ title: 'Failed to load skills', color: 'error' })
  } finally {
    loading.value = false
  }
}

async function handleToggle(name: string) {
  try {
    const res = await $fetch<{ data: { name: string, active: boolean } }>(`/api/skills/${name}/toggle`, {
      method: 'POST'
    })
    const skill = skills.value.find(s => s.name === name)
    if (skill) skill.active = res.data.active
    toast.add({
      title: `${name} ${res.data.active ? 'enabled' : 'disabled'}`,
      color: 'success'
    })
  } catch {
    toast.add({ title: `Failed to toggle ${name}`, color: 'error' })
  }
}

onMounted(() => loadSkills())
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <UDashboardPanel
      id="skills-main"
      grow
    >
      <template #header>
        <UDashboardNavbar title="Skills">
          <template #right>
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Search skills..."
              size="sm"
              class="w-48"
            />
            <NuxtLink to="/skills/library">
              <UButton
                icon="i-lucide-library"
                variant="ghost"
                color="neutral"
                size="sm"
              >
                Library
              </UButton>
            </NuxtLink>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              @click="createOpen = true"
            >
              Create Skill
            </UButton>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-4">
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
              name="i-lucide-puzzle"
              class="size-12 mb-4"
            />
            <p class="text-lg font-medium">
              No skills found
            </p>
            <p class="text-sm mt-1">
              Skills are loaded from ~/.claude/skills/
            </p>
          </div>

          <!-- No results -->
          <div
            v-else-if="filteredSkills.length === 0"
            class="text-center py-12 text-muted text-sm"
          >
            No skills matching "{{ search }}"
          </div>

          <!-- Grid -->
          <div
            v-else
            class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <SkillsCard
              v-for="skill in filteredSkills"
              :key="skill.name"
              :skill="skill"
              @toggle="handleToggle"
            />
          </div>
        </div>
      </template>
    </UDashboardPanel>

    <SkillsCreateModal
      :open="createOpen"
      @update:open="createOpen = $event"
      @created="loadSkills"
    />
  </div>
</template>
