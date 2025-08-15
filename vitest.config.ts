import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  },
  resolve: {
    alias: {
      '@tvc/rrl-core': '/home/ubuntu/repos/TVC/packages/rrl-core/src/index.ts'
    }
  }
})
