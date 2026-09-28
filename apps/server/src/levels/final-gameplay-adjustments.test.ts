import { CHARACTERS, CHARACTER_IDS } from "../../../../packages/game-domain/src/index.js";
import { describe, expect, it } from "vitest";
import { LEVEL_FOUR_TIMING } from "./level-four-content.js";
import { LEVEL_ONE_TIMING } from "./level-one-content.js";
import { LEVEL_SEVEN_TIMING } from "./level-seven-content.js";
import { LEVEL_SIX_TIMING } from "./level-six-content.js";
import { LEVEL_THREE_TIMING } from "./level-three-content.js";
import { LEVEL_TWO_TIMING } from "./level-two-content.js";

describe("final gameplay adjustments", () => {
  it("keeps stable character ids while exposing the new display names", () => {
    expect(CHARACTER_IDS).toEqual(["minh", "an", "khoa", "linh", "nam", "vy", "mai"]);
    expect(CHARACTERS.map(({ id, name }) => [id, name])).toEqual([
      ["minh", "TOÀN"],
      ["an", "KIÊN"],
      ["khoa", "ANH"],
      ["linh", "THƯ"],
      ["nam", "KHẢI"],
      ["vy", "CHÂU"],
      ["mai", "UYÊN"]
    ]);
  });

  it("uses the requested authoritative answer windows", () => {
    expect([
      LEVEL_ONE_TIMING.answerMs,
      LEVEL_TWO_TIMING.answerMs,
      LEVEL_THREE_TIMING.answerMs,
      LEVEL_FOUR_TIMING.answerMs,
      LEVEL_SIX_TIMING.answerMs
    ]).toEqual([30_000, 30_000, 30_000, 30_000, 30_000]);
    expect(LEVEL_SEVEN_TIMING.answerMs).toBe(45_000);
  });
});
