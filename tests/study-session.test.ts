import { describe, expect, it } from "vitest";
import { retryCards } from "../src/lib/study-session";
import type { CardWithProgress } from "../src/types";

const cards = ["apple", "book", "cat", "dog"].map(
  (term, i) => ({ id: `card-${i}`, term }) as CardWithProgress
);

describe("luyện lại từ vừa quên", () => {
  it("chỉ lấy từ trả lời sai; không gom từ bỏ qua hoặc nhớ được", () => {
    expect(retryCards(cards, [
      { index: 0, status: "good" },
      { index: 2, status: "hard" },
      { index: 3, status: "easy" },
    ])).toEqual([cards[2]]);
  });

  it("không giữ từ sai khi lượt đó đã hoàn tác rồi trả lời đúng", () => {
    // History chỉ chứa lượt còn hiệu lực sau hoàn tác.
    expect(retryCards(cards, [{ index: 0, status: "good" }])).toEqual([]);
    expect(retryCards(cards, [])).toEqual([]);
  });

  it("giữ thứ tự phiên học, không lặp thẻ hoặc lấy chỉ số ngoài hàng đợi", () => {
    expect(retryCards(cards, [
      { index: 2, status: "hard" },
      { index: 0, status: "hard" },
      { index: 2, status: "hard" },
      { index: 9, status: "hard" },
    ])).toEqual([cards[0], cards[2]]);
  });

  it("lượt luyện sau chỉ còn những từ vẫn chưa nhớ ở lượt luyện trước", () => {
    const first = retryCards(cards, [
      { index: 0, status: "hard" },
      { index: 2, status: "hard" },
    ]);
    expect(retryCards(first, [
      { index: 0, status: "good" },
      { index: 1, status: "hard" },
    ])).toEqual([cards[2]]);
  });
});
