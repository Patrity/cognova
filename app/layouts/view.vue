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

      <template #right>
        <UButton
          icon="i-simple-icons-github"
          to="https://github.com/Patrity/cognova"
          target="_blank"
          aria-label="View on GitHub"
          color="neutral"
          variant="ghost"
        />
        <UButton
          icon="i-simple-icons-x"
          to="https://x.com/Patrity/"
          target="_blank"
          aria-label="View Twitter"
          color="neutral"
          variant="ghost"
        />
      </template>
    </UFooter>
  </div>
</template>
