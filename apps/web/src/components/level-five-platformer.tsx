import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type { LevelFiveTeamProgressPublic, LevelResultPublic, LobbySnapshot } from "@htlm/protocol";
import { LevelFiveBridge } from "../game/level-five/level-five-bridge";
import { PageShell } from "./page-shell";

const LazyPlatformer = lazy(async () => ({ default: (await import("../game/level-five/level-five-mount")).LevelFivePhaserMount }));

function useClock(interval = 200): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), interval); return () => window.clearInterval(id); }, [interval]);
  return now;
}

export function HostLevelFive({ snapshot, busy, error, onContinue, onReturn }: { snapshot: LobbySnapshot; busy: boolean; error: string | null; onContinue: () => void; onReturn: () => void }) {
  const level = snapshot.levelFive;
  const now = useClock(500);
  if (!level) return null;
  if (level.phase === "intro") return <PageShell title="Hành Trình Vượt Thử Thách" subtitle="Chặng 05 · Sân Hội Làng"><section className="level-intro level-intro--festival"><span className="eyebrow">SÂN NHÀ CỦA NAM</span><h2>HÀNH TRÌNH VƯỢT THỬ THÁCH</h2><p>Vượt địa hình · mở 5 checkpoint · trả lời 5 câu hỏi · chạm cổng đích.</p><div className="home-advantage home-advantage--orange"><strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong><span>Áp dụng cho đội đồng hành cùng Nam.</span></div><button className="button button--secondary" disabled={busy} onClick={onContinue}>BẮT ĐẦU</button></section></PageShell>;
  if (level.phase === "level_result") return <LevelFiveResults snapshot={snapshot} busy={busy} error={error} onReturn={onReturn} />;
  return <PageShell title="Hành Trình Vượt Thử Thách" subtitle="Chặng 05 · Tiến độ trực tiếp"><section className="level-five-host-progress">{snapshot.teams.map((team) => {
    const state = level.teamProgress[team.teamId];
    const character = CHARACTERS.find((item) => item.id === team.characterId);
    const progress = state?.checkpointProgress ?? 0;
    return <article className="level-five-team-row" key={team.teamId}><div className="level-five-team-copy"><strong>{team.teamName}</strong><span>{character?.name ?? "Chưa chọn nhân vật"}</span></div><div className="level-five-progress-track"><span style={{ width: `${progress * 20}%` }} /></div><b>{progress}/5</b><small>{team.connected ? teamStatus(state, now) : "Mất kết nối"}</small></article>;
  })}{error && <p className="form-error">{error}</p>}</section></PageShell>;
}

