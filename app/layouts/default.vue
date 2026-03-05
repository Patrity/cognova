<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { user, logout } = useAuth()

const open = ref(false)

const links = [[{
  label: 'Dashboard',
  icon: 'i-lucide-layout-dashboard',
  to: '/dashboard',
  onSelect: () => { open.value = false }
}, {
  label: 'Chat',
  icon: 'i-lucide-message-square',
  to: '/chat',
  onSelect: () => { open.value = false }
}, {
  label: 'Agents',
  icon: 'i-lucide-bot',
  to: '/agents',
  onSelect: () => { open.value = false }
}, {
  label: 'Tasks',
  icon: 'i-lucide-check-square',
  to: '/tasks',
  onSelect: () => { open.value = false }
}, {
  label: 'Knowledge',
  icon: 'i-lucide-book-open',
  to: '/knowledge',
  onSelect: () => { open.value = false }
}, {
  label: 'Memories',
  icon: 'i-lucide-brain',
  to: '/memories',
  onSelect: () => { open.value = false }
}], [{
  label: 'Settings',
  icon: 'i-lucide-settings',
  to: '/settings',
  onSelect: () => { open.value = false }
}]] satisfies NavigationMenuItem[][]

const userMenuItems = computed(() => [[{
  type: 'label' as const,
  label: user.value?.name || 'User'
}], [{
  label: 'Settings',
  icon: 'i-lucide-settings',
  to: '/settings'
}], [{
  label: 'Log out',
  icon: 'i-lucide-log-out',
  onSelect: () => logout()
}]])

const searchGroups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.flat().map(l => ({
    ...l,
    id: l.to
  }))
}])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <div
          class="flex items-center gap-2 p-2"
          :class="collapsed ? 'justify-center' : ''"
        >
          <UIcon
            name="i-lucide-zap"
            class="size-6 text-primary shrink-0"
          />
          <span
            v-if="!collapsed"
            class="font-bold text-lg"
          >Cognova</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton
          :collapsed="collapsed"
          class="bg-transparent ring-default"
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu
          :items="userMenuItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
        >
          <UButton
            :label="collapsed ? undefined : (user?.name || 'User')"
            :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
            color="neutral"
            variant="ghost"
            block
            :square="collapsed"
            class="data-[state=open]:bg-elevated"
            :ui="{ trailingIcon: 'text-dimmed' }"
          >
            <template #leading>
              <UAvatar
                :alt="user?.name || 'U'"
                size="2xs"
              />
            </template>
          </UButton>
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <slot />
  </UDashboardGroup>
</template>
