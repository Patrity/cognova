---
tags: []
shared: false
---
# User Preferences

User preferences provide persistent storage for user interface settings and application state across browser sessions.

## Overview

The preferences system uses browser cookies to store user choices, ensuring settings persist even after closing the browser. All preferences are optional with sensible defaults, and the system gracefully handles missing or corrupt preference data.

## How It Works

### Cookie-Based Storage

Preferences are stored in a single cookie named `sb-preferences` with a one-year expiration. The cookie contains a JSON object with preference keys and values.

```
Cookie: sb-preferences
Max Age: 1 year (365 days)
Format: JSON object with partial preferences
```

### The Composable

The `usePreferences()` composable is the primary interface for reading and writing preferences. It leverages Nuxt's `useCookie` composable for reactive cookie access.

**Location:** `/app/composables/usePreferences.ts`

## Preference Reference

The following table lists all available preferences:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `editorMode` | `'editor' \| 'code'` | `'editor'` | Controls whether markdown files display in WYSIWYG editor mode or raw code view |
| `viewSourceMode` | `boolean` | `false` | Toggles source view for markdown documents in the public viewer |
| `lastDocumentPath` | `string \| null` | `null` | Remembers the last opened document path for quick navigation |
| `sidebarOpen` | `boolean` | `true` | Controls whether the main sidebar is expanded or collapsed |
| `docsTreeWidth` | `number` | `16` | Width of the docs file tree panel in rem units |
| `terminalOpen` | `boolean` | `false` | Whether the terminal popover is open |
| `taskStatusFilter` | `TaskStatus \| 'all'` | `'all'` | Last selected status filter on the tasks page |
| `taskProjectFilter` | `string \| null` | `null` | Last selected project filter on the tasks page |
| `agentStatsPeriod` | `'24h' \| '7d' \| '30d'` | `'7d'` | Selected time period for agent and hook statistics |

## Using Preferences in Components

### Basic Usage with Computed Refs

The composable exposes pre-built computed refs for each preference. These are two-way bindable and automatically sync to the cookie.

```vue
<script setup lang="ts">
const { sidebarOpen } = usePreferences()

// Read the current value
console.log(sidebarOpen.value) // true

// Update the value (automatically persisted)
sidebarOpen.value = false
</script>

<template>
  <UButton @click="sidebarOpen = !sidebarOpen">
    Toggle Sidebar
  </UButton>
</template>
```

### Using get() and set() for Raw Access

For more control or dynamic key access, use the `get()` and `set()` functions:

```vue
<script setup lang="ts">
const { get, set } = usePreferences()

// Read any preference
const mode = get('editorMode') // 'editor' | 'code'

// Write any preference
set('editorMode', 'code')
</script>
```

### Syncing Local Refs with Preferences

A common pattern is to use a local ref for component state while keeping it synchronized with preferences:

```vue
<script setup lang="ts">
const { terminalOpen } = usePreferences()

// Initialize local ref from preference
const isOpen = ref(terminalOpen.value)

// Sync changes back to preference
watch(isOpen, (open) => {
  terminalOpen.value = open
})
</script>
```

### Real-World Example: Editor Mode Toggle

From `DocumentEditor.vue`:

```vue
<script setup lang="ts">
// Get the preference
const { editorMode } = usePreferences()

// Create a computed for the switch component
const isEditorMode = computed({
  get: () => editorMode.value === 'editor',
  set: v => editorMode.value = v ? 'editor' : 'code'
})
</script>

<template>
  <USwitch
    v-model="isEditorMode"
    unchecked-icon="i-lucide-code"
    checked-icon="i-lucide-pencil"
    :label="isEditorMode ? 'Editor Mode' : 'Code Mode'"
  />
</template>
```

### Real-World Example: Filter Persistence

From `tasks.vue`:

