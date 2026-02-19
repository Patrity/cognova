<script setup lang="ts">
import type { SkillDetail } from '~~/shared/types'

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const skillName = computed(() => route.params.name as string)
const skill = ref<SkillDetail | null>(null)
const loading = ref(true)
const selectedFile = ref('')
const renameOpen = ref(false)

async function loadSkill() {
  loading.value = true
  try {
    const res = await $fetch<{ data: SkillDetail }>(`/api/skills/${skillName.value}`)
    skill.value = res.data

    // Auto-select SKILL.md if exists
    if (!selectedFile.value) {
      const skillMd = res.data.files.find(f => f.name === 'SKILL.md')
      if (skillMd) selectedFile.value = skillMd.path
    }
  } catch {
    toast.add({ title: 'Skill not found', color: 'error' })
    router.push('/skills')
  } finally {
    loading.value = false
  }
}

async function handleToggle() {
  if (!skill.value || skill.value.core) return
  try {
    const res = await $fetch<{ data: { active: boolean } }>(`/api/skills/${skillName.value}/toggle`, {
      method: 'POST'
    })
    skill.value.active = res.data.active
    toast.add({
      title: `${skillName.value} ${res.data.active ? 'enabled' : 'disabled'}`,
      color: 'success'
    })
  } catch {
    toast.add({ title: 'Failed to toggle skill', color: 'error' })
  }
}

function handleRenamed(newName: string) {
  router.replace(`/skills/${newName}`)
}

onMounted(() => loadSkill())
</script>

<template>
  <div class="flex flex-1 min-w-0">
    <!-- File tree sidebar -->
    <UDashboardPanel
      id="skill-filetree"
      collapsible
      resizable
      :min-size="12"
      :default-size="16"
      :max-size="24"
      class="hidden lg:flex"
    >
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <span class="text-sm font-medium truncate">Files</span>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-if="loading"
          class="p-4 space-y-2"
        >
          <USkeleton
            v-for="i in 4"
            :key="i"
            class="h-6 w-full"
          />
        </div>
        <SkillsFileTree
          v-else-if="skill"
          :skill-name="skillName"
          :files="skill.files"
          :selected-path="selectedFile"
          @select="selectedFile = $event"
          @refresh="loadSkill"
        />
      </template>
    </UDashboardPanel>

    <!-- Editor panel -->
    <UDashboardPanel
      id="skill-editor"
      grow
      :ui="{ body: '!p-0' }"
    >
      <template #header>
        <UDashboardNavbar>
          <template #title>
            <NuxtLink
              to="/skills"
              class="text-muted hover:text-default transition-colors"
            >
              <UIcon
                name="i-lucide-arrow-left"
                class="size-4"
              />
            </NuxtLink>
            <span class="font-medium">{{ skillName }}</span>
            <UBadge
              v-if="skill?.core"
              variant="subtle"
              color="primary"
              size="xs"
            >
              Core
            </UBadge>
            <UBadge
              v-if="skill && !skill.active"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              Disabled
            </UBadge>
          </template>
          <template #right>
            <USwitch
              v-if="skill && !skill.core"
              :model-value="skill.active"
              size="sm"
              @update:model-value="handleToggle"
            />
            <UButton
              v-if="skill && !skill.core"
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="sm"
              @click="renameOpen = true"
            />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div
          v-if="loading"
          class="flex-1 flex items-center justify-center h-full"
        >
          <UIcon
            name="i-lucide-loader-2"
            class="size-6 animate-spin text-dimmed"
          />
        </div>
        <div
          v-else-if="!selectedFile"
          class="flex-1 flex items-center justify-center h-full text-dimmed"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-file-code"
              class="size-12 mx-auto mb-4 opacity-50"
            />
            <p>Select a file to edit</p>
          </div>
        </div>
        <SkillsEditor
          v-else
          :key="selectedFile"
          :skill-name="skillName"
          :file-path="selectedFile"
          @saved="loadSkill"
        />
      </template>
    </UDashboardPanel>

    <SkillsRenameModal
      v-if="skill"
      :open="renameOpen"
      :current-name="skillName"
      @update:open="renameOpen = $event"
      @renamed="handleRenamed"
    />
  </div>
</template>
