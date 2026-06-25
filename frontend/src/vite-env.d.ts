/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origen del backend en producción (ej. https://tu-backend.up.railway.app). Vacío en dev. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
