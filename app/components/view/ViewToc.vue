<script setup lang="ts">
import type { TocLink } from '~~/shared/types'

defineProps<{
  links: TocLink[]
}>()

const activeId = ref<string | null>(null)

function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element)
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]')

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id
          break
        }
      }
    },
    { rootMargin: '-80px 0px -80% 0px' }
  )

  headings.forEach(heading => observer.observe(heading))

  onUnmounted(() => observer.disconnect())
})
</script>

<template>
  <nav
    v-if="links.length"
    class="space-y-1"
  >
    <p class="text-sm font-semibold text-muted mb-3">
      On this page
    </p>

    <template
      v-for="link in links"
      :key="link.id"
    >
      <button
        type="button"
        class="block w-full text-left text-sm py-1 hover:text-primary transition-colors"
        :class="[
          activeId === link.id ? 'text-primary font-medium' : 'text-dimmed',
          link.depth === 2 && 'pl-0',
          link.depth === 3 && 'pl-4',
          link.depth >= 4 && 'pl-8'
        ]"
        @click="scrollToHeading(link.id)"
      >
        {{ link.text }}
      </button>

      <template v-if="link.children?.length">
        <button
          v-for="child in link.children"
          :key="child.id"
          type="button"
          class="block w-full text-left text-sm py-1 hover:text-primary transition-colors pl-4"
          :class="activeId === child.id ? 'text-primary font-medium' : 'text-dimmed'"
          @click="scrollToHeading(child.id)"
        >
          {{ child.text }}
        </button>
      </template>
    </template>
  </nav>

  <div
    v-else
    class="text-sm text-dimmed italic"
  >
    No headings found
  </div>
</template>
