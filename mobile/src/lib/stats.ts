import { supabase } from "@/lib/supabase";
import {
  buildSeries,
  countByDay,
  currentStreak,
  dayKey,
  startOfDay,
  type DayCount,
} from "@/lib/streak";

export interface StudyStats {
  /** Số ngày học liên tiếp tính đến hôm nay (nếu hôm nay chưa học thì tính đến hôm qua). */
  streak: number;
  /** Số lượt ôn trong hôm nay. */
  todayCount: number;
  /** Tổng lượt ôn trong 7 ngày gần nhất. */
  weekCount: number;
  /** Chuỗi 7 ngày gần nhất (cũ → mới) để vẽ biểu đồ mini. */
  series: DayCount[];
}

export const EMPTY_STATS: StudyStats = {
  streak: 0,
  todayCount: 0,
  weekCount: 0,
  series: [],
};

/**
 * Tính streak + thống kê ôn tập từ bảng review_events (60 ngày gần nhất).
 * Trả về EMPTY_STATS nếu chưa đăng nhập hoặc bảng chưa có (migration chưa chạy).
 */
export async function fetchStudyStats(): Promise<StudyStats> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_STATS;

  const since = startOfDay();
  since.setDate(since.getDate() - 59);

  const { data, error } = await supabase
    .from("review_events")
    .select("reviewed_at")
    .gte("reviewed_at", since.toISOString());
  if (error || !data) return EMPTY_STATS;

  const today = new Date();
  const byDay = countByDay(data.map((r) => r.reviewed_at as string));
  const series = buildSeries(byDay, 7, today);

  return {
    streak: currentStreak(byDay, today),
    todayCount: byDay.get(dayKey(today)) ?? 0,
    weekCount: series.reduce((sum, d) => sum + d.count, 0),
    series,
  };
}
