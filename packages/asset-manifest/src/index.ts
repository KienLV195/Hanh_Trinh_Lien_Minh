import type { CharacterId, LevelId } from "@htlm/game-domain";

export interface AssetRef {
  key: string;
  url: string;
  kind: "image" | "atlas" | "audio" | "font" | "json";
}

export interface CharacterAssetManifest {
  characterId: CharacterId;
  portrait?: AssetRef;
  poses: Partial<Record<CharacterPose, AssetRef>>;
}

export type CharacterPose = "master" | "idle" | "thinking" | "action" | "happy" | "wrong";

// Future poses fall back to the master until their artwork is supplied.
export const CHARACTER_ASSETS: Record<CharacterId, CharacterAssetManifest> = Object.fromEntries(
  (["minh", "an", "khoa", "linh", "nam", "vy", "mai"] as const).map((characterId) => [
    characterId,
    {
      characterId,
      poses: {
        master: {
          key: `${characterId}-master`,
          url: `/characters/${characterId}-master.png`,
          kind: "image"
        }
      }
    }
  ])
) as Record<CharacterId, CharacterAssetManifest>;

export interface LevelAssetManifest {
  levelId: LevelId;
  namespace: string;
  layers: AssetRef[];
  props: AssetRef[];
}

export interface AudioAssetManifest {
  music: AssetRef[];
  soundEffects: AssetRef[];
}

export interface MapAssetManifest {
  layers: AssetRef[];
  landmarks: Partial<Record<LevelId, AssetRef>>;
}

export const JOURNEY_MAP_ASSETS: MapAssetManifest = {
  layers: [],
  landmarks: Object.fromEntries(
    ["workshop", "farm", "knowledge", "market", "field", "campus", "festival"].map((name, index) => [
      `level-${index + 1}`,
      { key: `map-${name}`, url: `/map/${name}.png`, kind: "image" }
    ])
  )
};

export interface GameAssetManifest {
  shared: AssetRef[];
  characters: CharacterAssetManifest[];
  levels: LevelAssetManifest[];
  audio: AudioAssetManifest;
  map: MapAssetManifest;
}
