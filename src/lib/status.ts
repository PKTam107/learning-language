import type { CardStatus, DeckStats } from "@/types";

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

/** Gộp danh sách trạng thái (mỗi thẻ 1 giá trị) thành DeckStats. */
export function statsFromStatuses(statuses: CardStatus[]): DeckStats {
  const byStatus = emptyByStatus();
  for (const s of statuses) byStatus[s]++;
  return { total: statuses.length, byStatus };
}

/** % đã thuộc (easy) để hiển thị nhanh. */
export function masteredPercent(stats: DeckStats): number {
  if (!stats.total) return 0;
  return Math.round((stats.byStatus.easy / stats.total) * 100);
}
