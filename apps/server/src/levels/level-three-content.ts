export type LevelThreeRound =
  | {
      id: string;
      type: "parking";
      prompt: string;
      parkingSpaces: readonly string[];
      inputMode: "numeric";
      answer: string;
      acceptedAnswers: readonly string[];
      explanation: string;
      points: 50;
      demo: true;
    }
  | {
      id: string;
      type: "story";
      prompt: string;
      storyParagraphs: readonly string[];
      inputMode: "text";
      answer: string;
      acceptedAnswers: readonly string[];
      explanation: string;
      points: 50;
      demo: true;
    };

export const LEVEL_THREE_ROUNDS = [
  {
    id: "level-03-riddle-01",
    type: "parking",
    prompt: "DẤU ? LÀ SỐ BAO NHIÊU?",
    parkingSpaces: ["16", "06", "68", "88", "?", "98"],
    inputMode: "numeric",
    answer: "87",
    acceptedAnswers: ["87"],
    explanation: "Khi xoay góc nhìn 180°, dãy số trở thành 86 – 87 – 88 – 89 – 90 – 91.",
    points: 50,
    demo: true
  },
  {
    id: "level-03-riddle-02",
    type: "story",
    prompt: "NAM ĐI ĐÂU LÚC ĐẦU?",
    storyParagraphs: [
      "Một hôm Nam đi chợ với 50.000 đồng. Nam mua 2 cây xúc xích giá 7.000 đồng/cây, mua thêm 3 chai nước giá 5.000 đồng/chai, rồi đứng suy nghĩ 10 phút không biết có nên mua bánh tráng hay không.",
      "Cuối cùng Nam không mua bánh tráng, quay sang mua thêm 1 cây kem 8.000 đồng.",
      "Trên đường về Nam gặp Minh, Minh xin 1 miếng xúc xích nhưng Nam không cho vì ‘tao đói’."
    ],
    inputMode: "text",
    answer: "ĐI CHỢ",
    acceptedAnswers: ["đi chợ", "chợ"],
    explanation: "Đáp án nằm ngay ở câu đầu tiên.",
    points: 50,
    demo: true
  }
] as const satisfies readonly LevelThreeRound[];

export const LEVEL_THREE_TIMING = {
  introMs: 4_500,
  answerMs: 16_000
} as const;
