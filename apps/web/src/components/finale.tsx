import { useEffect, useRef, type CSSProperties } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type { LobbySnapshot, TeamScorePublic } from "@htlm/protocol";
import { CharacterVisual } from "./character-visual";
import { PageShell } from "./page-shell";

export function AllianceConvergence({ mode, busy = false, error = null, onReveal }: {
  mode: "host" | "player";
  busy?: boolean;
  error?: string | null;
  onReveal?: () => void;
}) {
  const revealRef = useRef(onReveal);
  useEffect(() => { revealRef.current = onReveal; }, [onReveal]);
  useEffect(() => {
    if (mode !== "host") return;
    const timer = window.setTimeout(() => revealRef.current?.(), 3_200);
    return () => window.clearTimeout(timer);
  }, [mode]);

  return <PageShell title="TRUNG TÂM LIÊN MINH" subtitle="Bảy hành trình đã hội tụ"><section className="finale-convergence">
    <div className="finale-alliance-symbol" aria-label="Bảy mảnh Liên Minh đang hội tụ">
      {CHARACTERS.map((character, index) => <i key={character.id} style={{ "--piece-index": index } as CSSProperties}>◆</i>)}
      <b>◆</b>
    </div>
    <h2>7 MẢNH LIÊN MINH ĐÃ HỘI TỤ</h2>
    <p>{mode === "host" ? (busy ? "Đang mở bảng xếp hạng…" : "Bảng xếp hạng hành trình đang được mở…") : "Đang chờ MC mở bảng xếp hạng…"}</p>
    {error && <p className="form-error" role="alert">{error}</p>}
  </section></PageShell>;
}

export function FinalLeaderboard({ mode, snapshot, ownTeamId, busy = false, error = null, onComplete }: {
  mode: "host" | "player";
  snapshot: LobbySnapshot;
  ownTeamId?: string;
  busy?: boolean;
  error?: string | null;
  onComplete?: () => void;
}) {
  const ownResult = snapshot.scoreboard.find((entry) => entry.teamId === ownTeamId);
  return <PageShell title="BẢNG XẾP HẠNG" subtitle="HÀNH TRÌNH LIÊN MINH"><section className={`final-leaderboard final-leaderboard--${mode}`}>
    {mode === "player" && ownResult && <PersonalResult result={ownResult} />}
    <div className="final-ranking">
      <div className="final-podium">
        {snapshot.scoreboard.slice(0, 3).map((entry) => <RankCard entry={entry} highlighted={entry.teamId === ownTeamId} key={entry.teamId} />)}
      </div>
      {snapshot.scoreboard.length > 3 && <div className="final-ranking-rows">
        {snapshot.scoreboard.slice(3).map((entry) => <RankRow entry={entry} highlighted={entry.teamId === ownTeamId} key={entry.teamId} />)}
      </div>}
    </div>
    {mode === "host" && <button className="button button--primary final-complete-action" disabled={busy} onClick={onComplete} type="button">HOÀN TẤT HÀNH TRÌNH</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section></PageShell>;
}

function PersonalResult({ result }: { result: TeamScorePublic }) {
  const character = CHARACTERS.find((item) => item.id === result.characterId);
  return <aside className="personal-final-result">
    {character && <div className="personal-final-character"><CharacterVisual characterId={character.id} state="selected" size="large" /></div>}
    <span>HẠNG CỦA ĐỘI BẠN</span>
    <strong>#{result.rank}</strong>
    <h2>{result.teamName}</h2>
    <p>{character?.name} · {character?.role}</p>
    <b>{result.totalScore} ĐIỂM</b>
    <small>◆ ◆ ◆ ◆ ◆ ◆ ◆ · 7 / 7 MẢNH LIÊN MINH</small>
  </aside>;
}

function RankCard({ entry, highlighted }: { entry: TeamScorePublic; highlighted: boolean }) {
  const character = CHARACTERS.find((item) => item.id === entry.characterId);
  return <article className={`rank-card rank-card--${entry.rank}${highlighted ? " is-own-team" : ""}`}>
    <span className="rank-badge">{entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"} HẠNG {entry.rank}</span>
    {character && <div className="rank-character"><CharacterVisual characterId={character.id} size={entry.rank === 1 ? "large" : "medium"} /></div>}
    <h3>{character?.name ?? "—"}</h3>
    <p>{entry.teamName}</p>
    <small>{character?.role ?? "Chưa chọn nhân vật"}</small>
    <strong>{entry.totalScore} ĐIỂM</strong>
  </article>;
}

function RankRow({ entry, highlighted }: { entry: TeamScorePublic; highlighted: boolean }) {
  const character = CHARACTERS.find((item) => item.id === entry.characterId);
  return <article className={`rank-row${highlighted ? " is-own-team" : ""}`}>
    <b>#{entry.rank}</b><strong>{character?.name ?? "—"}</strong><span>{entry.teamName}</span><small>{character?.role ?? "Chưa chọn nhân vật"}</small><em>{entry.totalScore} điểm</em>
  </article>;
}

export function FinalEnding({ mode, snapshot, ownTeamId, busy = false, error = null, onReview }: { mode: "host" | "player"; snapshot: LobbySnapshot; ownTeamId?: string; busy?: boolean; error?: string | null; onReview?: () => void }) {
  const own = snapshot.scoreboard.find((entry) => entry.teamId === ownTeamId);
  return <PageShell title="HÀNH TRÌNH LIÊN MINH" subtitle="7 mảnh đã hội tụ"><section className="final-ending">
    <div className="final-character-lineup" aria-label="Bảy người đồng hành">
      {CHARACTERS.map((character) => <div key={character.id}><CharacterVisual characterId={character.id} size="medium" /><strong>{character.name}</strong></div>)}
    </div>
    <h2>Khác biệt tạo nên sức mạnh<br />khi cùng hướng về một mục tiêu.</h2>
    {mode === "player" && own && <p>Đội {own.teamName} · Hạng #{own.rank} · {own.totalScore} điểm</p>}
    <div className="alliance-piece final-seven-pieces">◆ ◆ ◆ ◆ ◆ ◆ ◆</div>
    {mode === "host" && <button className="button button--primary" disabled={busy} onClick={onReview} type="button">XEM LẠI BẢNG XẾP HẠNG</button>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section></PageShell>;
}
