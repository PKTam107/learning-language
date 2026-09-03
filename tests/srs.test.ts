import { describe, expect, it } from "vitest";
import {
  EASY_INTERVAL,
  GRADUATING_INTERVAL,
  LEARNING_STEPS_MIN,
  LEECH_LAPSES,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  RELEARN_STEPS_MIN,
  clampInterval,
  fuzzInterval,
  initialState,
  isLeech,
  rowFromState,
  scheduleReview,
  stateFromRow,
  type SrsState,
} from "@/lib/srs";

const NOW = new Date("2026-09-02T08:00:00.000Z");
/** Bỏ nhiễu để test khoảng ôn theo giá trị chính xác. */
const noFuzz = () => 0.5;

/** Thẻ đã tốt nghiệp với khoảng/ease cho trước. */
function reviewState(patch: Partial<SrsState> = {}): SrsState {
  return {
    ...initialState(),
    status: "good",
    phase: "review",
    intervalDays: 10,
    reviewCount: 5,
    ...patch,
  };
}

describe("thẻ mới (giai đoạn học)", () => {
  it('"Tạm nhớ" lần đầu hẹn theo bước học, KHÔNG nhảy thẳng vào khoảng nhiều ngày', () => {
    const r = scheduleReview(null, "good", NOW, noFuzz);
    expect(r.dueInMinutes).toBe(LEARNING_STEPS_MIN[1]); // 1 ngày
    expect(r.state.phase).toBe("learning");
    expect(r.state.learningStep).toBe(1);
    expect(r.state.intervalDays).toBe(0);
    expect(r.state.status).toBe("good");
    expect(r.state.reviewCount).toBe(1);
  });

  it("qua hết bước học thì tốt nghiệp vào giai đoạn review", () => {
    const first = scheduleReview(null, "good", NOW, noFuzz);
    const second = scheduleReview(first.state, "good", NOW, noFuzz);
    expect(second.state.phase).toBe("review");
    expect(second.state.intervalDays).toBe(GRADUATING_INTERVAL);
    expect(second.dueInMinutes).toBe(GRADUATING_INTERVAL * 1440);
  });

  it('"Chưa thuộc" khi đang học → gặp lại ngay trong hôm nay', () => {
    const first = scheduleReview(null, "good", NOW, noFuzz);
    const again = scheduleReview(first.state, "hard", NOW, noFuzz);
    expect(again.dueInMinutes).toBe(LEARNING_STEPS_MIN[0]); // 10 phút
    expect(again.state.learningStep).toBe(0);
    expect(again.state.phase).toBe("learning");
    // Sai khi còn đang học không tính là "quên" (lapse).
    expect(again.state.lapses).toBe(0);
  });

  it('"Đã thuộc" cho thẻ mới tốt nghiệp thẳng', () => {
    const r = scheduleReview(null, "easy", NOW, noFuzz);
    expect(r.state.phase).toBe("review");
    expect(r.state.intervalDays).toBe(EASY_INTERVAL);
  });
});

