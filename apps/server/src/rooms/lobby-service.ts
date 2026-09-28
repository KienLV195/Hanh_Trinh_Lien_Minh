import { randomInt, randomUUID } from "node:crypto";
import {
  getHomeCharacterId,
  isCharacterId,
  LEVEL_IDS,
  MAX_LEVEL_BASE_SCORE,
  type CharacterId,
  type LevelId
} from "@htlm/game-domain";
import type {
  LevelFourSubmission,
  LevelSixSubmission,
  LobbySnapshot,
  LobbyTeamPublic,
  ProtocolErrorPayload,
  TeamScorePublic
} from "@htlm/protocol";
import type { RoomState, RoomStateStore } from "./room-state-store.js";
import { LEVEL_ONE_QUESTIONS, LEVEL_ONE_TIMING } from "../levels/level-one-content.js";
import {
  LEVEL_THREE_ROUNDS,
  LEVEL_THREE_TIMING,
  type LevelThreeRound
} from "../levels/level-three-content.js";
import {
  createKeywordPattern,
  LEVEL_TWO_CHALLENGES,
  LEVEL_TWO_TIMING,
  type LevelTwoChallenge
} from "../levels/level-two-content.js";
import {
  createShuffledRightItemOrder,
  LEVEL_FOUR_CHALLENGES,
  LEVEL_FOUR_TIMING
} from "../levels/level-four-content.js";
import { LEVEL_FIVE_QUESTIONS, LEVEL_FIVE_TIMING } from "../levels/level-five-content.js";
import {
  LEVEL_SIX_CHALLENGES,
  LEVEL_SIX_TIMING,
  type LevelSixChallenge
} from "../levels/level-six-content.js";
import {
  createAnswerPattern,
  LEVEL_SEVEN_ROUNDS,
  LEVEL_SEVEN_TIMING,
  type LevelSevenRound
} from "../levels/level-seven-content.js";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_TEAMS = 7;
const MAX_TEAM_NAME_LENGTH = 32;

export class LobbyError extends Error {
  constructor(
    readonly code: ProtocolErrorPayload["code"],
    message: string
  ) {
    super(message);
    this.name = "LobbyError";
  }
}

function normalizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

function normalizeTeamName(teamName: string): string {
  return teamName.trim().replace(/\s+/g, " ");
}

export function normalizeLevelSevenAnswer(answer: string): string {
  return answer
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, " - ");
}

function isLevelSevenAnswerCorrect(round: LevelSevenRound, answer: string): boolean {
  const normalized = normalizeLevelSevenAnswer(answer);
  return [round.answer, ...round.aliases].some(
    (candidate) => normalizeLevelSevenAnswer(candidate) === normalized
  );
}

function bump(state: RoomState): RoomState {
  return { ...state, revision: state.revision + 1, updatedAt: Date.now() };
}

