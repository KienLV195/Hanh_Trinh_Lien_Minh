import { describe, expect, it } from "vitest";
import type { CharacterId } from "@htlm/game-domain";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import { LobbyService, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_FIVE_QUESTIONS } from "./level-five-content.js";

async function startFive(characters: CharacterId[] = ["nam"]) {
  const store = new InMemoryRoomStateStore();
  const service = new LobbyService(store);
  let room = await service.createRoom();
  for (let index = 0; index < characters.length; index += 1)
    room = await service.join(room.roomCode, `Đội ${index + 1}`, `socket-${index}`);
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  for (let index = 0; index < characters.length; index += 1)
    room = await service.claimCharacter(
      room.roomCode,
      room.teams[index]!.sessionToken,
      characters[index]!
    );
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
  room = {
    ...room,
    phase: "ready",
    completedLevelIds: ["level-1", "level-2", "level-3", "level-4"]
  };
  await store.set(room);
  room = await service.startLevelFive(room.roomCode, room.hostToken, 1_000);
  room = await service.advanceLevelFive(room.roomCode, 5_500);
  expect(room.levelFive?.levelStartedAt).toBe(5_500);
  return { service, room };
}

async function completeCheckpoint(
  service: LobbyService,
  room: Awaited<ReturnType<LobbyService["createRoom"]>>,
  teamIndex: number,
  checkpointIndex: number,
  now: number
) {
  const team = room.teams[teamIndex]!;
  const question = LEVEL_FIVE_QUESTIONS[checkpointIndex - 1]!;
  room = await service.reachLevelFiveCheckpoint(
    room.roomCode,
    team.sessionToken,
    checkpointIndex,
    now
  );
  return service.submitLevelFiveAnswer(
    room.roomCode,
    team.sessionToken,
    question.id,
    question.correctOptionId,
    now + 1
  );
}

async function completeAll(
  service: LobbyService,
  room: Awaited<ReturnType<LobbyService["createRoom"]>>,
  teamIndex: number,
  startAt: number
) {
  for (let checkpoint = 1; checkpoint <= 5; checkpoint += 1)
    room = await completeCheckpoint(
      service,
      room,
      teamIndex,
      checkpoint,
      startAt + checkpoint * 10
    );
  return room;
}

