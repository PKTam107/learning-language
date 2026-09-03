import { describe, expect, it } from "vitest";
import type { QueueCard } from "@/lib/queue";
import {
  DEFAULT_NEW_PER_DAY,
  buildDueQueue,
  computeStats,
  dueTodayCount,
  isDueReview,
  isNewCard,
  remainingNew,
  splitDue,
} from "@/lib/queue";

const NOW = new Date("2026-09-02T08:00:00.000Z").getTime();
const iso = (offsetDays: number) =>
  new Date(NOW + offsetDays * 86_400_000).toISOString();

/** Thẻ tối giản cho test: chỉ cần `progress` + một id để đối chiếu thứ tự. */
type TestCard = QueueCard & { id: string };

const newCard = (id: string): TestCard => ({ id });
const learned = (id: string, dueInDays: number): TestCard => ({
  id,
  progress: { last_reviewed_at: iso(-1), next_due_at: iso(dueInDays) },
});

describe("phân loại thẻ", () => {
  it("thẻ chưa có tiến độ là từ mới", () => {
    expect(isNewCard(newCard("a"))).toBe(true);
    expect(isNewCard({ progress: null })).toBe(true);
    expect(isNewCard(learned("c", -1))).toBe(false);
  });

  it("từ mới KHÔNG phải thẻ tới hạn ôn lại", () => {
    // Đây là điểm khác cốt lõi so với isDue(): nhập 200 từ không còn nghĩa là
    // 200 thẻ "tới hạn" hôm nay.
    expect(isDueReview(newCard("a"), NOW)).toBe(false);
    expect(isDueReview(learned("b", -1), NOW)).toBe(true);
    expect(isDueReview(learned("c", 3), NOW)).toBe(false);
  });

  it("dòng tiến độ thiếu next_due_at vẫn coi là tới hạn", () => {
    const card = { id: "x", progress: { last_reviewed_at: iso(-2), next_due_at: null } };
    expect(isDueReview(card, NOW)).toBe(true);
  });
});

describe("hạn mức từ mới", () => {
  it("trừ dần theo số từ mới đã học hôm nay", () => {
    expect(remainingNew({ newPerDay: 15, introducedToday: 0 })).toBe(15);
    expect(remainingNew({ newPerDay: 15, introducedToday: 10 })).toBe(5);
    expect(remainingNew({ newPerDay: 15, introducedToday: 20 })).toBe(0);
  });

  it("0 = không giới hạn", () => {
    expect(remainingNew({ newPerDay: 0, introducedToday: 99 })).toBe(Infinity);
  });
});

describe("buildDueQueue", () => {
  const cards = [
    learned("r1", -2),
    learned("r2", -1),
    learned("future", 5),
    newCard("n1"),
    newCard("n2"),
    newCard("n3"),
  ];

  it("gồm thẻ tới hạn + từ mới trong hạn mức, bỏ thẻ chưa tới hạn", () => {
    const q = buildDueQueue(cards, { newPerDay: 2, introducedToday: 0 }, NOW);
    expect(q.cards.map((c) => c.id)).toEqual(["r1", "r2", "n1", "n2"]);
    expect(q.reviewCount).toBe(2);
    expect(q.newCount).toBe(2);
    expect(q.newHeldBack).toBe(1);
  });

  it("hết hạn mức thì chỉ còn thẻ ôn lại", () => {
    const q = buildDueQueue(cards, { newPerDay: 2, introducedToday: 2 }, NOW);
    expect(q.cards.map((c) => c.id)).toEqual(["r1", "r2"]);
    expect(q.newHeldBack).toBe(3);
  });

  it("không giới hạn thì lấy hết từ mới", () => {
    const q = buildDueQueue(cards, { newPerDay: 0, introducedToday: 0 }, NOW);
    expect(q.newCount).toBe(3);
    expect(q.newHeldBack).toBe(0);
  });

  it("không cắt bớt thẻ đã tới hạn ôn lại (việc đã hẹn thì phải trả)", () => {
    const many = Array.from({ length: 80 }, (_, i) => learned(`r${i}`, -1));
    const q = buildDueQueue(many, { newPerDay: 5, introducedToday: 0 }, NOW);
    expect(q.cards).toHaveLength(80);
  });

  it("kho thẻ mới nhập không còn dồn hết vào hôm nay", () => {
    const imported = Array.from({ length: 200 }, (_, i) => newCard(`c${i}`));
    const q = buildDueQueue(
      imported,
      { newPerDay: DEFAULT_NEW_PER_DAY, introducedToday: 0 },
      NOW
    );
    expect(q.cards).toHaveLength(DEFAULT_NEW_PER_DAY);
    expect(q.newHeldBack).toBe(200 - DEFAULT_NEW_PER_DAY);
  });
});

describe("splitDue", () => {
  it("tách hai nhóm, giữ nguyên thứ tự đầu vào", () => {
    const { reviews, news } = splitDue(
      [newCard("n1"), learned("r1", -1), learned("f", 2), newCard("n2")],
      NOW
    );
    expect(reviews.map((c) => c.id)).toEqual(["r1"]);
    expect(news.map((c) => c.id)).toEqual(["n1", "n2"]);
  });
});

describe("dueTodayCount", () => {
  it("khớp với kích thước hàng đợi thật", () => {
    const cards = [
      learned("r1", -1),
      newCard("n1"),
      newCard("n2"),
      newCard("n3"),
    ];
    const policy = { newPerDay: 2, introducedToday: 0 };
    const q = buildDueQueue(cards, policy, NOW);
    expect(dueTodayCount({ dueReviews: 1, newAvailable: 3 }, policy)).toBe(
      q.cards.length
    );
  });

  it("không giới hạn → đếm tất cả", () => {
    expect(
      dueTodayCount(
        { dueReviews: 4, newAvailable: 200 },
        { newPerDay: 0, introducedToday: 0 }
      )
    ).toBe(204);
  });

  it("số đếm âm/lệch không làm ra kết quả âm", () => {
    expect(
      dueTodayCount(
        { dueReviews: -3, newAvailable: -2 },
        { newPerDay: 10, introducedToday: 0 }
      )
    ).toBe(0);
  });
});

describe("computeStats", () => {
  const cards = [
    { id: "a", progress: { status: "easy", last_reviewed_at: iso(-5), next_due_at: iso(4) } },
    { id: "b", progress: { status: "hard", last_reviewed_at: iso(-2), next_due_at: iso(-1) } },
    { id: "c" },
    { id: "d" },
  ] as any[];

  it("đếm trạng thái + hàng đợi hôm nay đã trừ hạn mức", () => {
    const s = computeStats(cards, { newPerDay: 1, introducedToday: 0 }, NOW);
    expect(s.total).toBe(4);
    expect(s.byStatus).toEqual({ new: 2, hard: 1, good: 0, easy: 1 });
    expect(s.dueReviews).toBe(1);
    expect(s.newToday).toBe(1);
    expect(s.newHeldBack).toBe(1);
    expect(s.due).toBe(2);
  });

  it("mặc định (chưa nạp cài đặt) coi như không giới hạn", () => {
    expect(computeStats(cards, undefined, NOW).due).toBe(3);
  });
});
