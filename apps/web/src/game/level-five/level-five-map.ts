export const LEVEL_FIVE_WORLD = { width: 6_400, height: 720, floorY: 650 } as const;

export interface PlatformShape { x: number; y: number; width: number; height: number }
export interface CheckpointShape { index: 1 | 2 | 3 | 4 | 5; x: number; spawnX: number; spawnY: number }

export const LEVEL_FIVE_PLATFORMS: readonly PlatformShape[] = [
  { x: 0, y: 650, width: 820, height: 70 },
  { x: 930, y: 610, width: 430, height: 110 },
  { x: 1_450, y: 650, width: 650, height: 70 },
  { x: 2_190, y: 560, width: 340, height: 160 },
  { x: 2_620, y: 650, width: 760, height: 70 },
  { x: 3_470, y: 600, width: 360, height: 120 },
  { x: 3_920, y: 520, width: 280, height: 200 },
  { x: 4_300, y: 650, width: 720, height: 70 },
  { x: 5_120, y: 575, width: 380, height: 145 },
  { x: 5_590, y: 650, width: 810, height: 70 }
];

export const LEVEL_FIVE_CHECKPOINTS: readonly CheckpointShape[] = [
  { index: 1, x: 720, spawnX: 650, spawnY: 560 },
  { index: 2, x: 1_930, spawnX: 1_830, spawnY: 560 },
  { index: 3, x: 3_180, spawnX: 3_080, spawnY: 560 },
  { index: 4, x: 4_820, spawnX: 4_720, spawnY: 560 },
  { index: 5, x: 5_380, spawnX: 5_280, spawnY: 485 }
];

export const LEVEL_FIVE_FINISH_X = 6_180;
export const LEVEL_FIVE_START_SPAWN = { x: 120, y: 560 } as const;

export function getLevelFiveSpawn(checkpointProgress: number): { x: number; y: number } {
  if (checkpointProgress <= 0) return LEVEL_FIVE_START_SPAWN;
  const checkpoint = LEVEL_FIVE_CHECKPOINTS[Math.min(5, checkpointProgress) - 1];
  return checkpoint ? { x: checkpoint.spawnX, y: checkpoint.spawnY } : LEVEL_FIVE_START_SPAWN;
}
