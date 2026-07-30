/**
 * Huy hiệu (achievement) — logic thuần, không truy vấn DB.
 * Mỗi nhóm là một chuỗi cột mốc tăng dần; mốc "mở" khi chỉ số tương ứng đạt ngưỡng.
 * Chỉ số lấy từ dữ liệu đã có (thẻ, tiến độ, nhật ký ôn) — xem lib/db/insights.ts.
 */

export type AchievementGroup =
  | "words"
  | "mastered"
  | "streak"
  | "reviews"
  | "days";

/** Các chỉ số dùng để xét huy hiệu. */
export interface AchievementMetrics {
  /** Tổng số thẻ đã tạo. */
  totalCards: number;
  /** Số thẻ đang ở mức "Đã thuộc". */
  masteredCards: number;
  /** Chuỗi ngày học hiện tại. */
  streak: number;
  /** Chuỗi ngày học dài nhất (trong phạm vi lịch sử đang lưu). */
  bestStreak: number;
  /** Tổng số lượt ôn (mọi kiểu ôn). */
  totalReviews: number;
  /** Số ngày khác nhau có ôn tập. */
  activeDays: number;
}

export const EMPTY_METRICS: AchievementMetrics = {
  totalCards: 0,
  masteredCards: 0,
  streak: 0,
  bestStreak: 0,
  totalReviews: 0,
  activeDays: 0,
};

export const GROUP_META: Record<
  AchievementGroup,
  { label: string; unit: string }
> = {
  words: { label: "Kho từ vựng", unit: "thẻ" },
  mastered: { label: "Từ đã thuộc", unit: "từ" },
  streak: { label: "Chuỗi ngày học", unit: "ngày" },
  reviews: { label: "Lượt ôn", unit: "lượt" },
  days: { label: "Ngày có học", unit: "ngày" },
};

interface Milestone {
  goal: number;
  icon: string;
  title: string;
}

/** Cột mốc từng nhóm, tăng dần — thứ tự trong mảng chính là bậc (tier). */
const MILESTONES: Record<AchievementGroup, Milestone[]> = {
  words: [
    { goal: 10, icon: "🌱", title: "Mầm từ vựng" },
    { goal: 50, icon: "📗", title: "Sổ tay nhỏ" },
    { goal: 100, icon: "📚", title: "Kệ sách riêng" },
    { goal: 250, icon: "🏛️", title: "Thư viện mini" },
    { goal: 500, icon: "🐘", title: "Từ điển sống" },
  ],
  mastered: [
    { goal: 10, icon: "✅", title: "Mười từ chắc" },
    { goal: 50, icon: "🎯", title: "Nhớ đúng đích" },
    { goal: 100, icon: "🏅", title: "Trăm từ vững" },
    { goal: 250, icon: "🧠", title: "Bộ nhớ thép" },
  ],
  streak: [
    { goal: 3, icon: "🔥", title: "Ba ngày liền" },
    { goal: 7, icon: "🗓️", title: "Tuần trọn vẹn" },
    { goal: 14, icon: "⚡", title: "Hai tuần bền" },
    { goal: 30, icon: "🏆", title: "Tháng không nghỉ" },
    { goal: 100, icon: "💎", title: "Trăm ngày kim cương" },
  ],
  reviews: [
    { goal: 50, icon: "🔁", title: "Ôn đều tay" },
    { goal: 200, icon: "💪", title: "Siêng ôn" },
    { goal: 500, icon: "🚀", title: "Tăng tốc" },
    { goal: 1000, icon: "🌟", title: "Nghìn lượt ôn" },
  ],
  days: [
    { goal: 7, icon: "📅", title: "Bảy ngày có mặt" },
    { goal: 30, icon: "🧭", title: "Ba mươi ngày" },
    { goal: 100, icon: "⛰️", title: "Trăm ngày học" },
    { goal: 365, icon: "👑", title: "Một năm đèn sách" },
  ],
};

const GROUP_ORDER: AchievementGroup[] = [
  "streak",
  "words",
  "mastered",
  "reviews",
  "days",
];

export interface AchievementDef {
  /** Khóa ổn định, vd "streak-7". */
  id: string;
  group: AchievementGroup;
  icon: string;
  title: string;
  /** Điều kiện đạt, viết cho người đọc. */
  detail: string;
  goal: number;
  /** Bậc trong nhóm (1..n) — dùng để tô màu. */
  tier: number;
}

