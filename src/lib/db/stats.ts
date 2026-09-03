"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";
import { fetchAllRows } from "@/lib/db/paginate";
import { resolvePolicy } from "@/lib/db/policy";
import { dueTodayCount, remainingNew } from "@/lib/queue";
import {
  buildSeries,
  countByDay,
  currentStreak,
  dayKey,
  startOfDay,
  type DayCount,
} from "@/lib/streak";

const supabase = () => createClient();

export interface DueSummary {
  /** Kích thước hàng đợi hôm nay = dueReviews + newToday. */
  total: number;
  /** Thẻ đã học, đã tới hạn ôn lại. */
  dueReviews: number;
  /** Từ mới được đưa vào hôm nay (trong hạn mức). */
  newToday: number;
  /** Từ mới còn chờ vì hết hạn mức hôm nay. */
  newHeldBack: number;
}

export const EMPTY_DUE_SUMMARY: DueSummary = {
  total: 0,
  dueReviews: 0,
  newToday: 0,
  newHeldBack: 0,
};

/**
 * Hàng đợi hôm nay trên toàn tài khoản, đếm **phía server** (head: true → không
 * tải dòng nào). Phải khớp với `buildDueQueue` để con số ở trang chủ đúng bằng
 * số thẻ nhận được khi bấm "Ôn ngay".
 *
 *   - thẻ tới hạn ôn lại = card_progress có next_due_at đã qua
 *   - từ mới còn lại     = tổng thẻ − số thẻ đã có tiến độ
 *
 * Dùng index card_progress_user_due (0008) và card_progress_user_introduced (0009).
 */
export async function fetchDueSummary(newPerDay: number): Promise<DueSummary> {
  const sb = supabase();
  const nowIso = new Date().toISOString();
  const [totalRes, withProgressRes, dueRes, policy] = await Promise.all([
    sb.from("cards").select("id", { count: "exact", head: true }),
    sb.from("card_progress").select("id", { count: "exact", head: true }),
    sb
      .from("card_progress")
      .select("id", { count: "exact", head: true })
      .lte("next_due_at", nowIso),
    resolvePolicy(newPerDay),
  ]);

  const dueReviews = dueRes.count ?? 0;
  const newAvailable = Math.max(
    0,
    (totalRes.count ?? 0) - (withProgressRes.count ?? 0)
  );
  const quota = remainingNew(policy);
  const newToday = quota === Infinity ? newAvailable : Math.min(newAvailable, quota);

  return {
    total: dueTodayCount({ dueReviews, newAvailable }, policy),
    dueReviews,
    newToday,
    newHeldBack: newAvailable - newToday,
  };
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
