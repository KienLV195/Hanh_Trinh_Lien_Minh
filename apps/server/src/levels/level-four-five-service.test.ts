import { describe, expect, it } from "vitest";
import type { CharacterId } from "@htlm/game-domain";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import { LobbyService, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_FOUR_CHALLENGES } from "./level-four-content.js";

async function ready(characters: CharacterId[]) {
  const store = new InMemoryRoomStateStore();
  const service = new LobbyService(store);
  let room = await service.createRoom();
  for (let index = 0; index < characters.length; index++) room = await service.join(room.roomCode, `Đội ${index + 1}`, `socket-${index}`);
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  for (let index = 0; index < characters.length; index++) room = await service.claimCharacter(room.roomCode, room.teams[index]!.sessionToken, characters[index]!);
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
  room = { ...room, phase: "ready", completedLevelIds: ["level-1", "level-2", "level-3"] };
  await store.set(room);
  return { service, room };
}

async function startFour(characters: CharacterId[] = ["linh"]) {
  const setup = await ready(characters);
  let room = await setup.service.startLevelFour(setup.room.roomCode, setup.room.hostToken, 1_000);
  room = await setup.service.advanceLevelFour(room.roomCode, 5_500);
  return { service: setup.service, room };
}

async function finishFour(service: LobbyService, room: Awaited<ReturnType<LobbyService["createRoom"]>>) {
  let now = 6_000;
  for (const challenge of LEVEL_FOUR_CHALLENGES) {
    for (const team of room.teams) room = await service.submitLevelFourAnswer(room.roomCode, team.sessionToken, challenge.id, challenge.solution, now);
    now += 3_100;
    room = await service.advanceLevelFour(room.roomCode, now);
  }
  return service.returnLevelFourToMap(room.roomCode, room.hostToken);
}

describe("Level 4 authoritative matching", () => {
  it("awards 25 for a fully correct match and hides the solution", async () => {
    const { service, room } = await startFour(["nam"]);
    expect(toLobbySnapshot(room).levelFour?.currentChallenge).not.toHaveProperty("solution");
    const updated = await service.submitLevelFourAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_FOUR_CHALLENGES[0].id, LEVEL_FOUR_CHALLENGES[0].solution, 6_000);
    expect(updated.levelFour?.baseScores[room.teams[0]!.teamId]).toBe(25);
  });

  it("awards 0 for an incorrect complete matching", async () => {
    const { service, room } = await startFour(["nam"]);
    const updated = await service.submitLevelFourAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_FOUR_CHALLENGES[0].id, { matches: [{ leftId: "l1", rightId: "r2" }, { leftId: "l2", rightId: "r1" }, { leftId: "l3", rightId: "r3" }] }, 6_000);
    expect(updated.levelFour?.baseScores[room.teams[0]!.teamId]).toBe(0);
  });

  it("applies Linh x2 at the result", async () => {
    const { service, room } = await startFour(["linh"]);
    const result = await finishFour(service, room);
    expect(toLobbySnapshot(result).levelFour?.results?.[0]).toMatchObject({ baseScore: 100, multiplier: 2, finalScore: 200 });
  });
});

/* Level 05 coverage moved to level-five-platformer-service.test.ts.
describe("Level 5 authoritative flag progress", () => {
  it("advances exactly one step for a correct answer and hides the correct option", async () => {
    const { service, room } = await startFive("linh");
    expect(toLobbySnapshot(room).levelFive?.currentQuestion).not.toHaveProperty("correctOptionId");
    const question = LEVEL_FIVE_QUESTIONS[0]!;
    const updated = await service.submitLevelFiveAnswer(room.roomCode, room.teams[0]!.sessionToken, question.id, question.correctOptionId, 35_000);
    expect(updated.levelFive?.progress[room.teams[0]!.teamId]).toBe(1);
    expect(updated.levelFive?.baseScores[room.teams[0]!.teamId]).toBe(20);
  });

  it("does not advance for an incorrect answer", async () => {
    const { service, room } = await startFive("linh");
    const updated = await service.submitLevelFiveAnswer(room.roomCode, room.teams[0]!.sessionToken, LEVEL_FIVE_QUESTIONS[0]!.id, "d", 35_000);
    expect(updated.levelFive?.progress[room.teams[0]!.teamId]).toBe(0);
  });

  it("rejects duplicate submission before it can advance twice", async () => {
    const { service, room } = await startFour(["nam", "linh"]);
    const readyRoom = await finishFour(service, room);
    let five = await service.startLevelFive(readyRoom.roomCode, readyRoom.hostToken, 30_000);
    five = await service.advanceLevelFive(five.roomCode, 34_500);
    const question = LEVEL_FIVE_QUESTIONS[0]!;
    five = await service.submitLevelFiveAnswer(five.roomCode, five.teams[0]!.sessionToken, question.id, question.correctOptionId, 35_000);
    await expect(service.submitLevelFiveAnswer(five.roomCode, five.teams[0]!.sessionToken, question.id, question.correctOptionId, 35_100)).rejects.toMatchObject({ code: "ANSWER_ALREADY_SUBMITTED" } satisfies Partial<LobbyError>);
    expect(five.levelFive?.progress[five.teams[0]!.teamId]).toBe(0);
  });

  it("applies Nam x2 to score but never to movement", async () => {
    const { service, room: initial } = await startFive("nam");
    let room = initial;
    let now = 35_000;
    for (const question of LEVEL_FIVE_QUESTIONS) {
      room = await service.submitLevelFiveAnswer(room.roomCode, room.teams[0]!.sessionToken, question.id, question.correctOptionId, now);
      now += 3_100;
      room = await service.advanceLevelFive(room.roomCode, now);
    }
    expect(room.levelFive?.progress[room.teams[0]!.teamId]).toBe(5);
    expect(toLobbySnapshot(room).levelFive?.results?.[0]).toMatchObject({ baseScore: 100, multiplier: 2, finalScore: 200 });
  });
});
*/
