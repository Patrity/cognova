<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  active: boolean
}>()

const terminalRef = ref<HTMLDivElement | null>(null)
const terminal = ref<Terminal | null>(null)
const fitAddon = ref<FitAddon | null>(null)
const terminalInitialized = ref(false)

const {
  status,
  connect,
  disconnect,
  sendInput,
  sendResize,
  startPingInterval,
  stopPingInterval
} = useTerminal()

const statusIcon = computed(() => {
  switch (status.value) {
    case 'connected': return 'i-lucide-wifi'
    case 'connecting': return 'i-lucide-loader-2'
    default: return 'i-lucide-wifi-off'
  }
})

function statusClasses(s: string) {
  return [
    s === 'connecting' && 'animate-spin',
    s === 'connected' && 'text-success',
    (s === 'error' || s === 'disconnected') && 'text-muted'
  ]
}

function initTerminal() {
  if (!terminalRef.value || terminalInitialized.value) return

  const term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    theme: {
      background: '#1a1a1a',
      foreground: '#e5e5e5',
      cursor: '#e5e5e5',
      cursorAccent: '#1a1a1a',
      selectionBackground: '#3b3b3b',
      black: '#1a1a1a',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#6272a4',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#e5e5e5',
      brightBlack: '#4d4d4d',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff'
    }
  })

  const fit = new FitAddon()
  fitAddon.value = fit

  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon())

  term.open(terminalRef.value)
  fit.fit()

  terminal.value = term
  terminalInitialized.value = true

  term.onData((data) => {
    sendInput(data)
  })
  term.onResize(({ cols, rows }) => {
    sendResize(cols, rows)
  })

  connect(term)
  startPingInterval()
}

function handleResize() {
  if (fitAddon.value && terminal.value)
    fitAddon.value.fit()
}

function handleReconnect() {
  if (status.value === 'connecting') return
  if (!terminalInitialized.value) {
    nextTick(initTerminal)
    return
  }
  if (terminal.value)
    connect(terminal.value)
}

let resizeObserver: ResizeObserver | null = null

function setup() {
  if (!terminalInitialized.value) {
    initTerminal()
    if (terminalRef.value) {
      resizeObserver = new ResizeObserver(() => handleResize())
      resizeObserver.observe(terminalRef.value)
    }
  } else {
    handleResize()
    terminal.value?.focus()
  }
}

watch(() => props.active, (active) => {
  if (active) nextTick(setup)
}, { immediate: true })

onUnmounted(() => {
  stopPingInterval()
  disconnect()
  if (resizeObserver) resizeObserver.disconnect()
  if (terminal.value) terminal.value.dispose()
})

defineExpose({ status })
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-default text-sm bg-muted/50">
      <div class="flex items-center gap-2 text-muted text-xs">
        <UIcon
          :name="statusIcon"
          :class="['size-3.5', ...statusClasses(status)]"
        />
        <span>{{ status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : status === 'error' ? 'Connection error' : 'Disconnected' }}</span>
      </div>
      <UButton
        v-if="status === 'disconnected' || status === 'error'"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        @click="handleReconnect"
      >
        Reconnect
      </UButton>
    </div>

    <div
      ref="terminalRef"
      class="flex-1 p-1 bg-[#1a1a1a]"
    />
  </div>
</template>

<style>
.xterm {
  height: 100%;
}

.xterm-viewport {
  overflow-y: auto !important;
}
</style>
