import { useCallback, useEffect, useMemo, useState } from "react";
import { CHARACTERS, type LevelId } from "@htlm/game-domain";
import type { LobbySnapshot } from "@htlm/protocol";
import { QRCodeSVG } from "qrcode.react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../components/page-shell";
import { CharacterCard } from "../components/character-card";
import { HostLevelOne } from "../components/level-one";
import { HostLevelThree, HostLevelTwo } from "../components/level-two-three";
import { HostLevelFour } from "../components/level-four-five";
import { HostLevelFive } from "../components/level-five-platformer";
import { HostLevelSeven, HostLevelSix } from "../components/level-six-seven";
import { AllianceConvergence, FinalEnding, FinalLeaderboard } from "../components/finale";
import { JourneyMapExperience } from "../components/journey-map-experience";
import { StorybookShell } from "../components/storybook-shell";
import { StatusPanel } from "../components/status-panel";
import { PhaserMount } from "../game/phaser-mount";
import { useSocketStatus } from "../hooks/use-socket-status";
import { loadHostSession, saveHostSession } from "../realtime/lobby-session";
import { socketStore } from "../realtime/socket-store";

export function HostPage() {
  const { roomCode } = useParams();

  if (roomCode === "DEMO") return <PhaserTestPage />;
  if (roomCode) return <HostLobby roomCode={roomCode.toUpperCase()} />;
  return <CreateRoomPage />;
}

function CreateRoomPage() {
  const navigate = useNavigate();
  const socket = useSocketStatus();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async () => {
    setCreating(true);
    setError(null);
    try {
      const { snapshot: _snapshot, ...credentials } = await socketStore.createRoom();
      saveHostSession(credentials);
      void navigate(`/host/${credentials.roomCode}`);
    } catch (reason) {
      setError(messageOf(reason));
      setCreating(false);
    }
  };

  return (
    <main className="host-create">
      <section className="host-create__panel">
        <span className="host-create__wordmark">HÀNH TRÌNH LIÊN MINH</span>
        <h1>TẠO PHÒNG CHƠI</h1>
        <p className="host-create__description">Tạo phòng để các đội tham gia bằng mã phòng hoặc QR.</p>
        <strong className="host-create__capacity">TỐI ĐA 7 ĐỘI</strong>
        <button
          className="button button--primary host-create__button"
          disabled={creating || socket.status !== "connected"}
          onClick={() => void createRoom()}
          type="button"
        >
          {creating ? "Đang tạo phòng…" : "Tạo phòng"}
        </button>
        <p className="note">
          {socket.status === "connected" ? "Máy chủ đã sẵn sàng." : "Đang kết nối máy chủ…"}
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Link className="host-create__back" to="/">← TRỞ VỀ</Link>
      </section>
    </main>
  );
}

