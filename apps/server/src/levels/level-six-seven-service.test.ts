import { describe, expect, it } from "vitest";
import type { CharacterId } from "@htlm/game-domain";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import {
  LobbyService,
  normalizeLevelSevenAnswer,
  toLobbySnapshot
} from "../rooms/lobby-service.js";
import { createAnswerPattern, LEVEL_SEVEN_ROUNDS } from "./level-seven-content.js";
import { LEVEL_SIX_CHALLENGES } from "./level-six-content.js";

async function startSix(character: CharacterId = "vy") {
  const store = new InMemoryRoomStateStore();
  const service = new LobbyService(store);
  let room = await service.createRoom();
  room = await service.join(room.roomCode, "Đội Demo", "socket");
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  room = await service.claimCharacter(room.roomCode, room.teams[0]!.sessionToken, character);
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
  room = {
    ...room,
    phase: "ready",
    completedLevelIds: ["level-1", "level-2", "level-3", "level-4", "level-5"]
  };
  await store.set(room);
  room = await service.startLevelSix(room.roomCode, room.hostToken, 1_000);
  room = await service.advanceLevelSix(room.roomCode, 5_500);
  return { service, room };
}

async function finishSix(
  service: LobbyService,
  room: Awaited<ReturnType<LobbyService["createRoom"]>>
) {
  let now = 6_000;
  for (const challenge of LEVEL_SIX_CHALLENGES) {
    room = await service.submitLevelSixAnswer(
      room.roomCode,
      room.teams[0]!.sessionToken,
      challenge.id,
      challenge.solution,
      now
    );
    now += 3_100;
    room = await service.advanceLevelSix(room.roomCode, now);
  }
  return room;
}

async function startSeven(character: CharacterId = "mai") {
  const six = await startSix(character);
  let room = await finishSix(six.service, six.room);
  room = await six.service.returnLevelSixToMap(room.roomCode, room.hostToken);
  room = await six.service.startLevelSeven(room.roomCode, room.hostToken, 30_000);
  room = await six.service.advanceLevelSeven(room.roomCode, 34_500);
  return { service: six.service, room };
}

describe("Level 6 knowledge relay", () => {
  it("progresses through the four station types in sequence", async () => {
    const { service, room: initial } = await startSix("mai");
    let room = initial;
    const types: string[] = [];
    let now = 6_000;
    for (const challenge of LEVEL_SIX_CHALLENGES) {
      types.push(room.levelSix ? LEVEL_SIX_CHALLENGES[room.levelSix.stationIndex]!.type : "");
      room = await service.submitLevelSixAnswer(
        room.roomCode,
        room.teams[0]!.sessionToken,
        challenge.id,
        challenge.solution,
        now
      );
      now += 3_100;
      room = await service.advanceLevelSix(room.roomCode, now);
    }
    expect(types).toEqual(["singleChoice", "classification", "ordering", "singleChoice"]);
    expect(room.levelSix?.phase).toBe("level_result");
  });

  it("awards exactly 25 for each correct station", async () => {
    const { service, room } = await startSix("mai");
    const updated = await service.submitLevelSixAnswer(
      room.roomCode,
      room.teams[0]!.sessionToken,
      LEVEL_SIX_CHALLENGES[0].id,
      LEVEL_SIX_CHALLENGES[0].solution,
      6_000
    );
    expect(updated.levelSix?.baseScores[room.teams[0]!.teamId]).toBe(25);
  });

  it("caps the four-station base score at 100", async () => {
    const { service, room } = await startSix("mai");
    const result = await finishSix(service, room);
    expect(result.levelSix?.baseScores[result.teams[0]!.teamId]).toBe(100);
  });

  it("applies Vy home advantage x2", async () => {
    const { service, room } = await startSix("vy");
    const result = await finishSix(service, room);
    expect(toLobbySnapshot(result).levelSix?.results?.[0]).toMatchObject({
      baseScore: 100,
      multiplier: 2,
      finalScore: 200
    });
  });
});

