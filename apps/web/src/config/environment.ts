import { PROTOCOL_VERSION } from "@htlm/protocol/constants";

export const environment = {
  serverUrl: import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001",
  socketUrl: import.meta.env.VITE_SOCKET_URL ?? "http://localhost:3001",
  protocolVersion: import.meta.env.VITE_PROTOCOL_VERSION ?? PROTOCOL_VERSION,
  mode: import.meta.env.MODE
} as const;
