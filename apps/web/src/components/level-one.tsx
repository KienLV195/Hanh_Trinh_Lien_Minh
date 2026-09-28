import { useEffect, useState } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type { LobbySnapshot } from "@htlm/protocol";
import { PageShell } from "./page-shell";

function useSeconds(deadlineAt: number | null): number {
  const [seconds, setSeconds] = useState(() => secondsUntil(deadlineAt));
  useEffect(() => {
    setSeconds(secondsUntil(deadlineAt));
    if (!deadlineAt) return;
    const timer = window.setInterval(() => setSeconds(secondsUntil(deadlineAt)), 200);
    return () => window.clearInterval(timer);
  }, [deadlineAt]);
  return seconds;
}

function secondsUntil(deadlineAt: number | null): number {
  return deadlineAt ? Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) : 0;
}

function questionLengthClass(prompt = ""): string {
  if (prompt.length < 120) return "question-copy--short";
  if (prompt.length <= 220) return "question-copy--medium";
  return "question-copy--long";
}

export function HostLevelOne({
  snapshot,
  busy,
  error,
  onContinue,
  onReturn
}: {
  snapshot: LobbySnapshot;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onReturn: () => void;
}) {
  const level = snapshot.levelOne;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  const minhTeam = snapshot.teams.find((team) => team.characterId === "minh");

  if (level.phase === "intro") {
    return (
      <PageShell title="Xưởng Công Nghệ" subtitle="Chặng 1 · Vòng quay tri thức">
        <section className="level-intro">
          <div className="factory-mark" aria-hidden="true"><span>⚙</span><span>⚙</span></div>
          <span className="eyebrow">Đang mở cổng tri thức · {seconds}s</span>
          <h2>VÒNG QUAY TRI THỨC</h2>
          <p>3 câu hỏi · 30 / 30 / 40 điểm · mỗi đội chỉ được trả lời một lần.</p>
          {minhTeam && <div className="home-advantage"><strong>LỢI THẾ SÂN NHÀ ×2</strong><span>{minhTeam.teamName} đồng hành cùng Minh tại Xưởng Công Nghệ.</span></div>}
          <button className="button button--secondary" disabled={busy} onClick={onContinue} type="button">TIẾP TỤC</button>
        </section>
      </PageShell>
    );
  }

  if (level.phase === "level_result") {
    return (
      <PageShell title="Hoàn thành Chặng 1" subtitle="Mảnh Liên Minh đầu tiên đã được khôi phục.">
        <section className="level-results">
          <div className="alliance-piece" aria-label="Mảnh Liên Minh số 1">◆</div>
          <h2>MẢNH LIÊN MINH 1</h2>
          <div className="result-table">
            {level.results?.map((result, index) => (
              <div className="result-row" key={result.teamId}>
                <strong>#{index + 1} · {result.teamName}</strong>
                <span>{result.baseScore} × {result.multiplier} = <b>{result.finalScore}</b></span>
              </div>
            ))}
          </div>
          <button className="button button--primary" disabled={busy} onClick={onReturn} type="button">TRỞ VỀ BẢN ĐỒ</button>
          {error && <p className="form-error">{error}</p>}
        </section>
      </PageShell>
    );
  }

  const question = level.currentQuestion;
  return (
    <PageShell title="Vòng quay tri thức" subtitle="Chặng 1 · Xưởng Công Nghệ">
      <section className="host-quiz-grid level-one-host-game">
        <aside className="level-one-wheel-stage" aria-label="Vòng quay tri thức">
          <div className={`knowledge-wheel knowledge-wheel--${level.phase}`} aria-hidden="true">
          <div>01</div><div>02</div><div>03</div><span>{level.questionIndex + 1}</span>
          </div>
          <span className="wheel-caption">Vòng quay tri thức</span>
        </aside>
        <article className="host-question-card level-one-question-panel">
          <header className="level-one-question-meta">
            <div><span>Câu</span><strong>{level.questionIndex + 1}/3</strong></div>
            <div><span>Điểm</span><strong>{question?.points ?? 0}</strong></div>
            <div className="quiz-timer"><strong>{seconds}</strong><span>GIÂY</span></div>
          </header>
          <h2 className={`level-one-question-copy ${questionLengthClass(question?.prompt)}`}>{question?.prompt}</h2>
          <div className="host-options">
            {question?.options.map((option) => (
              <div className={level.reveal?.correctOptionId === option.id ? "is-correct" : ""} key={option.id}>
                <b>{option.id.toUpperCase()}</b>{option.text}
              </div>
            ))}
          </div>
          <footer className="level-one-question-footer">
            {level.phase === "question_active" ? (
              <p className="answer-progress"><strong>{level.submittedTeamIds.length}/{snapshot.teamCount}</strong> đội đã trả lời</p>
            ) : (
              <div className="reveal-note"><strong>Đáp án {level.reveal?.correctOptionId.toUpperCase()}</strong><p>{level.reveal?.explanation}</p></div>
            )}
            <button className="button button--secondary" disabled={busy} onClick={onContinue} type="button">TIẾP TỤC</button>
          </footer>
          {error && <p className="form-error" role="alert">{error}</p>}
        </article>
      </section>
    </PageShell>
  );
}

