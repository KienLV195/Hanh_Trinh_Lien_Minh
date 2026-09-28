import type { LevelFourSubmission } from "@htlm/protocol";

export interface LevelFourChallenge {
  id: string;
  type: "matching";
  prompt: string;
  leftItems: Array<{ id: string; text: string }>;
  rightItems: Array<{ id: string; text: string }>;
  solution: LevelFourSubmission;
  explanation: string;
  points: 25;
  demo: true;
}

const challenge = (id: string, prompt: string, left: string[], right: string[], pairs: number[], explanation: string): LevelFourChallenge => ({
  id, type: "matching", prompt,
  leftItems: left.map((text, index) => ({ id: `l${index + 1}`, text })),
  rightItems: right.map((text, index) => ({ id: `r${index + 1}`, text })),
  solution: { matches: pairs.map((rightIndex, index) => ({ leftId: `l${index + 1}`, rightId: `r${rightIndex}` })) },
  explanation, points: 25, demo: true
});

export const LEVEL_FOUR_CHALLENGES = [
  challenge(
    "demo-level-04-challenge-01",
    "Ghép mỗi hoạt động với phương diện phù hợp.",
    ["Mở rộng sản xuất, phối hợp các hoạt động kinh tế", "Tạo sự thống nhất về mục tiêu, củng cố đoàn kết", "Nâng cao đời sống, đào tạo, văn hóa và phúc lợi"],
    ["Kinh tế", "Chính trị", "Văn hóa – xã hội"],
    [1, 2, 3],
    "Các hoạt động kinh tế, chính trị và văn hóa – xã hội thể hiện những phương diện khác nhau của liên minh."
  ),
  challenge(
    "demo-level-04-challenge-02",
    "Ghép mỗi tình huống với nội dung được thể hiện rõ nhất.",
    ["Người sản xuất tiếp cận công nghệ, doanh nghiệp mở rộng sản xuất", "Tăng cường sự tham gia của các lực lượng vào đời sống chung", "Đào tạo nghề, nâng cao chất lượng nguồn nhân lực"],
    ["Nội dung kinh tế", "Nội dung chính trị", "Nội dung văn hóa – xã hội"],
    [1, 2, 3],
    "Mỗi tình huống thể hiện tương ứng nội dung kinh tế, chính trị hoặc văn hóa – xã hội của liên minh."
  ),
  challenge(
    "demo-level-04-challenge-03",
    "Ghép mục tiêu với phương diện liên minh phù hợp.",
    ["Phát triển sản xuất và phối hợp lợi ích kinh tế", "Tạo đồng thuận và củng cố khối đoàn kết", "Nâng cao đời sống và phát triển con người"],
    ["Kinh tế", "Chính trị", "Văn hóa – xã hội"],
    [1, 2, 3],
    "Các mục tiêu được gắn với phương diện kinh tế, chính trị và văn hóa – xã hội tương ứng."
  ),
  challenge(
    "demo-level-04-challenge-04",
    "Ghép biểu hiện với nội dung tương ứng.",
    ["Ứng dụng khoa học – công nghệ vào hoạt động sản xuất", "Phối hợp và tăng cường sự tham gia của các lực lượng xã hội", "Giải quyết việc làm, an sinh và tiếp cận phúc lợi xã hội"],
    ["Kinh tế", "Chính trị", "Văn hóa – xã hội"],
    [1, 2, 3],
    "Các biểu hiện lần lượt thuộc nội dung kinh tế, chính trị và văn hóa – xã hội."
  ),
] as const satisfies readonly LevelFourChallenge[];

export const LEVEL_FOUR_TIMING = { introMs: 4_500, answerMs: 13_000, revealMs: 3_000 } as const;
