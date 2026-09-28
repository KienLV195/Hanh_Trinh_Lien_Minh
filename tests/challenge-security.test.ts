import { describe, expect, it } from "vitest";
import { challengeFixtures } from "../packages/test-fixtures/src/index";
import {
  challengeDefinitionSchema,
  publicChallengePayloadSchema,
  toPublicChallengePayload
} from "../packages/challenge-schema/src/index";

const forbiddenSolutionKeys = [
  "solution",
  "correctOptionId",
  "correctOptionIds",
  "correctTargetIds",
  "pairs",
  "orderedItemIds",
  "assignments"
];

describe("challenge security boundary", () => {
  it.each(challengeFixtures)("validates $type challenge definitions", (challenge) => {
    expect(challengeDefinitionSchema.safeParse(challenge).success).toBe(true);
  });

  it.each(challengeFixtures)("strips every solution field from $type", (challenge) => {
    const publicPayload = toPublicChallengePayload(challenge);
    const serialized = JSON.stringify(publicPayload);

    expect(publicChallengePayloadSchema.safeParse(publicPayload).success).toBe(true);
    for (const forbiddenKey of forbiddenSolutionKeys) {
      expect(serialized).not.toContain(`"${forbiddenKey}"`);
    }
  });
});
