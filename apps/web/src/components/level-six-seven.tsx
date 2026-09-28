import { useEffect, useState } from "react";
import { CHARACTERS } from "@htlm/game-domain";
import type { LevelResultPublic, LevelSixSubmission, LobbySnapshot } from "@htlm/protocol";
import { PageShell } from "./page-shell";

function useSeconds(deadline: number | null) {
  const [seconds, setSeconds] = useState(() => secondsUntil(deadline));
  useEffect(() => {
    setSeconds(secondsUntil(deadline));
    if (!deadline) return;
    const id = setInterval(() => setSeconds(secondsUntil(deadline)), 200);
    return () => clearInterval(id);
  }, [deadline]);
  return seconds;
}

function secondsUntil(deadline: number | null): number {
  return deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0;
}
type HostProps = {
  snapshot: LobbySnapshot;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
  onReturn: () => void;
};
function Result({
  title,
  place,
  piece,
  results,
  busy,
  onReturn
}: {
  title: string;
  place: string;
  piece: string;
  results: LevelResultPublic[] | null;
  busy: boolean;
  onReturn: () => void;
}) {
  return (
    <PageShell title={title} subtitle={place}>
      <section className="level-results">
        <div className="alliance-piece">◆</div>
        <h2>{piece}</h2>
        <div className="result-table">
          {results?.map((result) => (
            <div className="result-row" key={result.teamId}>
              <strong>{result.teamName}</strong>
              <span>
                {result.baseScore} × {result.multiplier} = <b>{result.finalScore}</b>
              </span>
            </div>
          ))}
        </div>
        <button className="button button--primary" disabled={busy} onClick={onReturn}>
          TRỞ VỀ BẢN ĐỒ
        </button>
      </section>
    </PageShell>
  );
}
function PlayerResult({ piece, result }: { piece: string; result: LevelResultPublic | undefined }) {
  return (
    <PageShell compact title={piece} subtitle="Chặng đã hoàn thành">
      <section className="player-level-state">
        <div className="alliance-piece">◆</div>
        <h2>{result?.finalScore ?? 0} điểm</h2>
        <p>
          {result?.baseScore ?? 0} × {result?.multiplier ?? 1}
        </p>
        <p>
          Tổng tích lũy: <b>{result?.accumulatedTotalScore ?? 0}</b>
        </p>
        <strong>Chờ MC trở về bản đồ.</strong>
      </section>
    </PageShell>
  );
}

