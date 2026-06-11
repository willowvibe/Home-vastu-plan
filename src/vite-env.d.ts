/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COLLAB_SERVER_URL: string;
  // Q-25: gemini.ts reads VITE_GEMINI_API_KEY via import.meta.env.
  readonly VITE_GEMINI_API_KEY?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
