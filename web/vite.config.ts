import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// vboxsf (VirtualBox shared folders) doesn't propagate inotify events reliably,
// so HMR needs polling to notice file changes.
export default defineConfig({
  // GitHub Pages serves this as a project page at /<repo>/, not from the domain root.
  base: process.env.VITE_BASE_PATH ?? '/',
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
