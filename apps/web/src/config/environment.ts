import { PROTOCOL_VERSION } from "@htlm/protocol/constants";

const defaultServerOrigin = import.meta.env.DEV ? "http://localhost:3001" : window.location.origin;

export const environment = {
  serverUrl: import.meta.env.VITE_SERVER_URL ?? defaultServerOrigin,
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? defaultServerOrigin,
  protocolVersion: import.meta.env.VITE_PROTOCOL_VERSION ?? PROTOCOL_VERSION,
  mode: import.meta.env.MODE
} as const;