describe("giai đoạn review", () => {
  it('"Tạm nhớ" nhân khoảng theo ease, không đổi ease', () => {
    const r = scheduleReview(reviewState({ intervalDays: 10, ease: 2.5 }), "good", NOW, noFuzz);
    expect(r.state.intervalDays).toBe(25);
    expect(r.state.ease).toBe(2.5);
  });

  it('"Đã thuộc" nhân thêm hệ số và tăng ease', () => {
    const r = scheduleReview(reviewState({ intervalDays: 10, ease: 2.5 }), "easy", NOW, noFuzz);
    expect(r.state.ease).toBeCloseTo(2.65, 5);
    expect(r.state.intervalDays).toBe(Math.round(10 * 2.65 * 1.3));
  });

  it("dùng khoảng ĐÃ LƯU nên ôn muộn không làm lệch lịch", () => {
    const state = reviewState({ intervalDays: 10, ease: 2 });
    const onTime = scheduleReview(state, "good", NOW, noFuzz);
    const late = scheduleReview(
      state,
      "good",
      new Date(NOW.getTime() + 30 * 86_400_000),
      noFuzz
    );
    expect(late.state.intervalDays).toBe(onTime.state.intervalDays);
  });

  it('"Chưa thuộc" → giảm ease, rút nửa khoảng, học lại một bước ngắn', () => {
    const r = scheduleReview(reviewState({ intervalDays: 20, ease: 2.5 }), "hard", NOW, noFuzz);
    expect(r.state.phase).toBe("relearning");
    expect(r.state.lapses).toBe(1);
    expect(r.state.ease).toBeCloseTo(2.3, 5);
    expect(r.state.intervalDays).toBe(10);
    expect(r.dueInMinutes).toBe(RELEARN_STEPS_MIN[0]);
  });

  it("ease không xuống dưới sàn dù quên nhiều lần", () => {
    let state = reviewState({ ease: 1.4 });
    for (let i = 0; i < 5; i++) {
      state = scheduleReview(state, "hard", NOW, noFuzz).state;
      state = { ...state, phase: "review" }; // bỏ qua bước học lại cho gọn
    }
    expect(state.ease).toBe(MIN_EASE);
  });

  it("khoảng ôn có trần", () => {
    const r = scheduleReview(
      reviewState({ intervalDays: 300, ease: 3 }),
      "easy",
      NOW,
      noFuzz
    );
    expect(r.state.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });
});

describe("học lại sau khi quên", () => {
  it('"Tạm nhớ" khi học lại → về review với khoảng đã rút ngắn', () => {
    const lapsed = scheduleReview(reviewState({ intervalDays: 20 }), "hard", NOW, noFuzz);
    const back = scheduleReview(lapsed.state, "good", NOW, noFuzz);
    expect(back.state.phase).toBe("review");
    expect(back.state.intervalDays).toBe(10);
    expect(back.dueInMinutes).toBe(10 * 1440);
  });

  it('"Chưa thuộc" khi đang học lại không cộng thêm lapse', () => {
    const lapsed = scheduleReview(reviewState(), "hard", NOW, noFuzz);
    const again = scheduleReview(lapsed.state, "hard", NOW, noFuzz);
    expect(again.state.lapses).toBe(1);
    expect(again.dueInMinutes).toBe(RELEARN_STEPS_MIN[0]);
  });

  it('"Đã thuộc" khi đang học lại không hẹn đi quá xa', () => {
    const lapsed = scheduleReview(reviewState({ intervalDays: 2 }), "hard", NOW, noFuzz);
    const back = scheduleReview(lapsed.state, "easy", NOW, noFuzz);
    expect(back.state.phase).toBe("review");
    expect(back.state.intervalDays).toBe(GRADUATING_INTERVAL);
  });
});

describe("nhiễu khoảng ôn (fuzz)", () => {
  it("khoảng ngắn không bị nhiễu", () => {
    expect(fuzzInterval(3, () => 0)).toBe(3);
    expect(fuzzInterval(3, () => 1)).toBe(3);
  });

  it("khoảng dài lệch trong ±5%", () => {
    expect(fuzzInterval(100, () => 0)).toBe(95);
    expect(fuzzInterval(100, () => 1)).toBe(105);
    expect(fuzzInterval(100, () => 0.5)).toBe(100);
  });

  it("hai thẻ cùng khoảng không còn tới hạn đúng cùng ngày", () => {
    const state = reviewState({ intervalDays: 30, ease: 2.5 });
    const a = scheduleReview(state, "good", NOW, () => 0);
    const b = scheduleReview(state, "good", NOW, () => 1);
    expect(a.state.intervalDays).not.toBe(b.state.intervalDays);
  });

  it("clampInterval giữ trong [1, trần]", () => {
    expect(clampInterval(0)).toBe(1);
    expect(clampInterval(-5)).toBe(1);
    expect(clampInterval(10_000)).toBe(MAX_INTERVAL_DAYS);
  });
});

describe("leech", () => {
  it(`gắn cờ từ ${LEECH_LAPSES} lần quên`, () => {
    expect(isLeech(LEECH_LAPSES - 1)).toBe(false);
    expect(isLeech(LEECH_LAPSES)).toBe(true);
  });
});

describe("dueAt", () => {
  it("khớp với dueInMinutes", () => {
    const r = scheduleReview(null, "good", NOW, noFuzz);
    expect(r.dueAt.getTime()).toBe(NOW.getTime() + r.dueInMinutes * 60_000);
  });
});

describe("đọc/ghi dòng card_progress", () => {
  it("thẻ chưa từng ôn → null (không có dòng, hoặc dòng rỗng)", () => {
    expect(stateFromRow(null)).toBeNull();
    expect(stateFromRow(undefined)).toBeNull();
    expect(stateFromRow({ status: "new", last_reviewed_at: null })).toBeNull();
  });

  it("dữ liệu trước 0009 (thiếu cột mới) → coi như đã tốt nghiệp, suy ra khoảng cũ", () => {
    const state = stateFromRow({
      status: "good",
      ease_factor: 2.3,
      review_count: 4,
      last_reviewed_at: "2026-08-20T00:00:00.000Z",
      next_due_at: "2026-08-30T00:00:00.000Z",
    });
    expect(state).not.toBeNull();
    expect(state!.phase).toBe("review");
    expect(state!.intervalDays).toBe(10);
    expect(state!.ease).toBe(2.3);
    // Và lượt ôn kế tiếp phải nối tiếp lịch cũ, không nhảy về bước học.
    const next = scheduleReview(state, "good", NOW, noFuzz);
    expect(next.state.intervalDays).toBe(23);
  });

  it("giá trị lạ/ngoài miền được chuẩn hóa", () => {
    const state = stateFromRow({
      status: "good",
      srs_phase: "bịa",
      ease_factor: 99,
      learning_step: -4,
      lapses: -1,
      interval_days: 7,
      last_reviewed_at: "2026-08-20T00:00:00.000Z",
    })!;
    expect(state.phase).toBe("review");
    expect(state.ease).toBe(3);
    expect(state.learningStep).toBe(0);
    expect(state.lapses).toBe(0);
  });

  it("rowFromState ghi đủ cột cho DB", () => {
    const r = scheduleReview(null, "good", NOW, noFuzz);
    const row = rowFromState(r.state, r.dueAt, NOW);
    expect(row).toMatchObject({
      status: "good",
      review_count: 1,
      srs_phase: "learning",
      learning_step: 1,
      interval_days: 0,
      lapses: 0,
    });
    expect(row.last_reviewed_at).toBe(NOW.toISOString());
    expect(row.next_due_at).toBe(r.dueAt.toISOString());
  });

  it("đọc rồi ghi lại không làm đổi trạng thái (round-trip)", () => {
    const first = scheduleReview(null, "good", NOW, noFuzz);
    const row = rowFromState(first.state, first.dueAt, NOW);
    const reread = stateFromRow(row)!;
    expect(reread).toEqual(first.state);
  });
});