```vue
<script setup lang="ts">
const { taskStatusFilter, taskProjectFilter } = usePreferences()

// Initialize select values from preferences
const statusFilter = ref(
  taskStatusFilter.value === 'all' ? ALL_VALUE : taskStatusFilter.value
)

// Sync changes to preferences and filters
watch(statusFilter, (value) => {
  filters.status = value === ALL_VALUE ? undefined : value as TaskStatus
  taskStatusFilter.value = value === ALL_VALUE ? 'all' : value as TaskStatus
})
</script>
```

## Session Persistence

Preferences persist across:

- Page navigations within the app
- Browser tab/window closes
- Full browser restarts
- Device reboots

The cookie's one-year expiration ensures long-term persistence. Users can clear preferences by:

1. Clearing browser cookies
2. Using browser developer tools to delete the `sb-preferences` cookie

## Adding New Preferences

Follow these steps to add a new preference:

### 1. Update the Interface

Add the new preference key to the `Preferences` interface:

```typescript
// app/composables/usePreferences.ts

interface Preferences {
  // ... existing preferences

  // Add your new preference with appropriate type
  newPreference: 'option1' | 'option2'
}
```

### 2. Add a Default Value

Add a default value to the `defaults` object:

```typescript
const defaults: Preferences = {
  // ... existing defaults
  newPreference: 'option1'
}
```

### 3. Create a Computed Ref (Optional but Recommended)

For commonly accessed preferences, add a computed ref for convenient usage:

```typescript
const newPreference = computed({
  get: () => get('newPreference'),
  set: v => set('newPreference', v)
})

return {
  // ... existing returns
  newPreference
}
```

### 4. Document the Preference

Update this documentation to include the new preference in the reference table.

### Example: Adding a Theme Preference

```typescript
interface Preferences {
  // ... existing
  theme: 'light' | 'dark' | 'system'
}

const defaults: Preferences = {
  // ... existing
  theme: 'system'
}

export function usePreferences() {
  // ... existing code

  const theme = computed({
    get: () => get('theme'),
    set: v => set('theme', v)
  })

  return {
    // ... existing returns
    theme
  }
}
```

## Implementation Details

### Type Safety

The composable uses TypeScript generics to ensure type safety:

```typescript
function get<K extends keyof Preferences>(key: K): Preferences[K]
function set<K extends keyof Preferences>(key: K, value: Preferences[K])
```

This means:
- `get('editorMode')` returns `'editor' | 'code'`
- `set('editorMode', 'invalid')` produces a TypeScript error

### Partial Storage

The cookie only stores preferences that differ from defaults. The `get()` function falls back to defaults for missing keys:

```typescript
function get<K extends keyof Preferences>(key: K): Preferences[K] {
  return cookie.value[key] ?? defaults[key]
}
```

### Reactive Updates

Changes to preferences are immediately reactive thanks to Nuxt's `useCookie` composable. Components using preferences will automatically re-render when values change.

## Components Using Preferences

The following components and pages currently use the preferences system:

| Component/Page | Preferences Used |
|----------------|------------------|
| `layouts/dashboard.vue` | `sidebarOpen` |
| `pages/docs.vue` | `lastDocumentPath` |
| `pages/tasks.vue` | `taskStatusFilter`, `taskProjectFilter` |
| `pages/agents/index.vue` | `agentStatsPeriod` |
| `pages/hooks.vue` | `agentStatsPeriod` |
| `pages/view/[uuid].vue` | `viewSourceMode` |
| `components/editor/DocumentEditor.vue` | `editorMode` |
| `components/TerminalPopover.client.vue` | `terminalOpen` |

## Best Practices

1. **Use defaults wisely** - Choose defaults that work for most users without configuration.

2. **Keep preferences granular** - Store individual settings rather than complex nested objects.

3. **Validate on read** - If a preference might have invalid values (e.g., from old app versions), validate when reading.

4. **Consider privacy** - Preferences are stored in cookies, which are sent with requests. Avoid storing sensitive data.

5. **Use local refs for frequent updates** - For values that change frequently (like during drag operations), use a local ref and sync on completion.
