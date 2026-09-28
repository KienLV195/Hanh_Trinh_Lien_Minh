import { describe, expect, it } from "vitest";
import { InMemoryRoomStateStore } from "./in-memory-room-state-store.js";
import { LobbyError, LobbyService } from "./lobby-service.js";

async function createLobby() {
  const service = new LobbyService(new InMemoryRoomStateStore());
  const room = await service.createRoom();
  return { service, room };
}

async function createSelection(teamCount = 2) {
  const { service, room } = await createLobby();
  let state = room;
  for (let index = 1; index <= teamCount; index += 1) {
    state = await service.join(room.roomCode, `Đội ${index}`, `socket-${index}`);
  }
  state = await service.setLocked(room.roomCode, room.hostToken, true);
  state = await service.startCharacterSelection(room.roomCode, room.hostToken);
  return { service, room, state };
}

describe("LobbyService", () => {
  it("limits a room to seven teams", async () => {
    const { service, room } = await createLobby();
    for (let index = 1; index <= 7; index += 1) {
      await service.join(room.roomCode, `Đội ${index}`, `socket-${index}`);
    }
    await expect(service.join(room.roomCode, "Đội 8", "socket-8")).rejects.toMatchObject({
      code: "ROOM_FULL"
    });
  });

  it("rejects duplicate team names without case sensitivity", async () => {
    const { service, room } = await createLobby();
    await service.join(room.roomCode, "Sao Mai", "socket-1");
    await expect(service.join(room.roomCode, "  sao mai  ", "socket-2")).rejects.toMatchObject({
      code: "DUPLICATE_TEAM_NAME"
    });
  });

  it("rejects joins while locked", async () => {
    const { service, room } = await createLobby();
    await service.setLocked(room.roomCode, room.hostToken, true);
    await expect(service.join(room.roomCode, "Mầm Xanh", "socket-1")).rejects.toMatchObject({
      code: "LOBBY_LOCKED"
    });
  });

  it("requires the host token for lobby controls", async () => {
    const { service, room } = await createLobby();
    await expect(service.setLocked(room.roomCode, "wrong-token", true)).rejects.toBeInstanceOf(
      LobbyError
    );
    await expect(service.setLocked(room.roomCode, "wrong-token", true)).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });
});

describe("LobbyService character selection", () => {
  it("allows only one team to own a character", async () => {
    const { service, room, state } = await createSelection();
    const [first, second] = state.teams;
    if (!first || !second) throw new Error("Test teams missing");

    await service.claimCharacter(room.roomCode, first.sessionToken, "minh");
    await expect(
      service.claimCharacter(room.roomCode, second.sessionToken, "minh")
    ).rejects.toMatchObject({ code: "CHARACTER_TAKEN" });
  });

  it("changes a team's character in one operation", async () => {
    const { service, room, state } = await createSelection(1);
    const team = state.teams[0];
    if (!team) throw new Error("Test team missing");

    await service.claimCharacter(room.roomCode, team.sessionToken, "minh");
    const changed = await service.claimCharacter(room.roomCode, team.sessionToken, "an");
    expect(changed.teams[0]?.characterId).toBe("an");
    expect(changed.teams.some((candidate) => candidate.characterId === "minh")).toBe(false);
  });

  it("rejects claims outside character selection", async () => {
    const { service, room } = await createLobby();
    const joined = await service.join(room.roomCode, "Đội 1", "socket-1");
    const team = joined.teams[0];
    if (!team) throw new Error("Test team missing");

    await expect(
      service.claimCharacter(room.roomCode, team.sessionToken, "minh")
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
  });

  it("does not confirm an incomplete lineup", async () => {
    const { service, room, state } = await createSelection(2);
    const first = state.teams[0];
    if (!first) throw new Error("Test team missing");
    await service.claimCharacter(room.roomCode, first.sessionToken, "minh");

    await expect(
      service.confirmCharacterSelection(room.roomCode, room.hostToken)
    ).rejects.toMatchObject({ code: "LINEUP_INCOMPLETE" });
  });

  it("confirms and locks a complete lineup", async () => {
    const { service, room, state } = await createSelection(2);
    const [first, second] = state.teams;
    if (!first || !second) throw new Error("Test teams missing");
    await service.claimCharacter(room.roomCode, first.sessionToken, "minh");
    await service.claimCharacter(room.roomCode, second.sessionToken, "an");

    const confirmed = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
    expect(confirmed.phase).toBe("ready");
    await expect(
      service.claimCharacter(room.roomCode, first.sessionToken, "khoa")
    ).rejects.toMatchObject({ code: "LINEUP_LOCKED" });
  });
});
