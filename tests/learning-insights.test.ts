import { describe, expect, it } from "vitest";
import { analyzeHealth, analyzeReviews, type HealthCard, type ReviewEvent } from "../src/lib/learning-insights";
const card = (patch: Partial<HealthCard> = {}): HealthCard => ({ id: "a", deck_id: "one", term: " Book ", source_language: "en", target_language: "vi", meaning_vi: "sách", examples: [{ text: "I read a book." }], ...patch });
const now = new Date(2026, 10, 23, 12);
const event = (patch: Partial<ReviewEvent> = {}): ReviewEvent => ({ card_id: "a", status: "good", reviewed_at: now.toISOString(), was_due: true, interval_before: 3, review_type: "typing", ...patch });
describe("card health", () => {
  it("finds blank data and leeches without mutating cards", () => {
    const rows = [card({ meaning_vi: "  ", examples: [{ text: " " }], card_progress: [{ lapses: 6 }] }), card({ id: "b", term: "good" })];
    expect(analyzeHealth(rows).map((row) => row.issues)).toEqual([["meaning", "examples", "leech"]]);
    expect(rows[0].meaning_vi).toBe("  ");
  });
  it("flags duplicates only across decks with the same language pair", () => {
    const rows = [card(), card({ id: "b", term: "book", deck_id: "two" }), card({ id: "c", term: "book", source_language: "de" })];
    expect(analyzeHealth(rows).map((row) => row.card.id)).toEqual(["a", "b"]);
    expect(analyzeHealth([card(), card({ id: "b", term: "book" })])).toEqual([]);
  });
});
describe("review effectiveness", () => {
  it("uses due graduated reviews, excluding initial learning, early reviews and legacy NULLs", () => {
    const result = analyzeReviews([event(), event({ status: "hard" }), event({ status: "easy" }), event({ interval_before: 0, status: "hard" }), event({ was_due: false }), event({ was_due: null, interval_before: null })], now);
    expect(result.due).toBe(3); expect(result.remembered).toBe(2); expect(result.retention).toBe(67); expect(result.unknown).toBe(1);
    expect(result.modes[0]).toMatchObject({ total: 6, forgotten: 2 });
  });
  it("includes the first calendar day, excludes future/old/invalid events and reports no data as null", () => {
    const start = new Date(2026, 10, 17);
    const result = analyzeReviews([event({ reviewed_at: start.toISOString(), status: "hard" }), event({ reviewed_at: new Date(start.getTime() - 1).toISOString() }), event({ reviewed_at: new Date(now.getTime() + 1).toISOString() }), event({ reviewed_at: "invalid" }), event({ status: "new" })], now);
    expect(result.total).toBe(1); expect(result.retention).toBe(0);
    expect(analyzeReviews([], now).retention).toBeNull();
    expect(analyzeReviews([event({ interval_before: null })], now).retention).toBeNull();
  });
  it("groups forgotten words by id and does not invent a card for deleted events", () => {
    const result = analyzeReviews([event({ status: "hard" }), event({ status: "hard" }), event({ card_id: "b", status: "hard", review_type: null }), event({ card_id: null, status: "hard" })], now);
    expect(result.forgotten).toEqual([{ cardId: "a", count: 2 }, { cardId: "b", count: 1 }]);
    expect(result.modes[0].total).toBe(3);
  });
});
