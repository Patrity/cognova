<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-default">
    <div class="w-full max-w-md px-4">
      <div class="flex flex-col items-center gap-6 mb-8">
        <div class="flex items-center gap-3">
          <UIcon
            name="i-lucide-brain"
            class="size-10 text-primary"
          />
          <span class="font-bold text-2xl">Second Brain</span>
        </div>
      </div>

      <slot />
    </div>
  </div>
</template>
