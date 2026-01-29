import type { TaskStatus } from '~~/shared/types'

interface Preferences {
  // Editor preferences
  editorMode: 'editor' | 'code'
  viewSourceMode: boolean

  // Navigation
  lastDocumentPath: string | null

  // Layout
  sidebarOpen: boolean
  docsTreeWidth: number

  // Task filters
  taskStatusFilter: TaskStatus | 'all'
  taskProjectFilter: string | null

  // Agent stats
  agentStatsPeriod: '24h' | '7d' | '30d'
}

const COOKIE_NAME = 'sb-preferences'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const defaults: Preferences = {
  editorMode: 'editor',
  viewSourceMode: false,
  lastDocumentPath: null,
  sidebarOpen: true,
  docsTreeWidth: 16,
  taskStatusFilter: 'all',
  taskProjectFilter: null,
  agentStatsPeriod: '7d'
}

export function usePreferences() {
  const cookie = useCookie<Partial<Preferences>>(COOKIE_NAME, {
    maxAge: COOKIE_MAX_AGE,
    default: () => ({})
  })

  function get<K extends keyof Preferences>(key: K): Preferences[K] {
    return cookie.value[key] ?? defaults[key]
  }

  function set<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    cookie.value = { ...cookie.value, [key]: value }
  }

  // Convenience computed refs for common preferences
  const editorMode = computed({
    get: () => get('editorMode'),
    set: v => set('editorMode', v)
  })

  const viewSourceMode = computed({
    get: () => get('viewSourceMode'),
    set: v => set('viewSourceMode', v)
  })

  const lastDocumentPath = computed({
    get: () => get('lastDocumentPath'),
    set: v => set('lastDocumentPath', v)
  })

  const sidebarOpen = computed({
    get: () => get('sidebarOpen'),
    set: v => set('sidebarOpen', v)
  })

  const docsTreeWidth = computed({
    get: () => get('docsTreeWidth'),
    set: v => set('docsTreeWidth', v)
  })

  const taskStatusFilter = computed({
    get: () => get('taskStatusFilter'),
    set: v => set('taskStatusFilter', v)
  })

  const taskProjectFilter = computed({
    get: () => get('taskProjectFilter'),
    set: v => set('taskProjectFilter', v)
  })

  const agentStatsPeriod = computed({
    get: () => get('agentStatsPeriod'),
    set: v => set('agentStatsPeriod', v)
  })

  return {
    // Raw access
    get,
    set,

    // Computed refs
    editorMode,
    viewSourceMode,
    lastDocumentPath,
    sidebarOpen,
    docsTreeWidth,
    taskStatusFilter,
    taskProjectFilter,
    agentStatsPeriod
  }
}
