/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_VERSION?: string;
  /** Match backend CACHE_PAYLOAD_VERSION — busts CDN cache on engine deploys. */
  readonly VITE_PANCHANGA_CACHE_VERSION?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_SENTRY_DSN?: string;
  /** R2 static data (https://static.vedicpatro.com); unset = everything from the API. */
  readonly VITE_STATIC_DATA_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
