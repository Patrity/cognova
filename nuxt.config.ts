export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxtjs/mdc'
  ],

  ssr: false,

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: '',
    betterAuthSecret: '',
    betterAuthUrl: 'http://localhost:3000',
    knowledgePath: '~/knowledge',
    encryptionKey: '',
    adminEmail: '',
    adminPassword: '',
    adminName: 'Admin'
  },

  routeRules: {
    '/view/**': { ssr: true }
  },

  future: {
    compatibilityVersion: 4
  },

  compatibilityDate: '2025-07-15',

  nitro: {
    preset: 'node-server',
    experimental: {
      websocket: true
    }
  },

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
        braceStyle: '1tbs',
        semi: false
      }
    }
  }
})
