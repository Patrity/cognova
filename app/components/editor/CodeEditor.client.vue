<script setup lang="ts">
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { markdown } from '@codemirror/lang-markdown'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { vue } from '@codemirror/lang-vue'
import { python } from '@codemirror/lang-python'
import { sql } from '@codemirror/lang-sql'
import { yaml } from '@codemirror/lang-yaml'
import { rust } from '@codemirror/lang-rust'
import { java } from '@codemirror/lang-java'
import { cpp } from '@codemirror/lang-cpp'
import { xml } from '@codemirror/lang-xml'
import { StreamLanguage } from '@codemirror/language'
import { go } from '@codemirror/legacy-modes/mode/go'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'
import type { Extension } from '@codemirror/state'
import type { CodeLanguage } from '~~/shared/types'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: CodeLanguage
  readOnly?: boolean
  placeholder?: string
}>(), {
  language: 'plaintext',
  readOnly: false,
  placeholder: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editorRef = ref<HTMLDivElement>()
let view: EditorView | null = null

const languageCompartment = new Compartment()
const readOnlyCompartment = new Compartment()
const editableCompartment = new Compartment()
const themeCompartment = new Compartment()

const colorMode = useColorMode()

function getLanguageExtension(lang: CodeLanguage): Extension {
  switch (lang) {
    case 'markdown':
      return markdown()
    case 'javascript':
      return javascript()
    case 'typescript':
      return javascript({ typescript: true })
    case 'json':
      return json()
    case 'html':
      return html()
    case 'css':
      return css()
    case 'vue':
      return vue()
    case 'python':
      return python()
    case 'sql':
      return sql()
    case 'yaml':
      return yaml()
    case 'bash':
      return StreamLanguage.define(shell)
    case 'go':
      return StreamLanguage.define(go)
    case 'rust':
      return rust()
    case 'dockerfile':
      return StreamLanguage.define(dockerFile)
    case 'java':
      return java()
    case 'cpp':
      return cpp()
    case 'xml':
      return xml()
    default:
      return []
  }
}

function getThemeExtension(): Extension[] {
  const baseTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px'
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
    },
    '.cm-content': {
      padding: '12px 0'
    },
    '.cm-line': {
      padding: '0 16px'
    },
    '&.cm-focused': {
      outline: 'none'
    }
  })

  // Use One Dark theme for dark mode
  if (colorMode.value === 'dark')
    return [baseTheme, oneDark]

  return [baseTheme]
}

onMounted(() => {
  if (!editorRef.value) return

  const extensions: Extension[] = [
    basicSetup,
    languageCompartment.of(getLanguageExtension(props.language)),
    readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
    editableCompartment.of(EditorView.editable.of(!props.readOnly)),
    themeCompartment.of(getThemeExtension()),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        emit('update:modelValue', update.state.doc.toString())
      }
    })
  ]

  view = new EditorView({
    state: EditorState.create({
      doc: props.modelValue,
      extensions
    }),
    parent: editorRef.value
  })
})

// Watch for external content changes
watch(() => props.modelValue, (newVal) => {
  if (view && newVal !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newVal }
    })
  }
})

// Watch for language changes
watch(() => props.language, (newLang) => {
  if (view) {
    view.dispatch({
      effects: languageCompartment.reconfigure(getLanguageExtension(newLang))
    })
  }
})

// Watch for readOnly changes
watch(() => props.readOnly, (newReadOnly) => {
  if (view) {
    view.dispatch({
      effects: [
        readOnlyCompartment.reconfigure(EditorState.readOnly.of(newReadOnly)),
        editableCompartment.reconfigure(EditorView.editable.of(!newReadOnly))
      ]
    })
  }
})

// Watch for theme changes
watch(() => colorMode.value, () => {
  if (view) {
    view.dispatch({
      effects: themeCompartment.reconfigure(getThemeExtension())
    })
  }
})

onUnmounted(() => {
  view?.destroy()
  view = null
})
</script>

<template>
  <div
    ref="editorRef"
    class="code-editor h-full overflow-hidden"
  />
</template>

<style>
.code-editor .cm-editor {
  height: 100%;
}

/* Light mode */
.code-editor .cm-editor {
  background-color: var(--ui-bg);
}

.code-editor .cm-gutters {
  background-color: var(--ui-bg-muted);
  border-right: 1px solid var(--ui-border);
}

/* Dark mode adjustments are handled by CodeMirror's dark option */
</style>