export function PlayerLevelOne({
  snapshot,
  teamId,
  teamName,
  busy,
  error,
  onAnswer
}: {
  snapshot: LobbySnapshot;
  teamId: string;
  teamName: string;
  busy: boolean;
  error: string | null;
  onAnswer: (questionId: string, optionId: string) => void;
}) {
  const level = snapshot.levelOne;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  useEffect(() => setSelectedOptionId(null), [level?.currentQuestion?.id]);
  if (!level) return null;
  const ownTeam = snapshot.teams.find((team) => team.teamId === teamId);
  const character = CHARACTERS.find((item) => item.id === ownTeam?.characterId);
  const submitted = level.submittedTeamIds.includes(teamId);
  const feedback = level.reveal?.feedback.find((item) => item.teamId === teamId);
  if (level.phase === "intro") return (
    <PageShell compact title="Xưởng Công Nghệ" subtitle="Vòng quay tri thức sắp bắt đầu">
      <section className="player-level-state"><span className="factory-icon">⚙</span><h2>{teamName}</h2><p>{character?.name} · {character?.role}</p>{character?.id === "minh" && <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2</strong>}<small>{seconds}s</small></section>
    </PageShell>
  );

  if (level.phase === "level_result") {
    const result = level.results?.find((item) => item.teamId === teamId);
    return <PageShell compact title="Mảnh Liên Minh 1" subtitle="Chặng 1 đã hoàn thành"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{result?.finalScore ?? 0} điểm</h2><p>Điểm gốc {result?.baseScore ?? 0} × {result?.multiplier ?? 1}</p><p>Tổng tích lũy: <b>{result?.accumulatedTotalScore ?? 0}</b></p><strong>Chờ MC trở về bản đồ hành trình.</strong></section></PageShell>;
  }

  const question = level.currentQuestion;
  return (
    <PageShell compact mode="player" title="Vòng quay tri thức" subtitle="Chặng 1 · Xưởng Công Nghệ">
      <section className="player-question level-one-player-game">
        <header className="level-one-player-meta">
          <span>Câu <strong>{level.questionIndex + 1}/3</strong></span>
          <span>{question?.points ?? 0} điểm</span>
          <span className="level-one-player-timer"><strong>{seconds}</strong> giây</span>
        </header>
        <h2 className={`level-one-question-copy ${questionLengthClass(question?.prompt)}`}>{question?.prompt}</h2>
        {(level.phase === "question_active" || level.phase === "question_reveal") && (
          <div className="player-options">{question?.options.map((option) => {
            const selected = selectedOptionId === option.id;
            const correct = level.reveal?.correctOptionId === option.id;
            return <button className={`${selected ? "is-selected" : ""}${correct ? " is-correct" : ""}`} disabled={busy || submitted || level.phase !== "question_active"} key={option.id} onClick={() => { setSelectedOptionId(option.id); onAnswer(question.id, option.id); }} type="button"><b>{option.id.toUpperCase()}</b><span>{option.text}</span></button>;
          })}</div>
        )}
        {level.phase === "question_active" && submitted && <div className="answer-locked"><strong>Đã gửi đáp án</strong><span>Chờ các đội còn lại…</span></div>}
        {level.phase === "question_reveal" && <div className={`personal-feedback ${feedback?.correct ? "is-correct" : "is-wrong"}`}><strong>{feedback?.correct ? "CHÍNH XÁC" : "CHƯA CHÍNH XÁC"}</strong><span>+{feedback?.pointsAwarded ?? 0} điểm gốc</span><p>{level.reveal?.explanation}</p></div>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </PageShell>
  );
}

export function CompletedJourneyMap({ snapshot }: { snapshot: LobbySnapshot }) {
  return <PageShell title="Hành trình Liên Minh" subtitle="Chặng 1 đã hoàn thành"><section className="journey-return"><div><span className="eyebrow">TIẾN ĐỘ LIÊN MINH</span><h2>◆ ◇ ◇ ◇ ◇ ◇ ◇</h2><strong>XƯỞNG CÔNG NGHỆ · HOÀN THÀNH</strong><p>{snapshot.teamCount} đội đã mang Mảnh Liên Minh đầu tiên trở về.</p></div><div className="next-level"><span>CHẶNG TIẾP THEO</span><strong>MIỀN ĐẤT MÙA VÀNG</strong><small>SẮP MỞ</small></div></section></PageShell>;
}
