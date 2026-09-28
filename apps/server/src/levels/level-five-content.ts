export interface LevelFiveQuestion {
  id: string;
  type: "singleChoice";
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  explanation: string;
  points: 20;
  demo: true;
}

export const LEVEL_FIVE_QUESTIONS = [
  { id: "demo-level-05-question-01", type: "singleChoice", prompt: "Trong thời kỳ quá độ, hai lực lượng có thể cùng tham gia một mục tiêu phát triển nhưng vẫn có những yêu cầu khác nhau về lợi ích.\nTrường hợp này nên được hiểu như thế nào?", options: [{ id: "a", text: "Sự khác biệt làm quan hệ liên minh không còn phù hợp." }, { id: "b", text: "Lợi ích chung chỉ hình thành sau khi lợi ích riêng bị xóa bỏ." }, { id: "c", text: "Sự khác biệt và hợp tác có thể cùng tồn tại trong cùng một quan hệ." }, { id: "d", text: "Quan hệ giữa hai lực lượng phải được xác định hoàn toàn theo lợi ích chung." }], correctOptionId: "c", explanation: "Sự tồn tại của lợi ích riêng không nhất thiết loại bỏ khả năng hợp tác trên những lợi ích và mục tiêu chung.", points: 20, demo: true },
  { id: "demo-level-05-question-02", type: "singleChoice", prompt: "Một chính sách tạo lợi ích rõ rệt cho một nhóm xã hội nhưng chưa đáp ứng đầy đủ lợi ích của nhóm khác. Nếu vẫn muốn duy trì sự phối hợp giữa các lực lượng, điều gì cần được đặt ra?", options: [{ id: "a", text: "Xác định một nhóm có lợi ích quan trọng hơn." }, { id: "b", text: "Loại bỏ chính sách để tránh mâu thuẫn." }, { id: "c", text: "Giữ nguyên lợi ích hiện tại." }, { id: "d", text: "Tìm điểm chung đồng thời giải quyết những khác biệt lợi ích có thể điều chỉnh." }], correctOptionId: "d", explanation: "Phối hợp không đòi hỏi xóa bỏ mọi khác biệt mà cần tìm điểm chung đồng thời xử lý những khác biệt có thể điều chỉnh.", points: 20, demo: true },
  { id: "demo-level-05-question-03", type: "singleChoice", prompt: "Lợi ích giữa các nhóm xã hội có thể mâu thuẫn ở một số vấn đề nhưng thống nhất ở những vấn đề khác.\nĐiều nào không nên được suy ra?", options: [{ id: "a", text: "Quan hệ giữa các lực lượng có thể vừa hợp tác vừa đấu tranh." }, { id: "b", text: "Khác biệt lợi ích không nhất thiết dẫn đến đối kháng hoàn toàn." }, { id: "c", text: "Lợi ích chung có thể tạo cơ sở cho sự liên minh." }, { id: "d", text: "Mọi khác biệt lợi ích phải được giải quyết trước khi có thể hợp tác." }], correctOptionId: "d", explanation: "Sự hợp tác vẫn có thể tồn tại khi các lực lượng còn những lợi ích khác nhau.", points: 20, demo: true },
  { id: "demo-level-05-question-04", type: "singleChoice", prompt: "Trong điều kiện cơ cấu xã hội – giai cấp ngày càng đa dạng, việc củng cố liên minh có ý nghĩa nào phù hợp hơn?", options: [{ id: "a", text: "Làm các nhóm xã hội trở nên đồng nhất." }, { id: "b", text: "Tạo khả năng phối hợp giữa các lực lượng dù vẫn tồn tại khác biệt." }, { id: "c", text: "Giảm vai trò của những nhóm có lợi ích riêng." }, { id: "d", text: "Chuyển mọi lợi ích riêng thành lợi ích chung." }], correctOptionId: "b", explanation: "Liên minh tạo khả năng phối hợp trên những điểm chung mà không đồng nghĩa xóa bỏ mọi khác biệt.", points: 20, demo: true },
  { id: "demo-level-05-question-05", type: "singleChoice", prompt: "Các nhóm xã hội có lợi ích riêng ngày càng rõ nhưng vẫn hợp tác trong những mục tiêu chung. Hai hiện tượng này nên được nhìn nhận như thế nào?", options: [{ id: "a", text: "Chỉ một trong hai có thể tồn tại." }, { id: "b", text: "Lợi ích riêng càng rõ thì khả năng hợp tác càng mất đi." }, { id: "c", text: "Sự khác biệt lợi ích và sự liên minh có thể tồn tại đồng thời." }, { id: "d", text: "Hợp tác chỉ là biểu hiện tạm thời." }], correctOptionId: "c", explanation: "Lợi ích riêng và khả năng phối hợp trên những mục tiêu chung có thể cùng tồn tại.", points: 20, demo: true }
] as const satisfies readonly LevelFiveQuestion[];

export const LEVEL_FIVE_TIMING = { introMs: 4_500, retryCooldownMs: 3_000 } as const;
