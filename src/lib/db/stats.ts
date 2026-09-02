"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";
import { fetchAllRows } from "@/lib/db/paginate";
import {
  buildSeries,
  countByDay,
  currentStreak,
  dayKey,
  startOfDay,
  type DayCount,
} from "@/lib/streak";

const supabase = () => createClient();

/**
 * Số thẻ đến hạn ôn trên toàn tài khoản, đếm **phía server** (head: true →
 * không tải dòng nào).
 *
 * "Đến hạn" = chưa có dòng progress HOẶC next_due_at đã qua (xem `isDue`), nên
 * đếm ngược: tổng thẻ − số thẻ còn hạn ở tương lai. Dùng index
 * card_progress_user_due (migration 0008).
 */
export async function fetchDueCount(): Promise<number> {
  const sb = supabase();
  const [totalRes, notDueRes] = await Promise.all([
    sb.from("cards").select("id", { count: "exact", head: true }),
    sb
      .from("card_progress")
      .select("id", { count: "exact", head: true })
      .gt("next_due_at", new Date().toISOString()),
  ]);
  return Math.max(0, (totalRes.count ?? 0) - (notDueRes.count ?? 0));
}

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
  const userId = await currentUserId();
  if (!userId) return EMPTY_STATS;

  const since = startOfDay();
  since.setDate(since.getDate() - 59);

  // Người ôn nhiều thì 60 ngày dễ vượt 1000 lượt — không phân trang là streak
  // bị tính thiếu (mất hẳn những ngày cũ nhất trong cửa sổ).
  let rows: { reviewed_at: string }[];
  try {
    rows = await fetchAllRows<{ reviewed_at: string }>((from, to) =>
      supabase()
        .from("review_events")
        .select("reviewed_at")
        .gte("reviewed_at", since.toISOString())
        .order("id")
        .range(from, to)
    );
  } catch {
    return EMPTY_STATS; // bảng chưa migrate → coi như chưa có lịch sử
  }

  const today = new Date();
  const byDay = countByDay(rows.map((r) => r.reviewed_at));
  const series = buildSeries(byDay, 7, today);

  return {
    streak: currentStreak(byDay, today),
    todayCount: byDay.get(dayKey(today)) ?? 0,
    weekCount: series.reduce((sum, d) => sum + d.count, 0),
    series,
  };
}
