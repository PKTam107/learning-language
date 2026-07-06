import type { CardStatus, CardWithProgress, DeckStats } from "@/types";

/** Thứ tự hiển thị: chưa học → chưa thuộc → đang thuộc → đã thuộc. */
export const STATUS_ORDER: CardStatus[] = ["new", "hard", "good", "easy"];

/**
 * Nguồn sự thật nhãn + màu trạng thái, dùng chung mọi nơi.
 * Class Tailwind để dạng literal đầy đủ để JIT nhận diện.
 */
export const STATUS_META: Record<
  CardStatus,
  { label: string; dot: string; bar: string; text: string }
> = {
  new: {
    label: "Chưa học",
    dot: "bg-slate-300",
    bar: "bg-slate-300",
    text: "text-slate-500",
  },
  hard: {
    label: "Chưa thuộc",
    dot: "bg-red-500",
    bar: "bg-red-500",
    text: "text-red-600",
  },
  good: {
    label: "Đang thuộc",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-600",
  },
  easy: {
    label: "Đã thuộc",
    dot: "bg-green-600",
    bar: "bg-green-600",
    text: "text-green-700",
  },
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

/** % đã thuộc (easy) để hiển thị nhanh. */
export function masteredPercent(stats: DeckStats): number {
  if (!stats.total) return 0;
  return Math.round((stats.byStatus.easy / stats.total) * 100);
}
