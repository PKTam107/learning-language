import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paginate";
import { isDue } from "@/lib/status";
import { resolvePolicy } from "@/lib/policy";
import {
  dueTodayCount,
  isNewCard,
  remainingNew,
  type QueuePolicy,
} from "@/lib/queue";
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
import { EMPTY_METRICS, type AchievementMetrics } from "@/lib/achievements";
import {
  EMPTY_CHALLENGE_METRICS,
  type ChallengeMetrics,
} from "@/lib/challenge";

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
  /**
   * Thẻ tới hạn theo ngày. Thẻ quá hạn gom vào **hôm nay**, cùng với số từ mới
   * còn trong hạn mức hôm nay.
   */
  byDay: Record<string, DueItem[]>;
  /** Số thẻ trong hàng đợi hôm nay (thẻ quá hạn + từ mới trong hạn mức). */
  dueNow: number;
  /** Từ mới chưa xếp lịch được vì hết hạn mức hôm nay. */
  newHeldBack: number;
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
  due: { byDay: {}, dueNow: 0, newHeldBack: 0, totalCards: 0 },
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
  card_progress?: {
    status?: string;
    next_due_at?: string | null;
    last_reviewed_at?: string | null;
  }[] | null;
}

function buildDueCalendar(
  rows: CardRow[],
  now: Date,
  policy: QueuePolicy
): DueCalendarData {
  const nowMs = now.getTime();
  const todayKey = dayKey(now);
  const byDay: Record<string, DueItem[]> = {};
  const item = (c: CardRow): DueItem => ({
    cardId: c.id,
    term: c.term,
    deckId: c.deck_id,
  });

  const news: CardRow[] = [];
  let dueNow = 0;

  for (const c of rows) {
    const progress = c.card_progress?.[0];
    // Từ mới chưa có ngày hẹn nào: chỉ những từ trong hạn mức hôm nay mới được
    // xếp vào ô hôm nay, phần còn lại là hàng chờ (xem lib/queue.ts).
    if (isNewCard({ progress })) {
      news.push(c);
      continue;
    }
    const nextDue = progress?.next_due_at ?? null;
    const overdue = isDue(nextDue, nowMs); // quá hạn → việc của hôm nay
    const key = overdue ? todayKey : dayKey(new Date(nextDue as string));
    if (overdue) dueNow++;
    (byDay[key] ??= []).push(item(c));
  }

  const quota = remainingNew(policy);
  const taken = quota === Infinity ? news : news.slice(0, quota);
  if (taken.length) {
    (byDay[todayKey] ??= []).push(...taken.map(item));
    dueNow += taken.length;
  }

  return {
    byDay,
    dueNow,
    newHeldBack: news.length - taken.length,
    totalCards: rows.length,
  };
}

/**
 * Nạp một lần toàn bộ dữ liệu cho màn Tiến độ: heatmap + huy hiệu + lịch ôn.
 * 3 truy vấn song song, không N+1. Trả EMPTY_PROGRESS nếu chưa đăng nhập.
 *
 * Lưu ý: heatmap/chuỗi ngày/số ngày có học tính trong cửa sổ HEATMAP_DAYS ngày;
 * riêng **tổng lượt ôn** đếm toàn bộ lịch sử (đếm phía server, không tải rows).
 */
export async function fetchProgressData(
  newPerDay: number
): Promise<ProgressData> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_PROGRESS;

  const now = new Date();
  const since = startOfDay(now);
  since.setDate(since.getDate() - (HEATMAP_DAYS - 1));

  // Cả hai truy vấn này đều vượt 1000 dòng rất dễ: 364 ngày nhật ký ôn, và
  // toàn bộ thẻ của tài khoản. Không phân trang thì heatmap, chuỗi ngày dài
  // nhất, số ngày có học và lịch ôn đều thiếu dữ liệu mà không báo lỗi.
  const [history, totalRes, cardRows, policy] = await Promise.all([
    // review_events có thể chưa được migrate → coi như chưa có lịch sử.
    fetchAllRows<{ reviewed_at: string }>((from, to) =>
      supabase
        .from("review_events")
        .select("reviewed_at")
        .gte("reviewed_at", since.toISOString())
        .order("id")
        .range(from, to)
    ).catch(() => [] as { reviewed_at: string }[]),
    supabase.from("review_events").select("id", { count: "exact", head: true }),
    fetchAllRows<CardRow>((from, to) =>
      supabase
        .from("cards")
        .select(
          "id, term, deck_id, card_progress(status, next_due_at, last_reviewed_at)"
        )
        .order("id")
        .range(from, to)
    ),
    resolvePolicy(newPerDay),
  ]);

  const activity = buildActivity(
    history.map((r) => r.reviewed_at),
    now
  );
  const due = buildDueCalendar(cardRows, now, policy);
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
export async function fetchChallengeMetrics(
  newPerDay: number
): Promise<ChallengeMetrics> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_CHALLENGE_METRICS;

  const dayStart = startOfDay().toISOString();

  // dueToday & totalCards đếm bằng COUNT phía server (head: true → không tải
  // dòng nào). Trước đây khối này kéo *toàn bộ* thẻ kèm progress về máy chỉ để
  // đếm — vừa nặng, vừa bị cắt ở 1000 dòng nên đếm thiếu.
  //
  // dueToday phải khớp hàng đợi thật (lib/queue.ts): thẻ tới hạn ôn lại +
  // từ mới trong hạn mức. Đếm được bằng 3 con số:
  //   thẻ tới hạn  = card_progress có next_due_at đã qua
  //   từ mới còn   = tổng thẻ − số thẻ đã có tiến độ
  const nowIso = new Date().toISOString();
  const [events, newRes, totalRes, withProgressRes, dueRes, policy] =
    await Promise.all([
      fetchAllRows<{ card_id: string | null; status: string }>((from, to) =>
        supabase
          .from("review_events")
          .select("card_id, status")
          .gte("reviewed_at", dayStart)
          .order("id")
          .range(from, to)
      ).catch(() => [] as { card_id: string | null; status: string }[]),
      supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .gte("created_at", dayStart),
      supabase.from("cards").select("id", { count: "exact", head: true }),
      supabase.from("card_progress").select("id", { count: "exact", head: true }),
      supabase
        .from("card_progress")
        .select("id", { count: "exact", head: true })
        .lte("next_due_at", nowIso),
      resolvePolicy(newPerDay),
    ]);

  const distinct = new Set<string>();
  const mastered = new Set<string>();
  for (const e of events) {
    const id = (e.card_id as string) ?? "";
    if (id) distinct.add(id);
    if (e.status === "easy" && id) mastered.add(id);
  }

  const totalCards = totalRes.count ?? 0;
  const newAvailable = Math.max(0, totalCards - (withProgressRes.count ?? 0));
  const dueToday = dueTodayCount(
    { dueReviews: dueRes.count ?? 0, newAvailable },
    policy
  );

  return {
    reviewsToday: events.length,
    distinctToday: distinct.size,
    masteredToday: mastered.size,
    newCardsToday: newRes.count ?? 0,
    dueToday,
    totalCards,
  };
}
