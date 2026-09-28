import { useEffect, useState } from "react";
import { environment } from "../config/environment";

export type ServerHealth = "checking" | "online" | "offline";

export function useServerHealth(): ServerHealth {
  const [health, setHealth] = useState<ServerHealth>("checking");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${environment.serverUrl}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Health check failed");
        setHealth("online");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setHealth("offline");
      });
    return () => controller.abort();
  }, []);

  return health;
}
