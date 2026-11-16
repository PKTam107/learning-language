/**
 * Thử thách hằng ngày (daily challenge) — logic thuần, không AI, không bảng mới.
 * Nhiệm vụ được sinh **tất định theo ngày**: cùng một ngày + cùng dữ liệu luôn ra
 * cùng bộ nhiệm vụ (không random), nên web và điện thoại hiện giống nhau.
 * Tiến độ đọc từ nhật ký ôn + thẻ tạo trong ngày (xem lib/db/insights.ts).
 */

import { dayKey } from "@/lib/streak";
import { DEFAULT_GOALS, type LearningGoals } from "@/lib/goals";

export interface ChallengeMetrics {
  /** Số lượt ôn hôm nay (mọi kiểu ôn). */
  reviewsToday: number;
  /** Số thẻ **khác nhau** đã ôn hôm nay. */
  distinctToday: number;
  /** Số thẻ được đánh giá "Đã thuộc" hôm nay. */
  masteredToday: number;
  /** Số thẻ tạo mới hôm nay. */
  newCardsToday: number;
  /** Số thẻ tới hạn ôn (tính lúc nạp trang). */
  dueToday: number;
  /** Tổng số thẻ trong tài khoản — dùng để co giãn mục tiêu. */
  totalCards: number;
}

export const EMPTY_CHALLENGE_METRICS: ChallengeMetrics = {
  reviewsToday: 0,
  distinctToday: 0,
  masteredToday: 0,
  newCardsToday: 0,
  dueToday: 0,
  totalCards: 0,
};

/** Gợi ý hành động cho từng nhiệm vụ (điều hướng khác nhau ở web/mobile). */
export type QuestAction = "study" | "create";

export interface Quest {
  id: string;
  icon: string;
  title: string;
  /** Diễn giải ngắn dưới tiêu đề. */
  hint: string;
  target: number;
  current: number;
  /** Đơn vị đếm: "lượt" / "từ" / "thẻ". */
  unit: string;
  done: boolean;
  action: QuestAction;
}

export interface DailyChallenge {
  /** Ngày của thử thách (yyyy-mm-dd) — tự đổi lúc 00:00 giờ địa phương. */
  day: string;
  quests: Quest[];
  doneCount: number;
  allDone: boolean;
  /** Tiến độ chung 0..100 (trung bình tiến độ các nhiệm vụ). */
  percent: number;
}

function quest(q: Omit<Quest, "done">): Quest {
  return { ...q, done: q.current >= q.target };
}

/**
 * Dựng thử thách của ngày `today` từ các chỉ số đã đo.
 * Kho thẻ trống → chỉ có một nhiệm vụ "thêm từ đầu tiên".
 */
export function buildDailyChallenge(
  m: ChallengeMetrics,
  today: Date = new Date(),
  goals: LearningGoals = DEFAULT_GOALS
): DailyChallenge {
  const day = dayKey(today);
  const quests: Quest[] = [];

  if (m.totalCards === 0) {
    quests.push(
      quest({
        id: "first-card",
        icon: "✨",
        title: "Thêm từ để bắt đầu",
        hint: "Tra một từ tiếng Anh và lưu vào bộ thẻ",
        target: 1,
        current: m.newCardsToday,
        unit: "thẻ",
        action: "create",
      })
    );
  } else {
    const reviews = Math.max(1, Math.min(goals.dailyGoal, m.totalCards));

    // 1. Một bước khởi động nhẹ trong ngày người dùng chọn học.
    quests.push(
      quest({
        id: "keep-streak",
        icon: "🔥",
        title: "Khởi động nhẹ",
        hint: "Ôn ít nhất 1 từ vào ngày bạn chọn học",
        target: 1,
        current: m.reviewsToday,
        unit: "lượt",
        action: "study",
      })
    );

    // 2. Mục tiêu từ khác nhau ổn định, không giảm khi hàng đợi rút ngắn.
    quests.push(
      quest({
        id: "review",
        icon: "🔁",
        title: `Ôn ${reviews} từ khác nhau`,
        hint:
          m.dueToday > 0
            ? `Hôm nay có ${m.dueToday} thẻ tới hạn`
            : "Ôn lại các từ đã học để nhớ lâu",
        target: reviews,
        current: m.distinctToday,
        unit: "từ",
        action: "study",
      })
    );

    // Khi tồn nhiều thẻ đến hạn, ưu tiên củng cố thay vì thêm việc mới.
    if (m.dueToday <= goals.dailyGoal * 2) {
      const newTarget = Math.max(1, Math.min(3, Math.floor(goals.dailyGoal / 5)));
      quests.push(quest({
        id: "new-words", icon: "🌱", title: `Thêm ${newTarget} từ mới`,
        hint: "Lưu từ bạn gặp trong lúc đọc hoặc nghe",
        target: newTarget, current: m.newCardsToday, unit: "từ", action: "create",
      }));
    }

  }

  const doneCount = quests.filter((q) => q.done).length;
  const percent = quests.length
    ? Math.round(
        (quests.reduce((sum, q) => sum + Math.min(1, q.current / q.target), 0) /
          quests.length) *
          100
      )
    : 0;

  return {
    day,
    quests,
    doneCount,
    allDone: doneCount === quests.length,
    percent,
  };
}
