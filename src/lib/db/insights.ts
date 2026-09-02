"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";
import { isDue } from "@/lib/status";
import { fetchAllRows } from "@/lib/db/paginate";
import {
  activeDayCount,
  bestStreak,
  buildSeries,
  countByDay,
  currentStreak,
  dayKey,
  startOfDay,
  type DayCount,
} from "@/lib/streak";
import type { AchievementMetrics } from "@/lib/achievements";
import { EMPTY_METRICS } from "@/lib/achievements";
import {
  EMPTY_CHALLENGE_METRICS,
  type ChallengeMetrics,
} from "@/lib/challenge";

const supabase = () => createClient();

/** Số ngày lịch sử vẽ heatmap — 52 tuần chẵn để lưới đủ cột. */
export const HEATMAP_DAYS = 364;

export interface ActivityStats {
  /** Lượt ôn theo từng ngày (cũ → mới), đủ HEATMAP_DAYS ngày kể cả ngày trống. */
  heatmap: DayCount[];
  /** Số lượt ôn nhiều nhất trong 1 ngày (để chia mức đậm nhạt). */
  busiest: number;
  todayCount: number;
  /** Tổng lượt ôn trong cửa sổ heatmap. */
  windowReviews: number;
  activeDays: number;
  streak: number;
  bestStreak: number;
}

export interface DueItem {
  cardId: string;
  term: string;
  deckId: string;
}

export interface DueCalendarData {
  /** Thẻ tới hạn theo ngày. Thẻ quá hạn & chưa học gom vào **hôm nay**. */
  byDay: Record<string, DueItem[]>;
  /** Số thẻ đã tới hạn tính đến lúc nạp (gồm thẻ chưa học). */
  dueNow: number;
  totalCards: number;
}

export interface ProgressData {
  activity: ActivityStats;
  metrics: AchievementMetrics;
  due: DueCalendarData;
}

const EMPTY_ACTIVITY: ActivityStats = {
  heatmap: [],
  busiest: 0,
  todayCount: 0,
  windowReviews: 0,
  activeDays: 0,
  streak: 0,
  bestStreak: 0,
};

export const EMPTY_PROGRESS: ProgressData = {
  activity: EMPTY_ACTIVITY,
  metrics: EMPTY_METRICS,
  due: { byDay: {}, dueNow: 0, totalCards: 0 },
};

/** Dựng ActivityStats từ danh sách mốc thời gian ôn (ISO). */
function buildActivity(timestamps: string[], now: Date): ActivityStats {
  const byDay = countByDay(timestamps);
  const heatmap = buildSeries(byDay, HEATMAP_DAYS, now);
  return {
    heatmap,
    busiest: heatmap.reduce((max, d) => Math.max(max, d.count), 0),
    todayCount: byDay.get(dayKey(now)) ?? 0,
    windowReviews: timestamps.length,
    activeDays: activeDayCount(byDay),
    streak: currentStreak(byDay, now),
    bestStreak: bestStreak(byDay),
  };
}

/** Thẻ + tiến độ dạng thô, dùng chung cho lịch ôn và chỉ số huy hiệu. */
interface CardRow {
  id: string;
  term: string;
  deck_id: string;
  card_progress?: { status?: string; next_due_at?: string | null }[] | null;
}

function buildDueCalendar(rows: CardRow[], now: Date): DueCalendarData {
  const nowMs = now.getTime();
  const todayKey = dayKey(now);
  const byDay: Record<string, DueItem[]> = {};
  let dueNow = 0;

  for (const c of rows) {
    const progress = c.card_progress?.[0];
    const nextDue = progress?.next_due_at ?? null;
    // Chưa học hoặc đã qua hạn → cần ôn ngay, xếp vào ô hôm nay.
    const overdue = isDue(nextDue, nowMs);
    const key = overdue ? todayKey : dayKey(new Date(nextDue as string));
    if (overdue) dueNow++;
    (byDay[key] ??= []).push({
      cardId: c.id,
      term: c.term,
      deckId: c.deck_id,
    });
  }

  return { byDay, dueNow, totalCards: rows.length };
}

/**
 * Nạp một lần toàn bộ dữ liệu cho trang Tiến độ: heatmap + huy hiệu + lịch ôn.
 * 4 truy vấn song song, không N+1. Trả EMPTY_PROGRESS nếu chưa đăng nhập.
 *
 * Lưu ý: heatmap/chuỗi ngày/số ngày có học tính trong cửa sổ HEATMAP_DAYS ngày;
 * riêng **tổng lượt ôn** đếm toàn bộ lịch sử (đếm phía server, không tải rows).
 */
