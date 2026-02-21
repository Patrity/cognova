// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/mdc'
  ],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  mdc: {
    highlight: {
      theme: {
        default: 'github-light',
        dark: 'github-dark'
      },
      langs: [
        'typescript',
        'javascript',
        'ts',
        'js',
        'bash',
        'shell',
        'vue',
        'html',
        'css',
        'scss',
        'json',
        'yaml',
        'toml',
        'xml',
        'markdown',
        'md',
        'sql',
        'graphql',
        'python',
        'go',
        'rust',
        'c',
        'cpp',
        'cs',
        'java',
        'dockerfile',
        'diff',
        'kotlin'
      ]
    }
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    public: {
      agentName: process.env.AGENT_NAME || 'Cognova',
      agentTone: process.env.AGENT_TONE || 'casual'
    }
  },

  alias: {
    '@shared': '~/../../shared'
  },

  routeRules: {},

  compatibilityDate: '2025-01-15',

  // Enable WebSocket support for terminal
  nitro: {
    experimental: {
      websocket: true
    },
    // node-pty and discord.js are native/complex modules that can't be bundled
    externals: {
      external: ['node-pty', 'discord.js']
    }
  },

  // Required for UEditor to avoid prosemirror plugin conflicts
  vite: {
    optimizeDeps: {
      include: [
        '@nuxt/ui > prosemirror-state',
        '@nuxt/ui > prosemirror-transform',
        '@nuxt/ui > prosemirror-model',
        '@nuxt/ui > prosemirror-view',
        '@nuxt/ui > prosemirror-gapcursor'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
