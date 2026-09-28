export interface LevelSevenRound {
  id: string;
  type: "pictureWord";
  prompt: string;
  imageUrls: readonly string[];
  answer: string;
  aliases: readonly string[];
  explanation: string;
  points: 25;
  demo: true;
}

export const LEVEL_SEVEN_ROUNDS = [
  { id: "demo-level-07-round-01", type: "pictureWord", prompt: "Hai hình ảnh cùng gợi nhắc đến từ khóa nào?", imageUrls: ["/level-07/linked-hands.svg", "/level-07/community-circle.svg"], answer: "đoàn kết", aliases: ["doan ket"], explanation: "Đoàn kết là cùng chung sức, đồng lòng vì mục tiêu chung.", points: 25, demo: true },
  { id: "demo-level-07-round-02", type: "pictureWord", prompt: "Ghép ý nghĩa của hai hình để tìm từ khóa.", imageUrls: ["/level-07/puzzle-pieces.svg", "/level-07/linked-hands.svg"], answer: "hợp tác", aliases: ["hop tac"], explanation: "Hợp tác là phối hợp khả năng và nguồn lực để cùng hoàn thành công việc.", points: 25, demo: true },
  { id: "demo-level-07-round-03", type: "pictureWord", prompt: "Hình ảnh này thể hiện phẩm chất nào?", imageUrls: ["/level-07/checklist.svg"], answer: "trách nhiệm", aliases: ["trach nhiem"], explanation: "Trách nhiệm thể hiện ở việc chủ động hoàn thành và chịu trách nhiệm về nhiệm vụ của mình.", points: 25, demo: true },
  { id: "demo-level-07-round-04", type: "pictureWord", prompt: "Hai hình ảnh cùng nói đến hành động nào?", imageUrls: ["/level-07/open-book.svg", "/level-07/giving-hands.svg"], answer: "chia sẻ", aliases: ["chia se"], explanation: "Chia sẻ tri thức và sự hỗ trợ giúp cộng đồng cùng tiến bộ.", points: 25, demo: true }
] as const satisfies readonly LevelSevenRound[];

export const LEVEL_SEVEN_TIMING = { introMs: 4_500, answerMs: 13_000, revealMs: 3_000 } as const;
