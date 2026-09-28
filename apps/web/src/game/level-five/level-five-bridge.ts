import type { LevelFiveTeamMode } from "@htlm/protocol";

export interface LevelFiveSceneState {
  checkpointProgress: number;
  mode: LevelFiveTeamMode;
  /** Public server timestamp identifies each confirmed wrong attempt, including retries. */
  retryAvailableAt?: number | null;
}

type Events = {
  ready: { scene: string };
  checkpointReached: { checkpointIndex: number };
  finishReached: Record<string, never>;
  setState: LevelFiveSceneState;
  destroyed: Record<string, never>;
};

export class LevelFiveBridge {
  readonly #listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  on<TKey extends keyof Events>(
    event: TKey,
    listener: (payload: Events[TKey]) => void
  ): () => void {
    const listeners = this.#listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.#listeners.set(event, listeners);
    return () => listeners.delete(listener);
  }

  emit<TKey extends keyof Events>(event: TKey, payload: Events[TKey]): void {
    for (const listener of this.#listeners.get(event) ?? []) listener(payload as never);
  }

  clear(): void {
    this.#listeners.clear();
  }
}
