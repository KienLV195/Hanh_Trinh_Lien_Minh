import type { CharacterId, GamePhase, LevelId, RoomId, TeamId } from "@htlm/game-domain";
import type { LevelFourSubmission, LevelSixSubmission } from "@htlm/protocol";

export interface LobbyTeamState {
  teamId: TeamId;
  teamName: string;
  sessionToken: string;
  connected: boolean;
  socketId: string | null;
  characterId: CharacterId | null;
}

export interface LevelOneAnswerState {
  teamId: TeamId;
  questionId: string;
  optionId: string;
  submittedAt: number;
}

export interface LevelOneState {
  phase: "intro" | "question_active" | "question_reveal" | "level_result";
  questionIndex: number;
  phaseStartedAt: number;
  deadlineAt: number | null;
  answers: LevelOneAnswerState[];
  baseScores: Record<TeamId, number>;
  pieceAwarded: boolean;
}

export interface LevelTwoAnswerState {
  teamId: TeamId;
  challengeId: string;
  keyword: string;
  submittedAt: number;
  correct: boolean;
}

export interface LevelTwoState {
  phase: "intro" | "round_active" | "round_complete" | "level_result";
  currentRoundIndex: 0 | 1;
  phaseStartedAt: number;
  deadlineAt: number | null;
  answers: LevelTwoAnswerState[];
  openedTiles: number[];
  currentReward: number;
  roundWinnerTeamId: TeamId | null;
  roundReward: number | null;
  roundResults: Array<{ round: 1 | 2; winnerTeamId: TeamId; baseReward: number }>;
  cooldownUntilByTeam: Record<TeamId, number>;
  startedAt: number | null;
  completedAt: number | null;
  baseScores: Record<TeamId, number>;
  pieceAwarded: boolean;
}

export interface LevelThreeAnswerState {
  teamId: TeamId;
  roundId: string;
  answerText: string;
  submittedAt: number;
}

export interface LevelThreeState {
  phase: "intro" | "round_active" | "round_reveal" | "level_result";
  roundIndex: number;
  phaseStartedAt: number;
  deadlineAt: number | null;
  answers: LevelThreeAnswerState[];
  baseScores: Record<TeamId, number>;
  pieceAwarded: boolean;
}

export interface LevelFourState {
  phase: "intro" | "challenge_active" | "challenge_reveal" | "level_result";
  challengeIndex: number;
  phaseStartedAt: number;
  deadlineAt: number | null;
  rightItemOrderByChallenge: Record<string, string[]>;
  answers: Array<{
    teamId: TeamId;
    challengeId: string;
    solution: LevelFourSubmission;
    submittedAt: number;
  }>;
  baseScores: Record<TeamId, number>;
  pieceAwarded: boolean;
}

export interface LevelFiveState {
  phase: "intro" | "running" | "level_result";
  phaseStartedAt: number;
  levelStartedAt: number | null;
  deadlineAt: number | null;
  answers: Array<{
    teamId: TeamId;
    checkpointIndex: number;
    questionId: string;
    optionId: string;
    correct: boolean;
    submittedAt: number;
  }>;
  baseScores: Record<TeamId, number>;
  teamProgress: Record<
    TeamId,
    {
      checkpointProgress: 0 | 1 | 2 | 3 | 4 | 5;
      mode: "platforming" | "question" | "retry_cooldown" | "final_platforming" | "finished";
      activeQuestionIndex: number | null;
      retryAvailableAt: number | null;
      finishedAt: number | null;
      completionTimeMs: number | null;
      finishRank: number | null;
      finishBonus: number;
      knowledgeScore: number | null;
      knowledgeMultiplier: 1 | 2 | null;
      finalScore: number | null;
      lastAnswerCorrect: boolean | null;
    }
  >;
  pieceAwarded: boolean;
}

export interface LevelSixState {
  phase: "intro" | "station_active" | "station_reveal" | "level_result";
  stationIndex: number;
  phaseStartedAt: number;
  deadlineAt: number | null;
  answers: Array<{
    teamId: TeamId;
    challengeId: string;
    solution: LevelSixSubmission;
    submittedAt: number;
  }>;
  baseScores: Record<TeamId, number>;
  pieceAwarded: boolean;
}
export interface LevelSevenState {
  phase: "intro" | "round_active" | "round_reveal" | "level_result";
  roundIndex: number;
  phaseStartedAt: number;
  deadlineAt: number | null;
  answers: Array<{ teamId: TeamId; roundId: string; answerText: string; submittedAt: number }>;
  baseScores: Record<TeamId, number>;
  pieceAwarded: boolean;
}

export interface RoomState {
  roomId: RoomId;
  roomCode: string;
  hostToken: string;
  phase: GamePhase;
  locked: boolean;
  teams: LobbyTeamState[];
  completedLevelIds: LevelId[];
  levelOne: LevelOneState | null;
  levelTwo: LevelTwoState | null;
  levelThree: LevelThreeState | null;
  levelFour: LevelFourState | null;
  levelFive: LevelFiveState | null;
  levelSix: LevelSixState | null;
  levelSeven: LevelSevenState | null;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoomStateStore {
  create(state: RoomState): Promise<void>;
  get(roomId: RoomId): Promise<RoomState | undefined>;
  getByCode(roomCode: string): Promise<RoomState | undefined>;
  mutateByCode(
    roomCode: string,
    mutate: (state: RoomState) => RoomState
  ): Promise<RoomState | undefined>;
  set(state: RoomState): Promise<void>;
  delete(roomId: RoomId): Promise<boolean>;
  list(): Promise<RoomState[]>;
}

export interface RecoverySnapshotStore {
  save(snapshot: RoomState): Promise<void>;
  load(roomId: RoomId): Promise<RoomState | undefined>;
  delete(roomId: RoomId): Promise<boolean>;
}