export function PlayerLevelFive({ snapshot, teamId, teamName, busy, error, onAnswer, onCheckpoint, onFinish }: {
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
  const sceneState = useMemo(() => ({ checkpointProgress: teamState?.checkpointProgress ?? 0, mode: teamState?.mode ?? "platforming" as const }), [teamState?.checkpointProgress, teamState?.mode]);

  useEffect(() => {
    const offCheckpoint = bridge.on("checkpointReached", ({ checkpointIndex }) => { void onCheckpoint(checkpointIndex).then((accepted) => { if (!accepted) bridge.emit("setState", sceneState); }); });
    const offFinish = bridge.on("finishReached", () => { void onFinish().then((accepted) => { if (!accepted) bridge.emit("setState", sceneState); }); });
    return () => { offCheckpoint(); offFinish(); };
  }, [bridge, onCheckpoint, onFinish, sceneState]);

  useEffect(() => { bridge.emit("setState", sceneState); }, [bridge, sceneState]);
  if (!level || !teamState || !ownTeam?.characterId) return null;
  if (level.phase === "intro") return <PageShell compact title="Hành Trình Vượt Thử Thách" subtitle="Chặng 05 sắp bắt đầu"><section className="player-level-state"><h2>{teamName}</h2><p>A / ← sang trái · D / → sang phải · W / ↑ / SPACE để nhảy</p>{ownTeam.characterId === "nam" && <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>}</section></PageShell>;
  if (level.phase === "level_result") return <PlayerLevelFiveResult result={level.results?.find((item) => item.teamId === teamId)} />;
  if (teamState.mode === "finished") return <PageShell compact title="ĐÃ VỀ ĐÍCH" subtitle="Chờ các đội còn lại"><section className="player-level-state"><div className="alliance-piece">⚑</div><h2>{teamName}</h2><p>Hoàn thành 5/5 checkpoint.</p></section></PageShell>;

  const question = level.currentQuestions[teamId];
  const retrySeconds = teamState.retryAvailableAt ? Math.max(0, Math.ceil((teamState.retryAvailableAt - now) / 1_000)) : 0;
  const canAnswer = teamState.mode === "question" || (teamState.mode === "retry_cooldown" && retrySeconds === 0);
  return <PageShell compact title="HÀNH TRÌNH VƯỢT THỬ THÁCH" subtitle={`${teamState.checkpointProgress}/5 checkpoint`}><section className="level-five-player-shell"><Suspense fallback={<div className="level-five-loading">Đang mở hành trình…</div>}><LazyPlatformer bridge={bridge} characterId={ownTeam.characterId} state={sceneState} /></Suspense><div className="level-five-controls">A / ← &nbsp; DI CHUYỂN &nbsp;·&nbsp; W / ↑ / SPACE &nbsp; NHẢY</div>{question && (teamState.mode === "question" || teamState.mode === "retry_cooldown") && <div className="level-five-question-backdrop"><section className="level-five-question-modal" role="dialog" aria-modal="true" aria-labelledby="level-five-question"><span className="eyebrow">CHECKPOINT {(teamState.activeQuestionIndex ?? 0) + 1}/5</span><h2 id="level-five-question">{question.prompt}</h2>{teamState.lastAnswerCorrect === false && <div className="level-five-retry"><strong>CHƯA CHÍNH XÁC</strong><span>{retrySeconds > 0 ? `Thử lại sau ${retrySeconds} giây` : "Bạn có thể thử lại ngay"}</span></div>}<div className="choice-grid">{question.options.map((option) => <button disabled={busy || !canAnswer} key={option.id} onClick={() => void onAnswer(question.id, option.id)}><b>{option.id.toUpperCase()}</b>{option.text}</button>)}</div>{error && <p className="form-error">{error}</p>}</section></div>}</section></PageShell>;
}

function teamStatus(state: LevelFiveTeamProgressPublic | undefined, now: number): string {
  if (!state) return "Đang chuẩn bị";
  if (state.mode === "finished") return "Đã về đích";
  if (state.mode === "final_platforming") return "Đang tới đích";
  if (state.mode === "question") return `Đang trả lời Câu ${(state.activeQuestionIndex ?? 0) + 1}`;
  if (state.mode === "retry_cooldown") return `Thử lại sau ${Math.max(0, Math.ceil(((state.retryAvailableAt ?? now) - now) / 1_000))} giây`;
  return "Đang vượt chướng ngại";
}

function LevelFiveResults({ snapshot, busy, error, onReturn }: { snapshot: LobbySnapshot; busy: boolean; error: string | null; onReturn: () => void }) {
  const level = snapshot.levelFive!;
  return <PageShell title="HOÀN THÀNH CHẶNG 05" subtitle="HÀNH TRÌNH VƯỢT THỬ THÁCH"><section className="level-results level-results--festival"><div className="alliance-piece">◆</div><h2>MẢNH LIÊN MINH 05</h2><div className="result-table">{level.results?.map((result, index) => <div className="result-row" key={result.teamId}><strong>#{index + 1} · {result.teamName}</strong><span>{result.baseScore} × {result.multiplier} = <b>{result.finalScore}</b></span></div>)}</div><button className="button button--primary" disabled={busy} onClick={onReturn}>TRỞ VỀ BẢN ĐỒ</button>{error && <p className="form-error">{error}</p>}</section></PageShell>;
}

function PlayerLevelFiveResult({ result }: { result: LevelResultPublic | undefined }) {
  return <PageShell compact title="MẢNH LIÊN MINH 05" subtitle="Chặng đã hoàn thành"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{result?.finalScore ?? 0} điểm</h2><p>Điểm gốc {result?.baseScore ?? 0} × {result?.multiplier ?? 1}</p><p>Tổng tích lũy: <b>{result?.accumulatedTotalScore ?? 0}</b></p></section></PageShell>;
}
