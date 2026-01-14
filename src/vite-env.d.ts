/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_MAPS_API_KEY: string
  readonly VITE_AVIATIONSTACK_API_KEY?: string
  readonly VITE_OPENWEATHER_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
