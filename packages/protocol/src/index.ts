import { z } from "zod";
import type { CharacterId, GamePhase, LevelId, RoomId, TeamId } from "@htlm/game-domain";
import { PROTOCOL_VERSION } from "./constants.js";

export { PROTOCOL_VERSION } from "./constants.js";

export type SessionId = string;
export type CommandId = string;
export type EventId = string;
export type AttemptId = string;

export interface CommandEnvelope<TType extends string = string, TPayload = unknown> {
  protocolVersion: typeof PROTOCOL_VERSION;
  type: TType;
  commandId: CommandId;
  sessionId: SessionId;
  roomId?: RoomId;
  expectedRevision?: number;
  attemptId?: AttemptId;
  payload: TPayload;
}

export interface EventEnvelope<TType extends string = string, TPayload = unknown> {
  protocolVersion: typeof PROTOCOL_VERSION;
  type: TType;
  eventId: EventId;
  roomId?: RoomId;
  revision: number;
  serverTime: number;
  payload: TPayload;
}

export const commandEnvelopeSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.string().min(1),
  commandId: z.string().min(1),
  sessionId: z.string().min(1),
  roomId: z.string().min(1).optional(),
  expectedRevision: z.number().int().nonnegative().optional(),
  attemptId: z.string().min(1).optional(),
  payload: z.unknown()
});

export const eventEnvelopeSchema = z.object({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  type: z.string().min(1),
  eventId: z.string().min(1),
  roomId: z.string().min(1).optional(),
  revision: z.number().int().nonnegative(),
  serverTime: z.number().int().nonnegative(),
  payload: z.unknown()
});

export interface SystemReadyPayload {
  protocolVersion: typeof PROTOCOL_VERSION;
  socketId: string;
  serverTime: number;
}

export interface PingPayload {
  clientTime: number;
}

export interface PongPayload {
  clientTime: number;
  serverTime: number;
}

export interface LobbyTeamPublic {
  teamId: TeamId;
  teamName: string;
  connected: boolean;
  characterId: CharacterId | null;
}

export interface PublicLevelScoreResult {
  levelId: LevelId;
  baseScore: number;
  multiplier: 1 | 2;
  finalScore: number;
  completed: boolean;
}

export interface TeamScorePublic {
  teamId: TeamId;
  teamName: string;
  characterId: CharacterId | null;
  completedLevelCount: number;
  levelResults: PublicLevelScoreResult[];
  totalScore: number;
  rank: number;
}

export interface JourneyProgressPublic {
  completedLevels: number;
  alliancePiecesCollected: number;
  nextLevel: LevelId | null;
  journeyComplete: boolean;
}

export type LevelOnePhase = "intro" | "question_active" | "question_reveal" | "level_result";

export interface LevelOneQuestionPublic {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  points: 30 | 40;
  demo: true;
}

export interface LevelOneResultPublic {
  teamId: TeamId;
  teamName: string;
  baseScore: number;
  multiplier: 1 | 2;
  finalScore: number;
  accumulatedTotalScore: number;
}

export interface LevelOnePublicState {
  phase: LevelOnePhase;
  questionIndex: number;
  totalQuestions: 3;
  phaseStartedAt: number;
  deadlineAt: number | null;
  currentQuestion: LevelOneQuestionPublic | null;
  submittedTeamIds: TeamId[];
  reveal: null | {
    correctOptionId: string;
    explanation: string;
    feedback: Array<{ teamId: TeamId; correct: boolean; pointsAwarded: number }>;
  };
  results: LevelOneResultPublic[] | null;
  pieceAwarded: boolean;
}

export type LevelTwoPhase = "intro" | "round_active" | "round_complete" | "level_result";

export interface LevelTwoChallengePublic {
  id: string;
  image: string;
  hint: string;
  keywordPattern: string;
  demo: true;
}

export type LevelResultPublic = LevelOneResultPublic;

