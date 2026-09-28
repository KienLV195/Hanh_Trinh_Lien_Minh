import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "./app.js";

let app: FastifyInstance | undefined;

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("server health", () => {
  it("returns useful development status", async () => {
    app = await buildServer({
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: 3001,
      WEB_ORIGIN: "http://localhost:5173",
      PROTOCOL_VERSION: "1.0.0"
    });

    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", protocolVersion: "1.0.0" });
  });
});
