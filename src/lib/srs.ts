import type { CardStatus, SrsPhase } from "@/types";

/**
 * Lịch ôn (spaced repetition) — hàm thuần, không đụng DB.
 *
 * Ba giai đoạn của một thẻ:
 *  - `learning`   — thẻ mới, đi qua các bước học ngắn trước khi vào nhịp giãn cách.
 *  - `review`     — đã tốt nghiệp: mỗi lần nhớ được thì khoảng ôn nhân lên theo `ease`.
 *  - `relearning` — vừa quên ở giai đoạn review: học lại một bước ngắn rồi quay về
 *                   review với khoảng đã bị rút ngắn.
 *
 * So với bản trước 0009, ba điểm khác quan trọng:
 *  1. Khoảng ôn được **lưu tường minh** (`intervalDays`) chứ không suy ra từ
 *     `next_due_at − last_reviewed_at` — ôn sớm/muộn không còn làm lệch khoảng.
 *  2. Thẻ mới không nhảy thẳng vào khoảng nhiều ngày; phải qua bước học.
 *  3. Khoảng ôn có **nhiễu ±5%** để các thẻ nhập cùng một lô không tới hạn cùng
 *     một ngày mãi mãi, và có **trần** để không hẹn đi vài năm.
 */

/** Đánh giá của người học (3 nút) — cũng chính là status ghi vào DB. */
export type Rating = Exclude<CardStatus, "new">;

export type { SrsPhase };

/**
 * Các bước học của thẻ mới, tính bằng PHÚT.
 * Bước 0 là mốc dùng khi bấm "Chưa thuộc" (ôn lại ngay trong phiên/hôm nay),
 * bước 1 là mốc sau lần "Tạm nhớ" đầu tiên.
 */
export const LEARNING_STEPS_MIN = [10, 1440];
/** Bước học lại sau khi quên một thẻ đã tốt nghiệp. */
export const RELEARN_STEPS_MIN = [10];

/** Khoảng đầu tiên (ngày) khi tốt nghiệp bằng "Tạm nhớ". */
export const GRADUATING_INTERVAL = 3;
/** Khoảng đầu tiên (ngày) khi tốt nghiệp thẳng bằng "Đã thuộc". */
export const EASY_INTERVAL = 5;

export const MIN_EASE = 1.3;
export const MAX_EASE = 3;
export const EASE_PENALTY = 0.2;
export const EASE_BONUS = 0.15;
/** "Đã thuộc" giãn thêm 30% so với "Tạm nhớ". */
export const EASY_MULTIPLIER = 1.3;
/** Quên một thẻ đã tốt nghiệp → khoảng mới bằng nửa khoảng cũ. */
export const LAPSE_MULTIPLIER = 0.5;

/** Trần khoảng ôn (ngày) — hẹn xa hơn 1 năm là vô nghĩa với người học. */
export const MAX_INTERVAL_DAYS = 365;
/** Chỉ thêm nhiễu cho khoảng từ mốc này trở lên (dưới đó ±5% không đổi được gì). */
export const FUZZ_MIN_DAYS = 4;
export const FUZZ_RATIO = 0.05;

/** Số lần quên (ở giai đoạn review) để coi một thẻ là "leech" — ôn mãi không vào. */
export const LEECH_LAPSES = 6;

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** Trạng thái lịch ôn của một thẻ (ánh xạ 1–1 với các cột của `card_progress`). */
export interface SrsState {
  status: CardStatus;
  ease: number;
  /** Khoảng đã chốt cho lần ôn kế, tính bằng ngày. 0 khi thẻ đang học. */
  intervalDays: number;
  phase: SrsPhase;
  /** Số bước học đã qua trong phase hiện tại. */
  learningStep: number;
  lapses: number;
  reviewCount: number;
}

export interface ScheduledReview {
  state: SrsState;
  dueAt: Date;
  /** Khoảng cách tới lần ôn kế, tính bằng phút — tiện cho việc hiển thị/kiểm thử. */
  dueInMinutes: number;
}

