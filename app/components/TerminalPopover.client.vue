<script setup lang="ts">
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

const isOpen = ref(false)
const terminalRef = ref<HTMLDivElement | null>(null)
const terminal = ref<Terminal | null>(null)
const fitAddon = ref<FitAddon | null>(null)
const initialized = ref(false)

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
    case 'connected':
      return 'i-lucide-wifi'
    case 'connecting':
      return 'i-lucide-loader-2'
    case 'error':
      return 'i-lucide-wifi-off'
    default:
      return 'i-lucide-wifi-off'
  }
})

const statusText = computed(() => {
  switch (status.value) {
    case 'connected':
      return 'Connected'
    case 'connecting':
      return 'Connecting...'
    case 'error':
      return 'Connection error'
    default:
      return 'Disconnected'
  }
})

function initTerminal() {
  if (!terminalRef.value || initialized.value) return

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
  initialized.value = true

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
  if (terminal.value && status.value !== 'connecting')
    connect(terminal.value)
}

let resizeObserver: ResizeObserver | null = null

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      if (!initialized.value) {
        initTerminal()

        if (terminalRef.value) {
          resizeObserver = new ResizeObserver(() => {
            handleResize()
          })
          resizeObserver.observe(terminalRef.value)
        }
      } else {
        handleResize()
        terminal.value?.focus()
      }
    })
  }
})

onUnmounted(() => {
  stopPingInterval()
  disconnect()

  if (resizeObserver)
    resizeObserver.disconnect()

  if (terminal.value)
    terminal.value.dispose()
})
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50">
    <UButton
      :icon="isOpen ? 'i-lucide-x' : 'i-lucide-terminal'"
      size="lg"
      color="primary"
      class="rounded-full!"
      @click="isOpen = !isOpen"
    />

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <div
        v-show="isOpen"
        class="terminal-panel absolute bottom-14 right-0 flex flex-col bg-elevated rounded-lg overflow-hidden shadow-lg border border-default resize"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-default text-sm bg-muted/50">
          <div class="flex items-center gap-2 text-muted">
            <UIcon
              :name="statusIcon"
              :class="[
                'size-4',
                status === 'connecting' && 'animate-spin',
                status === 'connected' && 'text-success',
                status === 'error' && 'text-error'
              ]"
            />
            <span>{{ statusText }}</span>
          </div>
          <div class="flex items-center gap-1">
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
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="isOpen = false"
            />
          </div>
        </div>
        <div ref="terminalRef" class="flex-1 p-1 bg-[#1a1a1a]" />
      </div>
    </Transition>
  </div>
</template>

<style>
.terminal-panel {
  width: clamp(320px, 40vw, 800px);
  height: clamp(200px, 50vh, 600px);
  min-width: 320px;
  min-height: 200px;
  max-width: 90vw;
  max-height: 80vh;
}

.xterm {
  height: 100%;
}

.xterm-viewport {
  overflow-y: auto !important;
}
</style>
