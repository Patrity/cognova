<script setup lang="ts">
// Minimal layout for public document viewing
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <UHeader
      title="Second Brain"
      to="/"
    >
      <template #title>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-brain"
            class="size-6 text-primary"
          />
          <span class="font-semibold">Second Brain</span>
        </div>
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <!-- Page Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-default py-4">
      <UContainer>
        <div class="flex items-center justify-center gap-4 text-sm text-dimmed">
          <span>Shared via Second Brain</span>
          <UButton
            icon="i-simple-icons-github"
            to="https://github.com/patrity/second-brain"
            target="_blank"
            variant="ghost"
            size="xs"
            color="neutral"
          />
        </div>
      </UContainer>
    </footer>
  </div>
</template>
