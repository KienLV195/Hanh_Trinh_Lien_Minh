import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CHARACTERS, type CharacterId } from "@htlm/game-domain";
import type { LevelFourSubmission, LevelSixSubmission, LobbySnapshot } from "@htlm/protocol";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../components/page-shell";
import { CharacterCard } from "../components/character-card";
import { PlayerCharacterPicker } from "../components/player-character-picker";
import { PlayerLevelOne } from "../components/level-one";
import { PlayerLevelThree, PlayerLevelTwo } from "../components/level-two-three";
import { PlayerLevelFour } from "../components/level-four-five";
import { PlayerLevelFive } from "../components/level-five-platformer";
import { PlayerLevelSeven, PlayerLevelSix } from "../components/level-six-seven";
import { AllianceConvergence, FinalEnding, FinalLeaderboard } from "../components/finale";
import { useSocketStatus } from "../hooks/use-socket-status";
import {
  clearPlayerSession,
  loadPlayerSession,
  savePlayerSession
} from "../realtime/lobby-session";
import { socketStore } from "../realtime/socket-store";

export function PlayerPage() {
  const { roomCode } = useParams();
  const location = useLocation();

  if (!roomCode) return <RoomCodeForm />;
  const normalizedRoomCode = normalizeCode(roomCode);
  if (location.pathname.startsWith("/play/")) {
    return <WaitingRoom roomCode={normalizedRoomCode} />;
  }
  if (loadPlayerSession(normalizedRoomCode)) return <Navigate replace to={`/play/${normalizedRoomCode}`} />;
  return <TeamJoinForm roomCode={normalizedRoomCode} />;
}

