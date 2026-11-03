import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project site base path for this repository.
  base: '/riwaq-library1/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
