import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: '/skillhub-web/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  server: {
    port: 3000,
    watch: {
      usePolling: true,
      interval: 150,
    },
    proxy: {
      '/skillhub-server': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
