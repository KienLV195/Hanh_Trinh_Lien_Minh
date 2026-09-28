import type { ChallengeType } from "@htlm/challenge-schema";
import { HOME_CHARACTER_BY_LEVEL, type CharacterId, type LevelId } from "@htlm/game-domain";

export interface LevelConfig {
  id: LevelId;
  title: string;
  homeCharacterId: CharacterId;
  durationSeconds: 70 | 80;
  allowedChallengeTypes: readonly ChallengeType[];
  assetNamespace: string;
  miniGameModuleId: string;
}

export const LEVELS = [
  {
    id: "level-1",
    title: "Vòng Quay Tri Thức",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-1"],
    durationSeconds: 70,
    allowedChallengeTypes: ["single_choice"],
    assetNamespace: "level-01-workshop",
    miniGameModuleId: "knowledge-wheel"
  },
  {
    id: "level-2",
    title: "Đuổi Hình Bắt Chữ",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-2"],
    durationSeconds: 80,
    allowedChallengeTypes: ["classification", "target_selection"],
    assetNamespace: "level-02-agriculture",
    miniGameModuleId: "knowledge-o-an-quan"
  },
  {
    id: "level-3",
    title: "Đố Vui",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-3"],
    durationSeconds: 80,
    allowedChallengeTypes: [],
    assetNamespace: "level-03-knowledge",
    miniGameModuleId: "riddle-quiz"
  },
  {
    id: "level-4",
    title: "Chợ Phiên Kết Nối",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-4"],
    durationSeconds: 80,
    allowedChallengeTypes: ["matching"],
    assetNamespace: "level-04-commerce",
    miniGameModuleId: "connection-market"
  },
  {
    id: "level-5",
    title: "Hành Trình Vượt Thử Thách",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-5"],
    durationSeconds: 70,
    allowedChallengeTypes: ["single_choice", "multi_choice"],
    assetNamespace: "level-05-community-field",
    miniGameModuleId: "checkpoint-platformer"
  },
  {
    id: "level-6",
    title: "Tiếp Sức Tri Thức",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-6"],
    durationSeconds: 80,
    allowedChallengeTypes: ["single_choice", "classification", "ordering"],
    assetNamespace: "level-06-campus",
    miniGameModuleId: "knowledge-relay"
  },
  {
    id: "level-7",
    title: "Nhìn Hình Đoán Chữ",
    homeCharacterId: HOME_CHARACTER_BY_LEVEL["level-7"],
    durationSeconds: 80,
    allowedChallengeTypes: ["picture_word"],
    assetNamespace: "level-07-festival",
    miniGameModuleId: "picture-word"
  }
] as const satisfies readonly LevelConfig[];
