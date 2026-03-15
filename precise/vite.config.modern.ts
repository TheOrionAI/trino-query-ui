import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Demo app config for modern UI
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist-modern',
  },
})
