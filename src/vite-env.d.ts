/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COLLAB_SERVER_URL: string;
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