export interface LevelFiveResultPublic extends LevelOneResultPublic {
  completionTimeMs: number | null;
  finishRank: number | null;
  finishBonus: number;
}

export interface LevelTwoPublicState {
  phase: LevelTwoPhase;
  currentRound: 1 | 2;
  totalRounds: 2;
  phaseStartedAt: number;
  deadlineAt: number | null;
  currentChallenge: LevelTwoChallengePublic | null;
  openedTiles: number[];
  currentReward: number;
  roundWinnerTeamId: TeamId | null;
  roundReward: number | null;
  guessedTeamIds: TeamId[];
  cooldownUntilByTeam: Record<TeamId, number>;
  reveal: null | { keyword: string; winnerTeamId: TeamId | null; winnerTeamName: string | null };
  roundResults: Array<{
    round: 1 | 2;
    winnerTeamId: TeamId;
    winnerTeamName: string;
    baseReward: number;
    multiplier: 1 | 2;
    awardedScore: number;
  }>;
  results: LevelResultPublic[] | null;
  pieceAwarded: boolean;
}

export type LevelThreePhase = "intro" | "round_active" | "round_reveal" | "level_result";
export type LevelThreeRoundPublic =
  | {
      id: string;
      type: "parking";
      prompt: string;
      parkingSpaces: string[];
      inputMode: "numeric";
      points: 50;
      demo: true;
    }
  | {
      id: string;
      type: "story";
      prompt: string;
      storyParagraphs: string[];
      inputMode: "text";
      points: 50;
      demo: true;
    };

export interface LevelThreePublicState {
  phase: LevelThreePhase;
  roundIndex: number;
  totalRounds: 2;
  phaseStartedAt: number;
  deadlineAt: number | null;
  currentRound: LevelThreeRoundPublic | null;
  submittedTeamIds: TeamId[];
  reveal: null | {
    answer: string;
    explanation: string;
    feedback: Array<{ teamId: TeamId; correct: boolean; pointsAwarded: number }>;
  };
  results: LevelResultPublic[] | null;
  pieceAwarded: boolean;
}

export type LevelFourSubmission = { matches: readonly { leftId: string; rightId: string }[] };
export interface LevelFourChallengePublic {
  id: string;
  type: "matching";
  prompt: string;
  leftItems: Array<{ id: string; text: string }>;
  rightItems: Array<{ id: string; text: string }>;
  points: 25;
  demo: true;
}
export interface LevelFourPublicState {
  phase: "intro" | "challenge_active" | "challenge_reveal" | "level_result";
  challengeIndex: number;
  totalChallenges: 4;
  phaseStartedAt: number;
  deadlineAt: number | null;
  currentChallenge: LevelFourChallengePublic | null;
  submittedTeamIds: TeamId[];
  reveal: null | {
    solution: LevelFourSubmission;
    explanation: string;
    feedback: Array<{ teamId: TeamId; correct: boolean; pointsAwarded: number }>;
  };
  results: LevelResultPublic[] | null;
  pieceAwarded: boolean;
}

export interface LevelFiveQuestionPublic {
  id: string;
  type: "singleChoice";
  prompt: string;
  options: Array<{ id: string; text: string }>;
  points: 20;
  demo: true;
}
export type LevelFiveTeamMode =
  "platforming" | "question" | "retry_cooldown" | "final_platforming" | "finished";
