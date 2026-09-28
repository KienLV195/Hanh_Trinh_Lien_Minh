import type { LevelFiveSceneState } from "./level-five-bridge";

export function isLevelFiveMovementLocked(state: LevelFiveSceneState, waitingForServer: boolean): boolean {
  return waitingForServer || state.mode === "question" || state.mode === "retry_cooldown" || state.mode === "finished";
}

export function canTriggerCheckpoint(state: LevelFiveSceneState, checkpointIndex: number, waitingForServer: boolean): boolean {
  return !waitingForServer && state.mode === "platforming" && checkpointIndex === state.checkpointProgress + 1;
}

export function canTriggerFinish(state: LevelFiveSceneState, waitingForServer: boolean): boolean {
  return !waitingForServer && state.mode === "final_platforming" && state.checkpointProgress === 5;
}
