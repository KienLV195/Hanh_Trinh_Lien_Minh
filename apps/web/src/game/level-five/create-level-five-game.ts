import Phaser from "phaser";
import type { CharacterId } from "@htlm/game-domain";
import { LevelFivePlatformerScene } from "./level-five-platformer-scene";
import type { LevelFiveBridge, LevelFiveSceneState } from "./level-five-bridge";

export function createLevelFiveGame(
  parent: HTMLElement,
  bridge: LevelFiveBridge,
  characterId: CharacterId,
  state: LevelFiveSceneState
): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1_280,
    height: 720,
    backgroundColor: "#c9e1cf",
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 1_400 }, debug: false } },
    callbacks: {
      preBoot: (game) => {
        game.registry.set("levelFiveBridge", bridge);
        game.registry.set("levelFiveCharacterId", characterId);
        game.registry.set("levelFiveState", state);
      }
    },
    scene: [LevelFivePlatformerScene]
  });
}
