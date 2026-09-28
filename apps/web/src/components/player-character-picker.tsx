import { useRef, useState } from "react";
import { CHARACTERS, type CharacterId } from "@htlm/game-domain";
import type { LobbySnapshot } from "@htlm/protocol";
import { CharacterVisual } from "./character-visual";
import { StorybookShell } from "./storybook-shell";

export function PlayerCharacterPicker({ snapshot, teamId, teamName, claiming, error, connected, onClaim }: {
  snapshot: LobbySnapshot;
  teamId: string;
  teamName: string;
  claiming: CharacterId | null;
  error: string | null;
  connected: boolean;
  onClaim: (id: CharacterId) => void;
}) {
  const ownId = snapshot.teams.find((team) => team.teamId === teamId)?.characterId;
  const [browsing, setBrowsing] = useState<CharacterId | null>(null);
  const chooser = useRef<HTMLElement>(null);
  const currentId = browsing ?? ownId ?? "minh";
  const character = CHARACTERS.find((item) => item.id === currentId)!;
  const owner = snapshot.teams.find((team) => team.characterId === currentId);
  const selected = owner?.teamId === teamId;
  const unavailable = Boolean(owner && !selected);
  const state = selected ? "selected" : unavailable ? "claimed" : "available";

  return (
    <StorybookShell mode="player" title="Chọn người đồng hành" subtitle="Mỗi nhân vật chỉ thuộc về một đội."
      actions={<span className="storybook__room">{teamName}</span>}>
      <section className={`companion-preview companion-preview--${character.accent}`} aria-label={`Xem ${character.name}`}>
        <CharacterVisual characterId={currentId} state={state} size="large" />
        <div className="companion-preview__copy" aria-live="polite">
          <span className="companion-preview__status">{selected ? "✓ Đội bạn đã chọn" : unavailable ? "Đã được chọn" : "Người đồng hành của bạn?"}</span>
          <h2>{character.name}</h2>
          <strong>{character.role}</strong>
          <p>{character.shortDescription}</p>
          <small>Sân nhà · Chặng {character.homeLevelId.replace("level-", "")}</small>
          {owner && <span className="companion-preview__team">{owner.teamName}</span>}
        </div>
      </section>
      <nav ref={chooser} className="companion-chooser" aria-label="Xem bảy nhân vật">
        {CHARACTERS.map((item) => {
          const claimed = snapshot.teams.find((team) => team.characterId === item.id);
          return (
            <button type="button" key={item.id} aria-pressed={currentId === item.id}
              aria-label={`${item.name}, ${item.role}${claimed ? `, đội ${claimed.teamName}` : ", còn trống"}`}
              onClick={() => setBrowsing(item.id)}>
              <CharacterVisual characterId={item.id} size="small" state={claimed?.teamId === teamId ? "selected" : claimed ? "claimed" : "available"} />
              <strong>{item.name}</strong>
              <span>{claimed?.teamId === teamId ? "Đội bạn" : claimed ? "Đã có đội" : "Còn trống"}</span>
            </button>
          );
        })}
      </nav>
      <footer className="companion-actions">
        {error && <p className="form-error" role="alert">{error}</p>}
        {!connected && <p role="status">Đang kết nối lại…</p>}
        {selected ? (
          <button className="button button--secondary" type="button" onClick={() => {
            chooser.current?.querySelector<HTMLButtonElement>('button[aria-pressed="false"]')?.focus();
            chooser.current?.scrollIntoView({ block: "nearest" });
          }}>Đổi nhân vật</button>
        ) : (
          <button className="button button--primary" type="button" disabled={unavailable || Boolean(claiming) || !connected}
            onClick={() => onClaim(currentId)}>
            {claiming ? `Đang chọn ${CHARACTERS.find((item) => item.id === claiming)?.name}…` : unavailable ? `Đã được đội ${owner?.teamName} chọn` : `Chọn ${character.name}`}
          </button>
        )}
        <small>{ownId ? "Bạn có thể đổi trước khi host xác nhận đội hình." : "Chọn một người đồng hành để sẵn sàng."}</small>
      </footer>
    </StorybookShell>
  );
}
