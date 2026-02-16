import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  outDir: '../dist/cli',
  target: 'node22',
  clean: true,
  splitting: false,
  sourcemap: false,
  noExternal: [/@clack/, /picocolors/],
  banner: {
    js: '#!/usr/bin/env node'
  }
})
