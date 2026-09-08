import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')) as {
  version: string
}

// vboxsf (VirtualBox shared folders) doesn't propagate inotify events reliably,
// so HMR needs polling to notice file changes.
export default defineConfig({
  // GitHub Pages serves this as a project page at /<repo>/, not from the domain root.
  base: process.env.VITE_BASE_PATH ?? '/',
  // Single source of truth for the version shown in the footer: package.json.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