export interface Achievement extends AchievementDef {
  /** Giá trị hiện tại của chỉ số tương ứng. */
  current: number;
  unlocked: boolean;
  /** Tiến độ tới mốc (0..100). */
  percent: number;
  /** Còn thiếu bao nhiêu để đạt (0 nếu đã đạt). */
  remaining: number;
}

function detailOf(group: AchievementGroup, goal: number): string {
  switch (group) {
    case "words":
      return `Tạo ${goal} thẻ từ vựng`;
    case "mastered":
      return `Đưa ${goal} từ lên mức "Đã thuộc"`;
    case "streak":
      return `Học liên tiếp ${goal} ngày`;
    case "reviews":
      return `Hoàn thành ${goal} lượt ôn`;
    case "days":
      return `Có ôn tập trong ${goal} ngày khác nhau`;
  }
}

/** Danh mục huy hiệu (cố định, không phụ thuộc dữ liệu). */
export const ACHIEVEMENTS: AchievementDef[] = GROUP_ORDER.flatMap((group) =>
  MILESTONES[group].map((m, i) => ({
    id: `${group}-${m.goal}`,
    group,
    icon: m.icon,
    title: m.title,
    detail: detailOf(group, m.goal),
    goal: m.goal,
    tier: i + 1,
  }))
);

/** Chỉ số tương ứng mỗi nhóm. Nhóm streak lấy chuỗi dài nhất (đạt rồi thì giữ). */
export function groupValue(
  group: AchievementGroup,
  m: AchievementMetrics
): number {
  switch (group) {
    case "words":
      return m.totalCards;
    case "mastered":
      return m.masteredCards;
    case "streak":
      return Math.max(m.streak, m.bestStreak);
    case "reviews":
      return m.totalReviews;
    case "days":
      return m.activeDays;
  }
}

/** Gắn tiến độ hiện tại vào từng huy hiệu. */
export function evaluateAchievements(m: AchievementMetrics): Achievement[] {
  return ACHIEVEMENTS.map((def) => {
    const current = groupValue(def.group, m);
    const unlocked = current >= def.goal;
    return {
      ...def,
      current,
      unlocked,
      percent: Math.min(100, Math.round((current / def.goal) * 100)),
      remaining: unlocked ? 0 : def.goal - current,
    };
  });
}

export interface AchievementSummary {
  unlocked: number;
  total: number;
  /** Mốc chưa đạt nhưng gần nhất (để hiện "sắp đạt"). */
  next: Achievement | null;
}

export function summarize(list: Achievement[]): AchievementSummary {
  const unlocked = list.filter((a) => a.unlocked);
  const locked = list.filter((a) => !a.unlocked);
  // "Gần nhất" = tiến độ % cao nhất; hòa thì lấy mốc nhỏ hơn.
  locked.sort((a, b) => b.percent - a.percent || a.goal - b.goal);
  return {
    unlocked: unlocked.length,
    total: list.length,
    next: locked[0] ?? null,
  };
}

export interface GroupProgress {
  group: AchievementGroup;
  label: string;
  unit: string;
  current: number;
  unlockedCount: number;
  totalCount: number;
  /** Mốc cao nhất đã đạt trong nhóm. */
  earned: Achievement | null;
  /** Mốc kế tiếp trong nhóm (null nếu đã đạt hết). */
  next: Achievement | null;
}

/** Gộp theo nhóm để hiển thị gọn: mốc cao nhất đã đạt + mốc kế tiếp. */
export function groupProgress(list: Achievement[]): GroupProgress[] {
  return GROUP_ORDER.map((group) => {
    const items = list
      .filter((a) => a.group === group)
      .sort((a, b) => a.goal - b.goal);
    const unlocked = items.filter((a) => a.unlocked);
    return {
      group,
      label: GROUP_META[group].label,
      unit: GROUP_META[group].unit,
      current: items[0]?.current ?? 0,
      unlockedCount: unlocked.length,
      totalCount: items.length,
      earned: unlocked[unlocked.length - 1] ?? null,
      next: items.find((a) => !a.unlocked) ?? null,
    };
  });
}
