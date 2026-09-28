import { describe, expect, it } from "vitest";
import { HOME_CHARACTER_BY_LEVEL, LEVEL_IDS, type CharacterId } from "@htlm/game-domain";
import type { RoomState } from "../rooms/room-state-store.js";
import { rankTeamScores, toLobbySnapshot } from "../rooms/lobby-service.js";
import { LEVEL_ONE_QUESTIONS } from "./level-one-content.js";
import { LEVEL_TWO_CHALLENGES } from "./level-two-content.js";
import { LEVEL_THREE_ROUNDS } from "./level-three-content.js";
import { LEVEL_FOUR_CHALLENGES } from "./level-four-content.js";
import { LEVEL_FIVE_QUESTIONS } from "./level-five-content.js";
import { LEVEL_SIX_CHALLENGES } from "./level-six-content.js";
import { LEVEL_SEVEN_ROUNDS } from "./level-seven-content.js";

const characters = ["minh", "an", "khoa", "linh", "nam", "vy", "mai"] as const satisfies readonly CharacterId[];

function perfectRoom(): RoomState {
  const teams = characters.map((characterId, index) => ({ teamId: `team-${index + 1}`, teamName: `Đội ${index + 1}`, sessionToken: `private-${index}`, connected: true, socketId: `socket-${index}`, characterId }));
  const scores = Object.fromEntries(teams.map((team) => [team.teamId, 100]));
  return {
    roomId: "room-audit", roomCode: "AUDIT", hostToken: "private-host", phase: "ready", locked: true, teams,
    completedLevelIds: [...LEVEL_IDS],
    levelOne: { phase: "level_result", questionIndex: 2, phaseStartedAt: 1, deadlineAt: null, answers: [], baseScores: { ...scores }, pieceAwarded: true },
    levelTwo: { phase: "level_result", currentRoundIndex: 1, phaseStartedAt: 1, deadlineAt: null, answers: [], openedTiles: [], currentReward: 1000, roundWinnerTeamId: null, roundReward: null, roundResults: [], cooldownUntilByTeam: {}, startedAt: 1, completedAt: 1, baseScores: { ...scores }, pieceAwarded: true },
    levelThree: { phase: "level_result", roundIndex: 1, phaseStartedAt: 1, deadlineAt: null, answers: [], baseScores: { ...scores }, pieceAwarded: true },
    levelFour: { phase: "level_result", challengeIndex: 3, phaseStartedAt: 1, deadlineAt: null, answers: [], baseScores: { ...scores }, pieceAwarded: true },
    levelFive: { phase: "level_result", phaseStartedAt: 1, deadlineAt: null, answers: [], baseScores: { ...scores }, teamProgress: Object.fromEntries(teams.map((team) => [team.teamId, { checkpointProgress: 5, mode: "finished", activeQuestionIndex: null, retryAvailableAt: null, finishedAt: 1, lastAnswerCorrect: true }])), pieceAwarded: true },
    levelSix: { phase: "level_result", stationIndex: 3, phaseStartedAt: 1, deadlineAt: null, answers: [], baseScores: { ...scores }, pieceAwarded: true },
    levelSeven: { phase: "level_result", roundIndex: 3, phaseStartedAt: 1, deadlineAt: null, answers: [], baseScores: { ...scores }, pieceAwarded: true },
    revision: 1, createdAt: 1, updatedAt: 1
  };
}

describe("cross-level scoring and journey invariants", () => {
  it("keeps the configured maximum base score for every level", () => {
    const maxima = [
      LEVEL_ONE_QUESTIONS.reduce((sum, item) => sum + item.points, 0),
      LEVEL_TWO_CHALLENGES.length * 1000,
      LEVEL_THREE_ROUNDS.reduce((sum, item) => sum + item.points, 0),
      LEVEL_FOUR_CHALLENGES.reduce((sum, item) => sum + item.points, 0),
      LEVEL_FIVE_QUESTIONS.reduce((sum, item) => sum + item.points, 0),
      LEVEL_SIX_CHALLENGES.reduce((sum, item) => sum + item.points, 0),
      LEVEL_SEVEN_ROUNDS.reduce((sum, item) => sum + item.points, 0)
    ];
    expect(maxima).toEqual([100, 2000, 100, 100, 100, 100, 100]);
  });

  it("uses the canonical one-to-one home mapping", () => {
    expect(HOME_CHARACTER_BY_LEVEL).toEqual({ "level-1": "minh", "level-2": "an", "level-3": "khoa", "level-4": "linh", "level-5": "nam", "level-6": "vy", "level-7": "mai" });
    expect(new Set(Object.values(HOME_CHARACTER_BY_LEVEL)).size).toBe(7);
  });

  it("gives each team one x2 home result and six x1 results", () => {
    const snapshot = toLobbySnapshot(perfectRoom());
    for (const team of snapshot.scoreboard) {
      expect(team.levelResults).toHaveLength(7);
      expect(team.levelResults.filter((result) => result.multiplier === 2)).toHaveLength(1);
      expect(team.levelResults.filter((result) => result.multiplier === 1)).toHaveLength(6);
      expect(team.levelResults.every((result) => result.finalScore === result.baseScore * result.multiplier)).toBe(true);
      expect(team.totalScore).toBe(800);
      expect(team.totalScore).toBe(team.levelResults.reduce((sum, result) => sum + result.finalScore, 0));
    }
  });

  it("normalizes duplicate completion and piece entries idempotently", () => {
    const room = perfectRoom();
    room.completedLevelIds.push("level-4", "level-7");
    const snapshot = toLobbySnapshot(room);
    expect(snapshot.completedLevelIds).toEqual(LEVEL_IDS);
    expect(snapshot.journey).toEqual({ completedLevels: 7, alliancePiecesCollected: 7, nextLevel: null, journeyComplete: true });
    expect(snapshot.scoreboard.every((team) => team.totalScore === 800)).toBe(true);
  });

  it("derives score server-side and ignores forged score fields", () => {
    const room = Object.assign(perfectRoom(), { multiplier: 99, finalScore: 999_999, totalScore: 999_999 });
    const snapshot = toLobbySnapshot(room);
    expect(snapshot.scoreboard[0]?.totalScore).toBe(800);
    expect(snapshot).not.toHaveProperty("hostToken");
    expect(snapshot.teams[0]).not.toHaveProperty("sessionToken");
  });

  it("ranks equal totals by stable join order without bonus points", () => {
    const ranked = rankTeamScores([{ id: "second", totalScore: 300, joinIndex: 1 }, { id: "first", totalScore: 300, joinIndex: 0 }, { id: "top", totalScore: 400, joinIndex: 2 }]);
    expect(ranked.map((entry) => entry.id)).toEqual(["top", "first", "second"]);
    expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
  });
});
