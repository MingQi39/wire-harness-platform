import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, configDir, '')
  const apiProxyTarget =
    process.env.VITE_API_PROXY_TARGET ||
    env.VITE_API_PROXY_TARGET ||
    `http://127.0.0.1:${env.VITE_BACKEND_PORT || '8081'}`

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(configDir, './src'),
      },
    },
    server: {
      host: true,
      port: Number(env.VITE_DEV_PORT || 5173),
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
