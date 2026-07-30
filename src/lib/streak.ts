/**
 * Helper thuần cho "lịch ngày học" — dùng chung cho streak, heatmap,
 * thử thách hằng ngày và lịch ôn. Không phụ thuộc Supabase/React để dễ tái dùng.
 * Mọi phép tính theo **giờ địa phương** (ngày học của người dùng, không phải UTC).
 */

export interface DayCount {
  /** Khóa ngày yyyy-mm-dd theo giờ địa phương. */
  day: string;
  count: number;
}

/** Khóa ngày theo giờ địa phương: yyyy-mm-dd. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ngược của dayKey: 00:00 giờ địa phương của ngày đó. */
export function fromDayKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

/** Bản sao dời `n` ngày (n âm = lùi lại). */
export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** 00:00 giờ địa phương của ngày chứa `d`. */
export function startOfDay(d: Date = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Đếm số bản ghi theo ngày địa phương từ danh sách mốc thời gian ISO. */
export function countByDay(timestamps: string[]): Map<string, number> {
  const byDay = new Map<string, number>();
  for (const ts of timestamps) {
    const key = dayKey(new Date(ts));
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }
  return byDay;
}

/**
 * Chuỗi ngày học liên tiếp tính đến hôm nay. Nếu hôm nay chưa học thì tính đến
 * hôm qua — chuỗi vẫn còn "sống" cho tới hết ngày hôm nay.
 */
export function currentStreak(
  byDay: Map<string, number>,
  today: Date = new Date()
): number {
  let streak = 0;
  let cursor = startOfDay(today);
  if (!byDay.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (byDay.has(dayKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Chuỗi ngày học dài nhất trong phạm vi dữ liệu đang có. */
export function bestStreak(byDay: Map<string, number>): number {
  const days = [...byDay.entries()]
    .filter(([, c]) => c > 0)
    .map(([day]) => day)
    .sort();

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    const isNext = prev !== null && day === dayKey(addDays(fromDayKey(prev), 1));
    run = isNext ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

/** Số ngày (kể cả ngày trống) có ít nhất 1 lượt — dùng cho huy hiệu "ngày có học". */
export function activeDayCount(byDay: Map<string, number>): number {
  let n = 0;
  for (const count of byDay.values()) if (count > 0) n++;
  return n;
}

/**
 * Chuỗi `days` ngày liên tiếp kết thúc ở `end` (cũ → mới), điền 0 cho ngày trống.
 * Dùng cho biểu đồ 7 ngày và heatmap.
 */
export function buildSeries(
  byDay: Map<string, number>,
  days: number,
  end: Date = new Date()
): DayCount[] {
  const out: DayCount[] = [];
  const last = startOfDay(end);
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(addDays(last, -i));
    out.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

/** Số ngày giữa hai khóa ngày (b - a). */
export function daysBetween(a: string, b: string): number {
  const ms = fromDayKey(b).getTime() - fromDayKey(a).getTime();
  return Math.round(ms / 86_400_000);
}
