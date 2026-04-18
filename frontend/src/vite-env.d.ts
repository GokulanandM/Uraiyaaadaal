/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MOCK?: string
  /** Optional React Router basename (no trailing slash). */
  readonly VITE_ROUTER_BASENAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
