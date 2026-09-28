import { useEffect, useState } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type { LevelResultPublic, LevelThreeRoundPublic, LobbySnapshot } from "@htlm/protocol";
import { PageShell } from "./page-shell";

function useSeconds(deadlineAt: number | null): number {
  const [seconds, setSeconds] = useState(() => deadlineAt ? Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) : 0);
  useEffect(() => {
    const calculate = () => deadlineAt ? Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)) : 0;
    setSeconds(calculate());
    if (!deadlineAt) return;
    const timer = window.setInterval(() => setSeconds(calculate()), 200);
    return () => window.clearInterval(timer);
  }, [deadlineAt]);
  return seconds;
}

export function HostLevelTwo({
  snapshot,
  busy,
  error,
  onContinue,
  onRevealAnswer,
  onRevealTile,
  onReturn
}: {
  snapshot: LobbySnapshot;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onRevealAnswer: () => void;
  onRevealTile: () => void;
  onReturn: () => void;
}) {
  const level = snapshot.levelTwo;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  const anTeam = snapshot.teams.find((team) => team.characterId === "an");

  if (level.phase === "intro") {
    return (
      <PageShell title="Đồng Quê Xanh" subtitle="Chặng 02 · Đuổi Hình Bắt Chữ">
        <section className="level-intro level-intro--field">
          <div className="field-mark" aria-hidden="true"><span>▰</span><span>▰</span><span>▰</span></div>
          <span className="eyebrow">SÂN NHÀ CỦA AN · {seconds}s</span>
          <h2>ĐUỔI HÌNH BẮT CHỮ</h2>
          <p>2 lượt đoán hình · mỗi lượt có 4 mảnh gợi ý được mở ngẫu nhiên · đội đoán đúng đầu tiên nhận điểm.</p>
          {anTeam && <div className="home-advantage home-advantage--green"><strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong><span>{anTeam.teamName} đồng hành cùng An tại Đồng Quê Xanh.</span></div>}
          <button className="button button--secondary" disabled={busy} onClick={onContinue} type="button">TIẾP TỤC</button>
        </section>
      </PageShell>
    );
  }

  if (level.phase === "level_result") {
    return <LevelResult title="HOÀN THÀNH CHẶNG 02" subtitle="ĐỒNG QUÊ XANH" pieceLabel="MẢNH LIÊN MINH 02" results={level.results ?? []} busy={busy} error={error} onReturn={onReturn} />;
  }

  const challenge = level.currentChallenge;
  const roundResult = level.roundResults.find((result) => result.round === level.currentRound);
  const completed = level.phase === "round_complete";
  return (
    <PageShell title="Đuổi Hình Bắt Chữ" subtitle={`Chặng 02 · Lượt ${level.currentRound}/2`}>
      <section className="host-board-grid level-two-reveal-host">
        <header className="level-two-scorebar"><span>LƯỢT {level.currentRound} / 2</span><strong>{level.currentReward} ĐIỂM</strong><small>{level.guessedTeamIds.length}/{snapshot.teamCount} đội đã đoán</small></header>
        {challenge && <p className="host-keyword-hint"><span>GỢI Ý</span>{challenge.hint}</p>}
        <div className={`image-reveal-board${completed ? " is-complete" : ""}`} aria-label={`Ảnh đuổi hình bắt chữ lượt ${level.currentRound}`}>
          {challenge && <img alt={`Ảnh bí mật lượt ${level.currentRound}`} src={challenge.image} />}
          <div className={`reveal-tile-grid${level.currentRound === 2 ? " reveal-tile-grid--vertical" : ""}`}>
            {Array.from({ length: 4 }, (_, tileIndex) => {
              const opened = completed || level.openedTiles.includes(tileIndex);
              return <div aria-hidden={opened} className={`reveal-tile${opened ? " is-open" : ""}`} key={tileIndex}><span>?</span></div>;
            })}
          </div>
        </div>
        {!completed && (
          <div className="random-reveal-control">
            <div className="level-two-host-actions">
              <button className="button button--secondary" disabled={busy || level.openedTiles.length >= 4} onClick={onRevealTile} type="button">
                {level.openedTiles.length >= 4 ? "ĐÃ MỞ CẢ 4 MẢNH" : "MỞ NGẪU NHIÊN 1 MẢNH"}
              </button>
              <button className="button button--answer" disabled={busy} onClick={onRevealAnswer} type="button">HIỂN THỊ ĐÁP ÁN</button>
            </div>
            <span>{level.openedTiles.length} / 4 mảnh đã mở · Người chơi vẫn có thể đoán bất cứ lúc nào</span>
          </div>
        )}
        {completed && (
          <div className="round-winner-card">
            <span className="eyebrow">LƯỢT {level.currentRound} HOÀN THÀNH</span>
            <h2>{roundResult ? `ĐỘI ${roundResult.winnerTeamName} ĐÃ ĐOÁN ĐÚNG` : "CHƯA CÓ ĐỘI ĐOÁN ĐÚNG"}</h2>
            <p>TỪ KHÓA <strong>{level.reveal?.keyword}</strong></p>
            {roundResult
              ? <div className="round-score-detail"><span>Điểm đoán hình <b>{roundResult.baseReward}</b></span>{roundResult.multiplier === 2 && <span>Sân nhà An <b>×2</b></span>}<span>Tổng nhận <b>{roundResult.awardedScore}</b></span></div>
              : <p className="no-winner-note">MC đã chủ động hiển thị đáp án · Không cộng điểm lượt này</p>}
            <button className="button button--primary" disabled={busy} onClick={onContinue} type="button">{level.currentRound === 1 ? "LƯỢT TIẾP THEO" : "HOÀN THÀNH CHẶNG"}</button>
          </div>
        )}
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </PageShell>
  );
}