function RoomCodeForm() {
  const navigate = useNavigate();
  const socket = useSocketStatus();
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const code = normalizeCode(roomCode);
    if (code.length !== 5) {
      setError("Mã phòng phải gồm 5 ký tự.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await socketStore.inspectRoom(code);
      void navigate(loadPlayerSession(code) ? `/play/${code}` : `/join/${code}`);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell compact mode="player" title="Tham gia phòng" subtitle="Nhập mã 5 ký tự hiển thị trên màn hình host.">
      <form className="lobby-card join-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="room-code">Mã phòng</label>
        <input
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          id="room-code"
          inputMode="text"
          maxLength={5}
          onChange={(event) => setRoomCode(normalizeCode(event.target.value))}
          placeholder="ABCDE"
          value={roomCode}
        />
        <button className="button button--primary" disabled={busy || socket.status !== "connected"} type="submit">
          {busy ? "Đang kiểm tra…" : "Tiếp tục"}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </PageShell>
  );
}

function TeamJoinForm({ roomCode }: { roomCode: string }) {
  const navigate = useNavigate();
  const socket = useSocketStatus();
  const [teamName, setTeamName] = useState("");
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inspect = useCallback(async () => {
    try {
      const result = await socketStore.inspectRoom(roomCode);
      setSnapshot(result.snapshot);
      setError(null);
    } catch (reason) {
      setSnapshot(null);
      setError(messageOf(reason));
    }
  }, [roomCode]);

  useEffect(() => socketStore.subscribeLobby((next) => {
    if (next.roomCode === roomCode) setSnapshot(next);
  }), [roomCode]);
  useEffect(() => {
    if (socket.status === "connected") void inspect();
  }, [inspect, socket.status]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = teamName.trim();
    if (!cleanName) {
      setError("Hãy nhập tên đội.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await socketStore.joinRoom(roomCode, cleanName);
      savePlayerSession(result.session);
      void navigate(`/play/${roomCode}`);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const unavailable = !snapshot || snapshot.locked || snapshot.teamCount >= 7;

  return (
    <PageShell
      compact
      mode="player"
      title={`Phòng ${roomCode}`}
      subtitle={snapshot ? `${snapshot.teamCount}/7 đội đã tham gia.` : "Đang kiểm tra phòng…"}
    >
      <form className="lobby-card join-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor="team-name">Tên đội</label>
        <input
          autoComplete="off"
          autoFocus
          id="team-name"
          maxLength={32}
          onChange={(event) => setTeamName(event.target.value)}
          placeholder="Ví dụ: Sao Vàng"
          value={teamName}
        />
        <button className="button button--primary" disabled={busy || unavailable} type="submit">
          {busy ? "Đang tham gia…" : "Vào phòng chờ"}
        </button>
        {snapshot?.locked && <p className="form-error">Phòng đã khóa.</p>}
        {snapshot && snapshot.teamCount >= 7 && <p className="form-error">Phòng đã đủ 7 đội.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </PageShell>
  );
}

function WaitingRoom({ roomCode }: { roomCode: string }) {
  const navigate = useNavigate();
  const socket = useSocketStatus();
  const session = useMemo(() => loadPlayerSession(roomCode), [roomCode]);
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<CharacterId | null>(null);
  const [answering, setAnswering] = useState(false);

  const resume = useCallback(async () => {
    if (!session) return;
    try {
      const result = await socketStore.resumePlayer(roomCode, session.sessionToken);
      savePlayerSession(result.session);
      setSnapshot(result.snapshot);
      setError(null);
    } catch (reason) {
      clearPlayerSession(roomCode);
      void navigate(`/join/${roomCode}`, { replace: true });
    }
  }, [navigate, roomCode, session]);

  useEffect(() => socketStore.subscribeLobby((next) => {
    if (next.roomCode !== roomCode) return;
    setSnapshot(next);
    if (session && !next.teams.some((team) => team.teamId === session.teamId)) {
      clearPlayerSession(roomCode);
      setError("Đội của bạn đã bị host xóa khỏi phòng.");
    }
  }), [roomCode, session]);
  useEffect(() => {
    if (socket.status === "connected") void resume();
  }, [resume, socket.status]);

  if (!session) {
    return (
      <PageShell compact mode="player" title="Chưa tham gia phòng" subtitle={`Phòng ${roomCode}`}>
        <section className="lobby-card">
          <p>Không tìm thấy phiên đội trên thiết bị này.</p>
          <Link className="button button--primary" to={`/join/${roomCode}`}>Nhập tên đội</Link>
        </section>
      </PageShell>
    );
  }

  const claimCharacter = async (characterId: CharacterId) => {
    if (claiming) return;
    setClaiming(characterId);
    setError(null);
    try {
      const result = await socketStore.claimCharacter(
        roomCode,
        session.sessionToken,
        characterId
      );
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
      try {
        const refreshed = await socketStore.inspectRoom(roomCode);
        setSnapshot(refreshed.snapshot);
      } catch {
        // Keep the claim error, which is more useful to the player.
      }
    } finally {
      setClaiming(null);
    }
  };

  const answerQuestion = async (questionId: string, optionId: string) => {
    if (answering) return;
    setAnswering(true);
    setError(null);
    try {
      const result = await socketStore.submitLevelOneAnswer(
        roomCode,
        session.sessionToken,
        questionId,
        optionId
      );
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setAnswering(false);
    }
  };

  const answerLevelTwo = async (challengeId: string, keyword: string) => {
    if (answering) return;
    setAnswering(true);
    setError(null);
    try {
      const result = await socketStore.submitLevelTwoAnswer(
        roomCode,
        session.sessionToken,
        challengeId,
        keyword
      );
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setAnswering(false);
    }
  };

  const answerLevelThree = async (roundId: string, answerText: string) => {
    if (answering) return;
    setAnswering(true);
    setError(null);
    try {
      const result = await socketStore.submitLevelThreeAnswer(
        roomCode,
        session.sessionToken,
        roundId,
        answerText
      );
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setAnswering(false);
    }
  };

  const answerLevelFour = async (challengeId: string, solution: LevelFourSubmission) => {
    if (answering) return; setAnswering(true); setError(null);
    try { const result = await socketStore.submitLevelFourAnswer(roomCode, session.sessionToken, challengeId, solution); setSnapshot(result.snapshot); }
    catch (reason) { setError(messageOf(reason)); } finally { setAnswering(false); }
  };

  const answerLevelFive = async (questionId: string, optionId: string) => {
    if (answering) return; setAnswering(true); setError(null);
    try { const result = await socketStore.submitLevelFiveAnswer(roomCode, session.sessionToken, questionId, optionId); setSnapshot(result.snapshot); }
    catch (reason) { setError(messageOf(reason)); } finally { setAnswering(false); }
  };
  const reachLevelFiveCheckpoint = async (checkpointIndex: number) => {
    if (answering) return false; setAnswering(true); setError(null);
    try { const result = await socketStore.reachLevelFiveCheckpoint(roomCode, session.sessionToken, checkpointIndex); setSnapshot(result.snapshot); return true; }
    catch (reason) { setError(messageOf(reason)); return false; } finally { setAnswering(false); }
  };
  const reachLevelFiveFinish = async () => {
    if (answering) return false; setAnswering(true); setError(null);
    try { const result = await socketStore.reachLevelFiveFinish(roomCode, session.sessionToken); setSnapshot(result.snapshot); return true; }
    catch (reason) { setError(messageOf(reason)); return false; } finally { setAnswering(false); }
  };
  const answerLevelSix = async (challengeId: string, solution: LevelSixSubmission) => { if (answering) return; setAnswering(true); setError(null); try { const result = await socketStore.submitLevelSixAnswer(roomCode, session.sessionToken, challengeId, solution); setSnapshot(result.snapshot); } catch (reason) { setError(messageOf(reason)); } finally { setAnswering(false); } };
  const answerLevelSeven = async (roundId: string, answerText: string) => { if (answering) return; setAnswering(true); setError(null); try { const result = await socketStore.submitLevelSevenAnswer(roomCode, session.sessionToken, roundId, answerText); setSnapshot(result.snapshot); } catch (reason) { setError(messageOf(reason)); } finally { setAnswering(false); } };

  if (snapshot?.phase === "character_selection") {
    return (
      <PlayerCharacterPicker snapshot={snapshot} teamId={session.teamId} teamName={session.teamName}
        claiming={claiming} error={error} connected={socket.status === "connected"}
        onClaim={(id) => void claimCharacter(id)} />
    );
  }

  if (snapshot?.phase === "level_1") {
    return <PlayerLevelOne snapshot={snapshot} teamId={session.teamId} teamName={session.teamName} busy={answering} error={error} onAnswer={(questionId, optionId) => void answerQuestion(questionId, optionId)} />;
  }

  if (snapshot?.phase === "level_2") {
    return <PlayerLevelTwo snapshot={snapshot} teamId={session.teamId} teamName={session.teamName} busy={answering} error={error} onAnswer={(challengeId, keyword) => void answerLevelTwo(challengeId, keyword)} />;
  }

  if (snapshot?.phase === "level_3") {
    return <PlayerLevelThree snapshot={snapshot} teamId={session.teamId} teamName={session.teamName} busy={answering} error={error} onAnswer={(roundId, answerText) => void answerLevelThree(roundId, answerText)} />;
  }

  if (snapshot?.phase === "level_4") return <PlayerLevelFour snapshot={snapshot} teamId={session.teamId} teamName={session.teamName} busy={answering} error={error} onAnswer={(id, solution) => void answerLevelFour(id, solution)} />;
  if (snapshot?.phase === "level_5") return <PlayerLevelFive snapshot={snapshot} teamId={session.teamId} teamName={session.teamName} busy={answering} error={error} onAnswer={answerLevelFive} onCheckpoint={reachLevelFiveCheckpoint} onFinish={reachLevelFiveFinish} />;
  if (snapshot?.phase === "level_6") return <PlayerLevelSix snapshot={snapshot} teamId={session.teamId} busy={answering} error={error} onAnswer={(id, solution) => void answerLevelSix(id, solution)} />;
  if (snapshot?.phase === "level_7") return <PlayerLevelSeven snapshot={snapshot} teamId={session.teamId} busy={answering} error={error} onAnswer={(id, answerText) => void answerLevelSeven(id, answerText)} />;
  if (snapshot?.phase === "alliance_center") return <AllianceConvergence mode="player" />;
  if (snapshot?.phase === "final_results") return <FinalLeaderboard mode="player" snapshot={snapshot} ownTeamId={session.teamId} />;
  if (snapshot?.phase === "completed") return <FinalEnding mode="player" snapshot={snapshot} ownTeamId={session.teamId} />;

  if (snapshot?.phase === "ready") {
    const ownScore = snapshot.scoreboard.find((team) => team.teamId === session.teamId);
    const ownTeam = snapshot.teams.find((team) => team.teamId === session.teamId);
    const character = CHARACTERS.find((item) => item.id === ownTeam?.characterId);
    const pieces = `${"◆ ".repeat(snapshot.journey.alliancePiecesCollected)}${"◇ ".repeat(7 - snapshot.journey.alliancePiecesCollected)}`.trim();
    return <PageShell compact title={snapshot.journey.journeyComplete ? "HÀNH TRÌNH HOÀN THÀNH" : "HÀNH TRÌNH LIÊN MINH"} subtitle={snapshot.journey.journeyComplete ? "Bảy hành trình đã hội tụ" : "Đang chờ MC bắt đầu chặng tiếp theo"}><section className="player-complete player-journey-waiting">{character && <CharacterCard character={character} claimedBy={session.teamName} selected />}<div className="player-journey-summary"><span className="eyebrow">ĐÃ HOÀN THÀNH</span><h2>{snapshot.journey.completedLevels} / 7 CHẶNG</h2><div className="alliance-piece">{pieces}</div><p>MẢNH LIÊN MINH · {snapshot.journey.alliancePiecesCollected} / 7</p><p className="player-journey-total">TỔNG ĐIỂM <b>{ownScore?.totalScore ?? 0}</b></p><strong>{snapshot.journey.journeyComplete ? "Đang chờ MC mở Trung Tâm Liên Minh..." : "Đang chờ MC bắt đầu chặng tiếp theo..."}</strong></div></section></PageShell>;
  }

  if (snapshot?.phase === "character_selection_complete") {
    const ownTeam = snapshot.teams.find((team) => team.teamId === session.teamId);
    const character = CHARACTERS.find((candidate) => candidate.id === ownTeam?.characterId);
    return (
      <PageShell compact mode="player" title="Đội hình đã sẵn sàng" subtitle="Chờ người dẫn chương trình bắt đầu hành trình.">
        <section className="player-complete">
          <span className="eyebrow">Đội của bạn</span>
          <h2>{session.teamName}</h2>
          {character && (
            <CharacterCard character={character} claimedBy={session.teamName} selected />
          )}
          <p>Chờ người dẫn chương trình bắt đầu hành trình.</p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell compact mode="player" title="Đã vào phòng" subtitle={`Mã phòng ${roomCode}`}>
      <section className="waiting-card">
        <span className="eyebrow">Đội của bạn</span>
        <h2>{session.teamName}</h2>
        <div className="waiting-card__status">
          <span className={`connection-dot connection-dot--${socket.status}`} />
          {socket.status === "connected" ? "Đã kết nối" : "Đang kết nối lại…"}
        </div>
        <div className="waiting-card__count">
          <strong>{snapshot?.teamCount ?? "–"}/7</strong>
          <span>đội trong phòng</span>
        </div>
        <p>{snapshot?.locked ? "MC đã khóa phòng. Hãy sẵn sàng!" : "Đang chờ MC khóa phòng…"}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </PageShell>
  );
}

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}
