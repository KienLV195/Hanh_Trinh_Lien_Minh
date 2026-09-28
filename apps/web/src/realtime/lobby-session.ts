import type { HostRoomCredentials, PlayerSession } from "@htlm/protocol";

const HOST_PREFIX = "htlm:host:";
const PLAYER_PREFIX = "htlm:player:";

export function saveHostSession(credentials: HostRoomCredentials): void {
  localStorage.setItem(`${HOST_PREFIX}${credentials.roomCode}`, JSON.stringify(credentials));
}

export function loadHostSession(roomCode: string): HostRoomCredentials | null {
  return readSession<HostRoomCredentials>(`${HOST_PREFIX}${roomCode}`);
}

export function savePlayerSession(session: PlayerSession): void {
  localStorage.setItem(`${PLAYER_PREFIX}${session.roomCode}`, JSON.stringify(session));
}

export function loadPlayerSession(roomCode: string): PlayerSession | null {
  return readSession<PlayerSession>(`${PLAYER_PREFIX}${roomCode}`);
}

export function clearPlayerSession(roomCode: string): void {
  localStorage.removeItem(`${PLAYER_PREFIX}${roomCode}`);
}

function readSession<T>(key: string): T | null {
  const value = localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}
