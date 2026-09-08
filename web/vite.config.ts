import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// vboxsf (VirtualBox shared folders) doesn't propagate inotify events reliably,
// so HMR needs polling to notice file changes.
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
})
