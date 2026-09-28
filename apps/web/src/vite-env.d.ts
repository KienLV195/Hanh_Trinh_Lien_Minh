/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_PROTOCOL_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
