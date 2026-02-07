import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: parseInt(process.env.WEB_PORT || '10086'),
    proxy: {
      '/v1': {
        target: process.env.API_BASE_URL || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
