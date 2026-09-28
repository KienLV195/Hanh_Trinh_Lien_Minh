import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import type { CharacterId } from "@htlm/game-domain";
import { createLevelFiveGame } from "./create-level-five-game";
import type { LevelFiveBridge, LevelFiveSceneState } from "./level-five-bridge";

export function LevelFivePhaserMount({ bridge, characterId, state }: { bridge: LevelFiveBridge; characterId: CharacterId; state: LevelFiveSceneState }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initialStateRef = useRef(state);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent || gameRef.current) return;
    gameRef.current = createLevelFiveGame(parent, bridge, characterId, initialStateRef.current);
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      bridge.emit("destroyed", {});
      parent.replaceChildren();
    };
  }, [bridge, characterId]);

  useEffect(() => { bridge.emit("setState", state); }, [bridge, state]);

  return <div className="level-five-canvas" ref={containerRef} aria-label="Hành trình vượt thử thách" />;
}
