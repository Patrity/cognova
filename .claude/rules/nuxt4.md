---
paths: "**/*.vue,**/nuxt.config.ts,app/**/*,server/**/*"
---

# Nuxt 4 Development Rules

## Directory Structure (Nuxt 4)

Nuxt 4 uses `app/` as the source root. This is different from Nuxt 3.

```
project/
├── app/                    # Source root (NEW in Nuxt 4)
│   ├── components/
│   ├── composables/
│   ├── layouts/
│   ├── middleware/
│   ├── pages/
│   ├── plugins/
│   ├── assets/
│   ├── app.vue
│   └── app.config.ts
├── shared/                 # Shared between app and server (NEW)
│   ├── types/
│   └── utils/
├── server/                 # Stays at project root
│   ├── api/
│   ├── middleware/
│   └── utils/
├── public/
├── nuxt.config.ts
└── package.json
```

## Import Aliases

- `~/` or `@/` - resolves to `app/` directory
- `~~/` or `@@/` - resolves to project root
- `#imports` - auto-imports
- `#components` - component auto-imports

## Component Patterns

- Always use `<script setup lang="ts">`
- Use `defineProps<T>()` with TypeScript interfaces
- Use `defineEmits<T>()` for typed events
- Use `withDefaults()` for prop defaults

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const emit = defineEmits<{
  update: [value: number]
}>()
</script>
```

### Component Naming

Nuxt auto-generates component names from `directory + filename` with **duplicate segments removed**.

**Directory prefix becomes part of the name:**
```
app/components/
├── MyComponent.vue          → <MyComponent />
├── chat/
│   ├── Input.vue            → <ChatInput />
│   └── MessageBubble.vue    → <ChatMessageBubble />
├── settings/
│   ├── ProviderCard.vue     → <SettingsProviderCard />
│   └── GeneralForm.vue      → <SettingsGeneralForm />
```

**DO NOT repeat the directory name in the filename:**
```
app/components/
├── agents/
│   ├── Card.vue             → <AgentsCard />      ✅ GOOD
│   ├── AgentsCard.vue       → <AgentsCard />      ❌ BAD (redundant, relies on dedup)
```

Nuxt deduplicates matching segments, so `agents/AgentsFoo.vue` resolves to `<AgentsFoo>` not
`<AgentsAgentsFoo>`. But this is fragile — if the directory is plural (`agents/`) and the
prefix is singular (`Agent`), dedup fails and you get `<AgentsAgentFoo>`.

**Rule: Name files as if the directory prefix is already included.**

## Data Fetching

- Use `useFetch()` for simple requests
- Use `useAsyncData()` for complex scenarios
- Use `$fetch` for client-side only requests (e.g., form submissions, mutations)
- Always handle loading and error states

## Auto-imports

These are auto-imported (don't manually import):
- Vue: `ref`, `reactive`, `computed`, `watch`, `onMounted`, etc.
- Nuxt: `useFetch`, `useAsyncData`, `useRoute`, `useRouter`, `useState`
- Components in `app/components/`
- Composables in `app/composables/`

## Route Rules (SSR vs SPA)

Use route rules to control rendering per-route:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/': { ssr: true },
    '/login': { ssr: false },
    '/register': { ssr: false },
    '/dashboard/**': { ssr: false },
    '/api/**': { cors: true },
  },
})
```

### When to use `ssr: false`
- Auth-protected app pages (no SEO needed)
- Real-time interactive pages (WebSocket connections)
- Pages with browser-only libraries

### When to use `ssr: true`
- Landing pages (SEO important)
- Public document/knowledge sharing pages

## Client-Only Components

### .client.vue / .server.vue Suffixes
Components that access browser APIs should use `.client.vue`. The suffix is **stripped**
from the component name — reference them WITHOUT "Client" or "Server":

```
app/components/
├── chat/
│   ├── Editor.client.vue      # Client-only (browser APIs)
│   ├── Editor.server.vue      # SSR placeholder skeleton
│   └── MessageList.vue        # Normal SSR component
```

```vue
<template>
  <!-- ✅ CORRECT — suffix is NOT part of the name -->
  <ChatEditor :content="content" />

  <!-- ❌ WRONG — never include "Client" or "Server" in the tag -->
  <ChatEditorClient :content="content" />
</template>
```

### ClientOnly Wrapper (Alternative)
```vue
<ClientOnly>
  <SomeComponent />
  <template #fallback>
    <UIcon name="i-lucide-loader-2" class="animate-spin" />
  </template>
</ClientOnly>
```

**Warning:** `ClientOnly` prevents rendering but does NOT prevent module imports from executing. For libraries that access browser APIs at import time, use `.client.vue` instead.

## Skills Reference

Three skills are available for Nuxt development:

### Nuxt Framework (`nuxt-docs`)
Use for Nuxt core concepts: composables, routing, config, deployment.

```bash
python3 .claude/skills/nuxt-docs/fetch.py usefetch
python3 .claude/skills/nuxt-docs/fetch.py routing
python3 .claude/skills/nuxt-docs/fetch.py deployment
```

### Nuxt UI Components (`nuxt-ui-docs`)
Use for Nuxt UI component APIs: props, slots, events.

```bash
python3 .claude/skills/nuxt-ui-docs/fetch.py button
python3 .claude/skills/nuxt-ui-docs/fetch.py modal
```

### Implementation Examples (`nuxt-ui-templates`)
Use for real-world patterns: dashboards, landing pages, SaaS apps.

```bash
python3 .claude/skills/nuxt-ui-templates/fetch.py dashboard --structure
python3 .claude/skills/nuxt-ui-templates/fetch.py dashboard app/layouts/default.vue
```
