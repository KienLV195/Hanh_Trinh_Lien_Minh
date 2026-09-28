import Phaser from "phaser";
import type { GameBridge } from "./game-bridge";
import { BootScene } from "./scenes/boot-scene";
import { CorePreloadScene } from "./scenes/core-preload-scene";
import { SkeletonScene } from "./scenes/skeleton-scene";
import { JourneyMapScene } from "./scenes/journey-map-scene";

export function createPhaserGame(parent: HTMLElement, bridge: GameBridge, mode: "smoke" | "journey" = "smoke"): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: "#173e3a",
    render: { antialias: true, pixelArt: false },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    callbacks: {
      preBoot: (currentGame) => {
        currentGame.registry.set("gameBridge", bridge);
        currentGame.registry.set("entryScene", mode === "journey" ? "JourneyMapScene" : "SkeletonScene");
      }
    },
    scene: [BootScene, CorePreloadScene, SkeletonScene, JourneyMapScene]
  });
  return game;
}