export async function fetchProgressData(): Promise<ProgressData> {
  const sb = supabase();
  const userId = await currentUserId();
  if (!userId) return EMPTY_PROGRESS;

  const now = new Date();
  const since = startOfDay(now);
  since.setDate(since.getDate() - (HEATMAP_DAYS - 1));

  // Cả hai truy vấn này đều vượt 1000 dòng rất dễ: 364 ngày nhật ký ôn, và
  // toàn bộ thẻ của tài khoản. Không phân trang thì heatmap, chuỗi ngày dài
  // nhất, số ngày có học và lịch ôn đều thiếu dữ liệu mà không báo lỗi.
  const [history, totalRes, cardRows] = await Promise.all([
    // review_events có thể chưa được migrate → coi như chưa có lịch sử.
    fetchAllRows<{ reviewed_at: string }>((from, to) =>
      sb
        .from("review_events")
        .select("reviewed_at")
        .gte("reviewed_at", since.toISOString())
        .order("id")
        .range(from, to)
    ).catch(() => [] as { reviewed_at: string }[]),
    sb.from("review_events").select("id", { count: "exact", head: true }),
    fetchAllRows<CardRow>((from, to) =>
      sb
        .from("cards")
        .select("id, term, deck_id, card_progress(status, next_due_at)")
        .order("id")
        .range(from, to)
    ),
  ]);

  const activity = buildActivity(
    history.map((r) => r.reviewed_at),
    now
  );
  const due = buildDueCalendar(cardRows, now);
  const masteredCards = cardRows.filter(
    (c) => c.card_progress?.[0]?.status === "easy"
  ).length;

  const metrics: AchievementMetrics = {
    totalCards: cardRows.length,
    masteredCards,
    streak: activity.streak,
    bestStreak: activity.bestStreak,
    totalReviews: totalRes.count ?? activity.windowReviews,
    activeDays: activity.activeDays,
  };

  return { activity, metrics, due };
}

/**
 * Chỉ số cho thử thách hôm nay. Nhẹ hơn fetchProgressData: chỉ nhật ký ôn trong
 * ngày + số thẻ tạo trong ngày + hàng đợi tới hạn.
 */
export async function fetchChallengeMetrics(): Promise<ChallengeMetrics> {
  const sb = supabase();
  const userId = await currentUserId();
  if (!userId) return EMPTY_CHALLENGE_METRICS;

  const dayStart = startOfDay().toISOString();

  // dueToday & totalCards đếm bằng COUNT phía server (head: true → không tải
  // dòng nào). Trước đây khối này kéo *toàn bộ* thẻ kèm progress về máy chỉ để
  // đếm, nên tài khoản vài trăm từ phải tải cả kho mỗi lần mở trang chủ.
  //
  // "Chưa tới hạn" = có dòng progress và next_due_at còn ở tương lai (xem
  // isDue trong lib/status.ts: thiếu next_due_at nghĩa là chưa học → tới hạn),
  // nên dueToday = tổng thẻ − số thẻ chưa tới hạn. Dùng index
  // card_progress_user_due ở migration 0008.
  const [events, newRes, totalRes, notDueRes] = await Promise.all([
    fetchAllRows<{ card_id: string | null; status: string }>((from, to) =>
      sb
        .from("review_events")
        .select("card_id, status")
        .gte("reviewed_at", dayStart)
        .order("id")
        .range(from, to)
    ).catch(() => [] as { card_id: string | null; status: string }[]),
    sb.from("cards").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    sb.from("cards").select("id", { count: "exact", head: true }),
    sb
      .from("card_progress")
      .select("id", { count: "exact", head: true })
      .gt("next_due_at", new Date().toISOString()),
  ]);

  const distinct = new Set<string>();
  const mastered = new Set<string>();
  for (const e of events) {
    const id = (e.card_id as string) ?? "";
    if (id) distinct.add(id);
    if (e.status === "easy" && id) mastered.add(id);
  }

  const totalCards = totalRes.count ?? 0;
  const dueToday = Math.max(0, totalCards - (notDueRes.count ?? 0));

  return {
    reviewsToday: events.length,
    distinctToday: distinct.size,
    masteredToday: mastered.size,
    newCardsToday: newRes.count ?? 0,
    dueToday,
    totalCards,
  };
}
