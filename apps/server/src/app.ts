import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@htlm/protocol";
import { PROTOCOL_VERSION } from "@htlm/protocol";
import type { Acknowledgement, ProtocolErrorPayload } from "@htlm/protocol";
import type { ServerConfig } from "./config.js";
import { InMemoryRoomStateStore } from "./rooms/in-memory-room-state-store.js";
import { LobbyError, LobbyService, toLobbySnapshot } from "./rooms/lobby-service.js";

declare module "fastify" {
  interface FastifyInstance {
    io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  }
}

export async function buildServer(config: ServerConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: config.NODE_ENV !== "test" });
  const lobbyService = new LobbyService(new InMemoryRoomStateStore());

  await app.register(cors, {
    origin: config.NODE_ENV === "production" ? config.WEB_ORIGIN : true,
    credentials: true
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(app.server, {
    cors: {
      origin: config.NODE_ENV === "production" ? config.WEB_ORIGIN : true,
      credentials: true
    }
  });
  app.decorate("io", io);
  const levelTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const publishAndSchedule = (room: Awaited<ReturnType<LobbyService["inspect"]>>) => {
    const snapshot = toLobbySnapshot(room);
    io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
    const previous = levelTimers.get(room.roomCode);
    if (previous) clearTimeout(previous);
    levelTimers.delete(room.roomCode);
    const deadlineAt = room.levelOne?.deadlineAt ?? room.levelTwo?.deadlineAt ?? room.levelThree?.deadlineAt ?? room.levelFour?.deadlineAt ?? room.levelFive?.deadlineAt ?? room.levelSix?.deadlineAt ?? room.levelSeven?.deadlineAt;
    if (["level_1", "level_2", "level_3", "level_4", "level_5", "level_6", "level_7"].includes(room.phase) && deadlineAt !== null && deadlineAt !== undefined) {
      const timer = setTimeout(() => {
        const advance = room.phase === "level_1"
          ? lobbyService.advanceLevelOne(room.roomCode)
          : room.phase === "level_2"
            ? lobbyService.advanceLevelTwo(room.roomCode)
            : room.phase === "level_3"
              ? lobbyService.advanceLevelThree(room.roomCode)
              : room.phase === "level_4"
                ? lobbyService.advanceLevelFour(room.roomCode)
                : room.phase === "level_5" ? lobbyService.advanceLevelFive(room.roomCode) : room.phase === "level_6" ? lobbyService.advanceLevelSix(room.roomCode) : lobbyService.advanceLevelSeven(room.roomCode);
        void advance.then(publishAndSchedule).catch((error) => {
          app.log.error({ error, roomCode: room.roomCode, phase: room.phase }, "level timer failed");
        });
      }, Math.max(0, deadlineAt - Date.now()));
      levelTimers.set(room.roomCode, timer);
    }
    return snapshot;
  };

  app.get("/health", () => ({
    status: "ok",
    service: "hanh-trinh-lien-minh-server",
    protocolVersion: config.PROTOCOL_VERSION,
    serverTime: Date.now(),
    uptimeSeconds: Math.round(process.uptime())
  }));

  io.on("connection", (socket) => {
    app.log.info({ socketId: socket.id }, "socket connected");
    socket.emit("system:ready", {
      protocolVersion: PROTOCOL_VERSION,
      socketId: socket.id,
      serverTime: Date.now()
    });

    socket.on("system:ping", (payload, acknowledge) => {
      acknowledge({ clientTime: payload.clientTime, serverTime: Date.now() });
    });

    socket.on("host.room.create", (_payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.createRoom();
          await socket.join(roomChannel(room.roomCode));
          acknowledge({
            ok: true,
            data: {
              roomCode: room.roomCode,
              hostToken: room.hostToken,
              snapshot: toLobbySnapshot(room)
            }
          });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.session.resume", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.resumeHost(payload.roomCode, payload.hostToken);
          await socket.join(roomChannel(room.roomCode));
          acknowledge({ ok: true, data: { snapshot: toLobbySnapshot(room) } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    const setLobbyLocked = (locked: boolean) => {
      return (payload: { roomCode: string; hostToken: string }, acknowledge: AckSnapshot) => {
        void (async () => {
          try {
            const room = await lobbyService.setLocked(payload.roomCode, payload.hostToken, locked);
            const snapshot = toLobbySnapshot(room);
            io.to(roomChannel(room.roomCode)).emit(locked ? "lobby.locked" : "lobby.unlocked", snapshot);
            io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
            acknowledge({ ok: true, data: { snapshot } });
          } catch (error) {
            acknowledge(failure(error));
          }
        })();
      };
    };

    socket.on("host.lobby.lock", setLobbyLocked(true));
    socket.on("host.lobby.unlock", setLobbyLocked(false));

    socket.on("host.team.remove", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.removeTeam(
            payload.roomCode,
            payload.hostToken,
            payload.teamId
          );
          const snapshot = toLobbySnapshot(room);
          io.to(roomChannel(room.roomCode)).emit("team.removed", {
            teamId: payload.teamId,
            snapshot
          });
          io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.characterSelection.start", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.startCharacterSelection(
            payload.roomCode,
            payload.hostToken
          );
          const snapshot = toLobbySnapshot(room);
          io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.characterSelection.confirm", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.confirmCharacterSelection(
            payload.roomCode,
            payload.hostToken
          );
          const snapshot = toLobbySnapshot(room);
          io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelOne.start", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.startLevelOne(payload.roomCode, payload.hostToken);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelOne.continue", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.advanceLevelOne(
            payload.roomCode,
            Date.now(),
            true,
            payload.hostToken
          );
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelOne.returnToMap", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.returnLevelOneToMap(payload.roomCode, payload.hostToken);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelTwo.start", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.startLevelTwo(payload.roomCode, payload.hostToken);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelTwo.continue", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.advanceLevelTwo(
            payload.roomCode,
            Date.now(),
            true,
            payload.hostToken
          );
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelTwo.revealTile", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.revealLevelTwoTile(payload.roomCode, payload.hostToken, payload.tileIndex);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelTwo.returnToMap", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.returnLevelTwoToMap(payload.roomCode, payload.hostToken);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelThree.start", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.startLevelThree(payload.roomCode, payload.hostToken);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelThree.continue", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.advanceLevelThree(
            payload.roomCode,
            Date.now(),
            true,
            payload.hostToken
          );
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelThree.returnToMap", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.returnLevelThreeToMap(payload.roomCode, payload.hostToken);
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("host.levelFour.start", (payload, acknowledge) => { void lobbyService.startLevelFour(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelFour.continue", (payload, acknowledge) => { void lobbyService.advanceLevelFour(payload.roomCode, Date.now(), true, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelFour.returnToMap", (payload, acknowledge) => { void lobbyService.returnLevelFourToMap(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelFive.start", (payload, acknowledge) => { void lobbyService.startLevelFive(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelFive.continue", (payload, acknowledge) => { void lobbyService.advanceLevelFive(payload.roomCode, Date.now(), true, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelFive.returnToMap", (payload, acknowledge) => { void lobbyService.returnLevelFiveToMap(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelSix.start", (payload, acknowledge) => { void lobbyService.startLevelSix(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelSix.continue", (payload, acknowledge) => { void lobbyService.advanceLevelSix(payload.roomCode, Date.now(), true, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelSix.returnToMap", (payload, acknowledge) => { void lobbyService.returnLevelSixToMap(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelSeven.start", (payload, acknowledge) => { void lobbyService.startLevelSeven(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelSeven.continue", (payload, acknowledge) => { void lobbyService.advanceLevelSeven(payload.roomCode, Date.now(), true, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.levelSeven.returnToMap", (payload, acknowledge) => { void lobbyService.returnLevelSevenToMap(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.allianceCenter.enter", (payload, acknowledge) => { void lobbyService.enterAllianceCenter(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.finalResults.reveal", (payload, acknowledge) => { void lobbyService.revealFinalResults(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.finalResults.review", (payload, acknowledge) => { void lobbyService.reviewFinalResults(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("host.journey.complete", (payload, acknowledge) => { void lobbyService.completeJourney(payload.roomCode, payload.hostToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });

    socket.on("player.room.inspect", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.inspect(payload.roomCode);
          acknowledge({ ok: true, data: { snapshot: toLobbySnapshot(room) } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.room.join", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.join(payload.roomCode, payload.teamName, socket.id);
          await socket.join(roomChannel(room.roomCode));
          const team = room.teams.find((candidate) => candidate.socketId === socket.id);
          if (!team) throw new LobbyError("INTERNAL_ERROR", "Không thể tạo đội.");
          const snapshot = toLobbySnapshot(room);
          const publicTeam = snapshot.teams.find((candidate) => candidate.teamId === team.teamId);
          if (!publicTeam) throw new LobbyError("INTERNAL_ERROR", "Không thể tạo đội.");
          const session = {
            roomCode: room.roomCode,
            teamId: team.teamId,
            teamName: team.teamName,
            sessionToken: team.sessionToken
          };
          io.to(roomChannel(room.roomCode)).emit("team.joined", { team: publicTeam, snapshot });
          io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
          acknowledge({ ok: true, data: { session, snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.session.resume", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.resumePlayer(
            payload.roomCode,
            payload.sessionToken,
            socket.id
          );
          await socket.join(roomChannel(room.roomCode));
          const team = room.teams.find((candidate) => candidate.sessionToken === payload.sessionToken);
          if (!team) throw new LobbyError("TEAM_NOT_FOUND", "Phiên đội không còn hợp lệ.");
          const snapshot = toLobbySnapshot(room);
          const session = {
            roomCode: room.roomCode,
            teamId: team.teamId,
            teamName: team.teamName,
            sessionToken: team.sessionToken
          };
          io.to(roomChannel(room.roomCode)).emit("team.connectionChanged", {
            teamId: team.teamId,
            connected: true,
            snapshot
          });
          io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
          acknowledge({ ok: true, data: { session, snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.character.claim", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.claimCharacter(
            payload.roomCode,
            payload.sessionToken,
            payload.characterId
          );
          const snapshot = toLobbySnapshot(room);
          io.to(roomChannel(room.roomCode)).emit("room.snapshot", snapshot);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.levelOne.answer", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.submitLevelOneAnswer(
            payload.roomCode,
            payload.sessionToken,
            payload.questionId,
            payload.optionId
          );
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.levelTwo.answer", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.submitLevelTwoAnswer(
            payload.roomCode,
            payload.sessionToken,
            payload.challengeId,
            payload.keyword
          );
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.levelThree.answer", (payload, acknowledge) => {
      void (async () => {
        try {
          const room = await lobbyService.submitLevelThreeAnswer(
            payload.roomCode,
            payload.sessionToken,
            payload.roundId,
            payload.answerText
          );
          const snapshot = publishAndSchedule(room);
          acknowledge({ ok: true, data: { snapshot } });
        } catch (error) {
          acknowledge(failure(error));
        }
      })();
    });

    socket.on("player.levelFour.answer", (payload, acknowledge) => { void lobbyService.submitLevelFourAnswer(payload.roomCode, payload.sessionToken, payload.challengeId, payload.solution).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("player.levelFive.answer", (payload, acknowledge) => { void lobbyService.submitLevelFiveAnswer(payload.roomCode, payload.sessionToken, payload.questionId, payload.optionId).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("player.levelFive.checkpointReached", (payload, acknowledge) => { void lobbyService.reachLevelFiveCheckpoint(payload.roomCode, payload.sessionToken, payload.checkpointIndex).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("player.levelFive.finishReached", (payload, acknowledge) => { void lobbyService.reachLevelFiveFinish(payload.roomCode, payload.sessionToken).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("player.levelSix.answer", (payload, acknowledge) => { void lobbyService.submitLevelSixAnswer(payload.roomCode, payload.sessionToken, payload.challengeId, payload.solution).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });
    socket.on("player.levelSeven.answer", (payload, acknowledge) => { void lobbyService.submitLevelSevenAnswer(payload.roomCode, payload.sessionToken, payload.roundId, payload.answerText).then((room) => acknowledge({ ok: true, data: { snapshot: publishAndSchedule(room) } })).catch((error) => acknowledge(failure(error))); });

    socket.on("disconnect", (reason) => {
      app.log.info({ socketId: socket.id, reason }, "socket disconnected");
      void lobbyService.disconnect(socket.id).then((changes) => {
        for (const { state, teamId } of changes) {
          const snapshot = toLobbySnapshot(state);
          io.to(roomChannel(state.roomCode)).emit("team.connectionChanged", {
            teamId,
            connected: false,
            snapshot
          });
          io.to(roomChannel(state.roomCode)).emit("room.snapshot", snapshot);
        }
      });
    });
  });

  if (config.STATIC_DIR) {
    await app.register(fastifyStatic, { root: config.STATIC_DIR });
    app.setNotFoundHandler(async (request, reply) => {
      if (request.headers.accept?.includes("text/html")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "Not Found" });
    });
  }

  app.addHook("onClose", () => {
    for (const timer of levelTimers.values()) clearTimeout(timer);
    levelTimers.clear();
    void io.close();
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ error }, "request failed");
    void reply.code(error.statusCode ?? 500).send({
      error: error.name,
      message: config.NODE_ENV === "production" ? "Unexpected server error" : error.message
    });
  });

  return app;
}

type AckSnapshot = (result: Acknowledgement<{ snapshot: ReturnType<typeof toLobbySnapshot> }>) => void;

function roomChannel(roomCode: string): string {
  return `room:${roomCode}`;
}

function failure(error: unknown): { ok: false; error: ProtocolErrorPayload } {
  if (error instanceof LobbyError) {
    return { ok: false, error: { code: error.code, message: error.message } };
  }
  return {
    ok: false,
    error: { code: "INTERNAL_ERROR", message: "Đã xảy ra lỗi máy chủ." }
  };
}
