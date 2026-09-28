import type { RoomId } from "@htlm/game-domain";
import type { RoomState, RoomStateStore } from "./room-state-store.js";

export class InMemoryRoomStateStore implements RoomStateStore {
  readonly #rooms = new Map<RoomId, RoomState>();

  create(state: RoomState): Promise<void> {
    if (this.#rooms.has(state.roomId)) {
      return Promise.reject(new Error(`Room already exists: ${state.roomId}`));
    }
    this.#rooms.set(state.roomId, structuredClone(state));
    return Promise.resolve();
  }

  get(roomId: RoomId): Promise<RoomState | undefined> {
    const state = this.#rooms.get(roomId);
    return Promise.resolve(state === undefined ? undefined : structuredClone(state));
  }

  getByCode(roomCode: string): Promise<RoomState | undefined> {
    const state = [...this.#rooms.values()].find((room) => room.roomCode === roomCode);
    return Promise.resolve(state === undefined ? undefined : structuredClone(state));
  }

  mutateByCode(
    roomCode: string,
    mutate: (state: RoomState) => RoomState
  ): Promise<RoomState | undefined> {
    const current = [...this.#rooms.values()].find((room) => room.roomCode === roomCode);
    if (!current) return Promise.resolve(undefined);
    const updated = mutate(structuredClone(current));
    this.#rooms.set(updated.roomId, structuredClone(updated));
    return Promise.resolve(structuredClone(updated));
  }

  set(state: RoomState): Promise<void> {
    this.#rooms.set(state.roomId, structuredClone(state));
    return Promise.resolve();
  }

  delete(roomId: RoomId): Promise<boolean> {
    return Promise.resolve(this.#rooms.delete(roomId));
  }

  list(): Promise<RoomState[]> {
    return Promise.resolve([...this.#rooms.values()].map((state) => structuredClone(state)));
  }
}
