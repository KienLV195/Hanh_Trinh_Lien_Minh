import { describe, expect, it, vi } from "vitest";
import { GameBridge } from "./game-bridge";

describe("GameBridge", () => {
  it("subscribes and unsubscribes without retaining listeners", () => {
    const bridge = new GameBridge();
    const listener = vi.fn();
    const unsubscribe = bridge.on("phaser:ready", listener);
    bridge.emit("phaser:ready", { scene: "SkeletonScene" });
    unsubscribe();
    bridge.emit("phaser:ready", { scene: "SkeletonScene" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
