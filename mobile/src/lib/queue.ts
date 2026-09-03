import { emptyByStatus, isDue } from "@/lib/status";
import type { CardStatus, CardWithProgress, DeckStats } from "@/types";

/**
 * Hàng đợi ôn "hôm nay" — hàm thuần, không đụng DB.
 * Bản sao đồng bộ của web `src/lib/queue.ts`.
 *
 * Vì sao cần: trước đây MỌI thẻ chưa học đều được coi là "đến hạn hôm nay", nên
 * nhập 200 từ từ Excel là trang chủ báo "200 từ cần ôn hôm nay" — một con số
 * không ai học nổi, làm thử thách trong ngày và lịch ôn cũng sai theo. Nay hàng
 * đợi được tách hai phần:
 *
 *   1. **Thẻ tới hạn ôn lại** — đã học rồi và `next_due_at` đã qua. Không giới hạn:
 *      đây là việc đã hẹn, cắt bớt chỉ khiến nó dồn sang mai.
 *   2. **Từ mới** — chưa ôn lần nào. Giới hạn `newPerDay` mỗi ngày cho cả tài khoản.
 *
 * Hạn mức từ mới là **chung cho cả tài khoản**, nên khi xem một bộ thẻ riêng lẻ,
 * con số hiển thị là "nếu học bộ này ngay bây giờ thì được bao nhiêu từ mới" —
 * học bộ nào trước thì bộ đó tiêu hạn mức.
 */

/** Số từ mới mặc định mỗi ngày. */
export const DEFAULT_NEW_PER_DAY = 15;
/** Các mức chọn được trong Cài đặt (0 = không giới hạn). */
export const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20, 30, 50, 0];

/** Chỉ cần hai cột này để xếp hàng đợi — không buộc phải là CardWithProgress đầy đủ. */
export interface QueueCard {
  progress?: {
    next_due_at?: string | null;
    last_reviewed_at?: string | null;
  } | null;
}

export interface QueuePolicy {
  /** Hạn mức từ mới mỗi ngày (0 = không giới hạn). */
  newPerDay: number;
  /** Số từ mới đã học trong hôm nay (toàn tài khoản). */
  introducedToday: number;
}

/** Thẻ chưa từng ôn. Reset tiến độ xóa hẳn dòng progress → thành từ mới trở lại. */
export function isNewCard(card: QueueCard): boolean {
  return !card.progress?.last_reviewed_at;
}

/** Thẻ đã học và đã tới hạn ôn lại. */
export function isDueReview(card: QueueCard, nowMs: number = Date.now()): boolean {
  if (isNewCard(card)) return false;
  return isDue(card.progress?.next_due_at, nowMs);
}

/** Số từ mới còn được phép học hôm nay (Infinity nếu tắt giới hạn). */
export function remainingNew(policy: QueuePolicy): number {
  if (!policy.newPerDay || policy.newPerDay <= 0) return Infinity;
  return Math.max(0, policy.newPerDay - Math.max(0, policy.introducedToday));
}

export interface DueSplit<T> {
  /** Thẻ tới hạn ôn lại (đã học trước đó). */
  reviews: T[];
  /** Từ mới, chưa lọc theo hạn mức. */
  news: T[];
}

export function splitDue<T extends QueueCard>(
  cards: T[],
  nowMs: number = Date.now()
): DueSplit<T> {
  const reviews: T[] = [];
  const news: T[] = [];
  for (const c of cards) {
    if (isNewCard(c)) news.push(c);
    else if (isDue(c.progress?.next_due_at, nowMs)) reviews.push(c);
  }
  return { reviews, news };
}

export interface DueQueue<T> {
  /** Tập thẻ của phiên: thẻ tới hạn + từ mới trong hạn mức. */
  cards: T[];
  reviewCount: number;
  newCount: number;
  /** Số từ mới bị giữ lại vì hết hạn mức hôm nay. */
  newHeldBack: number;
}

/** Dựng hàng đợi hôm nay từ một tập thẻ (một bộ hoặc cả tài khoản). */
export function buildDueQueue<T extends QueueCard>(
  cards: T[],
  policy: QueuePolicy,
  nowMs: number = Date.now()
): DueQueue<T> {
  const { reviews, news } = splitDue(cards, nowMs);
  const quota = remainingNew(policy);
  const taken = quota === Infinity ? news : news.slice(0, quota);
  return {
    cards: [...reviews, ...taken],
    reviewCount: reviews.length,
    newCount: taken.length,
    newHeldBack: news.length - taken.length,
  };
}

/**
 * Số thẻ "cần ôn hôm nay" khi chỉ có các con số đếm (đếm phía server, không tải
 * dòng nào). Phải khớp với kích thước hàng đợi mà `buildDueQueue` dựng ra.
 */
export function dueTodayCount(
  counts: { dueReviews: number; newAvailable: number },
  policy: QueuePolicy
): number {
  const quota = remainingNew(policy);
  const news =
    quota === Infinity ? counts.newAvailable : Math.min(counts.newAvailable, quota);
  return Math.max(0, counts.dueReviews) + Math.max(0, news);
}

/** Hạn mức "không giới hạn" — dùng khi chưa nạp xong cài đặt. */
export const UNLIMITED: QueuePolicy = { newPerDay: 0, introducedToday: 0 };

/**
 * Tính DeckStats từ danh sách thẻ kèm progress.
 *
 * `due` là **kích thước hàng đợi hôm nay** của tập thẻ này (đã trừ hạn mức từ
 * mới), nên con số hiện trên bộ thẻ khớp với số thẻ thật sự nhận được khi bấm
 * "Học ngay" → "Ôn hôm nay".
 */
export function computeStats(
  cards: CardWithProgress[],
  policy: QueuePolicy = UNLIMITED,
  nowMs: number = Date.now()
): DeckStats {
  const byStatus = emptyByStatus();
  for (const c of cards) {
    byStatus[(c.progress?.status ?? "new") as CardStatus]++;
  }
  const q = buildDueQueue(cards, policy, nowMs);
  return {
    total: cards.length,
    byStatus,
    due: q.cards.length,
    dueReviews: q.reviewCount,
    newToday: q.newCount,
    newHeldBack: q.newHeldBack,
  };
}
