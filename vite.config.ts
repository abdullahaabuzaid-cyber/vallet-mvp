import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Path aliases (mirrored in tsconfig.app.json "paths")
const alias = {
  '@common': fileURLToPath(new URL('./common', import.meta.url)),
  '@': fileURLToPath(new URL('./src', import.meta.url)),
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: false }, '/health': 'http://localhost:8080' },
  },
  preview: { host: '0.0.0.0', port: 4173 },
})
