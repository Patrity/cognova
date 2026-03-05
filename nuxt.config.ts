export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint'
  ],

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
