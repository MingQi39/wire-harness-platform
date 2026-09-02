/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PASSWORD_ENCRYPT_KEY: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_BACKEND_PORT?: string
  readonly VITE_DEV_PORT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  electronAPI?: { platform?: string }
}
