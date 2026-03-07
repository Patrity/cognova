interface Preferences {
  editorMode: 'editor' | 'code'
  viewSourceMode: boolean
  lastKnowledgePath: string | null
}

const COOKIE_NAME = 'cognova-preferences'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const defaults: Preferences = {
  editorMode: 'editor',
  viewSourceMode: false,
  lastKnowledgePath: null
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

  const editorMode = computed({
    get: () => get('editorMode'),
    set: v => set('editorMode', v)
  })

  const viewSourceMode = computed({
    get: () => get('viewSourceMode'),
    set: v => set('viewSourceMode', v)
  })

  const lastKnowledgePath = computed({
    get: () => get('lastKnowledgePath'),
    set: v => set('lastKnowledgePath', v)
  })

  return {
    get,
    set,
    editorMode,
    viewSourceMode,
    lastKnowledgePath
  }
}
