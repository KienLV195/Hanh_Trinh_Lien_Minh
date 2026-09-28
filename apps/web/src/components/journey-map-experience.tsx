import { useEffect, useMemo, useState } from "react";
import { CHARACTERS, type LevelId } from "@htlm/game-domain";
import { PhaserMount } from "../game/phaser-mount";
import { GameBridge } from "../game/game-bridge";
import { JOURNEY_AREAS } from "../game/journey-map-config";
import "../journey-map.css";

export function JourneyMapExperience({
  mode,
  completedLevelIds = [],
  availableLevelId = null,
  journeyComplete = false,
  busy = false,
  error = null,
  onStartLevel,
  onEnterAllianceCenter
}: {
  mode: "dev" | "host";
  completedLevelIds?: readonly LevelId[];
  availableLevelId?: LevelId | null;
  journeyComplete?: boolean;
  busy?: boolean;
  error?: string | null;
  onStartLevel?: (levelId: LevelId) => void;
  onEnterAllianceCenter?: () => void;
}) {
  const bridge = useMemo(() => new GameBridge(), []);
  const [focusedLevelId, setFocusedLevelId] = useState<LevelId | null>(null);
  const [centerFocused, setCenterFocused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const focused = bridge.on("map:focused", ({ levelId }) => setFocusedLevelId(levelId));
    const center = bridge.on("map:centerFocused", ({ focused: value }) => {
      setCenterFocused(value);
    });
    const loaded = bridge.on("phaser:ready", ({ scene }) => setReady(scene === "JourneyMapScene"));
    return () => { focused(); center(); loaded(); };
  }, [bridge]);
  useEffect(() => {
    if (ready) bridge.emit("map:setState", { mode, completedLevelIds, availableLevelId });
  }, [availableLevelId, bridge, completedLevelIds, mode, ready]);

  const focused = JOURNEY_AREAS.find((area) => area.levelId === focusedLevelId);
  const character = CHARACTERS.find((item) => item.id === focused?.characterId);
  const completed = focusedLevelId ? completedLevelIds.includes(focusedLevelId) : false;
  const available = focusedLevelId === availableLevelId;
  const navigate = (target: LevelId | "overview" | "next" | "previous" | "alliance-center") => bridge.emit("map:navigate", { target });
  const pieces = CHARACTERS.map((_, index) => index < completedLevelIds.length ? "◆" : "◇");

  return (
    <section className={`journey-experience journey-experience--${mode}`} aria-label="Hành trình Liên Minh">
      <div className="journey-review__stage" aria-label="Bản đồ hành trình tương tác">
        <PhaserMount mode="journey" bridge={bridge} />
        {!ready && <p className="journey-review__loading" role="status">Đang mở bản đồ hành trình…</p>}
        {focused && character && (
          <aside className={`journey-focus${mode === "host" ? " journey-focus--interactive" : ""}${focused.levelId === "level-7" ? " journey-focus--level-7" : ""}`} aria-live="polite">
            <span>CHẶNG {focused.levelId.replace("level-", "0")}</span>
            <h2>{focused.title}</h2>
            <p>{character.name} — {character.role}</p>
            <strong>{focused.futureGame}</strong>
            {mode === "host" && <div className="journey-focus__actions">
              {available && <button className="button button--primary" disabled={busy} onClick={() => onStartLevel?.(focused.levelId)} type="button">BẮT ĐẦU CHẶNG {focused.levelId.slice(-1)}</button>}
              {completed && <small>CHẶNG ĐÃ HOÀN THÀNH · Không thể chơi lại</small>}
              <button className="journey-back" onClick={() => navigate("overview")} type="button">← TRỞ LẠI BẢN ĐỒ</button>
            </div>}
          </aside>
        )}
        {mode === "host" && centerFocused && journeyComplete && completedLevelIds.length === 7 && (
          <aside className="alliance-center-overlay" aria-live="polite">
            <span>7 / 7 MẢNH ĐÃ ĐƯỢC THU THẬP</span>
            <h2>TRUNG TÂM LIÊN MINH</h2>
            <p>Bảy hành trình đã hội tụ.<br />Cánh cửa cuối cùng đã được mở.</p>
            <button className="button button--primary" disabled={busy} onClick={onEnterAllianceCenter} type="button">TIẾN VÀO TRUNG TÂM LIÊN MINH</button>
            <button className="journey-back" onClick={() => navigate("overview")} type="button">← TRỞ LẠI BẢN ĐỒ</button>
          </aside>
        )}
        <div className="journey-pieces" aria-label={`${completedLevelIds.length} trên 7 mảnh Liên Minh`}>
          <span>{completedLevelIds.length} / 7 MẢNH LIÊN MINH</span>
          <div aria-hidden="true">{pieces.map((piece, index) => <i key={CHARACTERS[index]?.id}>{piece}</i>)}</div>
        </div>
        {journeyComplete && !centerFocused && <div className="journey-complete"><strong>HÀNH TRÌNH ĐÃ HOÀN THÀNH</strong><span>Nhấn Trung Tâm Liên Minh để tiếp tục</span></div>}
        {error && <p className="journey-map-error" role="alert">{error}</p>}
      </div>
      {mode === "dev" && <nav className="journey-navigation" aria-label="Điều hướng bản đồ thử nghiệm">
        <span className="journey-navigation__label">Bản xem thử</span>
        <button disabled={!ready} aria-pressed={!focusedLevelId && !centerFocused} onClick={() => navigate("overview")} type="button">Toàn cảnh</button>
        {JOURNEY_AREAS.map((area, index) => <button disabled={!ready} key={area.levelId} aria-pressed={area.levelId === focusedLevelId} onClick={() => navigate(area.levelId)} type="button">{index + 1} {area.characterId.toUpperCase()}</button>)}
        <button disabled={!ready || !focusedLevelId} onClick={() => navigate("previous")} type="button">← Trước</button>
        <button disabled={!ready || focusedLevelId === "level-7"} onClick={() => navigate("next")} type="button">Sau →</button>
        <button disabled={!ready} aria-pressed={centerFocused} onClick={() => navigate("alliance-center")} type="button">Trung tâm</button>
      </nav>}
    </section>
  );
}
