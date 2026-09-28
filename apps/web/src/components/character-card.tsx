import type { CSSProperties } from "react";
import type { Character, CharacterAccent } from "@htlm/game-domain";
import { CharacterVisual } from "./character-visual";
import "../character-selection.css";

const ACCENT_COLORS: Record<CharacterAccent, string> = {
  blue: "#3d78b8",
  green: "#43865a",
  indigo: "#6555a6",
  coral: "#c85f57",
  orange: "#d47b35",
  teal: "#27877f",
  berry: "#b14f78"
};

interface CharacterCardProps {
  character: Character;
  imageSrc?: string | undefined;
  selected?: boolean;
  claimedBy?: string | undefined;
  disabled?: boolean;
  pending?: boolean;
  onSelect?: () => void;
}

export function CharacterCard({
  character,
  imageSrc,
  selected = false,
  claimedBy,
  disabled = false,
  pending = false,
  onSelect
}: CharacterCardProps) {
  const style = {
    "--character-accent": ACCENT_COLORS[character.accent]
  } as CSSProperties;
  const homeLevel = character.homeLevelId.replace("level-", "");

  return (
    <article
      className={`character-card${selected ? " character-card--selected" : ""}${
        claimedBy && !selected ? " character-card--claimed" : ""
      }`}
      style={style}
    >
      <div className="character-card__art">
        <CharacterVisual characterId={character.id} imageSrc={imageSrc}
          state={selected ? "selected" : claimedBy ? "claimed" : "available"} />
      </div>
      <div className="character-card__copy">
        <span className="character-card__home">Sân nhà · Chặng {homeLevel}</span>
        <h3>{character.name}</h3>
        <p>{character.role}</p>
      </div>
      {onSelect ? (
        <>
        {claimedBy && <div className="character-card__owner"><span>{selected ? "Đội bạn đã chọn" : "Đã được chọn"}</span><strong>{claimedBy}</strong></div>}
        <button
          className="character-card__action"
          disabled={disabled || pending}
          onClick={onSelect}
          type="button"
        >
          {pending ? `Đang chọn ${character.name}…` : selected ? "Đã chọn" : claimedBy ? "Đã có đội" : `Chọn ${character.name}`}
        </button>
        </>
      ) : (
        <div className="character-card__owner">
          <span>{claimedBy ? "Đã chọn" : "Chưa có đội"}</span>
          <strong>{claimedBy ?? "—"}</strong>
        </div>
      )}
    </article>
  );
}
