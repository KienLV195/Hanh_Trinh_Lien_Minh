import type { ChallengeDefinition } from "@htlm/challenge-schema";

const common = {
  levelId: "level-1",
  contentVersion: "demo-v1",
  prompt: "CÂU HỎI DEMO 01",
  scoringProfileId: "normalized-default"
} as const;

export const challengeFixtures = [
  {
    ...common,
    id: "demo-single",
    type: "single_choice",
    options: [
      { id: "a", text: "Đáp án A" },
      { id: "b", text: "Đáp án B" }
    ],
    solution: { correctOptionId: "a" }
  },
  {
    ...common,
    id: "demo-multi",
    type: "multi_choice",
    options: [
      { id: "a", text: "Đáp án A" },
      { id: "b", text: "Đáp án B" }
    ],
    selection: { min: 1, max: 2 },
    solution: { correctOptionIds: ["a"], partialCredit: true }
  },
  {
    ...common,
    id: "demo-matching",
    type: "matching",
    leftItems: [{ id: "a1", text: "Item A1" }],
    rightItems: [{ id: "b1", text: "Item B1" }],
    solution: { pairs: [{ leftId: "a1", rightId: "b1" }] }
  },
  {
    ...common,
    id: "demo-ordering",
    type: "ordering",
    items: [
      { id: "one", text: "Bước 1" },
      { id: "two", text: "Bước 2" }
    ],
    solution: { orderedItemIds: ["one", "two"], partialCreditMode: "exact_position" }
  },
  {
    ...common,
    id: "demo-classification",
    type: "classification",
    categories: [
      { id: "group-a", label: "Nhóm A" },
      { id: "group-b", label: "Nhóm B" }
    ],
    items: [{ id: "item-a", text: "Item A" }],
    solution: { assignments: [{ itemId: "item-a", categoryId: "group-a" }] }
  },
  {
    ...common,
    id: "demo-target",
    type: "target_selection",
    targets: [
      { id: "target-a", label: "Mục tiêu A" },
      { id: "target-b", label: "Mục tiêu B" }
    ],
    selection: { min: 1, max: 1 },
    solution: { correctTargetIds: ["target-a"], partialCredit: false }
  }
] as const satisfies readonly ChallengeDefinition[];
