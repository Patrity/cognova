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

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || ''
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
    // node-pty is a native module that can't be bundled
    externals: {
      external: ['node-pty']
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
