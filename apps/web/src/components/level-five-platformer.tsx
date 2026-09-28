import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type {
  LevelFiveResultPublic,
  LevelFiveTeamProgressPublic,
  LobbySnapshot
} from "@htlm/protocol";
import { LevelFiveBridge } from "../game/level-five/level-five-bridge";
import { PageShell } from "./page-shell";

const LazyPlatformer = lazy(async () => ({
  default: (await import("../game/level-five/level-five-mount")).LevelFivePhaserMount
}));

function useClock(interval = 200): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return now;
}

export function HostLevelFive({
  snapshot,
  busy,
  error,
  onContinue,
  onForceComplete,
  onReturn
}: {
  snapshot: LobbySnapshot;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onForceComplete: () => void;
  onReturn: () => void;
}) {
  const level = snapshot.levelFive;
  const now = useClock(500);
  const [showForceConfirmation, setShowForceConfirmation] = useState(false);
  if (!level) return null;
  if (level.phase === "intro")
    return (
      <PageShell className="level-five-page" title="Hành Trình Vượt Thử Thách" subtitle="Chặng 05 · Sân Hội Làng">
        <section className="level-intro level-intro--festival">
          <span className="eyebrow">SÂN NHÀ CỦA KHẢI</span>
          <h2>HÀNH TRÌNH VƯỢT THỬ THÁCH</h2>
          <p>Vượt địa hình · mở 5 checkpoint · trả lời 5 câu hỏi · chạm cổng đích.</p>
          <div className="home-advantage home-advantage--orange">
            <strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>
            <span>Áp dụng cho đội đồng hành cùng Khải.</span>
          </div>
          <button className="button button--secondary" disabled={busy} onClick={onContinue}>
            BẮT ĐẦU
          </button>
        </section>
      </PageShell>
    );
  if (level.phase === "level_result")
    return <LevelFiveResults snapshot={snapshot} busy={busy} error={error} onReturn={onReturn} />;
  const elapsedMs = level.levelStartedAt === null ? 0 : Math.max(0, now - level.levelStartedAt);
  return (
    <PageShell className="level-five-page" title="Hành Trình Vượt Thử Thách" subtitle="Chặng 05 · Tiến độ trực tiếp">
      <section className="level-five-host-progress">
        <header className="level-five-host-clock">
          <span>THỜI GIAN</span>
          <strong>{formatDuration(elapsedMs)}</strong>
        </header>
        {snapshot.teams.map((team) => {
          const state = level.teamProgress[team.teamId];
          const character = CHARACTERS.find((item) => item.id === team.characterId);
          const progress = state?.checkpointProgress ?? 0;
          return (
            <article className="level-five-team-row" key={team.teamId}>
              <div className="level-five-team-identity">
                {character && (
                  <img src={`/characters/${character.id}-master.png`} alt={character.name} />
                )}
                <div className="level-five-team-copy">
                  <strong>{team.teamName}</strong>
                  <span>{character?.name ?? "Chưa chọn nhân vật"}</span>
                </div>
              </div>
              <JourneyNodes progress={progress} finished={state?.mode === "finished"} />
              {state?.mode === "finished" ? (
                <div className="level-five-finish-rank">
                  <b>{rankLabel(state.finishRank)}</b>
                  <span>
                    {formatDuration(state.completionTimeMs ?? 0)} · +{state.finishBonus}
                  </span>
                </div>
              ) : (
                <>
                  <b>{progress}/5</b>
                  <small aria-live="polite">
                    {team.connected ? teamStatus(state, now) : "Mất kết nối"}
                  </small>
                </>
              )}
            </article>
          );
        })}
        <button
          className="button button--secondary"
          disabled={busy}
          onClick={() => setShowForceConfirmation(true)}
          type="button"
        >
          HOÀN THÀNH CHẶNG
        </button>
        {showForceConfirmation && (
          <div className="level-five-force-backdrop" role="presentation">
            <section aria-labelledby="level-five-force-title" aria-modal="true" className="level-five-force-dialog" role="dialog">
              <h2 id="level-five-force-title">Một số đội chưa hoàn thành Chặng 5.</h2>
              <p>Bạn có chắc muốn kết thúc chặng và tiếp tục không?</p>
              <div>
                <button className="button button--secondary" disabled={busy} onClick={() => setShowForceConfirmation(false)} type="button">QUAY LẠI</button>
                <button className="button button--primary" disabled={busy} onClick={() => { setShowForceConfirmation(false); onForceComplete(); }} type="button">VẪN HOÀN THÀNH</button>
              </div>
            </section>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

export function PlayerLevelFive({
  snapshot,
  teamId,
  teamName,
  busy,
  error,
  onAnswer,
  onCheckpoint,
  onFinish
}: {
  snapshot: LobbySnapshot;
  teamId: string;
  teamName: string;
  busy: boolean;
  error: string | null;
  onAnswer: (questionId: string, optionId: string) => Promise<void>;
  onCheckpoint: (checkpointIndex: number) => Promise<boolean>;
  onFinish: () => Promise<boolean>;
}) {
  const level = snapshot.levelFive;
  const bridge = useMemo(() => new LevelFiveBridge(), []);
  const now = useClock();
  const ownTeam = snapshot.teams.find((team) => team.teamId === teamId);
  const teamState = level?.teamProgress[teamId];
  const [finishPresented, setFinishPresented] = useState(teamState?.mode === "finished");
  const sceneState = useMemo(
    () => ({
      checkpointProgress: teamState?.checkpointProgress ?? 0,
      mode: teamState?.mode ?? ("platforming" as const),
      retryAvailableAt: teamState?.retryAvailableAt ?? null
    }),
    [teamState?.checkpointProgress, teamState?.mode, teamState?.retryAvailableAt]
  );
  useEffect(() => {
    if (teamState?.mode !== "finished") {
      setFinishPresented(false);
      return;
    }
    // Presentation only: server has already confirmed the finish and all points.
    const timer = window.setTimeout(() => setFinishPresented(true), 900);
    return () => window.clearTimeout(timer);
  }, [teamState?.mode]);

  useEffect(() => {
    const offCheckpoint = bridge.on("checkpointReached", ({ checkpointIndex }) => {
      void onCheckpoint(checkpointIndex).then((accepted) => {
        if (!accepted) bridge.emit("setState", sceneState);
      });
    });
    const offFinish = bridge.on("finishReached", () => {
      void onFinish().then((accepted) => {
        if (!accepted) bridge.emit("setState", sceneState);
      });
    });
    return () => {
      offCheckpoint();
      offFinish();
    };
  }, [bridge, onCheckpoint, onFinish, sceneState]);

  useEffect(() => {
    bridge.emit("setState", sceneState);
  }, [bridge, sceneState]);
  if (!level || !teamState || !ownTeam?.characterId) return null;
  if (level.phase === "intro")
    return (
      <PageShell className="level-five-page" compact title="Hành Trình Vượt Thử Thách" subtitle="Chặng 05 sắp bắt đầu">
        <section className="player-level-state">
          <h2>{teamName}</h2>
          <p>A / ← sang trái · D / → sang phải · W / ↑ / SPACE để nhảy</p>
          {ownTeam.characterId === "nam" && (
            <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>
          )}
        </section>
      </PageShell>
    );
  if (level.phase === "level_result" || (teamState.mode === "finished" && finishPresented)) {
    const result = level.results?.find((item) => item.teamId === teamId);
    return <PlayerLevelFiveResult result={result} progress={teamState} teamName={teamName} />;
  }

  const question = level.currentQuestions[teamId];
  const retrySeconds = teamState.retryAvailableAt
    ? Math.max(0, Math.ceil((teamState.retryAvailableAt - now) / 1_000))
    : 0;
  const canAnswer =
    teamState.mode === "question" || (teamState.mode === "retry_cooldown" && retrySeconds === 0);
  return (
    <PageShell
      className="level-five-page"
      compact
      title="HÀNH TRÌNH VƯỢT THỬ THÁCH"
      subtitle="Chặng 5 · Qua miền quê, kết tình đồng đội"
    >
      <section className="level-five-player-shell">
        <div className="level-five-hud">
          <strong>CHẶNG 5</strong>
          <JourneyNodes
            progress={teamState.checkpointProgress}
            finished={teamState.mode === "finished"}
          />
          <span aria-live="polite">
            Điểm gốc <b>{teamState.checkpointProgress * 20} / 100</b>
            {ownTeam.characterId === "nam" && <em>Khải ×2</em>}
          </span>
        </div>
        <Suspense fallback={<div className="level-five-loading">Đang mở hành trình…</div>}>
          <LazyPlatformer bridge={bridge} characterId={ownTeam.characterId} state={sceneState} />
        </Suspense>
        <div className="level-five-controls">
          <span>
            <kbd>A</kbd> <kbd>D</kbd> / ← → &nbsp; Di chuyển
          </span>
          <span>
            <kbd>W</kbd> / ↑ / <kbd>SPACE</kbd> &nbsp; Nhảy
          </span>
          <span>5 câu hỏi · Một hành trình</span>
        </div>
        {error && !question && (
          <p className="level-five-world-error form-error" role="alert">
            {error}
          </p>
        )}
        {question && (teamState.mode === "question" || teamState.mode === "retry_cooldown") && (
          <div className="level-five-question-backdrop">
            <section
              className="level-five-question-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="level-five-question"
            >
              <div className="level-five-question-heading">
                <span>CHẶNG 5</span>
                <strong>CÂU {(teamState.activeQuestionIndex ?? 0) + 1} / 5</strong>
              </div>
              <h2 id="level-five-question">{question.prompt}</h2>
              {teamState.lastAnswerCorrect === false && (
                <div className="level-five-retry" role="status">
                  <strong>Chưa chính xác</strong>
                  <span>
                    {retrySeconds > 0
                      ? `Thử lại sau ${retrySeconds} giây`
                      : "Bạn có thể thử lại ngay"}
                  </span>
                </div>
              )}
              <div className="choice-grid">
                {question.options.map((option) => (
                  <button
                    disabled={busy || !canAnswer}
                    key={option.id}
                    onClick={() => void onAnswer(question.id, option.id)}
                  >
                    <b>{option.id.toUpperCase()}</b>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </section>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function JourneyNodes({ progress, finished = false }: { progress: number; finished?: boolean }) {
  return (
    <div
      className="level-five-journey"
      aria-label={`${progress}/5 câu hoàn thành${finished ? ", đã về đích" : ""}`}
    >
      <span className="level-five-journey-start" aria-hidden="true">
        Xuất phát
      </span>
      {[1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`level-five-node${index <= progress ? " is-complete" : index === progress + 1 ? " is-current" : ""}`}
        >
          {index <= progress ? "✓" : index}
        </span>
      ))}
      <span
        className={`level-five-journey-finish${finished ? " is-complete" : ""}`}
        aria-hidden="true"
      >
        ⚑
      </span>
    </div>
  );
}

function teamStatus(state: LevelFiveTeamProgressPublic | undefined, now: number): string {
  if (!state) return "Đang chuẩn bị";
  if (state.mode === "finished") return "Đã về đích";
  if (state.mode === "final_platforming") return "Đang tới đích";
  if (state.mode === "question") return `Đang trả lời Câu ${(state.activeQuestionIndex ?? 0) + 1}`;
  if (state.mode === "retry_cooldown")
    return `Thử lại sau ${Math.max(0, Math.ceil(((state.retryAvailableAt ?? now) - now) / 1_000))} giây`;
  return "Đang vượt chướng ngại";
}

function LevelFiveResults({
  snapshot,
  busy,
  error,
  onReturn
}: {
  snapshot: LobbySnapshot;
  busy: boolean;
  error: string | null;
  onReturn: () => void;
}) {
  const level = snapshot.levelFive!;
  return (
    <PageShell className="level-five-page" title="HOÀN THÀNH CHẶNG 05" subtitle="HÀNH TRÌNH VƯỢT THỬ THÁCH">
      <section className="level-results level-results--festival">
        <div className="alliance-piece">◆</div>
        <h2>MẢNH LIÊN MINH 05</h2>
        <div className="result-table">
          {level.results?.map((result) => (
            <div className="result-row" key={result.teamId}>
              <strong>
                {result.finishRank ? `#${result.finishRank}` : "—"} · {result.teamName}
              </strong>
              <span>
                {result.baseScore} × {result.multiplier} + {result.finishBonus} ={" "}
                <b>{result.finalScore}</b>
              </span>
              <small>
                {result.finishRank && result.completionTimeMs !== null
                  ? `${rankLabel(result.finishRank)} · ${formatDuration(result.completionTimeMs)}`
                  : "CHƯA VỀ ĐÍCH"}
              </small>
            </div>
          ))}
        </div>
        <button className="button button--primary" disabled={busy} onClick={onReturn}>
          TRỞ VỀ BẢN ĐỒ
        </button>
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

function PlayerLevelFiveResult({
  result,
  progress,
  teamName
}: {
  result: LevelFiveResultPublic | undefined;
  progress: LevelFiveTeamProgressPublic;
  teamName: string;
}) {
  const knowledgeScore = result?.baseScore ?? progress.knowledgeScore ?? 0;
  const multiplier = result?.multiplier ?? progress.knowledgeMultiplier ?? 1;
  const finishBonus = result?.finishBonus ?? progress.finishBonus;
  const finalScore =
    result?.finalScore ?? progress.finalScore ?? knowledgeScore * multiplier + finishBonus;
  const finished = progress.mode === "finished";
  const completionTimeMs = result?.completionTimeMs ?? progress.completionTimeMs;
  return (
    <PageShell className="level-five-page" compact title={finished ? "VỀ ĐÍCH!" : "CHẶNG ĐÃ KẾT THÚC"} subtitle={teamName}>
      <section className="player-level-state level-five-finish-result">
        <div className="alliance-piece">⚑</div>
        <h2>{rankLabel(result?.finishRank ?? progress.finishRank)}</h2>
        {completionTimeMs !== null && <p>Thời gian: <b>{formatDuration(completionTimeMs)}</b></p>}
        {!finished && <p>Đội chưa về đích trước khi MC kết thúc chặng.</p>}
        <dl>
          <div>
            <dt>Điểm kiến thức</dt>
            <dd>{knowledgeScore}</dd>
          </div>
          {multiplier === 2 && (
            <div>
              <dt>Lợi thế sân nhà</dt>
              <dd>×2</dd>
            </div>
          )}
          <div>
            <dt>Thưởng về đích</dt>
            <dd>+{finishBonus}</dd>
          </div>
          <div className="level-five-finish-total">
            <dt>Tổng điểm</dt>
            <dd>{finalScore}</dd>
          </div>
        </dl>
        {!result && <small>Chờ các đội còn lại về đích.</small>}
      </section>
    </PageShell>
  );
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function rankLabel(rank: number | null): string {
  if (!rank) return "CHƯA XẾP HẠNG";
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";
  return `${medal} HẠNG ${rank}`.trim();
}
