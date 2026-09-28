import { describe, expect, it } from "vitest";
import type { CharacterId } from "@htlm/game-domain";
import { InMemoryRoomStateStore } from "../rooms/in-memory-room-state-store.js";
import type { LobbyError} from "../rooms/lobby-service.js";
import { LobbyService, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_ONE_QUESTIONS } from "./level-one-content.js";

async function setup(characters: CharacterId[] = ["an"]) {
  const service = new LobbyService(new InMemoryRoomStateStore());
  let room = await service.createRoom();
  for (let index = 0; index < characters.length; index += 1) {
    room = await service.join(room.roomCode, `Đội ${index + 1}`, `socket-${index}`);
  }
  room = await service.setLocked(room.roomCode, room.hostToken, true);
  room = await service.startCharacterSelection(room.roomCode, room.hostToken);
  for (let index = 0; index < characters.length; index += 1) {
    room = await service.claimCharacter(room.roomCode, room.teams[index]!.sessionToken, characters[index]!);
  }
  room = await service.confirmCharacterSelection(room.roomCode, room.hostToken);
  room = await service.startLevelOne(room.roomCode, room.hostToken, 1_000);
  room = await service.advanceLevelOne(room.roomCode, 5_500);
  return { service, room };
}

async function finishWithCorrectAnswers(character: CharacterId) {
  const { service, room: initial } = await setup([character]);
  let room = initial;
  const team = room.teams[0]!;
  let now = 6_000;
  for (let index = 0; index < LEVEL_ONE_QUESTIONS.length; index += 1) {
    const question = LEVEL_ONE_QUESTIONS[index]!;
    room = await service.submitLevelOneAnswer(room.roomCode, team.sessionToken, question.id, question.correctOptionId, now);
    if (index < LEVEL_ONE_QUESTIONS.length - 1) {
      now += 3_000;
      room = await service.advanceLevelOne(room.roomCode, now);
    }
    now += 100;
  }
  room = await service.advanceLevelOne(room.roomCode, now + 3_000);
  return toLobbySnapshot(room);
}

describe("Level 1 authoritative rules", () => {
  it("awards the configured points for a correct answer", async () => {
    const { service, room } = await setup(["an"]);
    const question = LEVEL_ONE_QUESTIONS[0];
    const updated = await service.submitLevelOneAnswer(room.roomCode, room.teams[0]!.sessionToken, question.id, question.correctOptionId, 6_000);
    expect(updated.levelOne?.baseScores[room.teams[0]!.teamId]).toBe(30);
  });

  it("rejects a duplicate submission", async () => {
    const { service, room } = await setup(["an", "khoa"]);
    const question = LEVEL_ONE_QUESTIONS[0];
    await service.submitLevelOneAnswer(room.roomCode, room.teams[0]!.sessionToken, question.id, "a", 6_000);
    await expect(service.submitLevelOneAnswer(room.roomCode, room.teams[0]!.sessionToken, question.id, "b", 6_100))
      .rejects.toMatchObject({ code: "ANSWER_ALREADY_SUBMITTED" } satisfies Partial<LobbyError>);
  });

  it("rejects an answer at or after the deadline", async () => {
    const { service, room } = await setup(["an"]);
    const question = LEVEL_ONE_QUESTIONS[0];
    await expect(service.submitLevelOneAnswer(room.roomCode, room.teams[0]!.sessionToken, question.id, "a", room.levelOne!.deadlineAt!))
      .rejects.toMatchObject({ code: "ANSWER_LATE" } satisfies Partial<LobbyError>);
  });

  it("does not expose the correct answer before reveal", async () => {
    const { room } = await setup(["an"]);
    const snapshot = toLobbySnapshot(room);
    expect(snapshot.levelOne?.phase).toBe("question_active");
    expect(snapshot.levelOne?.reveal).toBeNull();
    expect(snapshot.levelOne?.currentQuestion).not.toHaveProperty("correctOptionId");
  });

  it("applies Minh's home advantage multiplier x2", async () => {
    const snapshot = await finishWithCorrectAnswers("minh");
    expect(snapshot.levelOne?.results?.[0]).toMatchObject({ baseScore: 100, multiplier: 2, finalScore: 200 });
  });

  it("keeps a non-Minh character at multiplier x1", async () => {
    const snapshot = await finishWithCorrectAnswers("an");
    expect(snapshot.levelOne?.results?.[0]).toMatchObject({ baseScore: 100, multiplier: 1, finalScore: 100 });
  });
});
