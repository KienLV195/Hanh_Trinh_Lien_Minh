import { z } from "zod";
import { PROTOCOL_VERSION } from "@htlm/protocol";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url().optional(),
  PROTOCOL_VERSION: z.literal(PROTOCOL_VERSION).default(PROTOCOL_VERSION),
  STATIC_DIR: z.string().optional()
});

export type ServerConfig = z.infer<typeof environmentSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return environmentSchema.parse(environment);
}
