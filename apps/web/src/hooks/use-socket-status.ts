import { useSyncExternalStore } from "react";
import { socketStore } from "../realtime/socket-store";

export function useSocketStatus() {
  return useSyncExternalStore(
    socketStore.subscribe,
    socketStore.getSnapshot,
    socketStore.getSnapshot
  );
}
