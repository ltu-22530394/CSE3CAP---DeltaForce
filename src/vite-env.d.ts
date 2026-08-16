/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK_API?: string
  readonly VITE_AUTH_REGISTER_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_APPLICATIONS_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
