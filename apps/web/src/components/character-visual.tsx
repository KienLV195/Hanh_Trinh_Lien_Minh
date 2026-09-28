import { useState } from "react";
import { CHARACTER_ASSETS, type CharacterPose } from "@htlm/asset-manifest";
import { CHARACTERS, type CharacterId } from "@htlm/game-domain";

export type CharacterVisualState = "idle" | "available" | "selected" | "claimed";

export function CharacterVisual({ characterId, pose = "master", state = "idle", size = "medium", imageSrc }: {
  characterId: CharacterId;
  pose?: CharacterPose;
  state?: CharacterVisualState;
  size?: "small" | "medium" | "large";
  imageSrc?: string | undefined;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const asset = CHARACTER_ASSETS[characterId];
  const source = imageSrc ?? asset.poses[pose]?.url ?? asset.poses.master?.url;
  const character = CHARACTERS.find((item) => item.id === characterId)!;
  return (
    <div className={`character-visual character-visual--${size} character-visual--${state} character-visual--${characterId}`}>
      <span className="character-visual__ground" aria-hidden="true" />
      {source && source !== failedSource ? (
        <img src={source} alt={`${character.name} — ${character.role}`} width={512} height={768}
          decoding="async" loading={size === "small" ? "lazy" : "eager"}
          onError={() => setFailedSource(source)} />
      ) : (
        <div className="character-visual__fallback" role="img" aria-label={`${character.name} — hình đại diện tạm`}>
          <span aria-hidden="true">{character.name.slice(0, 1)}</span>
        </div>
      )}
      {state === "selected" && <span className="character-visual__check" aria-label="Đã chọn">✓</span>}
    </div>
  );
}
