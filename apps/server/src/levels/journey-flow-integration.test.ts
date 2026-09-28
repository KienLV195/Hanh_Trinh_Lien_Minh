import { describe, expect, it } from "vitest";
import type { RoomState } from "../rooms/room-state-store.js";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import { LobbyService, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_ONE_QUESTIONS } from "./level-one-content.js";
import { LEVEL_TWO_CHALLENGES } from "./level-two-content.js";
import { LEVEL_THREE_ROUNDS } from "./level-three-content.js";
import { LEVEL_FOUR_CHALLENGES } from "./level-four-content.js";
import { LEVEL_FIVE_QUESTIONS } from "./level-five-content.js";
import { LEVEL_SIX_CHALLENGES } from "./level-six-content.js";
import { LEVEL_SEVEN_ROUNDS } from "./level-seven-content.js";

async function confirmedJourney() {
  const service = new LobbyService(new InMemoryRoomStateStore());
  let room = await service.createRoom();
  room = await service.join(room.roomCode, "Đội Hành Trình", "socket-player");
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  room = await service.claimCharacter(room.roomCode, room.teams[0]!.sessionToken, "minh");
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
  return { service, room };
}

async function completeLevel(service: LobbyService, room: RoomState, level: 1 | 2 | 3 | 4 | 5 | 6 | 7, startAt: number): Promise<RoomState> {
  const token = room.teams[0]!.sessionToken;
  if (level === 1) {
    room = await service.startLevelOne(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelOne(room.roomCode, startAt + 1, true, room.hostToken);
    for (const item of LEVEL_ONE_QUESTIONS) { room = await service.submitLevelOneAnswer(room.roomCode, token, item.id, item.correctOptionId, startAt + 2); room = await service.advanceLevelOne(room.roomCode, startAt + 3, true, room.hostToken); }
    return service.returnLevelOneToMap(room.roomCode, room.hostToken);
  }
  if (level === 2) {
    room = await service.startLevelTwo(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelTwo(room.roomCode, startAt + 1, true, room.hostToken);
    for (const item of LEVEL_TWO_CHALLENGES) { room = await service.submitLevelTwoAnswer(room.roomCode, token, item.id, item.keyword, startAt + 2); room = await service.advanceLevelTwo(room.roomCode, startAt + 3, true, room.hostToken); }
    return service.returnLevelTwoToMap(room.roomCode, room.hostToken);
  }
  if (level === 3) {
    room = await service.startLevelThree(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelThree(room.roomCode, startAt + 1, true, room.hostToken);
    for (const item of LEVEL_THREE_ROUNDS) { room = await service.submitLevelThreeAnswer(room.roomCode, token, item.id, item.answer, startAt + 2); room = await service.advanceLevelThree(room.roomCode, startAt + 3, true, room.hostToken); }
    return service.returnLevelThreeToMap(room.roomCode, room.hostToken);
  }
  if (level === 4) {
    room = await service.startLevelFour(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelFour(room.roomCode, startAt + 1, true, room.hostToken);
    for (const item of LEVEL_FOUR_CHALLENGES) { room = await service.submitLevelFourAnswer(room.roomCode, token, item.id, item.solution, startAt + 2); room = await service.advanceLevelFour(room.roomCode, startAt + 3, true, room.hostToken); }
    return service.returnLevelFourToMap(room.roomCode, room.hostToken);
  }
  if (level === 5) {
    room = await service.startLevelFive(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelFive(room.roomCode, startAt + 1, true, room.hostToken);
    for (let index = 0; index < LEVEL_FIVE_QUESTIONS.length; index += 1) { const item = LEVEL_FIVE_QUESTIONS[index]!; room = await service.reachLevelFiveCheckpoint(room.roomCode, token, index + 1, startAt + 2); room = await service.submitLevelFiveAnswer(room.roomCode, token, item.id, item.correctOptionId, startAt + 3); }
    room = await service.reachLevelFiveFinish(room.roomCode, token, startAt + 4);
    return service.returnLevelFiveToMap(room.roomCode, room.hostToken);
  }
  if (level === 6) {
    room = await service.startLevelSix(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelSix(room.roomCode, startAt + 1, true, room.hostToken);
    for (const item of LEVEL_SIX_CHALLENGES) { room = await service.submitLevelSixAnswer(room.roomCode, token, item.id, item.solution, startAt + 2); room = await service.advanceLevelSix(room.roomCode, startAt + 3, true, room.hostToken); }
    return service.returnLevelSixToMap(room.roomCode, room.hostToken);
  }
  room = await service.startLevelSeven(room.roomCode, room.hostToken, startAt); room = await service.advanceLevelSeven(room.roomCode, startAt + 1, true, room.hostToken);
  for (const item of LEVEL_SEVEN_ROUNDS) { room = await service.submitLevelSevenAnswer(room.roomCode, token, item.id, item.answer, startAt + 2); room = await service.advanceLevelSeven(room.roomCode, startAt + 3, true, room.hostToken); }
  return service.returnLevelSevenToMap(room.roomCode, room.hostToken);
}

describe("full journey integration", () => {
  it("moves confirmed Character Selection to Journey with only Level 1 available", async () => {
    const { room } = await confirmedJourney();
    const snapshot = toLobbySnapshot(room);
    expect(room.phase).toBe("ready");
    expect(snapshot.journey).toEqual({ completedLevels: 0, alliancePiecesCollected: 0, nextLevel: "level-1", journeyComplete: false });
  });

  it("rejects a future locked level", async () => {
    const { service, room } = await confirmedJourney();
    await expect(service.startLevelThree(room.roomCode, room.hostToken)).rejects.toMatchObject({ code: "LEVEL_NOT_READY" });
  });

  it("rejects Alliance Center before all seven pieces are collected", async () => {
    const { service, room } = await confirmedJourney();
    await expect(service.enterAllianceCenter(room.roomCode, room.hostToken)).rejects.toMatchObject({ code: "INVALID_PHASE" });
  });

  it("unlocks exactly one next level and keeps duplicate return idempotent", async () => {
    const { service, room: initial } = await confirmedJourney();
    const room = await completeLevel(service, initial, 1, 1_000);
    const snapshot = toLobbySnapshot(room);
    expect(snapshot.journey).toMatchObject({ completedLevels: 1, alliancePiecesCollected: 1, nextLevel: "level-2" });
    const total = snapshot.scoreboard[0]!.totalScore;
    await expect(service.returnLevelOneToMap(room.roomCode, room.hostToken)).rejects.toMatchObject({ code: "INVALID_PHASE" });
    const afterDuplicate = toLobbySnapshot(await service.inspect(room.roomCode));
    expect(afterDuplicate.journey.alliancePiecesCollected).toBe(1);
    expect(afterDuplicate.scoreboard[0]!.totalScore).toBe(total);
  });

  it("completes the canonical seven-level journey without Level 8", async () => {
    const { service, room: initial } = await confirmedJourney();
    let room = initial;
    for (let level = 1; level <= 7; level += 1) {
      room = await completeLevel(service, room, level as 1 | 2 | 3 | 4 | 5 | 6 | 7, level * 10_000);
      const snapshot = toLobbySnapshot(room);
      expect(snapshot.journey.completedLevels).toBe(level);
      expect(snapshot.journey.alliancePiecesCollected).toBe(level);
      expect(snapshot.journey.nextLevel).toBe(level < 7 ? `level-${level + 1}` : null);
    }
    const snapshot = toLobbySnapshot(room);
    expect(snapshot.phase).toBe("ready");
    expect(snapshot.completedLevelIds).toHaveLength(7);
    expect(snapshot.journey).toEqual({ completedLevels: 7, alliancePiecesCollected: 7, nextLevel: null, journeyComplete: true });
    expect(snapshot.scoreboard[0]?.totalScore).toBe(2750);
  });

  it("enters and restores the authoritative final sequence after 7/7", async () => {
    const { service, room: initial } = await confirmedJourney();
    let room = initial;
    for (let level = 1; level <= 7; level += 1) room = await completeLevel(service, room, level as 1 | 2 | 3 | 4 | 5 | 6 | 7, level * 10_000);

    room = await service.enterAllianceCenter(room.roomCode, room.hostToken);
    expect(room.phase).toBe("alliance_center");
    room = await service.revealFinalResults(room.roomCode, room.hostToken);
    const finalSnapshot = toLobbySnapshot(room);
    expect(finalSnapshot.phase).toBe("final_results");
    expect(finalSnapshot.scoreboard[0]).toMatchObject({ rank: 1, totalScore: 2750, teamName: "Đội Hành Trình", characterId: "minh" });

    const resumed = toLobbySnapshot(await service.inspect(room.roomCode));
    expect(resumed.phase).toBe("final_results");
    expect(resumed.scoreboard).toEqual(finalSnapshot.scoreboard);
    expect((resumed as unknown as Record<string, unknown>)).not.toHaveProperty("finalScoreInput");

    room = await service.completeJourney(room.roomCode, room.hostToken);
    expect(room.phase).toBe("completed");

    const completedSnapshot = toLobbySnapshot(room);
    room = await service.reviewFinalResults(room.roomCode, room.hostToken);
    const reviewedSnapshot = toLobbySnapshot(room);
    expect(reviewedSnapshot.phase).toBe("final_results");
    expect(reviewedSnapshot.scoreboard).toEqual(completedSnapshot.scoreboard);
    expect(reviewedSnapshot.completedLevelIds).toEqual(completedSnapshot.completedLevelIds);
  });
});
