import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true
  },
  build: {
    target: 'esnext', // Ensures support for top-level await used in some AI libraries
    outDir: 'dist',
    sourcemap: false
  }
})