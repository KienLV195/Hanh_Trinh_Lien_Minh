import { describe, expect, it } from "vitest";
import { InMemoryRoomStateStore } from "./in-memory-room-state-store.js";
import type { RoomState } from "./room-state-store.js";

const room: RoomState = {
  roomId: "ROOM01",
  roomCode: "ABC23",
  hostToken: "host-token",
  phase: "lobby",
  locked: false,
  teams: [],
  completedLevelIds: [],
  levelOne: null,
  levelTwo: null,
  levelThree: null,
  levelFour: null,
  levelFive: null,
  levelSix: null,
  levelSeven: null,
  revision: 0,
  createdAt: 1,
  updatedAt: 1
};

describe("InMemoryRoomStateStore", () => {
  it("supports create, read, update, list and delete", async () => {
    const store = new InMemoryRoomStateStore();
    await store.create(room);
    expect(await store.get(room.roomId)).toEqual(room);

    await store.set({ ...room, phase: "paused", revision: 1, updatedAt: 2 });
    expect((await store.get(room.roomId))?.phase).toBe("paused");
    expect(await store.list()).toHaveLength(1);
    expect(await store.delete(room.roomId)).toBe(true);
    expect(await store.get(room.roomId)).toBeUndefined();
  });

  it("does not expose mutable internal state", async () => {
    const store = new InMemoryRoomStateStore();
    await store.create(room);
    const snapshot = await store.get(room.roomId);
    if (snapshot) snapshot.phase = "completed";
    expect((await store.get(room.roomId))?.phase).toBe("lobby");
  });
});