export function toLobbySnapshot(state: RoomState): LobbySnapshot {
  const teams: LobbyTeamPublic[] = state.teams.map(
    ({ teamId, teamName, connected, characterId }) => ({
      teamId,
      teamName,
      connected,
      characterId
    })
  );
  const levelOne = state.levelOne;
  const question = levelOne ? LEVEL_ONE_QUESTIONS[levelOne.questionIndex] : undefined;
  const reveal =
    levelOne?.phase === "question_reveal" && question
      ? {
          correctOptionId: question.correctOptionId,
          explanation: question.explanation,
          feedback: state.teams.map((team) => {
            const answer = levelOne.answers.find(
              (candidate) =>
                candidate.teamId === team.teamId && candidate.questionId === question.id
            );
            const correct = answer?.optionId === question.correctOptionId;
            return { teamId: team.teamId, correct, pointsAwarded: correct ? question.points : 0 };
          })
        }
      : null;
  const results =
    levelOne?.phase === "level_result"
      ? createResults(state, levelOne.baseScores, "level-1")
      : null;
  const levelTwo = state.levelTwo;
  const challenge = levelTwo ? LEVEL_TWO_CHALLENGES[levelTwo.currentRoundIndex] : undefined;
  const levelTwoWinner = levelTwo?.roundWinnerTeamId
    ? state.teams.find((team) => team.teamId === levelTwo.roundWinnerTeamId)
    : undefined;
  const levelTwoReveal =
    levelTwo?.phase === "round_complete" && challenge
      ? {
          keyword: challenge.keyword,
          winnerTeamId: levelTwoWinner?.teamId ?? null,
          winnerTeamName: levelTwoWinner?.teamName ?? null
        }
      : null;
  const levelTwoResults =
    levelTwo?.phase === "level_result"
      ? createResults(state, levelTwo.baseScores, "level-2")
      : null;
  const levelThree = state.levelThree;
  const levelThreeRound = levelThree ? LEVEL_THREE_ROUNDS[levelThree.roundIndex] : undefined;
  const levelThreeReveal =
    levelThree?.phase === "round_reveal" && levelThreeRound
      ? {
          answer: levelThreeRound.answer,
          explanation: levelThreeRound.explanation,
          feedback: state.teams.map((team) => {
            const answer = levelThree.answers.find(
              (candidate) =>
                candidate.teamId === team.teamId && candidate.roundId === levelThreeRound.id
            );
            const correct = answer
              ? isLevelThreeAnswerCorrect(levelThreeRound, answer.answerText)
              : false;
            return {
              teamId: team.teamId,
              correct,
              pointsAwarded: correct ? levelThreeRound.points : 0
            };
          })
        }
      : null;
  const levelThreeResults =
    levelThree?.phase === "level_result"
      ? createResults(state, levelThree.baseScores, "level-3")
      : null;
  const levelFour = state.levelFour;
  const levelFourChallenge = levelFour
    ? LEVEL_FOUR_CHALLENGES[levelFour.challengeIndex]
    : undefined;
  const levelFourReveal =
    levelFour?.phase === "challenge_reveal" && levelFourChallenge
      ? {
          solution: levelFourChallenge.solution,
          explanation: levelFourChallenge.explanation,
          feedback: state.teams.map((team) => {
            const answer = levelFour.answers.find(
              (candidate) =>
                candidate.teamId === team.teamId && candidate.challengeId === levelFourChallenge.id
            );
            const correct = answer
              ? isMatchingCorrect(levelFourChallenge.solution.matches, answer.solution.matches)
              : false;
            return {
              teamId: team.teamId,
              correct,
              pointsAwarded: correct ? levelFourChallenge.points : 0
            };
          })
        }
      : null;
  const levelFive = state.levelFive;
  const levelSix = state.levelSix;
  const levelSixChallenge = levelSix ? LEVEL_SIX_CHALLENGES[levelSix.stationIndex] : undefined;
  const levelSixReveal =
    levelSix?.phase === "station_reveal" && levelSixChallenge
      ? {
          solution: levelSixChallenge.solution,
          explanation: levelSixChallenge.explanation,
          feedback: state.teams.map((team) => {
            const answer = levelSix.answers.find(
              (item) => item.teamId === team.teamId && item.challengeId === levelSixChallenge.id
            );
            const correct = answer
              ? isLevelSixCorrect(levelSixChallenge.solution, answer.solution)
              : false;
            return {
              teamId: team.teamId,
              correct,
              pointsAwarded: correct ? levelSixChallenge.points : 0
            };
          })
        }
      : null;
  const levelSeven = state.levelSeven;
  const levelSevenRound = levelSeven ? LEVEL_SEVEN_ROUNDS[levelSeven.roundIndex] : undefined;
  const levelSevenReveal =
    levelSeven?.phase === "round_reveal" && levelSevenRound
      ? {
          answer: levelSevenRound.answer,
          explanation: levelSevenRound.explanation,
          feedback: state.teams.map((team) => {
            const answer = levelSeven.answers.find(
              (item) => item.teamId === team.teamId && item.roundId === levelSevenRound.id
            );
            const correct = answer
              ? isLevelSevenAnswerCorrect(levelSevenRound, answer.answerText)
              : false;
            return {
              teamId: team.teamId,
              correct,
              pointsAwarded: correct ? levelSevenRound.points : 0
            };
          })
        }
      : null;
  const completedLevelIds = LEVEL_IDS.filter((levelId) =>
    state.completedLevelIds.includes(levelId)
  );
  const scoreboard = createScoreboard(state);
  const nextLevel = LEVEL_IDS.find((levelId) => !completedLevelIds.includes(levelId)) ?? null;
  return {
    roomCode: state.roomCode,
    phase: state.phase,
    locked: state.locked,
    teamCount: teams.length,
    teams,
    revision: state.revision,
    completedLevelIds,
    scoreboard,
    journey: {
      completedLevels: completedLevelIds.length,
      alliancePiecesCollected: completedLevelIds.length,
      nextLevel,
      journeyComplete: completedLevelIds.length === LEVEL_IDS.length
    },
    levelOne: levelOne
      ? {
          phase: levelOne.phase,
          questionIndex: levelOne.questionIndex,
          totalQuestions: 3,
          phaseStartedAt: levelOne.phaseStartedAt,
          deadlineAt: levelOne.deadlineAt,
          currentQuestion: question
            ? {
                id: question.id,
                prompt: question.prompt,
                options: [...question.options],
                points: question.points,
                demo: true
              }
            : null,
          submittedTeamIds: question
            ? levelOne.answers
                .filter((answer) => answer.questionId === question.id)
                .map((answer) => answer.teamId)
            : [],
          reveal,
          results,
          pieceAwarded: levelOne.pieceAwarded
        }
      : null,
    levelTwo: levelTwo
      ? {
          phase: levelTwo.phase,
          currentRound: (levelTwo.currentRoundIndex + 1) as 1 | 2,
          totalRounds: 2,
          phaseStartedAt: levelTwo.phaseStartedAt,
          deadlineAt: levelTwo.deadlineAt,
          currentChallenge: challenge
            ? {
                id: challenge.id,
                image: challenge.image,
                hint: challenge.hint,
                keywordPattern: createKeywordPattern(challenge.keyword),
                demo: true
              }
            : null,
          openedTiles: [...levelTwo.openedTiles],
          currentReward: levelTwo.currentReward,
          roundWinnerTeamId: levelTwo.roundWinnerTeamId,
          roundReward: levelTwo.roundReward,
          guessedTeamIds: [
            ...new Set(
              levelTwo.answers
                .filter((answer) => answer.challengeId === challenge?.id)
                .map((answer) => answer.teamId)
            )
          ],
          cooldownUntilByTeam: { ...levelTwo.cooldownUntilByTeam },
          reveal: levelTwoReveal,
          roundResults: levelTwo.roundResults.map((result) => {
            const team = state.teams.find((candidate) => candidate.teamId === result.winnerTeamId)!;
            const multiplier =
              team.characterId === getHomeCharacterId("level-2") ? (2 as const) : (1 as const);
            return {
              ...result,
              winnerTeamName: team.teamName,
              multiplier,
              awardedScore: result.baseReward * multiplier
            };
          }),
          results: levelTwoResults,
          pieceAwarded: levelTwo.pieceAwarded
        }
      : null,
    levelThree: levelThree
      ? {
          phase: levelThree.phase,
          roundIndex: levelThree.roundIndex,
          totalRounds: 2,
          phaseStartedAt: levelThree.phaseStartedAt,
          deadlineAt: levelThree.deadlineAt,
          currentRound: levelThreeRound ? toPublicLevelThreeRound(levelThreeRound) : null,
          submittedTeamIds: levelThreeRound
            ? levelThree.answers
                .filter((answer) => answer.roundId === levelThreeRound.id)
                .map((answer) => answer.teamId)
            : [],
          reveal: levelThreeReveal,
          results: levelThreeResults,
          pieceAwarded: levelThree.pieceAwarded
        }
      : null,
    levelFour: levelFour
      ? {
          phase: levelFour.phase,
          challengeIndex: levelFour.challengeIndex,
          totalChallenges: 4,
          phaseStartedAt: levelFour.phaseStartedAt,
          deadlineAt: levelFour.deadlineAt,
          currentChallenge: levelFourChallenge
            ? {
                id: levelFourChallenge.id,
                type: "matching",
                prompt: levelFourChallenge.prompt,
                leftItems: [...levelFourChallenge.leftItems],
                rightItems: (
                  levelFour.rightItemOrderByChallenge[levelFourChallenge.id] ??
                  levelFourChallenge.rightItems.map((item) => item.id)
                ).flatMap((rightItemId) => {
                  const item = levelFourChallenge.rightItems.find(
                    (candidate) => candidate.id === rightItemId
                  );
                  return item ? [item] : [];
                }),
                points: 25,
                demo: true
              }
            : null,
          submittedTeamIds: levelFourChallenge
            ? levelFour.answers
                .filter((answer) => answer.challengeId === levelFourChallenge.id)
                .map((answer) => answer.teamId)
            : [],
          reveal: levelFourReveal,
          results:
            levelFour.phase === "level_result"
              ? createResults(state, levelFour.baseScores, "level-4")
              : null,
          pieceAwarded: levelFour.pieceAwarded
        }
      : null,
    levelFive: levelFive
      ? {
          phase: levelFive.phase,
          totalQuestions: 5,
          phaseStartedAt: levelFive.phaseStartedAt,
          levelStartedAt: levelFive.levelStartedAt,
          deadlineAt: levelFive.deadlineAt,
          teamProgress: levelFive.teamProgress,
          currentQuestions: Object.fromEntries(
            state.teams.map((team) => {
              const teamState = levelFive.teamProgress[team.teamId];
              const question =
                teamState?.activeQuestionIndex === null ||
                teamState?.activeQuestionIndex === undefined
                  ? null
                  : LEVEL_FIVE_QUESTIONS[teamState.activeQuestionIndex];
              return [
                team.teamId,
                question
                  ? {
                      id: question.id,
                      type: "singleChoice" as const,
                      prompt: question.prompt,
                      options: [...question.options],
                      points: 20 as const,
                      demo: true as const
                    }
                  : null
              ];
            })
          ),
          progress: Object.fromEntries(
            state.teams.map((team) => [
              team.teamId,
              levelFive.teamProgress[team.teamId]?.checkpointProgress ?? 0
            ])
          ),
          results: levelFive.phase === "level_result" ? createLevelFiveResults(state) : null,
          pieceAwarded: levelFive.pieceAwarded
        }
      : null,
    levelSix: levelSix
      ? {
          phase: levelSix.phase,
          stationIndex: levelSix.stationIndex,
          totalStations: 4,
          phaseStartedAt: levelSix.phaseStartedAt,
          deadlineAt: levelSix.deadlineAt,
          currentChallenge: levelSixChallenge ? toPublicLevelSixChallenge(levelSixChallenge) : null,
          submittedTeamIds: levelSixChallenge
            ? levelSix.answers
                .filter((answer) => answer.challengeId === levelSixChallenge.id)
                .map((answer) => answer.teamId)
            : [],
          reveal: levelSixReveal,
          results:
            levelSix.phase === "level_result"
              ? createResults(state, levelSix.baseScores, "level-6")
              : null,
          pieceAwarded: levelSix.pieceAwarded
        }
      : null,
    levelSeven: levelSeven
      ? {
          phase: levelSeven.phase,
          roundIndex: levelSeven.roundIndex,
          totalRounds: 3,
          phaseStartedAt: levelSeven.phaseStartedAt,
          deadlineAt: levelSeven.deadlineAt,
          currentRound: levelSevenRound
            ? {
                id: levelSevenRound.id,
                type: "pictureWord",
                prompt: levelSevenRound.prompt,
                imageUrls: [...levelSevenRound.imageUrls],
                answerPattern: createAnswerPattern(levelSevenRound.answer),
                points: levelSevenRound.points,
                demo: true
              }
            : null,
          submittedTeamIds: levelSevenRound
            ? levelSeven.answers
                .filter((answer) => answer.roundId === levelSevenRound.id)
                .map((answer) => answer.teamId)
            : [],
          reveal: levelSevenReveal,
          results:
            levelSeven.phase === "level_result"
              ? createResults(state, levelSeven.baseScores, "level-7")
              : null,
          pieceAwarded: levelSeven.pieceAwarded
        }
      : null
  };
}

export class LobbyService {
  constructor(private readonly store: RoomStateStore) {}

