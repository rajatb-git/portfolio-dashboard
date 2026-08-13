/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __CHANGELOG__: string;

interface ImportMetaEnv {
  readonly VITE_DB_HOST?: string;
  // Add more env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
