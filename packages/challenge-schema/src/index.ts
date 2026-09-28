import { z } from "zod";

export const CHALLENGE_TYPES = [
  "single_choice",
  "multi_choice",
  "matching",
  "ordering",
  "classification",
  "target_selection",
  "picture_word"
] as const;

export const challengeTypeSchema = z.enum(CHALLENGE_TYPES);
export type ChallengeType = z.infer<typeof challengeTypeSchema>;

const textItemSchema = z.object({ id: z.string().min(1), text: z.string().min(1) });
const baseShape = {
  id: z.string().min(1),
  levelId: z.string().regex(/^level-[1-7]$/),
  contentVersion: z.string().min(1),
  prompt: z.string().min(1),
  instruction: z.string().min(1).optional(),
  timeLimitMs: z.number().int().positive().optional(),
  scoringProfileId: z.string().min(1)
};

export const singleChoiceChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("single_choice"),
  options: z.array(textItemSchema).min(2),
  solution: z.object({ correctOptionId: z.string().min(1) })
});

export const multiChoiceChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("multi_choice"),
  options: z.array(textItemSchema).min(2),
  selection: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() }),
  solution: z.object({
    correctOptionIds: z.array(z.string().min(1)).min(1),
    partialCredit: z.boolean()
  })
});

export const matchingChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("matching"),
  leftItems: z.array(textItemSchema).min(1),
  rightItems: z.array(textItemSchema).min(1),
  solution: z.object({
    pairs: z.array(z.object({ leftId: z.string().min(1), rightId: z.string().min(1) })).min(1)
  })
});

export const orderingChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("ordering"),
  items: z.array(textItemSchema).min(2),
  solution: z.object({
    orderedItemIds: z.array(z.string().min(1)).min(2),
    partialCreditMode: z.enum(["exact_position", "relative_order"])
  })
});

export const classificationChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("classification"),
  categories: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
  items: z.array(textItemSchema).min(1),
  solution: z.object({
    assignments: z
      .array(z.object({ itemId: z.string().min(1), categoryId: z.string().min(1) }))
      .min(1)
  })
});

export const targetSelectionChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("target_selection"),
  targets: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        visualKey: z.string().optional()
      })
    )
    .min(2),
  selection: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() }),
  solution: z.object({
    correctTargetIds: z.array(z.string().min(1)).min(1),
    partialCredit: z.boolean()
  })
});

export const pictureWordChallengeSchema = z.object({
  ...baseShape,
  type: z.literal("picture_word"),
  imageUrls: z.array(z.string().min(1)).min(1).max(2),
  solution: z.object({ answer: z.string().min(1), aliases: z.array(z.string().min(1)).default([]) })
});

export const challengeDefinitionSchema = z.discriminatedUnion("type", [
  singleChoiceChallengeSchema,
  multiChoiceChallengeSchema,
  matchingChallengeSchema,
  orderingChallengeSchema,
  classificationChallengeSchema,
  targetSelectionChallengeSchema,
  pictureWordChallengeSchema
]);
export type ChallengeDefinition = z.infer<typeof challengeDefinitionSchema>;

const publicBaseShape = baseShape;
export const publicChallengePayloadSchema = z.discriminatedUnion("type", [
  z.object({
    ...publicBaseShape,
    type: z.literal("single_choice"),
    options: z.array(textItemSchema).min(2)
  }),
  z.object({
    ...publicBaseShape,
    type: z.literal("multi_choice"),
    options: z.array(textItemSchema).min(2),
    selection: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() })
  }),
  z.object({
    ...publicBaseShape,
    type: z.literal("matching"),
    leftItems: z.array(textItemSchema).min(1),
    rightItems: z.array(textItemSchema).min(1)
  }),
  z.object({
    ...publicBaseShape,
    type: z.literal("ordering"),
    items: z.array(textItemSchema).min(2)
  }),
  z.object({
    ...publicBaseShape,
    type: z.literal("classification"),
    categories: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
    items: z.array(textItemSchema).min(1)
  }),
  z.object({
    ...publicBaseShape,
    type: z.literal("target_selection"),
    targets: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          visualKey: z.string().optional()
        })
      )
      .min(2),
    selection: z.object({ min: z.number().int().nonnegative(), max: z.number().int().positive() })
  }),
  z.object({
    ...publicBaseShape,
    type: z.literal("picture_word"),
    imageUrls: z.array(z.string().min(1)).min(1).max(2)
  })
]);
export type PublicChallengePayload = z.infer<typeof publicChallengePayloadSchema>;

export const challengeSubmissionSchema = z.object({
  challengeId: z.string().min(1),
  value: z.union([
    z.string(),
    z.array(z.string()),
    z.array(z.object({ leftId: z.string(), rightId: z.string() })),
    z.array(z.object({ itemId: z.string(), categoryId: z.string() }))
  ])
});
export type ChallengeSubmission = z.infer<typeof challengeSubmissionSchema>;

export interface EvaluationResult {
  challengeId: string;
  correctness: number;
  isComplete: boolean;
}

export interface RevealPayload {
  challengeId: string;
  type: ChallengeType;
  solution: ChallengeDefinition["solution"];
  evaluation?: EvaluationResult;
}

export interface ChallengeProvider {
  getLevelChallenges(input: { packId: string; levelId: string }): Promise<ChallengeDefinition[]>;
  toPublicPayload(challenge: ChallengeDefinition): PublicChallengePayload;
  evaluate(challenge: ChallengeDefinition, submission: ChallengeSubmission): EvaluationResult;
  toRevealPayload(challenge: ChallengeDefinition, evaluation?: EvaluationResult): RevealPayload;
}

export function toPublicChallengePayload(challenge: ChallengeDefinition): PublicChallengePayload {
  const common = {
    id: challenge.id,
    levelId: challenge.levelId,
    contentVersion: challenge.contentVersion,
    prompt: challenge.prompt,
    scoringProfileId: challenge.scoringProfileId,
    ...(challenge.instruction === undefined ? {} : { instruction: challenge.instruction }),
    ...(challenge.timeLimitMs === undefined ? {} : { timeLimitMs: challenge.timeLimitMs })
  };

  switch (challenge.type) {
    case "single_choice":
      return { ...common, type: challenge.type, options: challenge.options };
    case "multi_choice":
      return {
        ...common,
        type: challenge.type,
        options: challenge.options,
        selection: challenge.selection
      };
    case "matching":
      return {
        ...common,
        type: challenge.type,
        leftItems: challenge.leftItems,
        rightItems: challenge.rightItems
      };
    case "ordering":
      return { ...common, type: challenge.type, items: challenge.items };
    case "classification":
      return {
        ...common,
        type: challenge.type,
        categories: challenge.categories,
        items: challenge.items
      };
    case "target_selection":
      return {
        ...common,
        type: challenge.type,
        targets: challenge.targets,
        selection: challenge.selection
      };
    case "picture_word":
      return { ...common, type: challenge.type, imageUrls: challenge.imageUrls };
  }
}
