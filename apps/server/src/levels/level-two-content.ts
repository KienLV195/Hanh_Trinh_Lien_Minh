export interface LevelTwoChallenge {
  id: string;
  image: string;
  keyword: string;
  acceptedAnswers: readonly string[];
  demo: true;
}

export const LEVEL_TWO_CHALLENGES = [
  {
    id: "demo-level-02-round-01",
    image: "/map/farm.png",
    keyword: "đồng quê xanh",
    acceptedAnswers: ["đồng quê xanh", "dong que xanh"],
    demo: true
  },
  {
    id: "demo-level-02-round-02",
    image: "/map/knowledge.png",
    keyword: "tri thức",
    acceptedAnswers: ["tri thức", "tri thuc"],
    demo: true
  }
] as const satisfies readonly LevelTwoChallenge[];

export const LEVEL_TWO_TIMING = { introMs: 4_000, cooldownMs: 2_000 } as const;

export function createKeywordPattern(keyword: string): string {
  return keyword.normalize("NFC").split(" ").map((word) => Array.from(word).map(() => "_").join("")).join(" ");
}