describe("Level 7 picture word game", () => {
  it("contains exactly the three requested image rounds worth 100 base points", () => {
    expect(LEVEL_SEVEN_ROUNDS).toMatchObject([
      { answer: "ĐOÀN KẾT", imageUrls: ["/level-07/doanket.jpg"], points: 30 },
      {
        answer: "CÔNG NGHIỆP HÓA - HIỆN ĐẠI HÓA",
        imageUrls: ["/level-07/cnhhdh.png"],
        points: 40
      },
      { answer: "CƠ CẤU XÃ HỘI", imageUrls: ["/level-07/cocauxahoi.png"], points: 30 }
    ]);
    expect(LEVEL_SEVEN_ROUNDS.reduce((total, round) => total + round.points, 0)).toBe(100);
    expect(LEVEL_SEVEN_ROUNDS.every((round) => round.imageUrls.length === 1)).toBe(true);
  });

  it("generates hidden-letter patterns with Vietnamese characters counted once", () => {
    expect(createAnswerPattern("ĐOÀN KẾT")).toBe("____ ___");
    expect(createAnswerPattern("CƠ CẤU XÃ HỘI")).toBe("__ ___ __ ___");
    expect(createAnswerPattern("CÔNG NGHIỆP HÓA - HIỆN ĐẠI HÓA")).toBe(
      "____ ______ ___ - ____ ___ ___"
    );
  });

  it("awards the configured points without leaking the answer before reveal", async () => {
    const { service, room } = await startSeven("vy");
    const round = LEVEL_SEVEN_ROUNDS[0];
    const active = toLobbySnapshot(room).levelSeven;
    expect(active?.totalRounds).toBe(3);
    expect(active?.currentRound).not.toHaveProperty("answer");
    expect(active?.currentRound).not.toHaveProperty("aliases");
    expect(active?.currentRound?.answerPattern).toBe("____ ___");
    const updated = await service.submitLevelSevenAnswer(
      room.roomCode,
      room.teams[0]!.sessionToken,
      round.id,
      round.answer,
      35_000
    );
    expect(updated.levelSeven?.baseScores[room.teams[0]!.teamId]).toBe(30);
    expect(toLobbySnapshot(updated).levelSeven?.reveal?.answer).toBe(round.answer);
  });

  it("awards 0 for an incorrect typed answer", async () => {
    const { service, room } = await startSeven("vy");
    const updated = await service.submitLevelSevenAnswer(
      room.roomCode,
      room.teams[0]!.sessionToken,
      LEVEL_SEVEN_ROUNDS[0].id,
      "một đáp án sai",
      35_000
    );
    expect(updated.levelSeven?.baseScores[room.teams[0]!.teamId]).toBe(0);
  });

  it("normalizes NFC, casing, whitespace and spaces around hyphens without stripping accents", () => {
    expect(normalizeLevelSevenAnswer("  ĐOÀN   KẾT ")).toBe("đoàn kết");
    expect(normalizeLevelSevenAnswer("CÔNG NGHIỆP HÓA- HIỆN ĐẠI HÓA")).toBe(
      "công nghiệp hóa - hiện đại hóa"
    );
    expect(normalizeLevelSevenAnswer("DOAN KET")).not.toBe(normalizeLevelSevenAnswer("ĐOÀN KẾT"));
  });

  it("rejects a repeated submission without awarding twice", async () => {
    const { service, room } = await startSeven("vy");
    const round = LEVEL_SEVEN_ROUNDS[0];
    await service.submitLevelSevenAnswer(
      room.roomCode,
      room.teams[0]!.sessionToken,
      round.id,
      round.answer,
      35_000
    );
    await expect(
      service.submitLevelSevenAnswer(
        room.roomCode,
        room.teams[0]!.sessionToken,
        round.id,
        round.answer,
        35_001
      )
    ).rejects.toMatchObject({ code: "INVALID_PHASE" });
    expect(
      (await service.inspect(room.roomCode)).levelSeven?.baseScores[room.teams[0]!.teamId]
    ).toBe(30);
  });

  it("applies Mai home advantage x2 across exactly three rounds", async () => {
    const { service, room: initial } = await startSeven("mai");
    let room = initial;
    let now = 35_000;
    for (const round of LEVEL_SEVEN_ROUNDS) {
      room = await service.submitLevelSevenAnswer(
        room.roomCode,
        room.teams[0]!.sessionToken,
        round.id,
        round.answer,
        now
      );
      now += 3_100;
      room = await service.advanceLevelSeven(room.roomCode, now);
    }
    expect(room.levelSeven).toMatchObject({
      phase: "level_result",
      roundIndex: 2,
      pieceAwarded: true
    });
    expect(toLobbySnapshot(room).levelSeven?.results?.[0]).toMatchObject({
      baseScore: 100,
      multiplier: 2,
      finalScore: 200
    });
  });

  it("records Piece #7 once, survives reconnect, and unlocks the Finale", async () => {
    const { service, room: initial } = await startSeven("mai");
    let room = initial;
    let now = 35_000;
    for (const round of LEVEL_SEVEN_ROUNDS) {
      room = await service.submitLevelSevenAnswer(
        room.roomCode,
        room.teams[0]!.sessionToken,
        round.id,
        round.answer,
        now
      );
      now += 3_100;
      room = await service.advanceLevelSeven(room.roomCode, now);
    }
    room = await service.returnLevelSevenToMap(room.roomCode, room.hostToken);
    expect(room.completedLevelIds.filter((levelId) => levelId === "level-7")).toHaveLength(1);

    const team = room.teams[0]!;
    await service.disconnect(team.socketId!);
    room = await service.resumePlayer(room.roomCode, team.sessionToken, "socket-after-level-seven");
    expect(room.completedLevelIds.filter((levelId) => levelId === "level-7")).toHaveLength(1);

    room = await service.enterAllianceCenter(room.roomCode, room.hostToken);
    expect(room.phase).toBe("alliance_center");
  });

  it("restores the same team, character, round and authoritative deadline after reconnect", async () => {
    const { service, room } = await startSeven("mai");
    const team = room.teams[0]!;
    const deadlineAt = room.levelSeven?.deadlineAt;
    await service.disconnect("socket");
    const resumed = await service.resumePlayer(
      room.roomCode,
      team.sessionToken,
      "socket-reconnected"
    );
    expect(resumed.teams).toHaveLength(1);
    expect(resumed.teams[0]).toMatchObject({
      teamId: team.teamId,
      characterId: "mai",
      connected: true,
      socketId: "socket-reconnected"
    });
    expect(resumed.levelSeven).toMatchObject({
      phase: "round_active",
      roundIndex: 0,
      deadlineAt
    });
  });
});
