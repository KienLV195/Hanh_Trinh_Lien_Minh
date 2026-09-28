import { describe, expect, it } from "vitest";
import type { CharacterId } from "@htlm/game-domain";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import { LobbyService, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_ONE_QUESTIONS } from "./level-one-content.js";
import { createKeywordPattern, LEVEL_TWO_CHALLENGES } from "./level-two-content.js";

async function setup(characters: CharacterId[] = ["an"]) {
  const service = new LobbyService(new InMemoryRoomStateStore());
  let room = await service.createRoom();
  for (let index = 0; index < characters.length; index += 1) room = await service.join(room.roomCode, `Đội ${index + 1}`, `socket-${index}`);
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  for (let index = 0; index < characters.length; index += 1) room = await service.claimCharacter(room.roomCode, room.teams[index]!.sessionToken, characters[index]!);
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
  return { service, room };
}

async function completeLevelOne(service: LobbyService, initialRoom: Awaited<ReturnType<LobbyService["createRoom"]>>) {
  let room = await service.startLevelOne(initialRoom.roomCode, initialRoom.hostToken, 1_000);
  room = await service.advanceLevelOne(room.roomCode, 5_500);
  let now = 6_000;
  for (const question of LEVEL_ONE_QUESTIONS) {
    for (const team of room.teams) {
      room = await service.submitLevelOneAnswer(room.roomCode, team.sessionToken, question.id, question.correctOptionId, now);
    }
    now += 3_100;
    room = await service.advanceLevelOne(room.roomCode, now);
  }
  return service.returnLevelOneToMap(room.roomCode, room.hostToken);
}

async function startLevelTwo(characters: CharacterId[] = ["an"]) {
  const { service, room } = await setup(characters);
  const ready = await completeLevelOne(service, room);
  let active = await service.startLevelTwo(ready.roomCode, ready.hostToken, 120_000);
  active = await service.advanceLevelTwo(active.roomCode, 124_500);
  return { service, room: active };
}

async function winRound(service: LobbyService, room: Awaited<ReturnType<LobbyService["createRoom"]>>, teamIndex: number, now: number) {
  const challenge = LEVEL_TWO_CHALLENGES[room.levelTwo!.currentRoundIndex]!;
  return service.submitLevelTwoAnswer(room.roomCode, room.teams[teamIndex]!.sessionToken, challenge.id, challenge.keyword, now);
}

