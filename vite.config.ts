
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/riwaq-library/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