/** Trạng thái của một thẻ chưa từng ôn. */
export function initialState(): SrsState {
  return {
    status: "new",
    ease: 2.5,
    intervalDays: 0,
    phase: "learning",
    learningStep: 0,
    lapses: 0,
    reviewCount: 0,
  };
}

const clampEase = (e: number) => Math.min(MAX_EASE, Math.max(MIN_EASE, e));

/** Chốt khoảng ôn về [1, MAX_INTERVAL_DAYS] và làm tròn về ngày. */
export function clampInterval(days: number): number {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

/**
 * Thêm nhiễu ±FUZZ_RATIO cho khoảng ôn. Không có bước này thì cả lô thẻ nhập
 * cùng lúc sẽ tới hạn cùng ngày ở mọi vòng ôn về sau — lịch ôn dồn thành cục.
 * `rand` tách ra làm tham số để kiểm thử được.
 */
export function fuzzInterval(days: number, rand: () => number = Math.random): number {
  if (days < FUZZ_MIN_DAYS) return clampInterval(days);
  const spread = days * FUZZ_RATIO;
  return clampInterval(days + (rand() * 2 - 1) * spread);
}

/** Đã quên đủ nhiều để đáng gắn cờ "leech" (nên sửa thẻ thay vì ôn tiếp). */
export function isLeech(lapses: number): boolean {
  return lapses >= LEECH_LAPSES;
}

function due(now: Date, minutes: number): { dueAt: Date; dueInMinutes: number } {
  return { dueAt: new Date(now.getTime() + minutes * MINUTE_MS), dueInMinutes: minutes };
}

const dueInDays = (now: Date, days: number) => due(now, days * 1440);

/**
 * Tính lịch ôn kế tiếp cho một thẻ.
 *
 * @param prev  trạng thái hiện có (null = thẻ chưa từng ôn)
 * @param rating đánh giá vừa nhận
 * @param now   thời điểm đánh giá
 * @param rand  nguồn nhiễu (chỉ để kiểm thử)
 */
export function scheduleReview(
  prev: SrsState | null,
  rating: Rating,
  now: Date = new Date(),
  rand: () => number = Math.random
): ScheduledReview {
  const state = prev ?? initialState();
  const reviewCount = state.reviewCount + 1;
  const base = { status: rating as CardStatus, reviewCount };

  // ---- Giai đoạn học / học lại ----
  if (state.phase === "learning" || state.phase === "relearning") {
    const steps =
      state.phase === "learning" ? LEARNING_STEPS_MIN : RELEARN_STEPS_MIN;

    if (rating === "hard") {
      // Quay về bước đầu, gặp lại ngay trong hôm nay.
      return {
        state: { ...state, ...base, learningStep: 0 },
        ...due(now, steps[0]),
      };
    }

    if (rating === "easy") {
      // Tốt nghiệp thẳng. Thẻ đang học lại thì giữ khoảng đã bị rút ngắn làm
      // sàn — vừa quên xong thì chưa nên hẹn đi 5 ngày.
      const interval = clampInterval(
        state.phase === "relearning"
          ? Math.max(state.intervalDays, GRADUATING_INTERVAL)
          : EASY_INTERVAL
      );
      return {
        state: {
          ...state,
          ...base,
          phase: "review",
          learningStep: 0,
          intervalDays: interval,
        },
        ...dueInDays(now, interval),
      };
    }

    // good: sang bước kế; hết bước thì tốt nghiệp.
    const nextStep = state.learningStep + 1;
    if (nextStep < steps.length) {
      return {
        state: { ...state, ...base, learningStep: nextStep },
        ...due(now, steps[nextStep]),
      };
    }
    const interval = clampInterval(
      state.phase === "relearning"
        ? Math.max(state.intervalDays, 1)
        : GRADUATING_INTERVAL
    );
    return {
      state: {
        ...state,
        ...base,
        phase: "review",
        learningStep: 0,
        intervalDays: interval,
      },
      ...dueInDays(now, interval),
    };
  }

  // ---- Giai đoạn review ----
  if (rating === "hard") {
    // Quên một thẻ đã tốt nghiệp: giảm ease, rút khoảng còn một nửa và học lại
    // một bước ngắn. Khoảng rút gọn được lưu ngay để lúc học lại xong dùng tới.
    return {
      state: {
        ...state,
        ...base,
        ease: clampEase(state.ease - EASE_PENALTY),
        intervalDays: clampInterval(state.intervalDays * LAPSE_MULTIPLIER),
        phase: "relearning",
        learningStep: 0,
        lapses: state.lapses + 1,
      },
      ...due(now, RELEARN_STEPS_MIN[0]),
    };
  }

  const prevInterval = Math.max(1, state.intervalDays);
  if (rating === "easy") {
    const ease = clampEase(state.ease + EASE_BONUS);
    const interval = fuzzInterval(prevInterval * ease * EASY_MULTIPLIER, rand);
    return {
      state: { ...state, ...base, ease, intervalDays: interval },
      ...dueInDays(now, interval),
    };
  }

  const interval = fuzzInterval(prevInterval * state.ease, rand);
  return {
    state: { ...state, ...base, intervalDays: interval },
    ...dueInDays(now, interval),
  };
}

/** Dòng `card_progress` đọc từ DB — lỏng kiểu vì có thể thiếu cột (migration chưa chạy). */
export interface ProgressRowLike {
  status?: string | null;
  ease_factor?: number | null;
  interval_days?: number | null;
  srs_phase?: string | null;
  learning_step?: number | null;
  lapses?: number | null;
  review_count?: number | null;
  last_reviewed_at?: string | null;
  next_due_at?: string | null;
}

const PHASES: SrsPhase[] = ["learning", "review", "relearning"];

/**
 * Đọc trạng thái lịch ôn từ một dòng `card_progress`. Trả về null nếu thẻ chưa
 * từng ôn (không có dòng progress).
 *
 * Chịu được dữ liệu cũ: thẻ đã học từ trước 0009 không có `interval_days` /
 * `srs_phase` thì coi như **đã tốt nghiệp**, khoảng ôn suy ra từ khoảng cách
 * lần hẹn gần nhất (đúng công thức bản cũ) để lịch không bị nhảy.
 */
export function stateFromRow(
  row: ProgressRowLike | null | undefined
): SrsState | null {
  if (!row || !row.last_reviewed_at) return null;

  const phase = PHASES.includes(row.srs_phase as SrsPhase)
    ? (row.srs_phase as SrsPhase)
    : "review";

  // Chỉ suy ra khoảng khi cột THỰC SỰ không có (dữ liệu trước 0009). Thẻ đang ở
  // giai đoạn học có interval_days = 0 hợp lệ — suy ra thêm là bịa ra một khoảng
  // mà thẻ chưa có.
  let intervalDays = Number(row.interval_days ?? 0);
  if (row.interval_days == null && row.next_due_at && row.last_reviewed_at) {
    intervalDays = Math.max(
      0,
      Math.round(
        (new Date(row.next_due_at).getTime() -
          new Date(row.last_reviewed_at).getTime()) /
          DAY_MS
      )
    );
  }

  return {
    status: (row.status as CardStatus) ?? "good",
    ease: clampEase(Number(row.ease_factor ?? 2.5)),
    intervalDays,
    phase,
    learningStep: Math.max(0, Number(row.learning_step ?? 0)),
    lapses: Math.max(0, Number(row.lapses ?? 0)),
    reviewCount: Math.max(0, Number(row.review_count ?? 0)),
  };
}

/** Các cột `card_progress` cần ghi sau một lượt đánh giá. */
export function rowFromState(
  state: SrsState,
  dueAt: Date,
  now: Date
): {
  status: CardStatus;
  review_count: number;
  last_reviewed_at: string;
  next_due_at: string;
  ease_factor: number;
  interval_days: number;
  srs_phase: SrsPhase;
  learning_step: number;
  lapses: number;
} {
  return {
    status: state.status,
    review_count: state.reviewCount,
    last_reviewed_at: now.toISOString(),
    next_due_at: dueAt.toISOString(),
    ease_factor: state.ease,
    interval_days: state.intervalDays,
    srs_phase: state.phase,
    learning_step: state.learningStep,
    lapses: state.lapses,
  };
}
