import type { CharacterId, LevelId } from "@htlm/game-domain";

export interface JourneyArea {
  levelId: LevelId;
  characterId: CharacterId;
  title: string;
  futureGame: string;
  x: number;
  y: number;
  accent: number;
  icon: string;
}

export const MAP_SIZE = { width: 3200, height: 1800 };
export const JOURNEY_AREAS: readonly JourneyArea[] = [
  { levelId: "level-1", characterId: "minh", title: "XƯỞNG CÔNG NGHỆ", futureGame: "Vòng quay tri thức", x: 450, y: 1160, accent: 0x497ca1, icon: "⚙" },
  { levelId: "level-2", characterId: "an", title: "ĐỒNG QUÊ XANH", futureGame: "Đuổi hình bắt chữ", x: 690, y: 490, accent: 0x567a46, icon: "♧" },
  { levelId: "level-3", characterId: "khoa", title: "KHÔNG GIAN TRI THỨC", futureGame: "Giải mã mảnh ghép", x: 1350, y: 400, accent: 0x756596, icon: "▤" },
  { levelId: "level-4", characterId: "linh", title: "PHỐ GIAO THƯƠNG", futureGame: "Chợ phiên kết nối", x: 1430, y: 1120, accent: 0xba6b59, icon: "▱" },
  { levelId: "level-5", characterId: "nam", title: "SÂN HỘI LÀNG", futureGame: "Hành trình vượt thử thách", x: 2080, y: 1140, accent: 0xb67b35, icon: "⚑" },
  { levelId: "level-6", characterId: "vy", title: "CAMPUS", futureGame: "Tiếp sức tri thức", x: 2120, y: 470, accent: 0x46867d, icon: "▤" },
  { levelId: "level-7", characterId: "mai", title: "LỄ HỘI CỘNG ĐỒNG", futureGame: "Ném còn liên minh", x: 2740, y: 430, accent: 0xa4607b, icon: "✧" }
];

export const JOURNEY_TRAIL = [
  [140, 1530], [450, 1380], [730, 1100], [690, 710], [940, 690],
  [1350, 620], [1590, 810], [1430, 1340], [1700, 1500],
  [2080, 1360], [2300, 1060], [2120, 690], [2450, 650],
  [2740, 650], [2950, 920], [2790, 1430]
] as const;

export function isAllianceCenterUnlocked(completedLevelIds: readonly LevelId[]): boolean {
  return JOURNEY_AREAS.every((area) => completedLevelIds.includes(area.levelId));
}
