import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
const webPort = parseInt(process.env.WEB_PORT || '10086');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: webPort,
    proxy: {
      '/v1': {
        target: apiBaseUrl,
        changeOrigin: true,
      },
    },
  },
})
