import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from parent directory (project root)
  const env = loadEnv(mode, resolve(__dirname, '..'), '')
  
  return {
    plugins: [react()],
    server: {
      host: env.CLIENT_HOST || process.env.CLIENT_HOST || '0.0.0.0', // Bind to all interfaces for network access
      port: parseInt(env.CLIENT_PORT || process.env.CLIENT_PORT || '5173', 10),
      strictPort: false, // Allow fallback if port is in use
    },
  }
})