export interface LevelFiveTeamProgressPublic {
  checkpointProgress: 0 | 1 | 2 | 3 | 4 | 5;
  mode: LevelFiveTeamMode;
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
export interface LevelFivePublicState {
  phase: "intro" | "running" | "level_result";
  totalQuestions: 5;
  phaseStartedAt: number;
  levelStartedAt: number | null;
  deadlineAt: number | null;
  teamProgress: Record<TeamId, LevelFiveTeamProgressPublic>;
  currentQuestions: Record<TeamId, LevelFiveQuestionPublic | null>;
  progress: Record<TeamId, number>;
  results: LevelFiveResultPublic[] | null;
  pieceAwarded: boolean;
}

export type LevelSixSubmission =
  | { type: "singleChoice" | "classification"; optionId: string }
  | { type: "ordering"; order: readonly string[] };
export type LevelSixChallengePublic =
  | {
      id: string;
      station: 1 | 4;
      type: "singleChoice";
      prompt: string;
      options: Array<{ id: string; text: string }>;
      points: 25;
      demo: true;
    }
  | {
      id: string;
      station: 2;
      type: "classification";
      prompt: string;
      options: Array<{ id: string; text: string }>;
      points: 25;
      demo: true;
    }
  | {
      id: string;
      station: 3;
      type: "ordering";
      prompt: string;
      items: Array<{ id: string; text: string }>;
      points: 25;
      demo: true;
    };
export interface LevelSixPublicState {
  phase: "intro" | "station_active" | "station_reveal" | "level_result";
  stationIndex: number;
  totalStations: 4;
  phaseStartedAt: number;
  deadlineAt: number | null;
  currentChallenge: LevelSixChallengePublic | null;
  submittedTeamIds: TeamId[];
  reveal: null | {
    solution: LevelSixSubmission;
    explanation: string;
    feedback: Array<{ teamId: TeamId; correct: boolean; pointsAwarded: number }>;
  };
  results: LevelResultPublic[] | null;
  pieceAwarded: boolean;
}
export interface LevelSevenRoundPublic {
  id: string;
  type: "pictureWord";
  prompt: string;
  imageUrls: string[];
  answerPattern: string;
  points: 30 | 40;
  demo: true;
}
export interface LevelSevenPublicState {
  phase: "intro" | "round_active" | "round_reveal" | "level_result";
  roundIndex: number;
  totalRounds: 3;
  phaseStartedAt: number;
  deadlineAt: number | null;
  currentRound: LevelSevenRoundPublic | null;
  submittedTeamIds: TeamId[];
  reveal: null | {
    answer: string;
    explanation: string;
    feedback: Array<{ teamId: TeamId; correct: boolean; pointsAwarded: number }>;
  };
  results: LevelResultPublic[] | null;
  pieceAwarded: boolean;
}

export interface LobbySnapshot {
  roomCode: string;
  phase: GamePhase;
  locked: boolean;
  teamCount: number;
  teams: LobbyTeamPublic[];
  revision: number;
  completedLevelIds: LevelId[];
  scoreboard: TeamScorePublic[];
  journey: JourneyProgressPublic;
  levelOne: LevelOnePublicState | null;
  levelTwo: LevelTwoPublicState | null;
  levelThree: LevelThreePublicState | null;
  levelFour: LevelFourPublicState | null;
  levelFive: LevelFivePublicState | null;
  levelSix: LevelSixPublicState | null;
  levelSeven: LevelSevenPublicState | null;
}

export interface ProtocolErrorPayload {
  code:
    | "ROOM_NOT_FOUND"
    | "ROOM_FULL"
    | "LOBBY_LOCKED"
    | "DUPLICATE_TEAM_NAME"
    | "INVALID_TEAM_NAME"
    | "UNAUTHORIZED"
    | "TEAM_NOT_FOUND"
    | "LOBBY_MUST_BE_UNLOCKED"
    | "INVALID_PHASE"
    | "CHARACTER_NOT_FOUND"
    | "CHARACTER_TAKEN"
    | "LINEUP_INCOMPLETE"
    | "LINEUP_LOCKED"
    | "LEVEL_NOT_READY"
    | "ANSWER_ALREADY_SUBMITTED"
    | "ANSWER_LATE"
    | "TILE_ALREADY_OPEN"
    | "GAME_ALREADY_COMPLETED"
    | "GUESS_COOLDOWN"
    | "INVALID_OPTION"
    | "INTERNAL_ERROR";
  message: string;
}

export type Acknowledgement<T> = { ok: true; data: T } | { ok: false; error: ProtocolErrorPayload };

export interface HostRoomCredentials {
  roomCode: string;
  hostToken: string;
}

export interface PlayerSession {
  roomCode: string;
  teamId: TeamId;
  teamName: string;
  sessionToken: string;
}

export interface ClientToServerEvents {
  "system:ping": (payload: PingPayload, acknowledge: (payload: PongPayload) => void) => void;
  "host.room.create": (
    payload: Record<string, never>,
    acknowledge: (
      result: Acknowledgement<HostRoomCredentials & { snapshot: LobbySnapshot }>
    ) => void
  ) => void;
  "host.session.resume": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.lobby.lock": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.lobby.unlock": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.team.remove": (
    payload: HostRoomCredentials & { teamId: TeamId },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.characterSelection.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.characterSelection.confirm": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelOne.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelOne.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelOne.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelTwo.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelTwo.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelTwo.revealTile": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelTwo.revealAnswer": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelTwo.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelThree.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelThree.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelThree.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFour.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFour.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFour.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFive.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFive.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFive.forceComplete": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelFive.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelSix.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelSix.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelSix.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelSeven.start": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelSeven.continue": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.levelSeven.returnToMap": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.allianceCenter.enter": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.finalResults.reveal": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.finalResults.review": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "host.journey.complete": (
    payload: HostRoomCredentials,
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.room.inspect": (
    payload: { roomCode: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.room.join": (
    payload: { roomCode: string; teamName: string },
    acknowledge: (
      result: Acknowledgement<{ session: PlayerSession; snapshot: LobbySnapshot }>
    ) => void
  ) => void;
  "player.session.resume": (
    payload: { roomCode: string; sessionToken: string },
    acknowledge: (
      result: Acknowledgement<{ session: PlayerSession; snapshot: LobbySnapshot }>
    ) => void
  ) => void;
  "player.character.claim": (
    payload: { roomCode: string; sessionToken: string; characterId: CharacterId },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelOne.answer": (
    payload: { roomCode: string; sessionToken: string; questionId: string; optionId: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelTwo.answer": (
    payload: { roomCode: string; sessionToken: string; challengeId: string; keyword: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelThree.answer": (
    payload: { roomCode: string; sessionToken: string; roundId: string; answerText: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelFour.answer": (
    payload: {
      roomCode: string;
      sessionToken: string;
      challengeId: string;
      solution: LevelFourSubmission;
    },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelFive.answer": (
    payload: { roomCode: string; sessionToken: string; questionId: string; optionId: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelFive.checkpointReached": (
    payload: { roomCode: string; sessionToken: string; checkpointIndex: number },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelFive.finishReached": (
    payload: { roomCode: string; sessionToken: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelSix.answer": (
    payload: {
      roomCode: string;
      sessionToken: string;
      challengeId: string;
      solution: LevelSixSubmission;
    },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
  "player.levelSeven.answer": (
    payload: { roomCode: string; sessionToken: string; roundId: string; answerText: string },
    acknowledge: (result: Acknowledgement<{ snapshot: LobbySnapshot }>) => void
  ) => void;
}

export interface ServerToClientEvents {
  "system:ready": (payload: SystemReadyPayload) => void;
  "room.snapshot": (payload: LobbySnapshot) => void;
  "team.joined": (payload: { team: LobbyTeamPublic; snapshot: LobbySnapshot }) => void;
  "team.removed": (payload: { teamId: TeamId; snapshot: LobbySnapshot }) => void;
  "team.connectionChanged": (payload: {
    teamId: TeamId;
    connected: boolean;
    snapshot: LobbySnapshot;
  }) => void;
  "lobby.locked": (payload: LobbySnapshot) => void;
  "lobby.unlocked": (payload: LobbySnapshot) => void;
  "protocol.error": (payload: ProtocolErrorPayload) => void;
}
