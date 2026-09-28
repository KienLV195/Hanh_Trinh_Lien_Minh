import { useEffect, useState } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type { LevelFourSubmission, LevelResultPublic, LobbySnapshot } from "@htlm/protocol";
import { PageShell } from "./page-shell";

function useSeconds(deadline: number | null) {
  const [value, setValue] = useState(() => deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)) : 0);
  useEffect(() => { const calculate = () => deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)) : 0; setValue(calculate()); if (!deadline) return; const id = window.setInterval(() => setValue(calculate()), 200); return () => clearInterval(id); }, [deadline]);
  return value;
}

function Results({ title, place, piece, results, teams, busy, error, onReturn }: { title: string; place: string; piece: string; results: LevelResultPublic[] | null; teams: LobbySnapshot["teams"]; busy: boolean; error: string | null; onReturn: () => void }) {
  return <PageShell title={title} subtitle={place}><section className="level-results level-results--festival"><div className="alliance-piece">◆</div><h2>{piece}</h2><div className="result-table">{results?.map((result, index) => { const team = teams.find((item) => item.teamId === result.teamId); const character = CHARACTERS.find((item) => item.id === team?.characterId); return <div className="result-row" key={result.teamId}><strong>#{index + 1} · {result.teamName}</strong><small>{character ? `${character.name} · ${character.role}` : "Chưa chọn nhân vật"}</small><span>{result.baseScore} × {result.multiplier} = <b>{result.finalScore}</b></span></div>; })}</div><button className="button button--primary" disabled={busy} onClick={onReturn}>TRỞ VỀ BẢN ĐỒ</button>{error && <p className="form-error">{error}</p>}</section></PageShell>;
}

export function HostLevelFour({ snapshot, busy, error, onContinue, onReturn }: LevelHostProps) {
  const level = snapshot.levelFour;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  if (level.phase === "intro") return <PageShell title="Phố Giao Thương" subtitle="Chặng 04 · Chợ Phiên Kết Nối"><section className="level-intro level-intro--market"><span className="eyebrow">SÂN NHÀ CỦA THƯ · {seconds}s</span><h2>CHỢ PHIÊN KẾT NỐI</h2><p>4 vòng ghép nối · mỗi vòng đúng trọn vẹn nhận 25 điểm.</p><div className="home-advantage home-advantage--coral"><strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong><span>{snapshot.teams.find((team) => team.characterId === "linh")?.teamName ?? "Đội Thư"}</span></div><button className="button button--secondary" disabled={busy} onClick={onContinue}>TIẾP TỤC</button></section></PageShell>;
  if (level.phase === "level_result") return <Results title="HOÀN THÀNH CHẶNG 04" place="PHỐ GIAO THƯƠNG" piece="MẢNH LIÊN MINH 04" results={level.results} teams={snapshot.teams} busy={busy} error={error} onReturn={onReturn} />;
  const challenge = level.currentChallenge;
  return <PageShell title="Chợ Phiên Kết Nối" subtitle={`Chặng 04 · Vòng ${level.challengeIndex + 1}/4`}><section className="host-market-grid"><div className="market-stage"><div className="market-awning" /><h2>{challenge?.prompt}</h2><div className="market-pairs"><div>{challenge?.leftItems.map((item) => <span key={item.id}>{item.text}</span>)}</div><b>↔</b><div>{challenge?.rightItems.map((item) => <span key={item.id}>{item.text}</span>)}</div></div>{level.reveal && <div className="pair-ribbons">{level.reveal.solution.matches.map((pair, index) => <span key={pair.leftId}>{index + 1}. {pair.leftId.toUpperCase()} ↔ {pair.rightId.toUpperCase()}</span>)}</div>}</div><div className="host-question-card"><div className="quiz-timer"><strong>{seconds}</strong><span>GIÂY</span></div>{level.phase === "challenge_active" ? <p className="answer-progress">{level.submittedTeamIds.length}/{snapshot.teamCount} đội đã gửi</p> : <div className="reveal-note"><strong>KẾT NỐI ĐÚNG</strong><p>{level.reveal?.explanation}</p></div>}<button className="button button--secondary" disabled={busy} onClick={onContinue}>TIẾP TỤC</button>{error && <p className="form-error">{error}</p>}</div></section></PageShell>;
}

export function PlayerLevelFour({ snapshot, teamId, teamName, busy, error, onAnswer }: { snapshot: LobbySnapshot; teamId: string; teamName: string; busy: boolean; error: string | null; onAnswer: (id: string, solution: LevelFourSubmission) => void }) {
  const level = snapshot.levelFour;
  const challenge = level?.currentChallenge;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [matches, setMatches] = useState<Array<{ leftId: string; rightId: string }>>([]);
  useEffect(() => { setSelected(null); setMatches([]); }, [challenge?.id]);
  if (!level || !challenge) return null;
  const submitted = level.submittedTeamIds.includes(teamId);
  const own = snapshot.teams.find((team) => team.teamId === teamId);
  if (level.phase === "intro") return <PlayerIntro title="Phố Giao Thương" teamName={teamName} advantage={own?.characterId === "linh"} seconds={seconds} />;
  if (level.phase === "level_result") return <PlayerResult title="Mảnh Liên Minh 04" result={level.results?.find((item) => item.teamId === teamId)} />;
  const connect = (rightId: string) => { if (!selected) return; setMatches((current) => [...current.filter((pair) => pair.leftId !== selected && pair.rightId !== rightId), { leftId: selected, rightId }]); setSelected(null); };
  const feedback = level.reveal?.feedback.find((item) => item.teamId === teamId);
  return <PageShell compact title={`Vòng ${level.challengeIndex + 1}/4`} subtitle={`${seconds} giây`}><section className="player-question player-market"><h2>{challenge.prompt}</h2>{level.phase === "challenge_active" && !submitted && <><div className="matching-grid"><div>{challenge.leftItems.map((item) => { const pair = matches.find((match) => match.leftId === item.id); const isSelected = selected === item.id; return <button aria-pressed={isSelected} className={isSelected ? "is-selected" : pair ? "is-matched" : ""} disabled={Boolean(pair)} key={item.id} onClick={() => setSelected(item.id)} type="button">{pair ? `${matches.indexOf(pair) + 1}. ` : ""}{item.text}</button>; })}</div><div>{challenge.rightItems.map((item) => { const paired = matches.some((pair) => pair.rightId === item.id); return <button className={paired ? "is-matched" : ""} disabled={paired || !selected} key={item.id} onClick={() => connect(item.id)} type="button">{item.text}</button>; })}</div><p>{matches.length}/3 cặp đã ghép</p></div><button className="button button--secondary" disabled={!matches.length} onClick={() => setMatches((current) => current.slice(0, -1))}>HOÀN TÁC</button><button className="button button--primary" disabled={busy || matches.length !== 3} onClick={() => onAnswer(challenge.id, { matches })}>GỬI KẾT QUẢ</button></>}{level.phase === "challenge_active" && submitted && <div className="answer-locked"><strong>ĐÃ GỬI KẾT QUẢ</strong></div>}{level.phase === "challenge_reveal" && <Feedback correct={feedback?.correct} correctText="CHÍNH XÁC!" wrongText="CHƯA CHÍNH XÁC" />}{error && <p className="form-error">{error}</p>}</section></PageShell>;
}

type LevelHostProps = { snapshot: LobbySnapshot; busy: boolean; error: string | null; onContinue: () => void; onReturn: () => void };
function PlayerIntro({ title, teamName, advantage, seconds }: { title: string; teamName: string; advantage: boolean; seconds: number }) { return <PageShell compact title={title} subtitle="Sắp bắt đầu"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{teamName}</h2>{advantage && <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>}<small>{seconds}s</small></section></PageShell>; }
function PlayerResult({ title, result }: { title: string; result: LevelResultPublic | undefined }) { return <PageShell compact title={title} subtitle="Chặng đã hoàn thành"><section className="player-level-state"><div className="alliance-piece">◆</div><h2>{result?.finalScore ?? 0} điểm</h2><p>Điểm gốc {result?.baseScore ?? 0} × {result?.multiplier ?? 1}</p><p>Tổng tích lũy: <b>{result?.accumulatedTotalScore ?? 0}</b></p><strong>Chờ MC trở về bản đồ.</strong></section></PageShell>; }
function Feedback({ correct, correctText, wrongText }: { correct: boolean | undefined; correctText: string; wrongText: string }) { return <div className={`personal-feedback ${correct ? "is-correct" : "is-wrong"}`}><strong>{correct ? correctText : wrongText}</strong></div>; }