describe("Level 5 per-team platformer state", () => {
  it("enforces checkpoint order and rejects skips", async () => {
    const { service, room } = await startFive();
    await expect(
      service.reachLevelFiveCheckpoint(room.roomCode, room.teams[0]!.sessionToken, 5, 6_000)
    ).rejects.toMatchObject({ code: "INVALID_OPTION" });
    const reached = await service.reachLevelFiveCheckpoint(
      room.roomCode,
      room.teams[0]!.sessionToken,
      1,
      6_001
    );
    expect(reached.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      checkpointProgress: 0,
      mode: "question",
      activeQuestionIndex: 0
    });
  });

  it("keeps each team independent", async () => {
    const { service, room } = await startFive(["nam", "linh"]);
    const reached = await service.reachLevelFiveCheckpoint(
      room.roomCode,
      room.teams[0]!.sessionToken,
      1,
      6_000
    );
    expect(reached.levelFive?.teamProgress[room.teams[0]!.teamId]?.mode).toBe("question");
    expect(reached.levelFive?.teamProgress[room.teams[1]!.teamId]).toMatchObject({
      checkpointProgress: 0,
      mode: "platforming"
    });
  });

  it("awards 20 once for a correct answer without leaking it", async () => {
    const { service, room } = await startFive();
    let updated = await service.reachLevelFiveCheckpoint(
      room.roomCode,
      room.teams[0]!.sessionToken,
      1,
      6_000
    );
    expect(
      toLobbySnapshot(updated).levelFive?.currentQuestions[room.teams[0]!.teamId]
    ).not.toHaveProperty("correctOptionId");
    updated = await service.submitLevelFiveAnswer(
      updated.roomCode,
      updated.teams[0]!.sessionToken,
      LEVEL_FIVE_QUESTIONS[0].id,
      LEVEL_FIVE_QUESTIONS[0].correctOptionId,
      6_001
    );
    expect(updated.levelFive?.baseScores[room.teams[0]!.teamId]).toBe(20);
    expect(updated.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      checkpointProgress: 1,
      mode: "platforming"
    });
    await expect(
      service.submitLevelFiveAnswer(
        updated.roomCode,
        updated.teams[0]!.sessionToken,
        LEVEL_FIVE_QUESTIONS[0].id,
        LEVEL_FIVE_QUESTIONS[0].correctOptionId,
        6_002
      )
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
  });

  it("scores a wrong answer as zero and enforces a three-second retry cooldown", async () => {
    const { service, room } = await startFive();
    let updated = await service.reachLevelFiveCheckpoint(
      room.roomCode,
      room.teams[0]!.sessionToken,
      1,
      6_000
    );
    updated = await service.submitLevelFiveAnswer(
      updated.roomCode,
      updated.teams[0]!.sessionToken,
      LEVEL_FIVE_QUESTIONS[0].id,
      "a",
      6_001
    );
    expect(updated.levelFive?.baseScores[room.teams[0]!.teamId]).toBe(0);
    expect(updated.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      checkpointProgress: 0,
      mode: "retry_cooldown",
      retryAvailableAt: 9_001
    });
    await expect(
      service.submitLevelFiveAnswer(
        updated.roomCode,
        updated.teams[0]!.sessionToken,
        LEVEL_FIVE_QUESTIONS[0].id,
        LEVEL_FIVE_QUESTIONS[0].correctOptionId,
        9_000
      )
    ).rejects.toMatchObject({ code: "GUESS_COOLDOWN" });
    updated = await service.submitLevelFiveAnswer(
      updated.roomCode,
      updated.teams[0]!.sessionToken,
      LEVEL_FIVE_QUESTIONS[0].id,
      LEVEL_FIVE_QUESTIONS[0].correctOptionId,
      9_001
    );
    expect(updated.levelFive?.baseScores[room.teams[0]!.teamId]).toBe(20);
  });

  it("requires checkpoint 5 before accepting finish", async () => {
    const { service, room } = await startFive();
    await expect(
      service.reachLevelFiveFinish(room.roomCode, room.teams[0]!.sessionToken, 6_000)
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
    const readyForFinish = await completeAll(service, room, 0, 7_000);
    expect(readyForFinish.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      checkpointProgress: 5,
      mode: "final_platforming"
    });
  });

  it("restores authoritative checkpoint progress on reconnect", async () => {
    const { service, room } = await startFive();
    const progressed = await completeCheckpoint(service, room, 0, 1, 6_000);
    const resumed = await service.resumePlayer(
      progressed.roomCode,
      progressed.teams[0]!.sessionToken,
      "new-socket"
    );
    expect(resumed.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      checkpointProgress: 1,
      mode: "platforming"
    });
  });

  it("finishes independently, applies Nam x2, awards Piece 5 once, and unlocks Level 6", async () => {
    const { service, room } = await startFive(["nam", "linh"]);
    let updated = await completeAll(service, room, 0, 7_000);
    updated = await service.reachLevelFiveFinish(
      updated.roomCode,
      updated.teams[0]!.sessionToken,
      8_000
    );
    expect(updated.levelFive).toMatchObject({ phase: "running", pieceAwarded: false });
    expect(updated.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      finishedAt: 8_000,
      completionTimeMs: 2_500,
      finishRank: 1,
      finishBonus: 50,
      knowledgeScore: 100,
      knowledgeMultiplier: 2,
      finalScore: 250
    });
    const resumed = await service.resumePlayer(
      updated.roomCode,
      updated.teams[0]!.sessionToken,
      "reconnected-finish"
    );
    expect(resumed.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      finishRank: 1,
      finishBonus: 50,
      finalScore: 250
    });
    await expect(
      service.reachLevelFiveFinish(updated.roomCode, updated.teams[0]!.sessionToken, 8_500)
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
    updated = await completeAll(service, updated, 1, 9_000);
    updated = await service.reachLevelFiveFinish(
      updated.roomCode,
      updated.teams[1]!.sessionToken,
      10_000
    );
    expect(updated.levelFive).toMatchObject({ phase: "level_result", pieceAwarded: true });
    expect(toLobbySnapshot(updated).levelFive?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamId: room.teams[0]!.teamId,
          baseScore: 100,
          multiplier: 2,
          finishRank: 1,
          finishBonus: 50,
          finalScore: 250
        }),
        expect.objectContaining({
          teamId: room.teams[1]!.teamId,
          baseScore: 100,
          multiplier: 1,
          finishRank: 2,
          finishBonus: 40,
          finalScore: 140
        })
      ])
    );
    expect(
      toLobbySnapshot(updated)
        .scoreboard.find((team) => team.teamId === room.teams[0]!.teamId)
        ?.levelResults.find((result) => result.levelId === "level-5")?.finalScore
    ).toBe(250);
    await expect(
      service.reachLevelFiveFinish(updated.roomCode, updated.teams[1]!.sessionToken, 10_001)
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
    updated = await service.returnLevelFiveToMap(updated.roomCode, updated.hostToken);
    expect(updated.completedLevelIds.filter((id) => id === "level-5")).toHaveLength(1);
    await expect(
      service.startLevelSix(updated.roomCode, updated.hostToken, 11_000)
    ).resolves.toMatchObject({ phase: "level_6" });
  });

  it("assigns unique finish ranks and the seven configured bonuses in server finish order", async () => {
    const { service, room } = await startFive(["minh", "an", "khoa", "linh", "nam", "vy", "mai"]);
    let updated = room;
    for (let index = 0; index < updated.teams.length; index += 1) {
      updated = await completeAll(service, updated, index, 7_000 + index * 1_000);
      updated = await service.reachLevelFiveFinish(
        updated.roomCode,
        updated.teams[index]!.sessionToken,
        8_000 + index * 1_000
      );
    }
    const progress = updated.teams.map((team) => updated.levelFive?.teamProgress[team.teamId]);
    expect(progress.map((item) => item?.finishRank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(progress.map((item) => item?.finishBonus)).toEqual([50, 40, 30, 20, 15, 10, 5]);
    expect(new Set(progress.map((item) => item?.finishedAt)).size).toBe(7);
    expect(updated.levelFive).toMatchObject({ phase: "level_result", pieceAwarded: true });
  });

  it("lets only the host force-complete while preserving real progress and no fake finish data", async () => {
    const { service, room } = await startFive(["nam", "linh"]);
    const progressed = await completeCheckpoint(service, room, 0, 1, 6_000);
    await expect(
      service.forceCompleteLevelFive(progressed.roomCode, progressed.teams[0]!.sessionToken, 7_000)
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    const completed = await service.forceCompleteLevelFive(
      progressed.roomCode,
      progressed.hostToken,
      7_000
    );
    expect(completed.levelFive).toMatchObject({ phase: "level_result", pieceAwarded: true });
    expect(completed.levelFive?.teamProgress[room.teams[0]!.teamId]).toMatchObject({
      checkpointProgress: 1,
      finishRank: null,
      finishBonus: 0
    });
    expect(completed.levelFive?.teamProgress[room.teams[1]!.teamId]).toMatchObject({
      checkpointProgress: 0,
      finishRank: null,
      finishBonus: 0
    });
    expect(toLobbySnapshot(completed).levelFive?.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ teamId: room.teams[0]!.teamId, baseScore: 20, finishRank: null, finishBonus: 0 }),
        expect.objectContaining({ teamId: room.teams[1]!.teamId, baseScore: 0, finishRank: null, finishBonus: 0 })
      ])
    );
    await expect(
      service.reachLevelFiveCheckpoint(completed.roomCode, completed.teams[1]!.sessionToken, 1, 7_001)
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
    const ready = await service.returnLevelFiveToMap(completed.roomCode, completed.hostToken);
    await expect(service.startLevelSix(ready.roomCode, ready.hostToken, 8_000)).resolves.toMatchObject({ phase: "level_6" });
  });
});