export function HostLevelSix({ snapshot, busy, error, onContinue, onReturn }: HostProps) {
  const level = snapshot.levelSix;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  if (level.phase === "intro")
    return (
      <PageShell title="Campus" subtitle="Chặng 06 · Tiếp Sức Tri Thức">
        <section className="level-intro level-intro--campus">
          <span className="eyebrow">SÂN NHÀ CỦA CHÂU · {seconds}s</span>
          <h2>TIẾP SỨC TRI THỨC</h2>
          <p>4 trạm đồng bộ · mỗi đáp án đúng nhận 25 điểm.</p>
          <div className="home-advantage home-advantage--teal">
            <strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>
            <span>Châu là nhân vật sinh viên trong hành trình gameplay.</span>
          </div>
          <button className="button button--secondary" disabled={busy} onClick={onContinue}>
            TIẾP TỤC
          </button>
        </section>
      </PageShell>
    );
  if (level.phase === "level_result")
    return (
      <Result
        title="HOÀN THÀNH CHẶNG 06"
        place="CAMPUS"
        piece="MẢNH LIÊN MINH 06"
        results={level.results}
        busy={busy}
        onReturn={onReturn}
      />
    );
  const challenge = level.currentChallenge;
  const globalReached = level.stationIndex + (level.phase === "station_reveal" ? 1 : 0);
  return (
    <PageShell title="Tiếp Sức Tri Thức" subtitle={`TRẠM ${level.stationIndex + 1} / 4`}>
      <section className="host-relay-grid">
        <div className="relay-campus">
          <header className="relay-campus__header">
            <div>
              <span>CHẶNG 06</span>
              <h2>ĐƯỜNG TIẾP SỨC</h2>
            </div>
            <small>{snapshot.teamCount} đội đang tham gia</small>
          </header>
          <RelayPath reached={globalReached} />
          <div className="relay-team-list">
            {snapshot.teams.map((team) => {
              const submitted = level.submittedTeamIds.includes(team.teamId);
              const completed =
                level.stationIndex + (level.phase === "station_reveal" || submitted ? 1 : 0);
              const character = CHARACTERS.find((item) => item.id === team.characterId);
              const status = !team.connected
                ? "Mất kết nối"
                : level.phase === "station_reveal"
                  ? "Đã hoàn thành trạm"
                  : submitted
                    ? "Đã hoàn thành trạm"
                    : "Đang thực hiện";
              return (
                <article
                  className={`relay-team-row${submitted ? " is-submitted" : ""}${!team.connected ? " is-offline" : ""}`}
                  key={team.teamId}
                >
                  <div className="relay-team-identity">
                    {character ? (
                      <img alt={character.name} src={`/characters/${character.id}-master.png`} />
                    ) : (
                      <span aria-hidden="true">?</span>
                    )}
                    <strong>{team.teamName}</strong>
                  </div>
                  <RelayMiniPath completed={completed} current={level.stationIndex + 1} />
                  <div className="relay-team-status">
                    <b>TRẠM {Math.min(4, level.stationIndex + 1)} / 4</b>
                    <span>{status}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
        <div className="host-question-card">
          <div className="quiz-timer">
            <strong>{seconds}</strong>
            <span>GIÂY</span>
          </div>
          <span className="eyebrow">{challenge?.type}</span>
          <h2>{challenge?.prompt}</h2>
          {level.phase === "station_active" ? (
            <p>
              {level.submittedTeamIds.length}/{snapshot.teamCount} đội đã hoàn thành trạm
            </p>
          ) : (
            <div className="reveal-note">
              <strong>ĐÁP ÁN ĐÃ MỞ</strong>
              <p>{level.reveal?.explanation}</p>
            </div>
          )}
          <button className="button button--secondary" disabled={busy} onClick={onContinue}>
            TIẾP TỤC
          </button>
          {error && <p className="form-error">{error}</p>}
        </div>
      </section>
    </PageShell>
  );
}

function RelayPath({ reached }: { reached: number }) {
  return (
    <div className="relay-path" aria-label={`${reached}/4 trạm hoàn thành`}>
      <span className="relay-path__endpoint is-reached">BẮT ĐẦU</span>
      {[1, 2, 3, 4].map((station) => (
        <span
          className={`${station <= reached ? "is-reached" : station === reached + 1 ? "is-current" : ""}`}
          key={station}
        >
          {station <= reached ? "✓" : station}
        </span>
      ))}
      <span
        className={`relay-path__endpoint relay-path__finish${reached === 4 ? " is-reached" : ""}`}
      >
        🏁
      </span>
    </div>
  );
}

function RelayMiniPath({ completed, current }: { completed: number; current: number }) {
  return (
    <div className="relay-mini-path" aria-label={`${completed}/4 trạm hoàn thành`}>
      {[1, 2, 3, 4].map((station) => (
        <span
          className={station <= completed ? "is-reached" : station === current ? "is-current" : ""}
          key={station}
        >
          {station <= completed ? "✓" : station}
        </span>
      ))}
      <span className={completed === 4 ? "is-finished" : ""}>⚑</span>
    </div>
  );
}

export function PlayerLevelSix({
  snapshot,
  teamId,
  busy,
  error,
  onAnswer
}: {
  snapshot: LobbySnapshot;
  teamId: string;
  busy: boolean;
  error: string | null;
  onAnswer: (id: string, solution: LevelSixSubmission) => void;
}) {
  const level = snapshot.levelSix;
  const challenge = level?.currentChallenge;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => setOrder([]), [challenge?.id]);
  if (!level || !challenge) return null;
  const submitted = level.submittedTeamIds.includes(teamId);
  const feedback = level.reveal?.feedback.find((item) => item.teamId === teamId);
  if (level.phase === "intro")
    return (
      <PageShell compact title="Campus" subtitle="Tiếp Sức Tri Thức">
        <section className="player-level-state">
          <h2>SÂN NHÀ CỦA CHÂU</h2>
          <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2</strong>
          <small>{seconds}s</small>
        </section>
      </PageShell>
    );
  if (level.phase === "level_result")
    return (
      <PlayerResult
        piece="MẢNH LIÊN MINH 06"
        result={level.results?.find((item) => item.teamId === teamId)}
      />
    );
  const submitOrder = () => onAnswer(challenge.id, { type: "ordering", order });
  return (
    <PageShell
      compact
      title="TIẾP SỨC TRI THỨC"
      subtitle={`TRẠM ${level.stationIndex + 1} / 4 · ${seconds}s`}
    >
      <section className="player-question">
        <h2>{challenge.prompt}</h2>
        {level.phase === "station_active" && !submitted && challenge.type !== "ordering" && (
          <div className="choice-grid">
            {challenge.options.map((option) => (
              <button
                disabled={busy}
                key={option.id}
                onClick={() =>
                  onAnswer(challenge.id, { type: challenge.type, optionId: option.id })
                }
              >
                <b>{option.id.toUpperCase()}</b>
                {option.text}
              </button>
            ))}
          </div>
        )}
        {level.phase === "station_active" && !submitted && challenge.type === "ordering" && (
          <>
            <div className="order-tray">
              {challenge.items.map((item) => (
                <button
                  disabled={order.includes(item.id)}
                  key={item.id}
                  onClick={() => setOrder((current) => [...current, item.id])}
                >
                  {item.text}
                </button>
              ))}
            </div>
            <div className="team-order">
              {order.map((id, index) => (
                <span key={id}>
                  {index + 1}. {challenge.items.find((item) => item.id === id)?.text}
                </span>
              ))}
            </div>
            <button
              className="button button--secondary"
              onClick={() => setOrder((current) => current.slice(0, -1))}
            >
              HOÀN TÁC
            </button>
            <button
              className="button button--primary"
              disabled={busy || order.length !== challenge.items.length}
              onClick={submitOrder}
            >
              GỬI ĐÁP ÁN
            </button>
          </>
        )}
        {level.phase === "station_active" && submitted && (
          <div className="answer-locked">
            <strong>ĐÃ HOÀN THÀNH TRẠM</strong>
            <span>Đang chờ kết quả...</span>
          </div>
        )}
        {level.phase === "station_reveal" && (
          <div className={`personal-feedback ${feedback?.correct ? "is-correct" : "is-wrong"}`}>
            <strong>{feedback?.correct ? "CHÍNH XÁC!" : "CHƯA CHÍNH XÁC"}</strong>
            <span>TIẾP TỤC ĐẾN TRẠM TIẾP THEO</span>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}

export function HostLevelSeven({ snapshot, busy, error, onContinue, onReturn }: HostProps) {
  const level = snapshot.levelSeven;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  if (!level) return null;
  if (level.phase === "intro")
    return (
      <PageShell title="Lễ Hội Cộng Đồng" subtitle="Chặng 07 · Nhìn Hình Đoán Chữ">
        <section className="level-intro level-intro--festival-seven">
          <span className="eyebrow">SÂN NHÀ CỦA UYÊN · {seconds}s</span>
          <h2>NHÌN HÌNH ĐOÁN CHỮ</h2>
          <p>3 câu đố hình ảnh · tổng điểm cơ bản tối đa 100.</p>
          <div className="home-advantage home-advantage--berry">
            <strong>LỢI THẾ SÂN NHÀ ×2 ĐIỂM</strong>
          </div>
          <button className="button button--secondary" disabled={busy} onClick={onContinue}>
            TIẾP TỤC
          </button>
        </section>
      </PageShell>
    );
  if (level.phase === "level_result")
    return (
      <Result
        title="HOÀN THÀNH CHẶNG 07"
        place="LỄ HỘI CỘNG ĐỒNG"
        piece="MẢNH LIÊN MINH 07"
        results={level.results}
        busy={busy}
        onReturn={onReturn}
      />
    );
  const round = level.currentRound;
  return (
    <PageShell
      title="NHÌN HÌNH ĐOÁN CHỮ"
      subtitle={`CÂU ${level.roundIndex + 1} / ${level.totalRounds}`}
    >
      <section className="host-picture-word-grid">
        <div className="host-picture-stage">
          <span className="picture-stage-kicker">CHẶNG 7</span>
          <PictureClues imageUrls={round?.imageUrls ?? []} />
        </div>
        <div className="host-question-card">
          <div className="quiz-timer">
            <strong>{seconds}</strong>
            <span>GIÂY</span>
          </div>
          <h2>{round?.prompt}</h2>
          {level.phase === "round_active" ? (
            <p className="answer-progress">
              {level.submittedTeamIds.length}/{snapshot.teamCount} đội đã gửi đáp án
            </p>
          ) : (
            <div className="reveal-note">
              <strong>ĐÁP ÁN: {level.reveal?.answer.toLocaleUpperCase("vi-VN")}</strong>
              <p>{level.reveal?.explanation}</p>
              <div className="picture-team-feedback">
                {level.reveal?.feedback.map((item) => (
                  <span className={item.correct ? "is-correct" : "is-wrong"} key={item.teamId}>
                    {item.correct ? "✓" : "×"}{" "}
                    {snapshot.teams.find((team) => team.teamId === item.teamId)?.teamName}
                  </span>
                ))}
              </div>
            </div>
          )}
          <button className="button button--secondary" disabled={busy} onClick={onContinue}>
            TIẾP TỤC
          </button>
          {error && <p className="form-error">{error}</p>}
        </div>
      </section>
    </PageShell>
  );
}

function PictureClues({ imageUrls }: { imageUrls: readonly string[] }) {
  return (
    <div className={`picture-clues picture-clues--${imageUrls.length}`}>
      {imageUrls.map((imageUrl, index) => (
        <figure key={imageUrl}>
          <img alt={`Gợi ý hình ảnh ${index + 1}`} src={imageUrl} />
        </figure>
      ))}
    </div>
  );
}

function AnswerPattern({ pattern }: { pattern: string }) {
  const tokens = pattern.match(/_+|-/gu) ?? [];
  return (
    <div className="answer-pattern" aria-label={`Mẫu đáp án: ${pattern}`}>
      {tokens.map((token, index) => (
        <span
          className={token === "-" ? "answer-pattern__hyphen" : "answer-pattern__word"}
          key={`${token}-${index}`}
        >
          {token}
        </span>
      ))}
    </div>
  );
}

export function PlayerLevelSeven({
  snapshot,
  teamId,
  busy,
  error,
  onAnswer
}: {
  snapshot: LobbySnapshot;
  teamId: string;
  busy: boolean;
  error: string | null;
  onAnswer: (id: string, answerText: string) => void;
}) {
  const level = snapshot.levelSeven;
  const seconds = useSeconds(level?.deadlineAt ?? null);
  const [answer, setAnswer] = useState("");
  useEffect(() => setAnswer(""), [level?.currentRound?.id]);
  if (!level) return null;
  if (level.phase === "intro")
    return (
      <PageShell compact title="Lễ Hội Cộng Đồng" subtitle="Nhìn Hình Đoán Chữ">
        <section className="player-level-state">
          <h2>SÂN NHÀ CỦA UYÊN</h2>
          <strong className="advantage-chip">LỢI THẾ SÂN NHÀ ×2</strong>
          <small>{seconds}s</small>
        </section>
      </PageShell>
    );
  if (level.phase === "level_result")
    return (
      <PlayerResult
        piece="MẢNH LIÊN MINH 07"
        result={level.results?.find((item) => item.teamId === teamId)}
      />
    );
  const round = level.currentRound;
  const submitted = level.submittedTeamIds.includes(teamId);
  const feedback = level.reveal?.feedback.find((item) => item.teamId === teamId);
  return (
    <PageShell
      compact
      title="NHÌN HÌNH ĐOÁN CHỮ"
      subtitle={`CÂU ${level.roundIndex + 1} / ${level.totalRounds} · ${seconds} giây`}
    >
      <section className="player-question player-picture-word">
        <span className="picture-stage-kicker">CHẶNG 7</span>
        <PictureClues imageUrls={round?.imageUrls ?? []} />
        {round && <AnswerPattern pattern={round.answerPattern} />}
        {level.phase === "round_active" && !submitted && (
          <form
            className="picture-answer-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (round && answer.trim() && !busy) onAnswer(round.id, answer);
            }}
          >
            <label htmlFor="picture-word-answer">Nhập đáp án đầy đủ</label>
            <input
              autoComplete="off"
              autoFocus
              id="picture-word-answer"
              maxLength={120}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Nhập đáp án..."
              value={answer}
            />
            <button
              className="button button--primary"
              disabled={busy || !answer.trim() || !round}
              type="submit"
            >
              TRẢ LỜI
            </button>
          </form>
        )}
        {level.phase === "round_active" && submitted && (
          <div className="answer-locked">
            <strong>ĐÃ GỬI ĐÁP ÁN</strong>
            <span>Đang chờ các đội khác...</span>
          </div>
        )}
        {level.phase === "round_reveal" && (
          <div className={`personal-feedback ${feedback?.correct ? "is-correct" : "is-wrong"}`}>
            <strong>{feedback?.correct ? "CHÍNH XÁC" : "CHƯA CHÍNH XÁC"}</strong>
            <span>Đáp án: {level.reveal?.answer}</span>
            <p>{level.reveal?.explanation}</p>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </section>
    </PageShell>
  );
}
