import type { CardStatus, CardWithProgress, DeckStats } from "@/types";

/** Thứ tự hiển thị: chưa học → chưa thuộc → đang thuộc → đã thuộc. */
export const STATUS_ORDER: CardStatus[] = ["new", "hard", "good", "easy"];

/** Nhãn + màu trạng thái (đồng bộ với web src/lib/status.ts). */
export const STATUS_META: Record<CardStatus, { label: string; color: string }> = {
  new: { label: "Chưa học", color: "#cbd5e1" }, // slate-300
  hard: { label: "Chưa thuộc", color: "#ef4444" }, // red-500
  good: { label: "Đang thuộc", color: "#f59e0b" }, // amber-500
  easy: { label: "Đã thuộc", color: "#16a34a" }, // green-600
};

export function emptyByStatus(): Record<CardStatus, number> {
  return { new: 0, hard: 0, good: 0, easy: 0 };
}

/** Thẻ đến hạn ôn: chưa học (không có next_due_at) hoặc đã tới hạn. */
export function isDue(
  nextDueAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!nextDueAt) return true;
  return new Date(nextDueAt).getTime() <= nowMs;
}

/** Tính DeckStats (byStatus + due) từ danh sách thẻ kèm progress. */
export function computeStats(
  cards: CardWithProgress[],
  nowMs: number = Date.now()
): DeckStats {
  const byStatus = emptyByStatus();
  let due = 0;
  for (const c of cards) {
    byStatus[c.progress?.status ?? "new"]++;
    if (isDue(c.progress?.next_due_at, nowMs)) due++;
  }
  return { total: cards.length, byStatus, due };
}

export function masteredPercent(stats: DeckStats): number {
  if (!stats.total) return 0;
  return Math.round((stats.byStatus.easy / stats.total) * 100);
}