export function PlayerLevelTwo({
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
  onAnswer: (challengeId: string, keyword: string) => void;
}) {
  const level = snapshot.levelTwo;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const [guess, setGuess] = useState("");
  const cooldownSeconds = useSeconds(level?.cooldownUntilByTeam[teamId] ?? null);
  useEffect(() => setGuess(""), [level?.currentChallenge?.id]);
  if (!level) return null;
  const ownTeam = snapshot.teams.find((team) => team.teamId === teamId);
  const character = CHARACTERS.find((item) => item.id === ownTeam?.characterId);
  const wrongGuess = Boolean(level.cooldownUntilByTeam[teamId]);

  if (level.phase === "intro") {
    return <PlayerIntro title="Đồng Quê Xanh" subtitle="Đuổi Hình Bắt Chữ sắp bắt đầu" teamName={teamName} characterText={`${character?.name ?? ""} · ${character?.role ?? ""}`} advantage={character?.id === "an"} seconds={seconds} />;
  }

  if (level.phase === "level_result") {
    const result = level.results?.find((item) => item.teamId === teamId);
    return <PlayerResult title="Mảnh Liên Minh 02" result={result} />;
  }

  const challenge = level.currentChallenge;
  const ownRoundResult = level.roundResults.find((result) => result.round === level.currentRound && result.winnerTeamId === teamId);
  const completed = level.phase === "round_complete";
  return (
    <PageShell compact title="ĐOÁN TỪ KHÓA" subtitle={`Chặng 02 · Lượt ${level.currentRound}/2`}>
      <section className="player-question level-two-player-card">
        <span className="round-badge">LƯỢT {level.currentRound} / 2</span>
        {!completed ? <>
          <span className="eyebrow">TỪ KHÓA BÍ MẬT</span>
          <p className="keyword-hint"><span>GỢI Ý</span>{challenge?.hint}</p>
          <strong className="keyword-pattern">{challenge?.keywordPattern}</strong>
          <strong className="player-round-reward">{level.currentReward} ĐIỂM</strong>
          <form className="keyword-guess-form" onSubmit={(event) => { event.preventDefault(); if (challenge && guess.trim() && cooldownSeconds === 0 && !busy) onAnswer(challenge.id, guess); }}>
            <input aria-label="Từ khóa dự đoán" autoComplete="off" disabled={busy || cooldownSeconds > 0} maxLength={80} onChange={(event) => setGuess(event.target.value)} placeholder="Nhập từ khóa bạn đoán..." value={guess} />
            <button className="button button--primary" disabled={busy || cooldownSeconds > 0 || !guess.trim()} type="submit">GỬI ĐÁP ÁN</button>
          </form>
          {wrongGuess && <p className="guess-feedback"><strong>CHƯA CHÍNH XÁC</strong><span>{cooldownSeconds > 0 ? `Thử lại sau ${cooldownSeconds} giây...` : "Hãy quan sát thêm!"}</span></p>}
          <p className="opened-tile-count">{level.openedTiles.length} / 4 MẢNH GỢI Ý ĐÃ MỞ</p>
        </> : <div className={`personal-feedback ${ownRoundResult ? "is-correct" : "is-wrong"}`}>
          <strong>{ownRoundResult ? "CHÍNH XÁC!" : level.reveal?.winnerTeamName ? "ĐÁP ÁN ĐÃ ĐƯỢC TÌM RA" : "MC ĐÃ HIỂN THỊ ĐÁP ÁN"}</strong>
          <span>{ownRoundResult ? `+${ownRoundResult.awardedScore} ĐIỂM` : level.reveal?.winnerTeamName ? `Đội ${level.reveal.winnerTeamName} đã đoán đúng.` : "Không có đội nhận điểm ở lượt này."}</span>
          <p>Từ khóa: <b>{level.reveal?.keyword}</b></p>
          {level.currentRound === 1 && <small>Đang chờ MC bắt đầu lượt tiếp theo...</small>}
        </div>}
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

export function HostLevelThree({
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
  const level = snapshot.levelThree;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  const khoaTeam = snapshot.teams.find((team) => team.characterId === "khoa");

  if (level.phase === "intro") {
    return (
      <PageShell title="Đố Vui" subtitle="Chặng 03 · Không Gian Tri Thức">
        <section className="level-intro level-intro--knowledge">
          <div className="knowledge-mark" aria-hidden="true">?</div>
          <span className="eyebrow">SÂN NHÀ CỦA KHOA · {seconds}s</span>
          <h2>ĐỐ VUI</h2>
          <p>2 câu đố · mỗi câu 50 điểm · mỗi đội chỉ gửi một đáp án.</p>
          {khoaTeam && <div className="home-advantage home-advantage--indigo"><strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong><span>{khoaTeam.teamName} đồng hành cùng Khoa tại Không Gian Tri Thức.</span></div>}
          <button className="button button--secondary" disabled={busy} onClick={onContinue} type="button">BẮT ĐẦU</button>
        </section>
      </PageShell>
    );
  }

  if (level.phase === "level_result") {
    return <LevelResult title="HOÀN THÀNH CHẶNG 03" subtitle="KHÔNG GIAN TRI THỨC" pieceLabel="MẢNH LIÊN MINH 03" results={level.results ?? []} busy={busy} error={error} onReturn={onReturn} />;
  }

  const round = level.currentRound;
  return (
    <PageShell title="Đố Vui" subtitle={`Chặng 03 · Câu ${level.roundIndex + 1}/2`}>
      <section className="host-riddle-grid">
        <RiddleContent round={round} />
        <div className="host-question-card riddle-question-card">
          {level.phase === "round_active" && <div className="quiz-timer"><strong>{seconds}</strong><span>GIÂY</span></div>}
          <span className="eyebrow">CÂU {level.roundIndex + 1}/2</span>
          <h2>{round?.prompt}</h2>
          {level.phase === "round_active" ? (
            <p className="answer-progress">{level.submittedTeamIds.length}/{snapshot.teamCount} đội đã gửi đáp án</p>
          ) : (
            <div className="reveal-note"><strong>ĐÁP ÁN: {level.reveal?.answer}</strong><p>{level.reveal?.explanation}</p></div>
          )}
          {level.phase === "round_reveal" && <button className="button button--secondary" disabled={busy} onClick={onContinue} type="button">{level.roundIndex === 0 ? "CÂU TIẾP THEO" : "HOÀN THÀNH CHẶNG"}</button>}
          {error && <p className="form-error">{error}</p>}
        </div>
      </section>
    </PageShell>
  );
}

export function PlayerLevelThree({
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
  onAnswer: (roundId: string, answerText: string) => void;
}) {
  const level = snapshot.levelThree;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const round = level?.currentRound;
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    setAnswerText("");
  }, [round?.id]);

  if (!level || !round) return null;
  const ownTeam = snapshot.teams.find((team) => team.teamId === teamId);
  const character = CHARACTERS.find((item) => item.id === ownTeam?.characterId);
  const submitted = level.submittedTeamIds.includes(teamId);
  const feedback = level.reveal?.feedback.find((item) => item.teamId === teamId);

  if (level.phase === "intro") {
    return <PlayerIntro title="Không Gian Tri Thức" subtitle="Đố Vui sắp bắt đầu" teamName={teamName} characterText={`${character?.name ?? ""} · ${character?.role ?? ""}`} advantage={character?.id === "khoa"} seconds={seconds} />;
  }

  if (level.phase === "level_result") {
    const result = level.results?.find((item) => item.teamId === teamId);
    return <PlayerResult title="Mảnh Liên Minh 03" result={result} />;
  }

  return (
    <PageShell compact title={`ĐỐ VUI · CÂU ${level.roundIndex + 1}/2`} subtitle={`${round.points} điểm · ${seconds} giây`}>
      <section className="player-question player-riddle">
        <RiddleContent round={round} />
        <h2>{round.prompt}</h2>
        {level.phase === "round_active" && !submitted && <form className="riddle-answer-form" onSubmit={(event) => { event.preventDefault(); onAnswer(round.id, answerText); }}><label htmlFor="level-three-answer">Đáp án của đội</label><input autoComplete="off" autoFocus id="level-three-answer" inputMode={round.inputMode} maxLength={120} onChange={(event) => setAnswerText(event.target.value)} placeholder={round.type === "parking" ? "Nhập đáp án..." : "Nhập câu trả lời..."} value={answerText} /><button className="button button--primary" disabled={busy || !answerText.trim()} type="submit">GỬI ĐÁP ÁN</button></form>}
        {level.phase === "round_active" && submitted && <div className="answer-locked"><strong>ĐÃ GỬI ĐÁP ÁN</strong><span>Đang chờ kết quả...</span></div>}
        {level.phase === "round_reveal" && <div className={`personal-feedback ${feedback?.correct ? "is-correct" : "is-wrong"}`}><strong>{feedback?.correct ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC"}</strong><span>+{feedback?.pointsAwarded ?? 0} điểm gốc</span><p>Đáp án: {level.reveal?.answer}</p><p>{level.reveal?.explanation}</p></div>}
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

function RiddleContent({ round }: { round: LevelThreeRoundPublic | null }) {
  if (!round) return null;
  if (round.type === "parking") {
    return <div className="riddle-stage riddle-stage--parking" aria-label="Dãy ô đỗ xe">{round.parkingSpaces.map((space, index) => <div className="parking-space" key={`${space}-${index}`}>{space}</div>)}</div>;
  }
  return <div className="riddle-stage riddle-story">{round.storyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>;
}

function LevelResult({ title, subtitle, pieceLabel, results, busy, error, onReturn }: { title: string; subtitle: string; pieceLabel: string; results: LevelResultPublic[] | null; busy: boolean; error: string | null; onReturn: () => void }) {
  return (
    <PageShell title={title} subtitle={subtitle}>
      <section className="level-results">
        <div className="alliance-piece" aria-label={pieceLabel}>◆</div>
        <h2>{pieceLabel}</h2>
        <div className="result-table">
          {results?.map((result, index) => (
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

function PlayerIntro({ title, subtitle, teamName, characterText, advantage, seconds }: { title: string; subtitle: string; teamName: string; characterText: string; advantage: boolean; seconds: number }) {
  return (
    <PageShell compact title={title} subtitle={subtitle}>
      <section className="player-level-state"><span className="factory-icon">◆</span><h2>{teamName}</h2><p>{characterText}</p>{advantage && <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2</strong>}<small>{seconds}s</small></section>
    </PageShell>
  );
}

function PlayerResult({ title, result }: { title: string; result: LevelResultPublic | undefined }) {
  return <PageShell compact title={title} subtitle="Chặng đã hoàn thành"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{result?.finalScore ?? 0} điểm</h2><p>Điểm gốc {result?.baseScore ?? 0} × {result?.multiplier ?? 1}</p><p>Tổng tích lũy: <b>{result?.accumulatedTotalScore ?? 0}</b></p><strong>Chờ MC trở về bản đồ hành trình.</strong></section></PageShell>;
}
