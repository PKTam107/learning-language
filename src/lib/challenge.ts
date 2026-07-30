/**
 * Thử thách hằng ngày (daily challenge) — logic thuần, không AI, không bảng mới.
 * Nhiệm vụ được sinh **tất định theo ngày**: cùng một ngày + cùng dữ liệu luôn ra
 * cùng bộ nhiệm vụ (không random), nên web và điện thoại hiện giống nhau.
 * Tiến độ đọc từ nhật ký ôn + thẻ tạo trong ngày (xem lib/db/insights.ts).
 */

import { dayKey, fromDayKey } from "@/lib/streak";

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Số ngày kể từ 1970-01-01 — hạt giống để đổi nhiệm vụ mỗi ngày. */
function dayIndex(day: string): number {
  return Math.floor(fromDayKey(day).getTime() / 86_400_000);
}

/**
 * Mục tiêu số lượt ôn: ưu tiên số thẻ tới hạn, kẹp trong [5, 20] và không vượt
 * số thẻ đang có (kho thẻ nhỏ thì mục tiêu nhỏ).
 */
function reviewTarget(m: ChallengeMetrics): number {
  const base = m.dueToday > 0 ? m.dueToday : 10;
  return Math.max(1, Math.min(clamp(base, 5, 20), m.totalCards));
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
  today: Date = new Date()
): DailyChallenge {
  const day = dayKey(today);
  const quests: Quest[] = [];

  if (m.totalCards === 0) {
    quests.push(
      quest({
        id: "first-card",
        icon: "✨",
        title: "Thêm từ đầu tiên",
        hint: "Tra một từ tiếng Anh và lưu vào bộ thẻ",
        target: 1,
        current: m.newCardsToday,
        unit: "thẻ",
        action: "create",
      })
    );
  } else {
    const reviews = reviewTarget(m);

    // 1. Giữ chuỗi — nhiệm vụ nhẹ nhất, luôn có.
    quests.push(
      quest({
        id: "keep-streak",
        icon: "🔥",
        title: "Giữ chuỗi ngày học",
        hint: "Ôn ít nhất 1 lượt trong hôm nay",
        target: 1,
        current: m.reviewsToday,
        unit: "lượt",
        action: "study",
      })
    );

    // 2. Ôn đủ số lượt của ngày.
    quests.push(
      quest({
        id: "review",
        icon: "🔁",
        title: `Ôn ${reviews} lượt`,
        hint:
          m.dueToday > 0
            ? `Hôm nay có ${m.dueToday} thẻ tới hạn`
            : "Ôn lại các từ đã học để nhớ lâu",
        target: reviews,
        current: m.reviewsToday,
        unit: "lượt",
        action: "study",
      })
    );

    // 3. Học từ mới — 5 từ mỗi 3 ngày, còn lại 3 từ.
    const newTarget = dayIndex(day) % 3 === 0 ? 5 : 3;
    quests.push(
      quest({
        id: "new-words",
        icon: "🌱",
        title: `Thêm ${newTarget} từ mới`,
        hint: "Tra từ mới bằng nút “+” và lưu vào bộ thẻ",
        target: newTarget,
        current: m.newCardsToday,
        unit: "từ",
        action: "create",
      })
    );

    // 4. Nhiệm vụ luân phiên theo ngày — đổi khẩu vị, vẫn dùng dữ liệu có sẵn.
    const rotation = dayIndex(day) % 3;
    if (rotation === 0) {
      const target = Math.max(1, Math.min(clamp(Math.round(reviews / 4), 2, 5), m.totalCards));
      quests.push(
        quest({
          id: "mastered",
          icon: "🏅",
          title: `Chốt ${target} từ "Đã thuộc"`,
          hint: 'Đánh giá "Đã thuộc" cho những từ bạn nhớ chắc',
          target,
          current: m.masteredToday,
          unit: "từ",
          action: "study",
        })
      );
    } else if (rotation === 1) {
      const target = Math.max(1, Math.min(clamp(Math.round(reviews / 2), 5, 15), m.totalCards));
      quests.push(
        quest({
          id: "variety",
          icon: "🎲",
          title: `Ôn ${target} từ khác nhau`,
          hint: "Đi rộng thay vì lặp lại vài từ",
          target,
          current: m.distinctToday,
          unit: "từ",
          action: "study",
        })
      );
    } else {
      const target = Math.max(1, Math.min(m.dueToday > 0 ? m.dueToday : 8, 30));
      quests.push(
        quest({
          id: "clear-due",
          icon: "🧹",
          title: `Dọn ${target} thẻ tới hạn`,
          hint: "Ôn hết hàng đợi hôm nay để lịch không dồn lại",
          target,
          current: m.distinctToday,
          unit: "thẻ",
          action: "study",
        })
      );
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