function HostLobby({ roomCode }: { roomCode: string }) {
  const socket = useSocketStatus();
  const credentials = useMemo(() => loadHostSession(roomCode), [roomCode]);
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  const resume = useCallback(async () => {
    if (!credentials) return;
    try {
      const result = await socketStore.resumeHost(credentials);
      setSnapshot(result.snapshot);
      setError(null);
    } catch (reason) {
      setError(messageOf(reason));
    }
  }, [credentials]);

  useEffect(() => socketStore.subscribeLobby(setSnapshot), []);
  useEffect(() => {
    if (socket.status === "connected") void resume();
  }, [resume, socket.status]);

  const changeLock = async () => {
    if (!credentials || !snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const result = await socketStore.setLobbyLocked(credentials, !snapshot.locked);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async (teamId: string, teamName: string) => {
    if (!credentials || snapshot?.locked) return;
    if (!window.confirm(`Xóa đội “${teamName}” khỏi phòng?`)) return;
    setBusy(true);
    setError(null);
    try {
      const result = await socketStore.removeTeam(credentials, teamId);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const startSelection = async () => {
    if (!credentials) return;
    setBusy(true);
    setError(null);
    try {
      const result = await socketStore.startCharacterSelection(credentials);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const confirmLineup = async () => {
    if (!credentials) return;
    setBusy(true);
    setError(null);
    try {
      const result = await socketStore.confirmCharacterSelection(credentials);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const runLevelAction = async (level: 1 | 2 | 3 | 4 | 5 | 6 | 7, action: "start" | "continue" | "return") => {
    if (!credentials) return;
    setBusy(true);
    setError(null);
    try {
      const result = level === 1
        ? action === "start"
          ? await socketStore.startLevelOne(credentials)
          : action === "continue"
            ? await socketStore.continueLevelOne(credentials)
            : await socketStore.returnLevelOneToMap(credentials)
        : level === 2
          ? action === "start"
            ? await socketStore.startLevelTwo(credentials)
            : action === "continue"
              ? await socketStore.continueLevelTwo(credentials)
              : await socketStore.returnLevelTwoToMap(credentials)
          : level === 3
            ? action === "start" ? await socketStore.startLevelThree(credentials) : action === "continue" ? await socketStore.continueLevelThree(credentials) : await socketStore.returnLevelThreeToMap(credentials)
            : level === 4
              ? action === "start" ? await socketStore.startLevelFour(credentials) : action === "continue" ? await socketStore.continueLevelFour(credentials) : await socketStore.returnLevelFourToMap(credentials)
              : level === 5
                ? action === "start" ? await socketStore.startLevelFive(credentials) : action === "continue" ? await socketStore.continueLevelFive(credentials) : await socketStore.returnLevelFiveToMap(credentials)
                : level === 6
                  ? action === "start" ? await socketStore.startLevelSix(credentials) : action === "continue" ? await socketStore.continueLevelSix(credentials) : await socketStore.returnLevelSixToMap(credentials)
                  : action === "start" ? await socketStore.startLevelSeven(credentials) : action === "continue" ? await socketStore.continueLevelSeven(credentials) : await socketStore.returnLevelSevenToMap(credentials);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const revealLevelTwoTile = async (tileIndex: number) => {
    if (!credentials) return;
    setBusy(true);
    setError(null);
    try {
      const result = await socketStore.revealLevelTwoTile(credentials, tileIndex);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  const runFinalAction = async (action: "enter" | "reveal" | "complete" | "review") => {
    if (!credentials) return;
    setBusy(true);
    setError(null);
    try {
      const result = action === "enter"
        ? await socketStore.enterAllianceCenter(credentials)
        : action === "reveal"
          ? await socketStore.revealFinalResults(credentials)
          : action === "review"
            ? await socketStore.reviewFinalResults(credentials)
            : await socketStore.completeJourney(credentials);
      setSnapshot(result.snapshot);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  if (!credentials) {
    return (
      <PageShell compact title="Không có quyền host" subtitle={`Phòng ${roomCode}`}>
        <section className="lobby-card">
          <p>Phiên host không có trên thiết bị này. Hãy tạo một phòng mới.</p>
          <a className="button button--primary" href="/host">Tạo phòng mới</a>
        </section>
      </PageShell>
    );
  }

  if (snapshot?.phase === "character_selection") {
    return (
      <HostCharacterSelection
        busy={busy}
        error={error}
        onConfirm={() => void confirmLineup()}
        snapshot={snapshot}
        socketStatus={socket.status}
      />
    );
  }

  if (snapshot?.phase === "character_selection_complete") {
    return <HostSelectionComplete busy={busy} error={error} onStart={() => void runLevelAction(1, "start")} snapshot={snapshot} socketStatus={socket.status} />;
  }

  if (snapshot?.phase === "level_1") {
    return <HostLevelOne snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(1, "continue")} onReturn={() => void runLevelAction(1, "return")} />;
  }

  if (snapshot?.phase === "level_2") {
    return <HostLevelTwo snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(2, "continue")} onRevealTile={(tileIndex) => void revealLevelTwoTile(tileIndex)} onReturn={() => void runLevelAction(2, "return")} />;
  }

  if (snapshot?.phase === "level_3") {
    return <HostLevelThree snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(3, "continue")} onReturn={() => void runLevelAction(3, "return")} />;
  }

  if (snapshot?.phase === "level_4") return <HostLevelFour snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(4, "continue")} onReturn={() => void runLevelAction(4, "return")} />;
  if (snapshot?.phase === "level_5") return <HostLevelFive snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(5, "continue")} onReturn={() => void runLevelAction(5, "return")} />;
  if (snapshot?.phase === "level_6") return <HostLevelSix snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(6, "continue")} onReturn={() => void runLevelAction(6, "return")} />;
  if (snapshot?.phase === "level_7") return <HostLevelSeven snapshot={snapshot} busy={busy} error={error} onContinue={() => void runLevelAction(7, "continue")} onReturn={() => void runLevelAction(7, "return")} />;
  if (snapshot?.phase === "alliance_center") return <AllianceConvergence mode="host" busy={busy} error={error} onReveal={() => void runFinalAction("reveal")} />;
  if (snapshot?.phase === "final_results") return <FinalLeaderboard mode="host" snapshot={snapshot} busy={busy} error={error} onComplete={() => void runFinalAction("complete")} />;
  if (snapshot?.phase === "completed") return <FinalEnding mode="host" snapshot={snapshot} busy={busy} error={error} onReview={() => void runFinalAction("review")} />;

  if (snapshot?.phase === "ready") {
    const startFromMap = (levelId: LevelId) => void runLevelAction(Number(levelId.slice(-1)) as 1 | 2 | 3 | 4 | 5 | 6 | 7, "start");
    return <main className="journey-review journey-review--host"><JourneyMapExperience mode="host" completedLevelIds={snapshot.completedLevelIds} availableLevelId={snapshot.journey.nextLevel} journeyComplete={snapshot.journey.journeyComplete} busy={busy} error={error} onStartLevel={startFromMap} onEnterAllianceCenter={() => void runFinalAction("enter")} /></main>;
  }

  const teams = snapshot?.teams ?? [];
  const slots = Array.from({ length: 7 }, (_, index) => teams[index] ?? null);

  return (
    <PageShell
      title={`Phòng ${roomCode}`}
      subtitle="Quét QR hoặc nhập mã phòng để tham gia. Danh sách đội cập nhật theo thời gian thực."
      actions={<span className={`connection-pill connection-pill--${socket.status}`}>{socket.status}</span>}
    >
      <div className="lobby-layout">
        <aside className="join-card">
          <div className="qr-frame">
            <QRCodeSVG value={joinUrl} size={190} level="M" marginSize={2} />
          </div>
          <span className="join-card__label">Mã phòng</span>
          <strong className="room-code">{roomCode}</strong>
          <span className="join-card__url">{joinUrl}</span>
        </aside>

        <section className="team-panel">
          <div className="team-panel__heading">
            <div>
              <span className="eyebrow">Phòng chờ</span>
              <h2>{teams.length}/7 đội</h2>
            </div>
            <button
              className={`button ${snapshot?.locked ? "button--secondary" : "button--primary"}`}
              disabled={busy || !snapshot}
              onClick={() => void changeLock()}
              type="button"
            >
              {snapshot?.locked ? "Mở phòng" : "Khóa phòng"}
            </button>
          </div>

          <ol className="team-slots" aria-live="polite">
            {slots.map((team, index) => (
              <li className={`team-slot${team ? " team-slot--filled" : ""}`} key={team?.teamId ?? index}>
                <span className="team-slot__number">{index + 1}</span>
                {team ? (
                  <>
                    <strong>{team.teamName}</strong>
                    <span className={`presence presence--${team.connected ? "online" : "offline"}`}>
                      {team.connected ? "Đã kết nối" : "Mất kết nối"}
                    </span>
                    <button
                      className="remove-team"
                      disabled={busy || snapshot?.locked}
                      onClick={() => void removeTeam(team.teamId, team.teamName)}
                      type="button"
                    >
                      Xóa
                    </button>
                  </>
                ) : (
                  <span className="team-slot__empty">Đang chờ đội…</span>
                )}
              </li>
            ))}
          </ol>
          <p className="lobby-state">
            {snapshot?.locked ? "Phòng đã khóa — không nhận thêm đội." : "Phòng đang mở."}
          </p>
          {snapshot?.locked && (
            <button
              className="button button--primary lobby-primary-action"
              disabled={busy || teams.length === 0}
              onClick={() => void startSelection()}
              type="button"
            >
              Bắt đầu chọn nhân vật
            </button>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </section>
      </div>
    </PageShell>
  );
}

function HostCharacterSelection({
  snapshot,
  busy,
  error,
  socketStatus,
  onConfirm
}: {
  snapshot: LobbySnapshot;
  busy: boolean;
  error: string | null;
  socketStatus: string;
  onConfirm: () => void;
}) {
  const selectedCount = snapshot.teams.filter((team) => team.characterId !== null).length;
  const allReady = snapshot.teamCount > 0 && selectedCount === snapshot.teamCount;

  return (
    <StorybookShell
      title="Chọn người đồng hành"
      subtitle="Mỗi đội hãy chọn một người đồng hành."
      actions={<span className={`connection-pill connection-pill--${socketStatus}`}>{socketStatus}</span>}
    >
      <section className="selection-heading storybook__controls">
        <div>
          <span className="eyebrow">Phòng {snapshot.roomCode}</span>
          <strong>{selectedCount}/{snapshot.teamCount} đội đã chọn</strong>
          {allReady && <p>{snapshot.teamCount === 7 ? "7/7 SẴN SÀNG" : "TẤT CẢ ĐÃ SẴN SÀNG"}</p>}
        </div>
        <button
          className="button button--primary"
          disabled={busy || !allReady}
          onClick={onConfirm}
          type="button"
        >
          {busy ? "Đang xác nhận…" : "Xác nhận đội hình"}
        </button>
      </section>
      <div className="storybook-lineup" aria-live="polite">
        {CHARACTERS.map((character) => {
          const owner = snapshot.teams.find((team) => team.characterId === character.id);
          return <CharacterCard character={character} claimedBy={owner?.teamName} selected={Boolean(owner)} key={character.id} />;
        })}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
    </StorybookShell>
  );
}

function HostSelectionComplete({
  snapshot,
  socketStatus,
  busy,
  error,
  onStart
}: {
  snapshot: LobbySnapshot;
  socketStatus: string;
  busy: boolean;
  error: string | null;
  onStart: () => void;
}) {
  return (
    <PageShell
      title="Đội hình đã sẵn sàng"
      subtitle={`${snapshot.teamCount} đội — ${snapshot.teamCount} nhân vật — 1 hành trình`}
      actions={<span className={`connection-pill connection-pill--${socketStatus}`}>{socketStatus}</span>}
    >
      <section className="lineup-complete">
        <div className="lineup-list">
          {snapshot.teams.map((team) => {
            const character = CHARACTERS.find((candidate) => candidate.id === team.characterId);
            return (
              <article className="lineup-pair" key={team.teamId}>
                <span>{team.teamName}</span>
                <strong>{character ? `${character.name} — ${character.role}` : "Chưa chọn"}</strong>
              </article>
            );
          })}
        </div>
        <button className="button button--primary" disabled={busy} onClick={onStart} type="button">
          {busy ? "Đang mở chặng…" : "BẮT ĐẦU CHẶNG 1"}
        </button>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </PageShell>
  );
}

function PhaserTestPage() {
  return (
    <PageShell title="Host foundation" subtitle="React shell with an isolated Phaser game world.">
      <div className="host-layout">
        <PhaserMount />
        <aside className="debug-panel">
          <h2>Operator debug</h2>
          <dl>
            <div><dt>Room</dt><dd>DEMO</dd></div>
            <div><dt>Canvas</dt><dd>1280 × 720</dd></div>
            <div><dt>Scale</dt><dd>FIT, centered</dd></div>
          </dl>
          <StatusPanel />
          <p className="note">Gameplay controls arrive in a later milestone.</p>
        </aside>
      </div>
    </PageShell>
  );
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
}
