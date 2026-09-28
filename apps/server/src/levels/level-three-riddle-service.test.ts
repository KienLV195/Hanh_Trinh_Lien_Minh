import { describe, expect, it } from "vitest";
import type { CharacterId } from "@htlm/game-domain";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import { LobbyService, normalizeLevelThreeAnswer, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_ONE_QUESTIONS } from "./level-one-content.js";
import { LEVEL_TWO_CHALLENGES } from "./level-two-content.js";
import { LEVEL_THREE_ROUNDS } from "./level-three-content.js";

async function startLevelThree(characters: CharacterId[] = ["khoa", "an"]) {
  const service = new LobbyService(new InMemoryRoomStateStore());
  let room = await service.createRoom();
  for (let index = 0; index < characters.length; index += 1) room = await service.join(room.roomCode, `Đội ${index + 1}`, `socket-${index}`);
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  for (let index = 0; index < characters.length; index += 1) room = await service.claimCharacter(room.roomCode, room.teams[index]!.sessionToken, characters[index]!);
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);

  room = await service.startLevelOne(room.roomCode, room.hostToken, 1_000);
  room = await service.advanceLevelOne(room.roomCode, 5_500);
  let now = 6_000;
  for (const question of LEVEL_ONE_QUESTIONS) {
    for (const team of room.teams) room = await service.submitLevelOneAnswer(room.roomCode, team.sessionToken, question.id, question.correctOptionId, now);
    room = await service.advanceLevelOne(room.roomCode, now + 3_100);
    now += 4_000;
  }
  room = await service.returnLevelOneToMap(room.roomCode, room.hostToken);

  room = await service.startLevelTwo(room.roomCode, room.hostToken, now);
  room = await service.advanceLevelTwo(room.roomCode, now + 4_500);
  room = await service.submitLevelTwoAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_TWO_CHALLENGES[0].id, LEVEL_TWO_CHALLENGES[0].keyword, now + 5_000);
  room = await service.advanceLevelTwo(room.roomCode, now + 5_001, true, room.hostToken);
  room = await service.submitLevelTwoAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_TWO_CHALLENGES[1].id, LEVEL_TWO_CHALLENGES[1].keyword, now + 5_002);
  room = await service.advanceLevelTwo(room.roomCode, now + 5_003, true, room.hostToken);
  room = await service.returnLevelTwoToMap(room.roomCode, room.hostToken);

  room = await service.startLevelThree(room.roomCode, room.hostToken, 100_000);
  room = await service.advanceLevelThree(room.roomCode, 104_500);
  return { service, room };
}

describe("Level 3 two-round riddle", () => {
  it("publishes exactly two rounds without leaking answers while active", async () => {
    const { room } = await startLevelThree();
    const snapshot = toLobbySnapshot(room).levelThree;
    expect(snapshot).toMatchObject({ phase: "round_active", roundIndex: 0, totalRounds: 2, pieceAwarded: false });
    expect(snapshot?.currentRound).toMatchObject({ type: "parking", parkingSpaces: ["16", "06", "68", "88", "?", "98"] });
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain('"answer"');
    expect(serialized).not.toContain("acceptedAnswers");
  });

  it("normalizes Vietnamese case and whitespace without removing accents", () => {
    expect(normalizeLevelThreeAnswer("  ĐI   CHỢ ")).toBe("đi chợ");
    expect(normalizeLevelThreeAnswer("di cho")).toBe("di cho");
  });

  it("reveals Round 1 without completing the level and accepts one answer per team", async () => {
    const { service, room } = await startLevelThree(["khoa"]);
    const round = LEVEL_THREE_ROUNDS[0];
    const revealed = await service.submitLevelThreeAnswer(room.roomCode, room.teams[0]!.sessionToken, round.id, "87", 105_000);
    expect(revealed.levelThree).toMatchObject({ phase: "round_reveal", roundIndex: 0, pieceAwarded: false });
    expect(toLobbySnapshot(revealed).levelThree?.reveal).toMatchObject({ answer: "87", explanation: round.explanation });
    await expect(service.submitLevelThreeAnswer(revealed.roomCode, revealed.teams[0]!.sessionToken, round.id, "87", 105_001)).rejects.toMatchObject({ code: "INVALID_PHASE" });
  });

  it("requires Host confirmation to move to Round 2 and finish", async () => {
    const { service, room } = await startLevelThree(["khoa"]);
    let updated = await service.submitLevelThreeAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_THREE_ROUNDS[0].id, "87", 105_000);
    const scoreAfterRoundOne = updated.levelThree?.baseScores[room.teams[0]!.teamId];
    const unchanged = await service.advanceLevelThree(updated.roomCode, 999_999);
    expect(unchanged.levelThree?.roundIndex).toBe(0);
    expect(unchanged.levelThree?.baseScores[room.teams[0]!.teamId]).toBe(scoreAfterRoundOne);
    updated = await service.advanceLevelThree(updated.roomCode, 105_001, true, updated.hostToken);
    expect(updated.levelThree).toMatchObject({ phase: "round_active", roundIndex: 1, pieceAwarded: false });
    updated = await service.submitLevelThreeAnswer(updated.roomCode, updated.teams[0]!.sessionToken, LEVEL_THREE_ROUNDS[1].id, "  chợ ", 105_002);
    expect(updated.levelThree).toMatchObject({ phase: "round_reveal", pieceAwarded: false });
    updated = await service.advanceLevelThree(updated.roomCode, 105_003, true, updated.hostToken);
    expect(updated.levelThree).toMatchObject({ phase: "level_result", pieceAwarded: true });
    expect(toLobbySnapshot(updated).levelThree?.results?.[0]).toMatchObject({ baseScore: 100, multiplier: 2, finalScore: 200 });
  });

  it("scores wrong answers as zero and unlocks Level 4 after returning to map", async () => {
    const { service, room } = await startLevelThree(["an"]);
    let updated = await service.submitLevelThreeAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_THREE_ROUNDS[0].id, "86", 105_000);
    expect(updated.levelThree?.baseScores[room.teams[0]!.teamId]).toBe(0);
    updated = await service.advanceLevelThree(updated.roomCode, 105_001, true, updated.hostToken);
    updated = await service.submitLevelThreeAnswer(updated.roomCode, updated.teams[0]!.sessionToken, LEVEL_THREE_ROUNDS[1].id, "đi chợ", 105_002);
    updated = await service.advanceLevelThree(updated.roomCode, 105_003, true, updated.hostToken);
    updated = await service.returnLevelThreeToMap(updated.roomCode, updated.hostToken);
    expect(updated.completedLevelIds.filter((id) => id === "level-3")).toHaveLength(1);
    await expect(service.startLevelFour(updated.roomCode, updated.hostToken, 106_000)).resolves.toMatchObject({ phase: "level_4" });
  });
});
