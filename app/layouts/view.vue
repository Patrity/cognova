<script setup lang="ts">
// Minimal layout for public document viewing
</script>

<template>
  <div>
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="flex items-center gap-2"
        >
          <UIcon
            name="i-lucide-brain"
            class="size-6 text-primary"
          />
          <span class="font-semibold">Cognova</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <USeparator
      icon="i-lucide-brain"
      :ui="{ icon: 'text-primary' }"
    />

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          Shared via Cognova
        </p>
      </template>
    </UFooter>
  </div>
</template>
