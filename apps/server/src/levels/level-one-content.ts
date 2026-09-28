export interface LevelOneQuestion {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  points: 30 | 40;
  demo: true;
}

export const LEVEL_ONE_QUESTIONS = [
  {
    id: "demo-question-01",
    prompt: "Sự biến đổi của cơ cấu kinh tế gắn với sự biến đổi của cơ cấu xã hội – giai cấp. Một địa phương đẩy mạnh công nghiệp hóa, lao động nông nghiệp chuyển dần sang công nghiệp và dịch vụ, đồng thời nhu cầu lao động có trình độ chuyên môn tăng lên.\nNếu chỉ xem đây là sự thay đổi nghề nghiệp, điều gì dễ bị bỏ qua?",
    options: [
      { id: "a", text: "Sự thay đổi của cơ cấu kinh tế có liên quan đến sự thay đổi của cơ cấu xã hội – giai cấp." },
      { id: "b", text: "Sự chuyển dịch lao động chủ yếu làm thay đổi cơ cấu dân cư." },
      { id: "c", text: "Sự phát triển công nghiệp sẽ làm giảm vai trò của các lực lượng xã hội khác." },
      { id: "d", text: "Sự gia tăng lao động có chuyên môn sẽ làm cơ cấu xã hội dần ổn định." }
    ],
    correctOptionId: "a",
    explanation: "Sự chuyển dịch lao động không chỉ là thay đổi nghề nghiệp mà còn phản ánh mối liên hệ giữa biến đổi kinh tế và biến đổi cơ cấu xã hội – giai cấp.",
    points: 30,
    demo: true
  },
  {
    id: "demo-question-02",
    prompt: "Khi các nhóm xã hội có những khác biệt về thu nhập, điều kiện sản xuất và cơ hội phát triển, điều gì khiến những khác biệt này chưa đủ để phủ nhận khả năng liên kết giữa các lực lượng?",
    options: [
      { id: "a", text: "Các nhóm xã hội cuối cùng đều có cùng vị trí kinh tế." },
      { id: "b", text: "Những khác biệt về lợi ích chỉ mang tính tạm thời." },
      { id: "c", text: "Giữa các lực lượng vẫn có những lợi ích và mục tiêu có thể cùng hướng tới." },
      { id: "d", text: "Mọi khác biệt lợi ích đều có thể được giải quyết bằng chính sách kinh tế." }
    ],
    correctOptionId: "c",
    explanation: "Các lực lượng có thể tồn tại lợi ích riêng khác nhau nhưng vẫn có những lợi ích và mục tiêu chung tạo cơ sở cho sự phối hợp.",
    points: 30,
    demo: true
  },
  {
    id: "demo-question-03",
    prompt: "Một chính sách giúp một khu vực kinh tế tăng trưởng nhanh nhưng đồng thời gây khó khăn cho một bộ phận người sản xuất ở khu vực khác. Nếu đặt vấn đề trong quan hệ giữa các giai cấp, tầng lớp, hướng xử lý nào phù hợp hơn?",
    options: [
      { id: "a", text: "Duy trì chính sách vì lợi ích chung luôn quan trọng hơn lợi ích riêng." },
      { id: "b", text: "Điều chỉnh để vừa bảo đảm mục tiêu phát triển vừa xử lý những lợi ích bị ảnh hưởng." },
      { id: "c", text: "Hạn chế khu vực đang tăng trưởng để đưa các lợi ích về mức cân bằng." },
      { id: "d", text: "Tách vấn đề lợi ích xã hội khỏi quá trình phát triển kinh tế." }
    ],
    correctOptionId: "b",
    explanation: "Việc phối hợp lợi ích cần gắn mục tiêu phát triển chung với việc xem xét và xử lý những lợi ích khác nhau giữa các lực lượng.",
    points: 40,
    demo: true
  }
] as const satisfies readonly LevelOneQuestion[];

export const LEVEL_ONE_TIMING = {
  introMs: 4_500,
  answerMs: 12_000,
  revealMs: 3_000,
  transitionMs: 1_500
} as const;
