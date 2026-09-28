import { describe, expect, it, vi } from "vitest";
import { LevelFiveBridge } from "./level-five-bridge";
import { getLevelFiveSpawn, LEVEL_FIVE_CHECKPOINTS, LEVEL_FIVE_PLATFORMS } from "./level-five-map";
import { canTriggerCheckpoint, canTriggerFinish, isLevelFiveMovementLocked } from "./level-five-rules";

describe("Level 5 platformer client rules", () => {
  it("defines a playable map with five ordered checkpoints, varied platforms, and respawn anchors", () => {
    expect(LEVEL_FIVE_CHECKPOINTS.map((checkpoint) => checkpoint.index)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(LEVEL_FIVE_PLATFORMS.map((platform) => platform.y)).size).toBeGreaterThan(2);
    expect(getLevelFiveSpawn(0).x).toBeLessThan(getLevelFiveSpawn(1).x);
    expect(getLevelFiveSpawn(5)).toMatchObject({ x: LEVEL_FIVE_CHECKPOINTS[4]!.spawnX, y: LEVEL_FIVE_CHECKPOINTS[4]!.spawnY });
  });

  it("locks movement for questions, cooldown and finish waiting", () => {
    expect(isLevelFiveMovementLocked({ checkpointProgress: 0, mode: "platforming" }, false)).toBe(false);
    expect(isLevelFiveMovementLocked({ checkpointProgress: 0, mode: "question" }, false)).toBe(true);
    expect(isLevelFiveMovementLocked({ checkpointProgress: 0, mode: "retry_cooldown" }, false)).toBe(true);
    expect(isLevelFiveMovementLocked({ checkpointProgress: 5, mode: "finished" }, false)).toBe(true);
  });

  it("triggers only the next checkpoint and requires final platforming to finish", () => {
    expect(canTriggerCheckpoint({ checkpointProgress: 2, mode: "platforming" }, 3, false)).toBe(true);
    expect(canTriggerCheckpoint({ checkpointProgress: 2, mode: "platforming" }, 4, false)).toBe(false);
    expect(canTriggerCheckpoint({ checkpointProgress: 2, mode: "question" }, 3, false)).toBe(false);
    expect(canTriggerFinish({ checkpointProgress: 5, mode: "final_platforming" }, false)).toBe(true);
    expect(canTriggerFinish({ checkpointProgress: 4, mode: "platforming" }, false)).toBe(false);
  });

  it("cleans up bridge listeners", () => {
    const bridge = new LevelFiveBridge();
    const listener = vi.fn();
    const unsubscribe = bridge.on("checkpointReached", listener);
    bridge.emit("checkpointReached", { checkpointIndex: 1 });
    unsubscribe();
    bridge.emit("checkpointReached", { checkpointIndex: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
