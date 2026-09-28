import { describe, expect, it } from "vitest";
import { commandEnvelopeSchema, PROTOCOL_VERSION } from "./index.js";

describe("protocol envelope", () => {
  it("accepts a valid command envelope", () => {
    const result = commandEnvelopeSchema.safeParse({
      protocolVersion: PROTOCOL_VERSION,
      type: "system.ping",
      commandId: "command-1",
      sessionId: "session-1",
      payload: { clientTime: 1 }
    });

    expect(result.success).toBe(true);
  });

  it("rejects an incompatible protocol version", () => {
    const result = commandEnvelopeSchema.safeParse({
      protocolVersion: "0.0.1",
      type: "system.ping",
      commandId: "command-1",
      sessionId: "session-1",
      payload: {}
    });

    expect(result.success).toBe(false);
  });
});