  async createRoom(): Promise<RoomState> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const roomCode = this.#createRoomCode();
      if (await this.store.getByCode(roomCode)) continue;
      const now = Date.now();
      const state: RoomState = {
        roomId: randomUUID(),
        roomCode,
        hostToken: randomUUID(),
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
        createdAt: now,
        updatedAt: now
      };
      await this.store.create(state);
      return state;
    }
    throw new LobbyError("INTERNAL_ERROR", "Không thể tạo mã phòng. Vui lòng thử lại.");
  }

  async inspect(roomCode: string): Promise<RoomState> {
    const state = await this.store.getByCode(normalizeRoomCode(roomCode));
    if (!state) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return state;
  }

  async resumeHost(roomCode: string, hostToken: string): Promise<RoomState> {
    const state = await this.inspect(roomCode);
    this.#requireHost(state, hostToken);
    return state;
  }

  async join(roomCode: string, rawTeamName: string, socketId: string): Promise<RoomState> {
    const code = normalizeRoomCode(roomCode);
    const teamName = normalizeTeamName(rawTeamName);
    if (!teamName || teamName.length > MAX_TEAM_NAME_LENGTH) {
      throw new LobbyError("INVALID_TEAM_NAME", "Tên đội phải có từ 1 đến 32 ký tự.");
    }

    const updated = await this.store.mutateByCode(code, (state) => {
      if (state.locked) throw new LobbyError("LOBBY_LOCKED", "Phòng đã khóa.");
      if (state.teams.length >= MAX_TEAMS) throw new LobbyError("ROOM_FULL", "Phòng đã đủ 7 đội.");
      const duplicate = state.teams.some(
        (team) => team.teamName.toLocaleLowerCase("vi") === teamName.toLocaleLowerCase("vi")
      );
      if (duplicate) throw new LobbyError("DUPLICATE_TEAM_NAME", "Tên đội đã được sử dụng.");
      return bump({
        ...state,
        teams: [
          ...state.teams,
          {
            teamId: randomUUID(),
            teamName,
            sessionToken: randomUUID(),
            connected: true,
            socketId,
            characterId: null
          }
        ]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async resumePlayer(roomCode: string, sessionToken: string, socketId: string): Promise<RoomState> {
    const code = normalizeRoomCode(roomCode);
    const updated = await this.store.mutateByCode(code, (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không còn hợp lệ.");
      return bump({
        ...state,
        teams: state.teams.map((candidate) =>
          candidate.teamId === team.teamId ? { ...candidate, connected: true, socketId } : candidate
        )
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async setLocked(roomCode: string, hostToken: string, locked: boolean): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "lobby") {
        throw new LobbyError("INVALID_PHASE", "Không thể thay đổi khóa phòng lúc này.");
      }
      return bump({ ...state, locked });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async removeTeam(roomCode: string, hostToken: string, teamId: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "lobby") {
        throw new LobbyError("INVALID_PHASE", "Không thể xóa đội sau khi bắt đầu chọn nhân vật.");
      }
      if (state.locked) {
        throw new LobbyError("LOBBY_MUST_BE_UNLOCKED", "Mở lại phòng trước khi xóa đội.");
      }
      if (!state.teams.some((team) => team.teamId === teamId)) {
        throw new LobbyError("TEAM_NOT_FOUND", "Không tìm thấy đội.");
      }
      return bump({ ...state, teams: state.teams.filter((team) => team.teamId !== teamId) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startCharacterSelection(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "lobby") {
        throw new LobbyError("INVALID_PHASE", "Phòng không còn ở giai đoạn chờ.");
      }
      if (!state.locked) {
        throw new LobbyError("LOBBY_LOCKED", "Hãy khóa phòng trước khi chọn nhân vật.");
      }
      if (state.teams.length === 0) {
        throw new LobbyError("LINEUP_INCOMPLETE", "Cần ít nhất một đội để chọn nhân vật.");
      }
      return bump({ ...state, phase: "character_selection" });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async claimCharacter(
    roomCode: string,
    sessionToken: string,
    characterId: CharacterId
  ): Promise<RoomState> {
    if (!isCharacterId(characterId)) {
      throw new LobbyError("CHARACTER_NOT_FOUND", "Không tìm thấy nhân vật.");
    }
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (state.phase === "character_selection_complete" || state.phase === "ready") {
        throw new LobbyError("LINEUP_LOCKED", "Đội hình đã được xác nhận.");
      }
      if (state.phase !== "character_selection") {
        throw new LobbyError("INVALID_PHASE", "Chưa đến giai đoạn chọn nhân vật.");
      }
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không còn hợp lệ.");
      const claimed = state.teams.some(
        (candidate) => candidate.teamId !== team.teamId && candidate.characterId === characterId
      );
      if (claimed) {
        throw new LobbyError("CHARACTER_TAKEN", "Nhân vật này vừa được đội khác chọn.");
      }
      if (team.characterId === characterId) return state;
      return bump({
        ...state,
        teams: state.teams.map((candidate) =>
          candidate.teamId === team.teamId ? { ...candidate, characterId } : candidate
        )
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async confirmCharacterSelection(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "character_selection") {
        throw new LobbyError("INVALID_PHASE", "Không thể xác nhận đội hình lúc này.");
      }
      const selections = state.teams.map((team) => team.characterId);
      if (
        selections.length === 0 ||
        selections.some((characterId) => characterId === null) ||
        new Set(selections).size !== selections.length
      ) {
        throw new LobbyError("LINEUP_INCOMPLETE", "Mỗi đội cần chọn một nhân vật riêng.");
      }
      return bump({ ...state, phase: "ready" });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelOne(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        state.completedLevelIds.length !== 0 ||
        state.levelOne !== null
      ) {
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 1 chưa thể bắt đầu lúc này.");
      }
      const baseScores = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      return bump({
        ...state,
        phase: "level_1",
        levelOne: {
          phase: "intro",
          questionIndex: 0,
          phaseStartedAt: now,
          deadlineAt: now + LEVEL_ONE_TIMING.introMs,
          answers: [],
          baseScores,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelOne(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_1" || !state.levelOne) {
        throw new LobbyError("INVALID_PHASE", "Chặng 1 không hoạt động.");
      }
      const level = state.levelOne;
      const question = LEVEL_ONE_QUESTIONS[level.questionIndex];
      const allAnswered = question
        ? allEligibleTeamsMatch(state, (teamId) =>
            level.answers.some(
              (answer) => answer.teamId === teamId && answer.questionId === question.id
            )
          )
        : false;
      if (
        !force &&
        now < (level.deadlineAt ?? Number.POSITIVE_INFINITY) &&
        !(level.phase === "question_active" && allAnswered)
      ) {
        return state;
      }
      return bump({ ...state, levelOne: advanceLevelState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelOneAnswer(
    roomCode: string,
    sessionToken: string,
    questionId: string,
    optionId: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không còn hợp lệ.");
      const level = state.levelOne;
      const question = level ? LEVEL_ONE_QUESTIONS[level.questionIndex] : undefined;
      if (
        state.phase !== "level_1" ||
        !level ||
        level.phase !== "question_active" ||
        !question ||
        question.id !== questionId
      ) {
        throw new LobbyError("INVALID_PHASE", "Câu hỏi này không nhận câu trả lời.");
      }
      if (level.deadlineAt === null || now >= level.deadlineAt) {
        throw new LobbyError("ANSWER_LATE", "Đã hết thời gian trả lời.");
      }
      if (!question.options.some((option) => option.id === optionId)) {
        throw new LobbyError("INVALID_OPTION", "Lựa chọn không hợp lệ.");
      }
      if (
        level.answers.some(
          (answer) => answer.teamId === team.teamId && answer.questionId === question.id
        )
      ) {
        throw new LobbyError("ANSWER_ALREADY_SUBMITTED", "Đội đã gửi đáp án cho câu này.");
      }
      const withAnswer = {
        ...level,
        answers: [...level.answers, { teamId: team.teamId, questionId, optionId, submittedAt: now }]
      };
      const allAnswered = allEligibleTeamsMatch(state, (teamId) =>
        withAnswer.answers.some(
          (answer) => answer.teamId === teamId && answer.questionId === question.id
        )
      );
      const answeredState = { ...state, levelOne: withAnswer };
      return bump({
        ...answeredState,
        levelOne: allAnswered ? advanceLevelState(answeredState, now) : withAnswer
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelOneToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_1" || state.levelOne?.phase !== "level_result") {
        throw new LobbyError("INVALID_PHASE", "Chặng 1 chưa hoàn tất.");
      }
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-1")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-1"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelTwo(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !state.completedLevelIds.includes("level-1") ||
        state.completedLevelIds.includes("level-2")
      ) {
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 2 chưa thể bắt đầu lúc này.");
      }
      const baseScores = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      return bump({
        ...state,
        phase: "level_2",
        levelTwo: {
          phase: "intro",
          currentRoundIndex: 0,
          phaseStartedAt: now,
          deadlineAt: now + LEVEL_TWO_TIMING.introMs,
          answers: [],
          openedTiles: [],
          currentReward: 1000,
          roundWinnerTeamId: null,
          roundReward: null,
          roundResults: [],
          cooldownUntilByTeam: {},
          startedAt: null,
          completedAt: null,
          baseScores,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelTwo(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_2" || !state.levelTwo) {
        throw new LobbyError("INVALID_PHASE", "Chặng 2 không hoạt động.");
      }
      const level = state.levelTwo;
      const challenge = LEVEL_TWO_CHALLENGES[level.currentRoundIndex];
      const allAnswered = challenge
        ? allEligibleTeamsMatch(state, (teamId) =>
            level.answers.some(
              (answer) => answer.teamId === teamId && answer.challengeId === challenge.id
            )
          )
        : false;
      if (!force && now < (level.deadlineAt ?? Number.POSITIVE_INFINITY)) {
        if (!(level.phase === "round_active" && allAnswered)) return state;
      }
      return bump({ ...state, levelTwo: advanceLevelTwoState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async revealLevelTwoTile(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      const level = state.levelTwo;
      if (state.phase !== "level_2" || !level || level.phase !== "round_active") {
        throw new LobbyError("GAME_ALREADY_COMPLETED", "Lượt hiện tại không nhận thao tác mở ô.");
      }
      const hiddenTiles = [0, 1, 2, 3].filter(
        (tileIndex) => !level.openedTiles.includes(tileIndex)
      );
      if (hiddenTiles.length === 0)
        throw new LobbyError("TILE_ALREADY_OPEN", "Cả 4 mảnh hình đã được mở.");
      const tileIndex = hiddenTiles[randomInt(hiddenTiles.length)]!;
      const openedTiles = [...level.openedTiles, tileIndex];
      return bump({
        ...state,
        levelTwo: {
          ...level,
          openedTiles,
          currentReward: Math.max(0, 1000 - openedTiles.length * 100)
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async revealLevelTwoAnswer(
    roomCode: string,
    hostToken: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      const level = state.levelTwo;
      if (state.phase !== "level_2" || !level || level.phase !== "round_active") {
        throw new LobbyError("GAME_ALREADY_COMPLETED", "Lượt hiện tại không thể hiển thị đáp án.");
      }
      return bump({
        ...state,
        levelTwo: {
          ...level,
          phase: "round_complete",
          phaseStartedAt: now,
          deadlineAt: null,
          roundWinnerTeamId: null,
          roundReward: 0
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelTwoAnswer(
    roomCode: string,
    sessionToken: string,
    challengeId: string,
    keyword: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không còn hợp lệ.");
      const level = state.levelTwo;
      const challenge = level ? LEVEL_TWO_CHALLENGES[level.currentRoundIndex] : undefined;
      if (state.phase !== "level_2" || !level || !challenge || challenge.id !== challengeId)
        throw new LobbyError("INVALID_PHASE", "Thử thách này không nhận câu trả lời.");
      if (level.phase !== "round_active")
        throw new LobbyError("GAME_ALREADY_COMPLETED", "Lượt này đã hoàn tất.");
      if ((level.cooldownUntilByTeam[team.teamId] ?? 0) > now)
        throw new LobbyError("GUESS_COOLDOWN", "Hãy chờ trước khi đoán lại.");
      const correct = isLevelTwoAnswerCorrect(challenge, keyword);
      const answers = [
        ...level.answers,
        { teamId: team.teamId, challengeId, keyword, submittedAt: now, correct }
      ];
      if (!correct) {
        const withAnswer = { ...level, answers };
        const allAnswered = allEligibleTeamsMatch(state, (teamId) =>
          answers.some((answer) => answer.teamId === teamId && answer.challengeId === challenge.id)
        );
        return bump({
          ...state,
          levelTwo: allAnswered
            ? {
                ...withAnswer,
                phase: "round_complete",
                phaseStartedAt: now,
                deadlineAt: null,
                roundWinnerTeamId: null,
                roundReward: 0
              }
            : {
                ...withAnswer,
                cooldownUntilByTeam: {
                  ...level.cooldownUntilByTeam,
                  [team.teamId]: now + LEVEL_TWO_TIMING.cooldownMs
                }
              }
        });
      }
      const baseScores = {
        ...level.baseScores,
        [team.teamId]: (level.baseScores[team.teamId] ?? 0) + level.currentReward
      };
      const round = (level.currentRoundIndex + 1) as 1 | 2;
      return bump({
        ...state,
        levelTwo: {
          ...level,
          phase: "round_complete",
          phaseStartedAt: now,
          deadlineAt: null,
          answers,
          baseScores,
          roundWinnerTeamId: team.teamId,
          roundReward: level.currentReward,
          roundResults: [
            ...level.roundResults,
            { round, winnerTeamId: team.teamId, baseReward: level.currentReward }
          ]
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelTwoToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_2" || state.levelTwo?.phase !== "level_result") {
        throw new LobbyError("INVALID_PHASE", "Chặng 2 chưa hoàn tất.");
      }
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-2")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-2"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelThree(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !state.completedLevelIds.includes("level-2") ||
        state.completedLevelIds.includes("level-3")
      ) {
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 3 chưa thể bắt đầu lúc này.");
      }
      const baseScores = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      return bump({
        ...state,
        phase: "level_3",
        levelThree: {
          phase: "intro",
          roundIndex: 0,
          phaseStartedAt: now,
          deadlineAt: now + LEVEL_THREE_TIMING.introMs,
          answers: [],
          baseScores,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelThree(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_3" || !state.levelThree) {
        throw new LobbyError("INVALID_PHASE", "Chặng 3 không hoạt động.");
      }
      const level = state.levelThree;
      const round = LEVEL_THREE_ROUNDS[level.roundIndex];
      const allAnswered = round
        ? allEligibleTeamsMatch(state, (teamId) =>
            level.answers.some(
              (answer) => answer.teamId === teamId && answer.roundId === round.id
            )
          )
        : false;
      if (
        !force &&
        now < (level.deadlineAt ?? Number.POSITIVE_INFINITY) &&
        !(level.phase === "round_active" && allAnswered)
      ) {
        return state;
      }
      return bump({ ...state, levelThree: advanceLevelThreeState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelThreeAnswer(
    roomCode: string,
    sessionToken: string,
    roundId: string,
    answerText: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không còn hợp lệ.");
      const level = state.levelThree;
      const round = level ? LEVEL_THREE_ROUNDS[level.roundIndex] : undefined;
      if (
        state.phase !== "level_3" ||
        !level ||
        level.phase !== "round_active" ||
        !round ||
        round.id !== roundId
      ) {
        throw new LobbyError("INVALID_PHASE", "Câu đố này không nhận câu trả lời.");
      }
      if (level.deadlineAt === null || now >= level.deadlineAt) {
        throw new LobbyError("ANSWER_LATE", "Đã hết thời gian trả lời.");
      }
      const normalizedAnswer = normalizeLevelThreeAnswer(answerText);
      if (!normalizedAnswer || answerText.length > 120) {
        throw new LobbyError("INVALID_OPTION", "Đáp án không hợp lệ.");
      }
      if (
        level.answers.some((answer) => answer.teamId === team.teamId && answer.roundId === round.id)
      ) {
        throw new LobbyError("ANSWER_ALREADY_SUBMITTED", "Đội đã gửi đáp án cho câu đố này.");
      }
      const withAnswer = {
        ...level,
        answers: [
          ...level.answers,
          { teamId: team.teamId, roundId, answerText: normalizedAnswer, submittedAt: now }
        ]
      };
      const allAnswered = allEligibleTeamsMatch(state, (teamId) =>
        withAnswer.answers.some(
          (answer) => answer.teamId === teamId && answer.roundId === round.id
        )
      );
      const answeredState = { ...state, levelThree: withAnswer };
      return bump({
        ...answeredState,
        levelThree: allAnswered ? advanceLevelThreeState(answeredState, now) : withAnswer
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelThreeToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_3" || state.levelThree?.phase !== "level_result") {
        throw new LobbyError("INVALID_PHASE", "Chặng 3 chưa hoàn tất.");
      }
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-3")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-3"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelFour(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !state.completedLevelIds.includes("level-3") ||
        state.completedLevelIds.includes("level-4")
      )
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 4 chưa thể bắt đầu.");
      const baseScores = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      return bump({
        ...state,
        phase: "level_4",
        levelFour: {
          phase: "intro",
          challengeIndex: 0,
          phaseStartedAt: now,
          deadlineAt: now + LEVEL_FOUR_TIMING.introMs,
          rightItemOrderByChallenge: Object.fromEntries(
            LEVEL_FOUR_CHALLENGES.map((challenge) => [
              challenge.id,
              createShuffledRightItemOrder(challenge)
            ])
          ),
          answers: [],
          baseScores,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelFour(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_4" || !state.levelFour)
        throw new LobbyError("INVALID_PHASE", "Chặng 4 không hoạt động.");
      const challenge = LEVEL_FOUR_CHALLENGES[state.levelFour.challengeIndex];
      const allAnswered = challenge
        ? allEligibleTeamsMatch(state, (teamId) =>
            state.levelFour!.answers.some(
              (answer) => answer.teamId === teamId && answer.challengeId === challenge.id
            )
          )
        : false;
      if (
        !force &&
        now < (state.levelFour.deadlineAt ?? Infinity) &&
        !(state.levelFour.phase === "challenge_active" && allAnswered)
      )
        return state;
      return bump({ ...state, levelFour: advanceLevelFourState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelFourAnswer(
    roomCode: string,
    sessionToken: string,
    challengeId: string,
    solution: LevelFourSubmission,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      const level = state.levelFour;
      const challenge = level ? LEVEL_FOUR_CHALLENGES[level.challengeIndex] : undefined;
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không hợp lệ.");
      if (
        state.phase !== "level_4" ||
        !level ||
        level.phase !== "challenge_active" ||
        !challenge ||
        challenge.id !== challengeId
      )
        throw new LobbyError("INVALID_PHASE", "Thử thách không nhận đáp án.");
      if (level.deadlineAt === null || now >= level.deadlineAt)
        throw new LobbyError("ANSWER_LATE", "Đã hết thời gian.");
      validateMatchingSubmission(challenge.leftItems, challenge.rightItems, solution.matches);
      if (
        level.answers.some(
          (answer) => answer.teamId === team.teamId && answer.challengeId === challenge.id
        )
      )
        throw new LobbyError("ANSWER_ALREADY_SUBMITTED", "Đội đã gửi đáp án.");
      const withAnswer = {
        ...level,
        answers: [
          ...level.answers,
          { teamId: team.teamId, challengeId, solution, submittedAt: now }
        ]
      };
      const answeredState = { ...state, levelFour: withAnswer };
      const allAnswered = allEligibleTeamsMatch(state, (teamId) =>
        withAnswer.answers.some(
          (answer) => answer.teamId === teamId && answer.challengeId === challenge.id
        )
      );
      return bump({
        ...answeredState,
        levelFour: allAnswered ? advanceLevelFourState(answeredState, now) : withAnswer
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelFourToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_4" || state.levelFour?.phase !== "level_result")
        throw new LobbyError("INVALID_PHASE", "Chặng 4 chưa hoàn tất.");
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-4")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-4"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelFive(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !state.completedLevelIds.includes("level-4") ||
        state.completedLevelIds.includes("level-5")
      )
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 5 chưa thể bắt đầu.");
      const zeros = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      const teamProgress = Object.fromEntries(
        state.teams.map((team) => [
          team.teamId,
          {
            checkpointProgress: 0 as const,
            mode: "platforming" as const,
            activeQuestionIndex: null,
            retryAvailableAt: null,
            finishedAt: null,
            completionTimeMs: null,
            finishRank: null,
            finishBonus: 0,
            knowledgeScore: null,
            knowledgeMultiplier: null,
            finalScore: null,
            lastAnswerCorrect: null
          }
        ])
      );
      return bump({
        ...state,
        phase: "level_5",
        levelFive: {
          phase: "intro",
          phaseStartedAt: now,
          levelStartedAt: null,
          deadlineAt: now + LEVEL_FIVE_TIMING.introMs,
          answers: [],
          baseScores: zeros,
          teamProgress,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelFive(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_5" || !state.levelFive)
        throw new LobbyError("INVALID_PHASE", "Chặng 5 không hoạt động.");
      if (!force && now < (state.levelFive.deadlineAt ?? Infinity)) return state;
      return bump({ ...state, levelFive: advanceLevelFiveState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelFiveAnswer(
    roomCode: string,
    sessionToken: string,
    questionId: string,
    optionId: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      const level = state.levelFive;
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không hợp lệ.");
      const teamState = level?.teamProgress[team.teamId];
      const question =
        teamState?.activeQuestionIndex === null || teamState?.activeQuestionIndex === undefined
          ? undefined
          : LEVEL_FIVE_QUESTIONS[teamState.activeQuestionIndex];
      if (
        state.phase !== "level_5" ||
        !level ||
        level.phase !== "running" ||
        !teamState ||
        !question ||
        question.id !== questionId ||
        (teamState.mode !== "question" && teamState.mode !== "retry_cooldown")
      )
        throw new LobbyError("INVALID_PHASE", "Câu hỏi không nhận đáp án.");
      if (teamState.retryAvailableAt !== null && now < teamState.retryAvailableAt)
        throw new LobbyError("GUESS_COOLDOWN", "Hãy chờ hết thời gian thử lại.");
      if (!question.options.some((option) => option.id === optionId))
        throw new LobbyError("INVALID_OPTION", "Lựa chọn không hợp lệ.");
      const correct = optionId === question.correctOptionId;
      const checkpointIndex = (teamState.activeQuestionIndex ?? 0) + 1;
      const baseScores = { ...level.baseScores };
      if (correct)
        baseScores[team.teamId] = Math.min(100, (baseScores[team.teamId] ?? 0) + question.points);
      const nextTeamState = correct
        ? {
            checkpointProgress: checkpointIndex as 1 | 2 | 3 | 4 | 5,
            mode: checkpointIndex === 5 ? ("final_platforming" as const) : ("platforming" as const),
            activeQuestionIndex: null,
            retryAvailableAt: null,
            finishedAt: null,
            completionTimeMs: null,
            finishRank: null,
            finishBonus: 0,
            knowledgeScore: null,
            knowledgeMultiplier: null,
            finalScore: null,
            lastAnswerCorrect: true
          }
        : {
            ...teamState,
            mode: "retry_cooldown" as const,
            retryAvailableAt: now + LEVEL_FIVE_TIMING.retryCooldownMs,
            lastAnswerCorrect: false
          };
      return bump({
        ...state,
        levelFive: {
          ...level,
          answers: [
            ...level.answers,
            {
              teamId: team.teamId,
              checkpointIndex,
              questionId,
              optionId,
              correct,
              submittedAt: now
            }
          ],
          baseScores,
          teamProgress: { ...level.teamProgress, [team.teamId]: nextTeamState }
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async reachLevelFiveCheckpoint(
    roomCode: string,
    sessionToken: string,
    checkpointIndex: number,
    _now = Date.now()
  ): Promise<RoomState> {
    void _now;
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không hợp lệ.");
      const level = state.levelFive;
      const teamState = level?.teamProgress[team.teamId];
      if (
        state.phase !== "level_5" ||
        !level ||
        level.phase !== "running" ||
        !teamState ||
        teamState.mode !== "platforming"
      )
        throw new LobbyError("INVALID_PHASE", "Đội chưa thể mở checkpoint.");
      const expectedCheckpoint = teamState.checkpointProgress + 1;
      if (
        !Number.isInteger(checkpointIndex) ||
        checkpointIndex !== expectedCheckpoint ||
        checkpointIndex < 1 ||
        checkpointIndex > 5
      )
        throw new LobbyError("INVALID_OPTION", "Checkpoint không đúng thứ tự.");
      return bump({
        ...state,
        levelFive: {
          ...level,
          teamProgress: {
            ...level.teamProgress,
            [team.teamId]: {
              ...teamState,
              mode: "question",
              activeQuestionIndex: checkpointIndex - 1,
              retryAvailableAt: null,
              lastAnswerCorrect: null
            }
          }
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async reachLevelFiveFinish(
    roomCode: string,
    sessionToken: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((candidate) => candidate.sessionToken === sessionToken);
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không hợp lệ.");
      const level = state.levelFive;
      const teamState = level?.teamProgress[team.teamId];
      if (
        state.phase !== "level_5" ||
        !level ||
        level.phase !== "running" ||
        !teamState ||
        teamState.mode !== "final_platforming" ||
        teamState.checkpointProgress !== 5
      )
        throw new LobbyError("INVALID_PHASE", "Đội chưa đủ điều kiện về đích.");
      if (level.levelStartedAt === null)
        throw new LobbyError("INVALID_PHASE", "Đồng hồ chặng 5 chưa bắt đầu.");
      const finishRank =
        Object.values(level.teamProgress).filter((progress) => progress.mode === "finished")
          .length + 1;
      const finishBonus = getLevelFiveFinishBonus(finishRank);
      const knowledgeScore = normalizeBaseScoreForLevel(
        level.baseScores[team.teamId] ?? 0,
        "level-5"
      );
      const knowledgeMultiplier =
        team.characterId === getHomeCharacterId("level-5") ? (2 as const) : (1 as const);
      const teamProgress = {
        ...level.teamProgress,
        [team.teamId]: {
          ...teamState,
          mode: "finished" as const,
          finishedAt: now,
          completionTimeMs: Math.max(0, now - level.levelStartedAt),
          finishRank,
          finishBonus,
          knowledgeScore,
          knowledgeMultiplier,
          finalScore: knowledgeScore * knowledgeMultiplier + finishBonus
        }
      };
      const allFinished = state.teams.every(
        (candidate) => teamProgress[candidate.teamId]?.mode === "finished"
      );
      return bump({
        ...state,
        levelFive: {
          ...level,
          phase: allFinished ? "level_result" : "running",
          phaseStartedAt: allFinished ? now : level.phaseStartedAt,
          deadlineAt: null,
          teamProgress,
          pieceAwarded: allFinished
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async forceCompleteLevelFive(
    roomCode: string,
    hostToken: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      const level = state.levelFive;
      if (state.phase !== "level_5" || !level || level.phase !== "running") {
        throw new LobbyError("INVALID_PHASE", "Chặng 5 không thể kết thúc lúc này.");
      }
      return bump({
        ...state,
        levelFive: {
          ...level,
          phase: "level_result",
          phaseStartedAt: now,
          deadlineAt: null,
          pieceAwarded: true
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelFiveToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_5" || state.levelFive?.phase !== "level_result")
        throw new LobbyError("INVALID_PHASE", "Chặng 5 chưa hoàn tất.");
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-5")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-5"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelSix(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !state.completedLevelIds.includes("level-5") ||
        state.completedLevelIds.includes("level-6")
      )
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 6 chưa thể bắt đầu.");
      const baseScores = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      return bump({
        ...state,
        phase: "level_6",
        levelSix: {
          phase: "intro",
          stationIndex: 0,
          phaseStartedAt: now,
          deadlineAt: now + LEVEL_SIX_TIMING.introMs,
          answers: [],
          baseScores,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelSix(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_6" || !state.levelSix)
        throw new LobbyError("INVALID_PHASE", "Chặng 6 không hoạt động.");
      const challenge = LEVEL_SIX_CHALLENGES[state.levelSix.stationIndex];
      const allAnswered = challenge
        ? allEligibleTeamsMatch(state, (teamId) =>
            state.levelSix!.answers.some(
              (answer) => answer.teamId === teamId && answer.challengeId === challenge.id
            )
          )
        : false;
      if (
        !force &&
        now < (state.levelSix.deadlineAt ?? Infinity) &&
        !(state.levelSix.phase === "station_active" && allAnswered)
      )
        return state;
      return bump({ ...state, levelSix: advanceLevelSixState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelSixAnswer(
    roomCode: string,
    sessionToken: string,
    challengeId: string,
    solution: LevelSixSubmission,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((item) => item.sessionToken === sessionToken);
      const level = state.levelSix;
      const challenge = level ? LEVEL_SIX_CHALLENGES[level.stationIndex] : undefined;
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không hợp lệ.");
      if (
        state.phase !== "level_6" ||
        !level ||
        level.phase !== "station_active" ||
        !challenge ||
        challenge.id !== challengeId
      )
        throw new LobbyError("INVALID_PHASE", "Trạm không nhận đáp án.");
      if (level.deadlineAt === null || now >= level.deadlineAt)
        throw new LobbyError("ANSWER_LATE", "Đã hết thời gian.");
      validateLevelSixSubmission(challenge, solution);
      if (
        level.answers.some(
          (answer) => answer.teamId === team.teamId && answer.challengeId === challenge.id
        )
      )
        throw new LobbyError("ANSWER_ALREADY_SUBMITTED", "Đội đã hoàn thành trạm.");
      const withAnswer = {
        ...level,
        answers: [
          ...level.answers,
          { teamId: team.teamId, challengeId, solution, submittedAt: now }
        ]
      };
      const answeredState = { ...state, levelSix: withAnswer };
      const allAnswered = allEligibleTeamsMatch(state, (teamId) =>
        withAnswer.answers.some(
          (answer) => answer.teamId === teamId && answer.challengeId === challenge.id
        )
      );
      return bump({
        ...answeredState,
        levelSix: allAnswered ? advanceLevelSixState(answeredState, now) : withAnswer
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelSixToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_6" || state.levelSix?.phase !== "level_result")
        throw new LobbyError("INVALID_PHASE", "Chặng 6 chưa hoàn tất.");
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-6")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-6"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async startLevelSeven(roomCode: string, hostToken: string, now = Date.now()): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !state.completedLevelIds.includes("level-6") ||
        state.completedLevelIds.includes("level-7")
      )
        throw new LobbyError("LEVEL_NOT_READY", "Chặng 7 chưa thể bắt đầu.");
      const baseScores = Object.fromEntries(state.teams.map((team) => [team.teamId, 0]));
      return bump({
        ...state,
        phase: "level_7",
        levelSeven: {
          phase: "intro",
          roundIndex: 0,
          phaseStartedAt: now,
          deadlineAt: now + LEVEL_SEVEN_TIMING.introMs,
          answers: [],
          baseScores,
          pieceAwarded: false
        }
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async advanceLevelSeven(
    roomCode: string,
    now = Date.now(),
    force = false,
    hostToken?: string
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      if (hostToken) this.#requireHost(state, hostToken);
      if (state.phase !== "level_7" || !state.levelSeven)
        throw new LobbyError("INVALID_PHASE", "Chặng 7 không hoạt động.");
      const round = LEVEL_SEVEN_ROUNDS[state.levelSeven.roundIndex];
      const allAnswered = round
        ? allEligibleTeamsMatch(state, (teamId) =>
            state.levelSeven!.answers.some(
              (answer) => answer.teamId === teamId && answer.roundId === round.id
            )
          )
        : false;
      if (
        !force &&
        now < (state.levelSeven.deadlineAt ?? Infinity) &&
        !(state.levelSeven.phase === "round_active" && allAnswered)
      )
        return state;
      return bump({ ...state, levelSeven: advanceLevelSevenState(state, now) });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async submitLevelSevenAnswer(
    roomCode: string,
    sessionToken: string,
    roundId: string,
    answerText: string,
    now = Date.now()
  ): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      const team = state.teams.find((item) => item.sessionToken === sessionToken);
      const level = state.levelSeven;
      const round = level ? LEVEL_SEVEN_ROUNDS[level.roundIndex] : undefined;
      if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không hợp lệ.");
      if (
        state.phase !== "level_7" ||
        !level ||
        level.phase !== "round_active" ||
        !round ||
        round.id !== roundId
      )
        throw new LobbyError("INVALID_PHASE", "Lượt này không nhận đáp án.");
      if (level.deadlineAt === null || now >= level.deadlineAt)
        throw new LobbyError("ANSWER_LATE", "Đã hết thời gian.");
      const normalized = normalizeLevelSevenAnswer(answerText);
      if (!normalized || normalized.length > 120)
        throw new LobbyError("INVALID_OPTION", "Đáp án không hợp lệ.");
      if (
        level.answers.some((answer) => answer.teamId === team.teamId && answer.roundId === round.id)
      )
        throw new LobbyError("ANSWER_ALREADY_SUBMITTED", "Đội đã gửi đáp án.");
      const withAnswer = {
        ...level,
        answers: [
          ...level.answers,
          { teamId: team.teamId, roundId, answerText: normalized, submittedAt: now }
        ]
      };
      const answeredState = { ...state, levelSeven: withAnswer };
      const allAnswered = allEligibleTeamsMatch(state, (teamId) =>
        withAnswer.answers.some(
          (answer) => answer.teamId === teamId && answer.roundId === round.id
        )
      );
      return bump({
        ...answeredState,
        levelSeven: allAnswered ? advanceLevelSevenState(answeredState, now) : withAnswer
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async returnLevelSevenToMap(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "level_7" || state.levelSeven?.phase !== "level_result")
        throw new LobbyError("INVALID_PHASE", "Chặng 7 chưa hoàn tất.");
      return bump({
        ...state,
        phase: "ready",
        completedLevelIds: state.completedLevelIds.includes("level-7")
          ? state.completedLevelIds
          : [...state.completedLevelIds, "level-7"]
      });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async enterAllianceCenter(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "ready" ||
        !LEVEL_IDS.every((levelId) => state.completedLevelIds.includes(levelId))
      ) {
        throw new LobbyError(
          "INVALID_PHASE",
          "Cần hoàn thành đủ 7 chặng trước khi vào Trung Tâm Liên Minh."
        );
      }
      return bump({ ...state, phase: "alliance_center" });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async revealFinalResults(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "alliance_center" ||
        !LEVEL_IDS.every((levelId) => state.completedLevelIds.includes(levelId))
      ) {
        throw new LobbyError("INVALID_PHASE", "Trung Tâm Liên Minh chưa sẵn sàng.");
      }
      return bump({ ...state, phase: "final_results" });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async completeJourney(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (state.phase !== "final_results")
        throw new LobbyError("INVALID_PHASE", "Bảng xếp hạng cuối chưa được mở.");
      return bump({ ...state, phase: "completed" });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async reviewFinalResults(roomCode: string, hostToken: string): Promise<RoomState> {
    const updated = await this.store.mutateByCode(normalizeRoomCode(roomCode), (state) => {
      this.#requireHost(state, hostToken);
      if (
        state.phase !== "completed" ||
        !LEVEL_IDS.every((levelId) => state.completedLevelIds.includes(levelId))
      ) {
        throw new LobbyError("INVALID_PHASE", "Hành trình chưa hoàn tất.");
      }
      return bump({ ...state, phase: "final_results" });
    });
    if (!updated) throw new LobbyError("ROOM_NOT_FOUND", "Không tìm thấy phòng.");
    return updated;
  }

  async disconnect(
    socketId: string,
    now = Date.now()
  ): Promise<Array<{ state: RoomState; teamId: string }>> {
    const changed: Array<{ state: RoomState; teamId: string }> = [];
    for (const room of await this.store.list()) {
      const disconnectedTeam = room.teams.find(
        (team) => team.socketId === socketId && team.connected
      );
      if (!disconnectedTeam) continue;
      const updated = await this.store.mutateByCode(room.roomCode, (state) =>
        bump({
          ...state,
          teams: state.teams.map((team) =>
            team.socketId === socketId ? { ...team, connected: false, socketId: null } : team
          )
        })
      );
      if (updated) {
        const advanced =
          updated.phase === "level_1"
            ? await this.advanceLevelOne(updated.roomCode, now)
            : updated.phase === "level_2"
              ? await this.advanceLevelTwo(updated.roomCode, now)
              : updated.phase === "level_3"
                ? await this.advanceLevelThree(updated.roomCode, now)
                : updated.phase === "level_4"
                  ? await this.advanceLevelFour(updated.roomCode, now)
                  : updated.phase === "level_6"
                    ? await this.advanceLevelSix(updated.roomCode, now)
                    : updated.phase === "level_7"
                      ? await this.advanceLevelSeven(updated.roomCode, now)
                      : updated;
        changed.push({ state: advanced, teamId: disconnectedTeam.teamId });
      }
    }
    return changed;
  }

  #requireHost(state: RoomState, hostToken: string): void {
    if (state.hostToken !== hostToken) {
      throw new LobbyError("UNAUTHORIZED", "Quyền Host không hợp lệ.");
    }
  }

  #createRoomCode(): string {
    let code = "";
    for (let index = 0; index < 5; index += 1) {
      code += ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length));
    }
    return code;
  }
}

function advanceLevelState(state: RoomState, now: number): NonNullable<RoomState["levelOne"]> {
  const level = state.levelOne;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 1 không hoạt động.");
  if (level.phase === "intro") {
    return {
      ...level,
      phase: "question_active",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_ONE_TIMING.answerMs
    };
  }
  if (level.phase === "question_active") {
    const question = LEVEL_ONE_QUESTIONS[level.questionIndex];
    const baseScores = { ...level.baseScores };
    if (question) {
      for (const answer of level.answers.filter(
        (candidate) => candidate.questionId === question.id
      )) {
        if (answer.optionId === question.correctOptionId) {
          baseScores[answer.teamId] = (baseScores[answer.teamId] ?? 0) + question.points;
        }
      }
    }
    return {
      ...level,
      baseScores,
      phase: "question_reveal",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_ONE_TIMING.revealMs
    };
  }
  if (level.phase === "question_reveal") {
    if (level.questionIndex < LEVEL_ONE_QUESTIONS.length - 1) {
      return {
        ...level,
        phase: "question_active",
        questionIndex: level.questionIndex + 1,
        phaseStartedAt: now,
        deadlineAt: now + LEVEL_ONE_TIMING.answerMs
      };
    }
    return {
      ...level,
      phase: "level_result",
      phaseStartedAt: now,
      deadlineAt: null,
      pieceAwarded: true
    };
  }
  return level;
}

function advanceLevelTwoState(state: RoomState, now: number): NonNullable<RoomState["levelTwo"]> {
  const level = state.levelTwo;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 2 không hoạt động.");
  if (level.phase === "intro") {
    return {
      ...level,
      phase: "round_active",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_TWO_TIMING.answerMs,
      startedAt: now
    };
  }
  if (level.phase === "round_active") {
    return {
      ...level,
      phase: "round_complete",
      phaseStartedAt: now,
      deadlineAt: null,
      roundWinnerTeamId: null,
      roundReward: 0
    };
  }
  if (level.phase === "round_complete") {
    if (level.currentRoundIndex === 0) {
      return {
        ...level,
        phase: "round_active",
        currentRoundIndex: 1,
        phaseStartedAt: now,
        deadlineAt: now + LEVEL_TWO_TIMING.answerMs,
        openedTiles: [],
        currentReward: 1000,
        roundWinnerTeamId: null,
        roundReward: null,
        cooldownUntilByTeam: {}
      };
    }
    return {
      ...level,
      phase: "level_result",
      phaseStartedAt: now,
      deadlineAt: null,
      completedAt: now,
      pieceAwarded: true
    };
  }
  return level;
}

function advanceLevelThreeState(
  state: RoomState,
  now: number
): NonNullable<RoomState["levelThree"]> {
  const level = state.levelThree;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 3 không hoạt động.");
  if (level.phase === "intro") {
    return {
      ...level,
      phase: "round_active",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_THREE_TIMING.answerMs
    };
  }
  if (level.phase === "round_active") {
    const round = LEVEL_THREE_ROUNDS[level.roundIndex];
    const baseScores = { ...level.baseScores };
    if (round) {
      for (const answer of level.answers.filter((candidate) => candidate.roundId === round.id)) {
        if (isLevelThreeAnswerCorrect(round, answer.answerText)) {
          baseScores[answer.teamId] = (baseScores[answer.teamId] ?? 0) + round.points;
        }
      }
    }
    return { ...level, baseScores, phase: "round_reveal", phaseStartedAt: now, deadlineAt: null };
  }
  if (level.phase === "round_reveal") {
    if (level.roundIndex < LEVEL_THREE_ROUNDS.length - 1) {
      return {
        ...level,
        phase: "round_active",
        roundIndex: level.roundIndex + 1,
        phaseStartedAt: now,
        deadlineAt: now + LEVEL_THREE_TIMING.answerMs
      };
    }
    return {
      ...level,
      phase: "level_result",
      phaseStartedAt: now,
      deadlineAt: null,
      pieceAwarded: true
    };
  }
  return level;
}

function advanceLevelFourState(state: RoomState, now: number): NonNullable<RoomState["levelFour"]> {
  const level = state.levelFour;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 4 không hoạt động.");
  if (level.phase === "intro")
    return {
      ...level,
      phase: "challenge_active",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_FOUR_TIMING.answerMs
    };
  if (level.phase === "challenge_active") {
    const current = LEVEL_FOUR_CHALLENGES[level.challengeIndex];
    const baseScores = { ...level.baseScores };
    if (current)
      for (const answer of level.answers.filter((item) => item.challengeId === current.id)) {
        if (isMatchingCorrect(current.solution.matches, answer.solution.matches))
          baseScores[answer.teamId] = (baseScores[answer.teamId] ?? 0) + current.points;
      }
    return {
      ...level,
      baseScores,
      phase: "challenge_reveal",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_FOUR_TIMING.revealMs
    };
  }
  if (level.phase === "challenge_reveal") {
    if (level.challengeIndex < LEVEL_FOUR_CHALLENGES.length - 1)
      return {
        ...level,
        phase: "challenge_active",
        challengeIndex: level.challengeIndex + 1,
        phaseStartedAt: now,
        deadlineAt: now + LEVEL_FOUR_TIMING.answerMs
      };
    return {
      ...level,
      phase: "level_result",
      phaseStartedAt: now,
      deadlineAt: null,
      pieceAwarded: true
    };
  }
  return level;
}

function advanceLevelFiveState(state: RoomState, now: number): NonNullable<RoomState["levelFive"]> {
  const level = state.levelFive;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 5 không hoạt động.");
  if (level.phase === "intro")
    return {
      ...level,
      phase: "running",
      phaseStartedAt: now,
      levelStartedAt: now,
      deadlineAt: null
    };
  return level;
}

function advanceLevelSixState(state: RoomState, now: number): NonNullable<RoomState["levelSix"]> {
  const level = state.levelSix;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 6 không hoạt động.");
  if (level.phase === "intro")
    return {
      ...level,
      phase: "station_active",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_SIX_TIMING.answerMs
    };
  if (level.phase === "station_active") {
    const challenge = LEVEL_SIX_CHALLENGES[level.stationIndex];
    const baseScores = { ...level.baseScores };
    if (challenge)
      for (const answer of level.answers.filter((item) => item.challengeId === challenge.id))
        if (isLevelSixCorrect(challenge.solution, answer.solution))
          baseScores[answer.teamId] = (baseScores[answer.teamId] ?? 0) + challenge.points;
    return {
      ...level,
      baseScores,
      phase: "station_reveal",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_SIX_TIMING.revealMs
    };
  }
  if (level.phase === "station_reveal") {
    if (level.stationIndex < 3)
      return {
        ...level,
        stationIndex: level.stationIndex + 1,
        phase: "station_active",
        phaseStartedAt: now,
        deadlineAt: now + LEVEL_SIX_TIMING.answerMs
      };
    return {
      ...level,
      phase: "level_result",
      phaseStartedAt: now,
      deadlineAt: null,
      pieceAwarded: true
    };
  }
  return level;
}

function advanceLevelSevenState(
  state: RoomState,
  now: number
): NonNullable<RoomState["levelSeven"]> {
  const level = state.levelSeven;
  if (!level) throw new LobbyError("INVALID_PHASE", "Chặng 7 không hoạt động.");
  if (level.phase === "intro")
    return {
      ...level,
      phase: "round_active",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_SEVEN_TIMING.answerMs
    };
  if (level.phase === "round_active") {
    const round = LEVEL_SEVEN_ROUNDS[level.roundIndex];
    const baseScores = { ...level.baseScores };
    if (round)
      for (const answer of level.answers.filter((item) => item.roundId === round.id))
        if (isLevelSevenAnswerCorrect(round, answer.answerText))
          baseScores[answer.teamId] = (baseScores[answer.teamId] ?? 0) + round.points;
    return {
      ...level,
      baseScores,
      phase: "round_reveal",
      phaseStartedAt: now,
      deadlineAt: now + LEVEL_SEVEN_TIMING.revealMs
    };
  }
  if (level.phase === "round_reveal") {
    if (level.roundIndex < LEVEL_SEVEN_ROUNDS.length - 1)
      return {
        ...level,
        roundIndex: level.roundIndex + 1,
        phase: "round_active",
        phaseStartedAt: now,
        deadlineAt: now + LEVEL_SEVEN_TIMING.answerMs
      };
    return {
      ...level,
      phase: "level_result",
      phaseStartedAt: now,
      deadlineAt: null,
      pieceAwarded: true
    };
  }
  return level;
}

function toPublicLevelSixChallenge(challenge: LevelSixChallenge) {
  if (challenge.type === "ordering")
    return {
      id: challenge.id,
      station: challenge.station,
      type: challenge.type,
      prompt: challenge.prompt,
      items: [...challenge.items],
      points: 25 as const,
      demo: true as const
    };
  if (challenge.type === "classification")
    return {
      id: challenge.id,
      station: challenge.station,
      type: challenge.type,
      prompt: challenge.prompt,
      options: [...challenge.options],
      points: 25 as const,
      demo: true as const
    };
  return {
    id: challenge.id,
    station: challenge.station,
    type: challenge.type,
    prompt: challenge.prompt,
    options: [...challenge.options],
    points: 25 as const,
    demo: true as const
  };
}

function validateLevelSixSubmission(
  challenge: LevelSixChallenge,
  solution: LevelSixSubmission
): void {
  if (challenge.type !== solution.type)
    throw new LobbyError("INVALID_OPTION", "Đáp án không đúng loại trạm.");
  if (challenge.type === "ordering" && solution.type === "ordering") {
    const allowed = new Set(challenge.items.map((item) => item.id));
    if (
      solution.order.length !== challenge.items.length ||
      new Set(solution.order).size !== solution.order.length ||
      solution.order.some((id) => !allowed.has(id))
    )
      throw new LobbyError("INVALID_OPTION", "Thứ tự không hợp lệ.");
    return;
  }
  if (
    solution.type === "ordering" ||
    challenge.type === "ordering" ||
    !challenge.options.some((option) => option.id === solution.optionId)
  )
    throw new LobbyError("INVALID_OPTION", "Lựa chọn không hợp lệ.");
}

function isLevelSixCorrect(expected: LevelSixSubmission, submitted: LevelSixSubmission): boolean {
  if (expected.type !== submitted.type) return false;
  if (expected.type === "ordering")
    return (
      submitted.type === "ordering" &&
      expected.order.length === submitted.order.length &&
      expected.order.every((id, index) => submitted.order[index] === id)
    );
  return submitted.type !== "ordering" && expected.optionId === submitted.optionId;
}

function createResults(state: RoomState, baseScores: Record<string, number>, levelId: LevelId) {
  const homeCharacterId = getHomeCharacterId(levelId);
  const totals = new Map(createScoreboard(state).map((team) => [team.teamId, team.totalScore]));
  return state.teams
    .map((team) => {
      const baseScore = normalizeBaseScoreForLevel(baseScores[team.teamId] ?? 0, levelId);
      const multiplier = team.characterId === homeCharacterId ? (2 as const) : (1 as const);
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        baseScore,
        multiplier,
        finalScore: baseScore * multiplier,
        accumulatedTotalScore: totals.get(team.teamId) ?? 0
      };
    })
    .sort(
      (left, right) =>
        right.finalScore - left.finalScore || left.teamName.localeCompare(right.teamName, "vi")
    );
}

const LEVEL_FIVE_FINISH_BONUSES = [50, 40, 30, 20, 15, 10, 5] as const;

function getLevelFiveFinishBonus(rank: number): number {
  return LEVEL_FIVE_FINISH_BONUSES[rank - 1] ?? 0;
}

function createLevelFiveResults(state: RoomState) {
  const level = state.levelFive;
  if (!level) return [];
  const totals = new Map(createScoreboard(state).map((team) => [team.teamId, team.totalScore]));
  return state.teams
    .map((team) => {
      const progress = level.teamProgress[team.teamId];
      const baseScore =
        progress?.knowledgeScore ??
        normalizeBaseScoreForLevel(level.baseScores[team.teamId] ?? 0, "level-5");
      const multiplier =
        progress?.knowledgeMultiplier ??
        (team.characterId === getHomeCharacterId("level-5") ? (2 as const) : (1 as const));
      const finishBonus = progress?.finishBonus ?? 0;
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        baseScore,
        multiplier,
        finalScore: baseScore * multiplier + finishBonus,
        accumulatedTotalScore: totals.get(team.teamId) ?? 0,
        completionTimeMs: progress?.completionTimeMs ?? null,
        finishRank: progress?.finishRank ?? null,
        finishBonus
      };
    })
    .sort((left, right) => (left.finishRank ?? Number.POSITIVE_INFINITY) - (right.finishRank ?? Number.POSITIVE_INFINITY));
}

function allEligibleTeamsMatch(state: RoomState, predicate: (teamId: string) => boolean): boolean {
  const eligibleTeams = state.teams.filter((team) => team.connected);
  return eligibleTeams.length > 0 && eligibleTeams.every((team) => predicate(team.teamId));
}

function createScoreboard(state: RoomState): TeamScorePublic[] {
  const scoreStates: Record<LevelId, { baseScores: Record<string, number>; completed: boolean }> = {
    "level-1": {
      baseScores: state.levelOne?.baseScores ?? {},
      completed: Boolean(
        state.levelOne?.pieceAwarded || state.completedLevelIds.includes("level-1")
      )
    },
    "level-2": {
      baseScores: state.levelTwo?.baseScores ?? {},
      completed: Boolean(
        state.levelTwo?.pieceAwarded || state.completedLevelIds.includes("level-2")
      )
    },
    "level-3": {
      baseScores: state.levelThree?.baseScores ?? {},
      completed: Boolean(
        state.levelThree?.pieceAwarded || state.completedLevelIds.includes("level-3")
      )
    },
    "level-4": {
      baseScores: state.levelFour?.baseScores ?? {},
      completed: Boolean(
        state.levelFour?.pieceAwarded || state.completedLevelIds.includes("level-4")
      )
    },
    "level-5": {
      baseScores: state.levelFive?.baseScores ?? {},
      completed: Boolean(
        state.levelFive?.pieceAwarded || state.completedLevelIds.includes("level-5")
      )
    },
    "level-6": {
      baseScores: state.levelSix?.baseScores ?? {},
      completed: Boolean(
        state.levelSix?.pieceAwarded || state.completedLevelIds.includes("level-6")
      )
    },
    "level-7": {
      baseScores: state.levelSeven?.baseScores ?? {},
      completed: Boolean(
        state.levelSeven?.pieceAwarded || state.completedLevelIds.includes("level-7")
      )
    }
  };
  const entries = state.teams.map((team, joinIndex) => {
    const levelResults = LEVEL_IDS.map((levelId) => {
      const completed = scoreStates[levelId].completed;
      const baseScore = completed
        ? normalizeBaseScoreForLevel(scoreStates[levelId].baseScores[team.teamId] ?? 0, levelId)
        : 0;
      const multiplier =
        team.characterId === getHomeCharacterId(levelId) ? (2 as const) : (1 as const);
      const finishBonus =
        levelId === "level-5" && completed
          ? (state.levelFive?.teamProgress[team.teamId]?.finishBonus ?? 0)
          : 0;
      return {
        levelId,
        baseScore,
        multiplier,
        finalScore: baseScore * multiplier + finishBonus,
        completed
      };
    });
    return {
      teamId: team.teamId,
      teamName: team.teamName,
      characterId: team.characterId,
      completedLevelCount: levelResults.filter((result) => result.completed).length,
      levelResults,
      totalScore: levelResults.reduce((sum, result) => sum + result.finalScore, 0),
      rank: 0,
      joinIndex
    };
  });
  return rankTeamScores(entries).map(({ joinIndex, ...entry }) => {
    void joinIndex;
    return entry;
  });
}

export function rankTeamScores<T extends { totalScore: number; joinIndex: number }>(
  entries: readonly T[]
): Array<T & { rank: number }> {
  return [...entries]
    .sort((left, right) => right.totalScore - left.totalScore || left.joinIndex - right.joinIndex)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function normalizeBaseScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_LEVEL_BASE_SCORE, Math.max(0, Math.trunc(value)));
}

function normalizeBaseScoreForLevel(value: number, levelId: LevelId): number {
  if (!Number.isFinite(value)) return 0;
  return levelId === "level-2" ? Math.max(0, Math.trunc(value)) : normalizeBaseScore(value);
}

export function normalizeLevelTwoAnswer(answer: string): string {
  return answer.normalize("NFC").trim().toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");
}

function isLevelTwoAnswerCorrect(challenge: LevelTwoChallenge, answer: string): boolean {
  const normalized = normalizeLevelTwoAnswer(answer);
  return [challenge.keyword, ...challenge.acceptedAnswers].some(
    (candidate) => normalizeLevelTwoAnswer(candidate) === normalized
  );
}

function toPublicLevelThreeRound(round: LevelThreeRound) {
  if (round.type === "parking") {
    return {
      id: round.id,
      type: round.type,
      prompt: round.prompt,
      parkingSpaces: [...round.parkingSpaces],
      inputMode: round.inputMode,
      points: round.points,
      demo: true as const
    };
  }
  return {
    id: round.id,
    type: round.type,
    prompt: round.prompt,
    storyParagraphs: [...round.storyParagraphs],
    inputMode: round.inputMode,
    points: round.points,
    demo: true as const
  };
}

export function normalizeLevelThreeAnswer(answer: string): string {
  return answer.normalize("NFC").trim().toLocaleLowerCase("vi-VN").replace(/\s+/g, " ");
}

function isLevelThreeAnswerCorrect(round: LevelThreeRound, answer: string): boolean {
  const normalized = normalizeLevelThreeAnswer(answer);
  return round.acceptedAnswers.some(
    (candidate) => normalizeLevelThreeAnswer(candidate) === normalized
  );
}

function validateMatchingSubmission(
  leftItems: readonly { id: string }[],
  rightItems: readonly { id: string }[],
  matches: readonly { leftId: string; rightId: string }[]
): void {
  const leftIds = new Set(leftItems.map((item) => item.id));
  const rightIds = new Set(rightItems.map((item) => item.id));
  const usedLeft = new Set(matches.map((match) => match.leftId));
  const usedRight = new Set(matches.map((match) => match.rightId));
  if (
    matches.length !== leftItems.length ||
    usedLeft.size !== matches.length ||
    usedRight.size !== matches.length ||
    matches.some((match) => !leftIds.has(match.leftId) || !rightIds.has(match.rightId))
  ) {
    throw new LobbyError("INVALID_OPTION", "Cặp ghép không hợp lệ.");
  }
}

function isMatchingCorrect(
  expected: readonly { leftId: string; rightId: string }[],
  submitted: readonly { leftId: string; rightId: string }[]
): boolean {
  const expectedPairs = new Set(expected.map((match) => `${match.leftId}:${match.rightId}`));
  return (
    submitted.length === expected.length &&
    submitted.every((match) => expectedPairs.has(`${match.leftId}:${match.rightId}`))
  );
}
