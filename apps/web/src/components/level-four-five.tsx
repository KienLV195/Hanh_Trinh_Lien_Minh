import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type {
  LevelFourChallengePublic,
  LevelFourSubmission,
  LevelResultPublic,
  LobbySnapshot
} from "@htlm/protocol";
import { PageShell } from "./page-shell";

type Match = LevelFourSubmission["matches"][number];

function useSeconds(deadline: number | null) {
  const [value, setValue] = useState(() =>
    deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)) : 0
  );
  useEffect(() => {
    const calculate = () =>
      deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)) : 0;
    setValue(calculate());
    if (!deadline) return;
    const id = window.setInterval(() => setValue(calculate()), 200);
    return () => clearInterval(id);
  }, [deadline]);
  return value;
}

function Results({ title, place, piece, results, teams, busy, error, onReturn }: {
  title: string; place: string; piece: string; results: LevelResultPublic[] | null;
  teams: LobbySnapshot["teams"]; busy: boolean; error: string | null; onReturn: () => void;
}) {
  return (
    <PageShell title={title} subtitle={place}>
      <section className="level-results level-results--festival">
        <div className="alliance-piece">◆</div><h2>{piece}</h2>
        <div className="result-table">
          {results?.map((result, index) => {
            const team = teams.find((item) => item.teamId === result.teamId);
            const character = CHARACTERS.find((item) => item.id === team?.characterId);
            return <div className="result-row" key={result.teamId}><strong>#{index + 1} · {result.teamName}</strong><small>{character ? `${character.name} · ${character.role}` : "Chưa chọn nhân vật"}</small><span>{result.baseScore} × {result.multiplier} = <b>{result.finalScore}</b></span></div>;
          })}
        </div>
        <button className="button button--primary" disabled={busy} onClick={onReturn}>TRỞ VỀ BẢN ĐỒ</button>
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

export function HostLevelFour({ snapshot, busy, error, onContinue, onReturn }: LevelHostProps) {
  const level = snapshot.levelFour;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  if (level.phase === "intro") return (
    <PageShell title="Phố Giao Thương" subtitle="Chặng 04 · Chợ Phiên Kết Nối">
      <section className="level-intro level-intro--market">
        <span className="eyebrow">SÂN NHÀ CỦA THƯ · {seconds}s</span><h2>CHỢ PHIÊN KẾT NỐI</h2>
        <p>4 vòng ghép nối · mỗi vòng đúng trọn vẹn nhận 25 điểm.</p>
        <div className="home-advantage home-advantage--coral"><strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong><span>{snapshot.teams.find((team) => team.characterId === "linh")?.teamName ?? "Đội Thư"}</span></div>
        <button className="button button--secondary" disabled={busy} onClick={onContinue}>TIẾP TỤC</button>
      </section>
    </PageShell>
  );
  if (level.phase === "level_result") return <Results title="HOÀN THÀNH CHẶNG 04" place="PHỐ GIAO THƯƠNG" piece="MẢNH LIÊN MINH 04" results={level.results} teams={snapshot.teams} busy={busy} error={error} onReturn={onReturn} />;
  const challenge = level.currentChallenge;
  return (
    <PageShell title="Chợ Phiên Kết Nối" subtitle={`Chặng 04 · Vòng ${level.challengeIndex + 1}/4`}>
      <section className="host-market-grid">
        <div className="market-stage">
          <div className="market-awning" /><h2>{challenge?.prompt}</h2>
          {challenge && <MatchingBoard challenge={challenge} matches={level.reveal?.solution.matches ?? []} readOnly />}
          {level.reveal && <p className="matching-reveal-label">Đường nối đáp án đúng</p>}
        </div>
        <div className="host-question-card">
          <div className="quiz-timer"><strong>{seconds}</strong><span>GIÂY</span></div>
          {level.phase === "challenge_active" ? <p className="answer-progress">{level.submittedTeamIds.length}/{snapshot.teamCount} đội đã gửi</p> : <div className="reveal-note"><strong>KẾT NỐI ĐÚNG</strong><p>{level.reveal?.explanation}</p></div>}
          <button className="button button--secondary" disabled={busy} onClick={onContinue}>TIẾP TỤC</button>{error && <p className="form-error">{error}</p>}
        </div>
      </section>
    </PageShell>
  );
}

export function PlayerLevelFour({ snapshot, teamId, teamName, busy, error, onAnswer }: {
  snapshot: LobbySnapshot; teamId: string; teamName: string; busy: boolean; error: string | null;
  onAnswer: (id: string, solution: LevelFourSubmission) => void;
}) {
  const level = snapshot.levelFour;
  const challenge = level?.currentChallenge;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  useEffect(() => { setSelected(null); setMatches([]); }, [challenge?.id]);
  if (!level || !challenge) return null;
  const submitted = level.submittedTeamIds.includes(teamId);
  const own = snapshot.teams.find((team) => team.teamId === teamId);
  if (level.phase === "intro") return <PlayerIntro title="Phố Giao Thương" teamName={teamName} advantage={own?.characterId === "linh"} seconds={seconds} />;
  if (level.phase === "level_result") return <PlayerResult title="Mảnh Liên Minh 04" result={level.results?.find((item) => item.teamId === teamId)} />;
  const connect = (rightId: string) => {
    if (!selected) return;
    setMatches((current) => [...current.filter((pair) => pair.leftId !== selected && pair.rightId !== rightId), { leftId: selected, rightId }]);
    setSelected(null);
  };
  const feedback = level.reveal?.feedback.find((item) => item.teamId === teamId);
  const displayedMatches = level.phase === "challenge_reveal" ? level.reveal?.solution.matches ?? [] : matches;
  const interactive = level.phase === "challenge_active" && !submitted;
  return (
    <PageShell compact title={`Vòng ${level.challengeIndex + 1}/4`} subtitle={`${seconds} giây`}>
      <section className="player-question player-market">
        <h2>{challenge.prompt}</h2>
        <MatchingBoard challenge={challenge} matches={displayedMatches} selectedLeftId={selected} onSelectLeft={interactive ? setSelected : undefined} onSelectRight={interactive ? connect : undefined} readOnly={!interactive} />
        {interactive && <><p className="matching-progress">{matches.length}/{challenge.leftItems.length} cặp đã ghép</p><button className="button button--secondary" disabled={!matches.length} onClick={() => setMatches((current) => current.slice(0, -1))}>HOÀN TÁC</button><button className="button button--primary" disabled={busy || matches.length !== challenge.leftItems.length} onClick={() => onAnswer(challenge.id, { matches })}>GỬI KẾT QUẢ</button></>}
        {level.phase === "challenge_active" && submitted && <div className="answer-locked"><strong>ĐÃ GỬI KẾT QUẢ</strong></div>}
        {level.phase === "challenge_reveal" && <Feedback correct={feedback?.correct} correctText="CHÍNH XÁC!" wrongText="CHƯA CHÍNH XÁC" />}
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

function MatchingBoard({ challenge, matches, selectedLeftId = null, onSelectLeft, onSelectRight, readOnly = false }: {
  challenge: LevelFourChallengePublic; matches: readonly Match[]; selectedLeftId?: string | null;
  onSelectLeft?: ((leftId: string) => void) | undefined; onSelectRight?: ((rightId: string) => void) | undefined; readOnly?: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef(new Map<string, HTMLElement>());
  const rightRefs = useRef(new Map<string, HTMLElement>());
  const [geometry, setGeometry] = useState({ width: 0, height: 0, lines: [] as Array<Match & { x1: number; y1: number; x2: number; y2: number }> });
  const updateLines = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardRect = board.getBoundingClientRect();
    const lines = matches.flatMap((match) => {
      const left = leftRefs.current.get(match.leftId)?.getBoundingClientRect();
      const right = rightRefs.current.get(match.rightId)?.getBoundingClientRect();
      if (!left || !right) return [];
      return [{ ...match, x1: left.right - boardRect.left, y1: left.top + left.height / 2 - boardRect.top, x2: right.left - boardRect.left, y2: right.top + right.height / 2 - boardRect.top }];
    });
    setGeometry({ width: boardRect.width, height: boardRect.height, lines });
  }, [matches]);
  useLayoutEffect(() => {
    updateLines();
    const board = boardRef.current;
    if (!board) return;
    const observer = new ResizeObserver(updateLines);
    observer.observe(board);
    for (const element of [...leftRefs.current.values(), ...rightRefs.current.values()]) observer.observe(element);
    window.addEventListener("resize", updateLines);
    return () => { observer.disconnect(); window.removeEventListener("resize", updateLines); };
  }, [challenge.id, updateLines]);
  const capture = (map: Map<string, HTMLElement>, id: string) => (element: HTMLElement | null) => { if (element) map.set(id, element); else map.delete(id); };
  return (
    <div className="level-four-matching" ref={boardRef}>
      <div className="level-four-match-column level-four-match-column--left">
        {challenge.leftItems.map((item) => {
          const paired = matches.some((match) => match.leftId === item.id);
          const className = `${selectedLeftId === item.id ? "is-selected " : ""}${paired ? "is-matched" : ""}`.trim();
          return readOnly ? <div className={className} key={item.id} ref={capture(leftRefs.current, item.id)}>{item.text}</div> : <button aria-pressed={selectedLeftId === item.id} className={className} disabled={paired} key={item.id} onClick={() => onSelectLeft?.(item.id)} ref={capture(leftRefs.current, item.id)} type="button">{item.text}</button>;
        })}
      </div>
      <svg aria-hidden="true" className="level-four-match-lines" viewBox={`0 0 ${geometry.width} ${geometry.height}`}>
        {geometry.lines.map((line, index) => {
          const bend = Math.max(30, (line.x2 - line.x1) * 0.42);
          return <path d={`M ${line.x1} ${line.y1} C ${line.x1 + bend} ${line.y1}, ${line.x2 - bend} ${line.y2}, ${line.x2} ${line.y2}`} key={`${line.leftId}-${line.rightId}`} style={{ "--match-index": index } as CSSProperties} />;
        })}
      </svg>
      <div className="level-four-match-column level-four-match-column--right">
        {challenge.rightItems.map((item) => {
          const paired = matches.some((match) => match.rightId === item.id);
          return readOnly ? <div className={paired ? "is-matched" : ""} key={item.id} ref={capture(rightRefs.current, item.id)}>{item.text}</div> : <button className={paired ? "is-matched" : ""} disabled={paired || !selectedLeftId} key={item.id} onClick={() => onSelectRight?.(item.id)} ref={capture(rightRefs.current, item.id)} type="button">{item.text}</button>;
        })}
      </div>
    </div>
  );
}

type LevelHostProps = { snapshot: LobbySnapshot; busy: boolean; error: string | null; onContinue: () => void; onReturn: () => void };
function PlayerIntro({ title, teamName, advantage, seconds }: { title: string; teamName: string; advantage: boolean; seconds: number }) { return <PageShell compact title={title} subtitle="Sắp bắt đầu"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{teamName}</h2>{advantage && <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>}<small>{seconds}s</small></section></PageShell>; }
function PlayerResult({ title, result }: { title: string; result: LevelResultPublic | undefined }) { return <PageShell compact title={title} subtitle="Chặng đã hoàn thành"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{result?.finalScore ?? 0} điểm</h2><p>Điểm gốc {result?.baseScore ?? 0} × {result?.multiplier ?? 1}</p><p>Tổng tích lũy: <b>{result?.accumulatedTotalScore ?? 0}</b></p><strong>Chờ MC trở về bản đồ.</strong></section></PageShell>; }
function Feedback({ correct, correctText, wrongText }: { correct: boolean | undefined; correctText: string; wrongText: string }) { return <div className={`personal-feedback ${correct ? "is-correct" : "is-wrong"}`}><strong>{correct ? correctText : wrongText}</strong></div>; }
