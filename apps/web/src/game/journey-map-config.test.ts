import { describe, expect, it } from "vitest";
import type { LevelId } from "@htlm/game-domain";
import { isAllianceCenterUnlocked } from "./journey-map-config";

describe("Alliance Center progression", () => {
  it("stays locked before all seven Alliance Pieces exist", () => {
    expect(isAllianceCenterUnlocked(["level-1", "level-2", "level-3", "level-4", "level-5", "level-6"])).toBe(false);
  });

  it("unlocks only after all seven Alliance Pieces exist", () => {
    const completed = Array.from({ length: 7 }, (_, index) => `level-${index + 1}` as LevelId);
    expect(isAllianceCenterUnlocked(completed)).toBe(true);
  });
});
