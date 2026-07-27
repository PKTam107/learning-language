import { supabase } from "@/lib/supabase";

export interface StudyStats {
  /** Số ngày học liên tiếp tính đến hôm nay (nếu hôm nay chưa học thì tính đến hôm qua). */
  streak: number;
  /** Số lượt ôn trong hôm nay. */
  todayCount: number;
  /** Tổng lượt ôn trong 7 ngày gần nhất. */
  weekCount: number;
  /** Chuỗi 7 ngày gần nhất (cũ → mới) để vẽ biểu đồ mini. */
  series: { day: string; count: number }[];
}

export const EMPTY_STATS: StudyStats = {
  streak: 0,
  todayCount: 0,
  weekCount: 0,
  series: [],
};

/** Khóa ngày theo giờ địa phương: yyyy-mm-dd. */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Tính streak + thống kê ôn tập từ bảng review_events (60 ngày gần nhất).
 * Trả về EMPTY_STATS nếu chưa đăng nhập hoặc bảng chưa có (migration chưa chạy).
 */
export async function fetchStudyStats(): Promise<StudyStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_STATS;

  const since = new Date();
  since.setDate(since.getDate() - 59);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("review_events")
    .select("reviewed_at")
    .gte("reviewed_at", since.toISOString());
  if (error || !data) return EMPTY_STATS;

  // Đếm số lượt theo ngày địa phương.
  const byDay = new Map<string, number>();
  for (const row of data) {
    const key = dayKey(new Date(row.reviewed_at as string));
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const today = new Date();
  const todayKey = dayKey(today);
  const todayCount = byDay.get(todayKey) ?? 0;

  // Streak: đếm ngược từ hôm nay; nếu hôm nay chưa học thì bắt đầu từ hôm qua
  // (chuỗi vẫn còn "sống" cho tới hết ngày hôm nay).
  let streak = 0;
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  if (!byDay.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Chuỗi 7 ngày gần nhất (cũ → mới) + tổng tuần.
  const series: { day: string; count: number }[] = [];
  let weekCount = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const count = byDay.get(dayKey(d)) ?? 0;
    weekCount += count;
    series.push({ day: dayKey(d), count });
  }

  return { streak, todayCount, weekCount, series };
}
