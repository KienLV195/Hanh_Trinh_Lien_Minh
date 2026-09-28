export const CHARACTER_IDS = ["minh", "an", "khoa", "linh", "nam", "vy", "mai"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

export type TeamId = string;
export type RoomId = string;
export type LevelId = `level-${1 | 2 | 3 | 4 | 5 | 6 | 7}`;
export const LEVEL_IDS = ["level-1", "level-2", "level-3", "level-4", "level-5", "level-6", "level-7"] as const satisfies readonly LevelId[];
export const HOME_CHARACTER_BY_LEVEL = {
  "level-1": "minh", "level-2": "an", "level-3": "khoa", "level-4": "linh",
  "level-5": "nam", "level-6": "vy", "level-7": "mai"
} as const satisfies Record<LevelId, CharacterId>;
export const MAX_LEVEL_BASE_SCORE = 100;
export const MAX_THEORETICAL_GAME_SCORE = 4_600;

export function getHomeCharacterId(levelId: LevelId): CharacterId {
  return HOME_CHARACTER_BY_LEVEL[levelId];
}

export type GamePhase =
  | "boot"
  | "lobby"
  | "character_selection"
  | "character_selection_complete"
  | "level_1"
  | "level_2"
  | "level_3"
  | "level_4"
  | "level_5"
  | "level_6"
  | "level_7"
  | "ready"
  | "alliance_center"
  | "final_results"
  | "running"
  | "paused"
  | "completed";

export type CharacterAccent = "blue" | "green" | "indigo" | "coral" | "orange" | "teal" | "berry";

export interface Character {
  id: CharacterId;
  name: string;
  role: string;
  gender: "male" | "female";
  accent: CharacterAccent;
  homeLevelId: LevelId;
  shortDescription: string;
  educationalNote?: string;
}

export interface Team {
  id: TeamId;
  name: string;
  characterId: CharacterId | null;
  connected: boolean;
  ready: boolean;
}

export interface AlliancePiece {
  id: `piece-${1 | 2 | 3 | 4 | 5 | 6 | 7}`;
  characterId: CharacterId;
  accent: CharacterAccent;
  collected: boolean;
}

export interface LevelScoreSummary {
  levelId: LevelId;
  baseScore: number;
  multiplier: 1 | 2;
  awardedScore: number;
}

export interface TeamScoreSummary {
  teamId: TeamId;
  total: number;
  levels: LevelScoreSummary[];
}

export const CHARACTERS = [
  {
    id: "minh",
    name: "MINH",
    role: "Công nhân",
    gender: "male",
    accent: "blue",
    homeLevelId: "level-1",
    shortDescription: "Công nhân kỹ thuật – công nghệ trẻ."
  },
  {
    id: "an",
    name: "AN",
    role: "Nông dân",
    gender: "male",
    accent: "green",
    homeLevelId: "level-2",
    shortDescription: "Người trẻ gắn với nông nghiệp hiện đại."
  },
  {
    id: "khoa",
    name: "KHOA",
    role: "Trí thức",
    gender: "male",
    accent: "indigo",
    homeLevelId: "level-3",
    shortDescription: "Người trẻ ham tìm hiểu và nghiên cứu."
  },
  {
    id: "linh",
    name: "LINH",
    role: "Doanh nhân",
    gender: "female",
    accent: "coral",
    homeLevelId: "level-4",
    shortDescription: "Người trẻ linh hoạt trong môi trường kinh doanh."
  },
  {
    id: "nam",
    name: "NAM",
    role: "Thanh niên",
    gender: "male",
    accent: "orange",
    homeLevelId: "level-5",
    shortDescription: "Người trẻ năng động và nhiệt tình với hoạt động cộng đồng."
  },
  {
    id: "vy",
    name: "VY",
    role: "Sinh viên",
    gender: "female",
    accent: "teal",
    homeLevelId: "level-6",
    shortDescription: "Sinh viên trẻ ham học hỏi và khám phá.",
    educationalNote: "Nhân vật gameplay gắn với nội dung trách nhiệm sinh viên."
  },
  {
    id: "mai",
    name: "MAI",
    role: "Phụ nữ",
    gender: "female",
    accent: "berry",
    homeLevelId: "level-7",
    shortDescription: "Người trẻ bản lĩnh, gần gũi và tích cực trong đời sống cộng đồng."
  }
] as const satisfies readonly Character[];

export function isCharacterId(value: string): value is CharacterId {
  return CHARACTER_IDS.includes(value as CharacterId);
}
