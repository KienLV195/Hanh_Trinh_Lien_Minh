import { io, type Socket } from "socket.io-client";
import type { CharacterId } from "@htlm/game-domain";
import type {
  Acknowledgement,
  ClientToServerEvents,
  HostRoomCredentials,
  LevelFourSubmission,
  LevelSixSubmission,
  LobbySnapshot,
  PlayerSession,
  ProtocolErrorPayload,
  ServerToClientEvents
} from "@htlm/protocol";
import { environment } from "../config/environment";

export type SocketStatus = "connecting" | "connected" | "disconnected" | "error";
type Listener = () => void;
type LobbyListener = (snapshot: LobbySnapshot) => void;

export class LobbyClientError extends Error {
  constructor(readonly detail: ProtocolErrorPayload) {
    super(detail.message);
    this.name = "LobbyClientError";
  }
}

class SocketStore {
  readonly #socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  readonly #listeners = new Set<Listener>();
  #status: SocketStatus = "connecting";
  #socketId: string | null = null;
  #snapshot: { status: SocketStatus; socketId: string | null } = {
    status: "connecting",
    socketId: null
  };

  constructor() {
    this.#socket = io(environment.socketUrl, {
      autoConnect: true,
      reconnection: true,
      transports: ["websocket", "polling"]
    });

    this.#socket.on("connect", () => this.#setStatus("connected"));
    this.#socket.on("disconnect", () => this.#setStatus("disconnected"));
    this.#socket.on("connect_error", () => this.#setStatus("error"));
    this.#socket.on("system:ready", (payload) => {
      this.#socketId = payload.socketId;
      this.#setStatus("connected");
    });
  }

  subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): { status: SocketStatus; socketId: string | null } => this.#snapshot;

  ping(): Promise<number> {
    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Socket ping timed out")), 2_000);
      this.#socket.emit("system:ping", { clientTime: startedAt }, () => {
        window.clearTimeout(timeout);
        resolve(Date.now() - startedAt);
      });
    });
  }

  createRoom(): Promise<HostRoomCredentials & { snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) => this.#socket.emit("host.room.create", {}, acknowledge));
  }

  resumeHost(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.session.resume", credentials, acknowledge)
    );
  }

  setLobbyLocked(
    credentials: HostRoomCredentials,
    locked: boolean
  ): Promise<{ snapshot: LobbySnapshot }> {
    if (locked) {
      return this.#acknowledge((acknowledge) =>
        this.#socket.emit("host.lobby.lock", credentials, acknowledge)
      );
    }
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.lobby.unlock", credentials, acknowledge)
    );
  }

  removeTeam(
    credentials: HostRoomCredentials,
    teamId: string
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.team.remove", { ...credentials, teamId }, acknowledge)
    );
  }

  startCharacterSelection(
    credentials: HostRoomCredentials
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.characterSelection.start", credentials, acknowledge)
    );
  }

  confirmCharacterSelection(
    credentials: HostRoomCredentials
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.characterSelection.confirm", credentials, acknowledge)
    );
  }

  startLevelOne(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelOne.start", credentials, acknowledge)
    );
  }

  continueLevelOne(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelOne.continue", credentials, acknowledge)
    );
  }

  returnLevelOneToMap(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelOne.returnToMap", credentials, acknowledge)
    );
  }

  startLevelTwo(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelTwo.start", credentials, acknowledge)
    );
  }

  continueLevelTwo(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelTwo.continue", credentials, acknowledge)
    );
  }

  revealLevelTwoTile(credentials: HostRoomCredentials, tileIndex: number): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelTwo.revealTile", { ...credentials, tileIndex }, acknowledge)
    );
  }

  returnLevelTwoToMap(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelTwo.returnToMap", credentials, acknowledge)
    );
  }

  startLevelThree(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelThree.start", credentials, acknowledge)
    );
  }

  continueLevelThree(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelThree.continue", credentials, acknowledge)
    );
  }

  returnLevelThreeToMap(credentials: HostRoomCredentials): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("host.levelThree.returnToMap", credentials, acknowledge)
    );
  }

  startLevelFour(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelFour.start", credentials, ack)); }
  continueLevelFour(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelFour.continue", credentials, ack)); }
  returnLevelFourToMap(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelFour.returnToMap", credentials, ack)); }
  startLevelFive(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelFive.start", credentials, ack)); }
  continueLevelFive(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelFive.continue", credentials, ack)); }
  returnLevelFiveToMap(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelFive.returnToMap", credentials, ack)); }
  startLevelSix(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelSix.start", credentials, ack)); }
  continueLevelSix(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelSix.continue", credentials, ack)); }
  returnLevelSixToMap(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelSix.returnToMap", credentials, ack)); }
  startLevelSeven(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelSeven.start", credentials, ack)); }
  continueLevelSeven(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelSeven.continue", credentials, ack)); }
  returnLevelSevenToMap(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.levelSeven.returnToMap", credentials, ack)); }
  enterAllianceCenter(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.allianceCenter.enter", credentials, ack)); }
  revealFinalResults(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.finalResults.reveal", credentials, ack)); }
  reviewFinalResults(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.finalResults.review", credentials, ack)); }
  completeJourney(credentials: HostRoomCredentials) { return this.#acknowledge<{ snapshot: LobbySnapshot }>((ack) => this.#socket.emit("host.journey.complete", credentials, ack)); }

  inspectRoom(roomCode: string): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("player.room.inspect", { roomCode }, acknowledge)
    );
  }

  joinRoom(
    roomCode: string,
    teamName: string
  ): Promise<{ session: PlayerSession; snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("player.room.join", { roomCode, teamName }, acknowledge)
    );
  }

  resumePlayer(
    roomCode: string,
    sessionToken: string
  ): Promise<{ session: PlayerSession; snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit("player.session.resume", { roomCode, sessionToken }, acknowledge)
    );
  }

  claimCharacter(
    roomCode: string,
    sessionToken: string,
    characterId: CharacterId
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit(
        "player.character.claim",
        { roomCode, sessionToken, characterId },
        acknowledge
      )
    );
  }

  submitLevelOneAnswer(
    roomCode: string,
    sessionToken: string,
    questionId: string,
    optionId: string
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit(
        "player.levelOne.answer",
        { roomCode, sessionToken, questionId, optionId },
        acknowledge
      )
    );
  }

  submitLevelTwoAnswer(
    roomCode: string,
    sessionToken: string,
    challengeId: string,
    keyword: string
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit(
        "player.levelTwo.answer",
        { roomCode, sessionToken, challengeId, keyword },
        acknowledge
      )
    );
  }

  submitLevelThreeAnswer(
    roomCode: string,
    sessionToken: string,
    roundId: string,
    answerText: string
  ): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) =>
      this.#socket.emit(
        "player.levelThree.answer",
        { roomCode, sessionToken, roundId, answerText },
        acknowledge
      )
    );
  }

  submitLevelFourAnswer(roomCode: string, sessionToken: string, challengeId: string, solution: LevelFourSubmission): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) => this.#socket.emit("player.levelFour.answer", { roomCode, sessionToken, challengeId, solution }, acknowledge));
  }

  submitLevelFiveAnswer(roomCode: string, sessionToken: string, questionId: string, optionId: string): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) => this.#socket.emit("player.levelFive.answer", { roomCode, sessionToken, questionId, optionId }, acknowledge));
  }
  reachLevelFiveCheckpoint(roomCode: string, sessionToken: string, checkpointIndex: number): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) => this.#socket.emit("player.levelFive.checkpointReached", { roomCode, sessionToken, checkpointIndex }, acknowledge));
  }
  reachLevelFiveFinish(roomCode: string, sessionToken: string): Promise<{ snapshot: LobbySnapshot }> {
    return this.#acknowledge((acknowledge) => this.#socket.emit("player.levelFive.finishReached", { roomCode, sessionToken }, acknowledge));
  }
  submitLevelSixAnswer(roomCode: string, sessionToken: string, challengeId: string, solution: LevelSixSubmission): Promise<{ snapshot: LobbySnapshot }> { return this.#acknowledge((ack) => this.#socket.emit("player.levelSix.answer", { roomCode, sessionToken, challengeId, solution }, ack)); }
  submitLevelSevenAnswer(roomCode: string, sessionToken: string, roundId: string, answerText: string): Promise<{ snapshot: LobbySnapshot }> { return this.#acknowledge((ack) => this.#socket.emit("player.levelSeven.answer", { roomCode, sessionToken, roundId, answerText }, ack)); }

  subscribeLobby(listener: LobbyListener): () => void {
    this.#socket.on("room.snapshot", listener);
    return () => this.#socket.off("room.snapshot", listener);
  }

  #acknowledge<T>(
    emit: (acknowledge: (result: Acknowledgement<T>) => void) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Máy chủ không phản hồi.")), 5_000);
      emit((result) => {
        window.clearTimeout(timeout);
        if (result.ok) resolve(result.data);
        else reject(new LobbyClientError(result.error));
      });
    });
  }

  #setStatus(status: SocketStatus): void {
    this.#status = status;
    if (status !== "connected") this.#socketId = null;
    this.#snapshot = { status: this.#status, socketId: this.#socketId };
    for (const listener of this.#listeners) listener();
  }
}

export const socketStore = new SocketStore();
