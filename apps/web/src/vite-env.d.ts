/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_VERSION?: string;
  /** Match backend CACHE_PAYLOAD_VERSION — busts CDN cache on engine deploys. */
  readonly VITE_PANCHANGA_CACHE_VERSION?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
