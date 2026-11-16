import type { CardWithProgress } from "@/types";

/** Chỉ luyện lại thẻ đã trả lời sai, theo thứ tự của phiên vừa học.
 * Lịch sử đã bỏ lượt hoàn tác; thẻ bỏ qua không được coi là sai.
 */
export function retryCards(
  queue: CardWithProgress[],
  history: { index: number; status: string }[]
): CardWithProgress[] {
  const missed = new Set(history.filter((h) => h.status === "hard").map((h) => h.index));
  return queue.filter((_, index) => missed.has(index));
}