describe("Level 2 two-round image reveal", () => {
  it("starts Round 1 with 1000 points", async () => {
    const { room } = await startLevelTwo();
    expect(room.levelTwo).toMatchObject({ phase: "round_active", currentRoundIndex: 0, openedTiles: [], currentReward: 1000 });
  });

  it("reveals one random hidden tile and decreases reward by 100", async () => {
    const { service, room } = await startLevelTwo();
    const opened = await service.revealLevelTwoTile(room.roomCode, room.hostToken);
    expect(opened.levelTwo?.openedTiles).toHaveLength(1);
    expect(opened.levelTwo?.openedTiles[0]).toBeGreaterThanOrEqual(0);
    expect(opened.levelTwo?.openedTiles[0]).toBeLessThan(4);
    expect(opened.levelTwo?.currentReward).toBe(900);
  });

  it("opens all four tiles without duplicates and stops when none remain", async () => {
    const { service, room } = await startLevelTwo();
    let updated = room;
    for (let count = 0; count < 4; count += 1) updated = await service.revealLevelTwoTile(updated.roomCode, updated.hostToken);
    expect(new Set(updated.levelTwo?.openedTiles)).toEqual(new Set([0, 1, 2, 3]));
    expect(updated.levelTwo?.currentReward).toBe(600);
    await expect(service.revealLevelTwoTile(updated.roomCode, updated.hostToken)).rejects.toMatchObject({ code: "TILE_ALREADY_OPEN" });
  });

  it("rejects Player authorization for tile reveal", async () => {
    const { service, room } = await startLevelTwo();
    await expect(service.revealLevelTwoTile(room.roomCode, room.teams[0]!.sessionToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("keeps an incorrect guess in the active round and applies cooldown", async () => {
    const { service, room } = await startLevelTwo();
    const challenge = LEVEL_TWO_CHALLENGES[0]!;
    const updated = await service.submitLevelTwoAnswer(room.roomCode, room.teams[0]!.sessionToken, challenge.id, "sai rồi", 125_000);
    expect(updated.levelTwo?.phase).toBe("round_active");
    expect(updated.levelTwo?.baseScores[room.teams[0]!.teamId]).toBe(0);
    await expect(service.submitLevelTwoAnswer(room.roomCode, room.teams[0]!.sessionToken, challenge.id, challenge.keyword, 125_500)).rejects.toMatchObject({ code: "GUESS_COOLDOWN" });
  });

  it("lets the Host reveal the answer when nobody guesses correctly", async () => {
    const { service, room } = await startLevelTwo();
    const challenge = LEVEL_TWO_CHALLENGES[0]!;
    const revealed = await service.revealLevelTwoAnswer(room.roomCode, room.hostToken, 125_000);
    expect(revealed.levelTwo).toMatchObject({ phase: "round_complete", roundWinnerTeamId: null, roundReward: 0 });
    expect(revealed.levelTwo?.roundResults).toHaveLength(0);
    expect(toLobbySnapshot(revealed).levelTwo?.reveal).toEqual({ keyword: challenge.keyword, winnerTeamId: null, winnerTeamName: null });
    await expect(service.submitLevelTwoAnswer(revealed.roomCode, revealed.teams[0]!.sessionToken, challenge.id, challenge.keyword, 125_001)).rejects.toMatchObject({ code: "GAME_ALREADY_COMPLETED" });
  });

  it("rejects Player authorization for answer reveal", async () => {
    const { service, room } = await startLevelTwo();
    await expect(service.revealLevelTwoAnswer(room.roomCode, room.teams[0]!.sessionToken)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("finishes Round 1 without completing Level 2 and locks later submissions", async () => {
    const { service, room } = await startLevelTwo(["an", "khoa"]);
    const won = await winRound(service, room, 0, 125_000);
    expect(won.levelTwo).toMatchObject({ phase: "round_complete", currentRoundIndex: 0, pieceAwarded: false });
    await expect(winRound(service, won, 1, 125_001)).rejects.toMatchObject({ code: "GAME_ALREADY_COMPLETED" });
  });

  it("accepts only one winner from simultaneous correct guesses", async () => {
    const { service, room } = await startLevelTwo(["an", "khoa"]);
    const challenge = LEVEL_TWO_CHALLENGES[0]!;
    const attempts = await Promise.allSettled(room.teams.map((team) => service.submitLevelTwoAnswer(room.roomCode, team.sessionToken, challenge.id, challenge.keyword, 125_000)));
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    const authoritative = await service.inspect(room.roomCode);
    expect(authoritative.levelTwo?.roundResults).toHaveLength(1);
    expect(Object.values(authoritative.levelTwo?.baseScores ?? {}).filter((score) => score > 0)).toHaveLength(1);
  });

  it("moves to Round 2 and resets board and reward", async () => {
    const { service, room } = await startLevelTwo();
    let updated = await service.revealLevelTwoTile(room.roomCode, room.hostToken);
    updated = await winRound(service, updated, 0, 125_000);
    updated = await service.advanceLevelTwo(updated.roomCode, 126_000, true, updated.hostToken);
    expect(updated.levelTwo).toMatchObject({ phase: "round_active", currentRoundIndex: 1, openedTiles: [], currentReward: 1000, roundWinnerTeamId: null });
  });

  it("uses a different challenge and image in Round 2", async () => {
    const { service, room } = await startLevelTwo();
    let updated = await winRound(service, room, 0, 125_000);
    const roundOne = toLobbySnapshot(updated).levelTwo?.currentChallenge;
    updated = await service.advanceLevelTwo(updated.roomCode, 126_000, true, updated.hostToken);
    const roundTwo = toLobbySnapshot(updated).levelTwo?.currentChallenge;
    expect(roundTwo?.id).not.toBe(roundOne?.id);
    expect(roundTwo?.image).not.toBe(roundOne?.image);
  });

  it("keeps Round 1 winner points in Round 2", async () => {
    const { service, room } = await startLevelTwo();
    let updated = await service.revealLevelTwoTile(room.roomCode, room.hostToken);
    updated = await winRound(service, updated, 0, 125_000);
    updated = await service.advanceLevelTwo(updated.roomCode, 126_000, true, updated.hostToken);
    expect(updated.levelTwo?.baseScores[room.teams[0]!.teamId]).toBe(900);
  });

  it("allows different teams to win the two rounds", async () => {
    const { service, room } = await startLevelTwo(["an", "khoa"]);
    let updated = await winRound(service, room, 0, 125_000);
    updated = await service.advanceLevelTwo(updated.roomCode, 126_000, true, updated.hostToken);
    updated = await service.revealLevelTwoTile(updated.roomCode, updated.hostToken);
    updated = await winRound(service, updated, 1, 127_000);
    expect(updated.levelTwo?.roundResults.map((result) => result.winnerTeamId)).toEqual([room.teams[0]!.teamId, room.teams[1]!.teamId]);
  });

  it("allows one team to win both rounds", async () => {
    const { service, room } = await startLevelTwo();
    let updated = await winRound(service, room, 0, 125_000);
    updated = await service.advanceLevelTwo(updated.roomCode, 126_000, true, updated.hostToken);
    updated = await winRound(service, updated, 0, 127_000);
    expect(updated.levelTwo?.baseScores[room.teams[0]!.teamId]).toBe(2000);
  });

  it("creates Unicode-safe keyword patterns", () => {
    expect(createKeywordPattern("liên minh")).toBe("____ ____");
    expect(createKeywordPattern("đoàn kết")).toBe("____ ___");
    expect(createKeywordPattern("cơ cấu xã hội")).toBe("__ ___ __ ___");
  });

  it("does not leak answers before a round is complete", async () => {
    const { room } = await startLevelTwo();
    const publicLevel = toLobbySnapshot(room).levelTwo;
    const serialized = JSON.stringify(publicLevel);
    expect(publicLevel?.currentChallenge?.hint).toBe(LEVEL_TWO_CHALLENGES[0]!.hint);
    expect(serialized).not.toContain(LEVEL_TWO_CHALLENGES[0]!.keyword);
    expect(serialized).not.toContain("acceptedAnswers");
  });

  it("reveals only Round 1 answer after Round 1 and not Round 2", async () => {
    const { service, room } = await startLevelTwo();
    const won = await winRound(service, room, 0, 125_000);
    const serialized = JSON.stringify(toLobbySnapshot(won).levelTwo);
    expect(serialized).toContain(LEVEL_TWO_CHALLENGES[0]!.keyword);
    expect(serialized).not.toContain(LEVEL_TWO_CHALLENGES[1]!.keyword);
  });

  it("completes Level 2 only after Round 2 and Host confirmation", async () => {
    const { service, room } = await startLevelTwo(["an"]);
    let updated = await winRound(service, room, 0, 125_000);
    updated = await service.advanceLevelTwo(updated.roomCode, 126_000, true, updated.hostToken);
    updated = await winRound(service, updated, 0, 127_000);
    expect(updated.levelTwo).toMatchObject({ phase: "round_complete", pieceAwarded: false });
    updated = await service.advanceLevelTwo(updated.roomCode, 128_000, true, updated.hostToken);
    const result = toLobbySnapshot(updated).levelTwo?.results?.[0];
    expect(updated.levelTwo).toMatchObject({ phase: "level_result", pieceAwarded: true });
    expect(result).toMatchObject({ baseScore: 2000, multiplier: 2, finalScore: 4000 });
  });
});
