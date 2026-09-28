export interface LevelTwoChallenge {
  id: string;
  image: string;
  hint: string;
  keyword: string;
  acceptedAnswers: readonly string[];
  demo: true;
}

export const LEVEL_TWO_CHALLENGES = [
  {
    id: "demo-level-02-round-01",
    image: "/level-02/thoi-ky-qua-do.png",
    hint: "Đây là giai đoạn mà xã hội chưa hoàn toàn thoát khỏi những dấu vết của chế độ cũ, trong khi những yếu tố của xã hội mới đang từng bước hình thành.",
    keyword: "THỜI KỲ QUÁ ĐỘ",
    acceptedAnswers: ["thời kỳ quá độ", "thoi ky qua do"],
    demo: true
  },
  {
    id: "demo-level-02-round-02",
    image: "/level-02/phan-hoa-xa-hoi.png",
    hint: "Khi xã hội ngày càng xuất hiện nhiều nhóm người khác nhau về vị trí, nghề nghiệp, điều kiện sống và lợi ích, quá trình đó là…",
    keyword: "PHÂN HOÁ XÃ HỘI",
    acceptedAnswers: ["phân hoá xã hội", "phân hóa xã hội", "phan hoa xa hoi"],
    demo: true
  }
] as const satisfies readonly LevelTwoChallenge[];

export const LEVEL_TWO_TIMING = { introMs: 4_000, cooldownMs: 2_000 } as const;

export function createKeywordPattern(keyword: string): string {
  return keyword.normalize("NFC").split(" ").map((word) => Array.from(word).map(() => "_").join("")).join(" ");
}
