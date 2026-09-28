import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";
import { createPhaserGame } from "./create-phaser-game";
import { GameBridge } from "./game-bridge";

export function PhaserMount({ mode = "smoke", bridge: externalBridge }: {
  mode?: "smoke" | "journey";
  bridge?: GameBridge;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const bridgeRef = useRef(externalBridge ?? new GameBridge());
  const [sceneStatus, setSceneStatus] = useState("Mounting canvas");

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent || gameRef.current) return;

    const bridge = bridgeRef.current;
    const unsubscribe = bridge.on("phaser:ready", ({ scene }) => setSceneStatus(`${scene} ready`));
    bridge.emit("shell:ready", { mountedAt: Date.now() });
    gameRef.current = createPhaserGame(parent, bridge, mode);

    return () => {
      unsubscribe();
      gameRef.current?.destroy(true);
      gameRef.current = null;
      bridge.emit("phaser:destroyed", { destroyedAt: Date.now() });
      bridge.clear();
      parent.replaceChildren();
    };
  }, [mode]);

  return (
    <section className="phaser-frame" aria-label={mode === "journey" ? "Bản đồ hành trình" : "Phaser integration test"}>
      <div ref={containerRef} className="phaser-canvas" />
      <p className="phaser-frame__status">{sceneStatus}</p>
    </section>
  );
}
