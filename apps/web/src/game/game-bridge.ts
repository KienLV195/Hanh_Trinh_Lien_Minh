import type { LevelId } from "@htlm/game-domain";

export type GameBridgeEventMap = {
  "map:navigate": { target: LevelId | "overview" | "next" | "previous" | "alliance-center" };
  "map:focused": { levelId: LevelId | null };
  "map:centerFocused": { focused: boolean };
  "map:setState": { mode: "dev" | "host"; completedLevelIds: readonly LevelId[]; availableLevelId: LevelId | null };
  "shell:ready": { mountedAt: number };
  "phaser:ready": { scene: string };
  "phaser:destroyed": { destroyedAt: number };
};

type GameBridgeEvent = keyof GameBridgeEventMap;
type Listener<TEvent extends GameBridgeEvent> = (payload: GameBridgeEventMap[TEvent]) => void;

export class GameBridge {
  readonly #listeners = new Map<GameBridgeEvent, Set<(payload: never) => void>>();

  on<TEvent extends GameBridgeEvent>(event: TEvent, listener: Listener<TEvent>): () => void {
    const listeners = this.#listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(event, listeners);
    return () => listeners.delete(listener);
  }

  emit<TEvent extends GameBridgeEvent>(event: TEvent, payload: GameBridgeEventMap[TEvent]): void {
    for (const listener of this.#listeners.get(event) ?? []) listener(payload as never);
  }

  clear(): void {
    this.#listeners.clear();
  }
}
