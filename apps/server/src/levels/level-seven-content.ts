export interface LevelSevenRound {
  id: string;
  type: "pictureWord";
  prompt: string;
  imageUrls: readonly [string];
  answer: string;
  aliases: readonly string[];
  explanation: string;
  points: 30 | 40;
  demo: true;
}

export function createAnswerPattern(answer: string): string {
  return Array.from(answer.normalize("NFC"), (character) => {
    if (character === "-") return "-";
    if (/\s/u.test(character)) return " ";
    return "_";
  }).join("");
}

export const LEVEL_SEVEN_ROUNDS = [
  {
    id: "level-07-round-01",
    type: "pictureWord",
    prompt: "Nhìn hình và đoán cụm từ.",
    imageUrls: ["/level-07/doanket.jpg"],
    answer: "ĐOÀN KẾT",
    aliases: [],
    explanation: "",
    points: 30,
    demo: true
  },
  {
    id: "level-07-round-02",
    type: "pictureWord",
    prompt: "Nhìn hình và đoán cụm từ.",
    imageUrls: ["/level-07/cnhhdh.png"],
    answer: "CÔNG NGHIỆP HÓA - HIỆN ĐẠI HÓA",
    aliases: [
      "CÔNG NGHIỆP HÓA HIỆN ĐẠI HÓA",
      "CNH-HĐH",
      "CNH - HĐH",
      "CNH HĐH",
      "CNHHĐH",
      "CNH-HDH",
      "CNH HDH",
      "CNHHDH"
    ],
    explanation: "",
    points: 40,
    demo: true
  },
  {
    id: "level-07-round-03",
    type: "pictureWord",
    prompt: "Nhìn hình và đoán cụm từ.",
    imageUrls: ["/level-07/cocauxahoi.png"],
    answer: "CƠ CẤU XÃ HỘI",
    aliases: [],
    explanation: "",
    points: 30,
    demo: true
  }
] as const satisfies readonly LevelSevenRound[];

export const LEVEL_SEVEN_TIMING = { introMs: 4_500, answerMs: 45_000, revealMs: 3_000 } as const;
