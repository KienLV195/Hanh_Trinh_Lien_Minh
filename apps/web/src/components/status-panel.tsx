import { useServerHealth } from "../hooks/use-server-health";
import { useSocketStatus } from "../hooks/use-socket-status";
import { StatusItem } from "./status-item";

export function StatusPanel() {
  const server = useServerHealth();
  const socket = useSocketStatus();

  return (
    <section className="status-panel" aria-label="Development status">
      <StatusItem label="Frontend" value="Ready" tone="ready" />
      <StatusItem
        label="Server"
        value={server}
        tone={server === "online" ? "ready" : server === "checking" ? "waiting" : "error"}
      />
      <StatusItem
        label="Socket"
        value={socket.status}
        tone={
          socket.status === "connected"
            ? "ready"
            : socket.status === "connecting"
              ? "waiting"
              : "error"
        }
      />
    </section>
  );
}
