import { describe, expect, it } from "vitest";
import {
  MAX_CHIPS,
  MAX_SHARED_LEN,
  parseSharedText,
} from "../src/lib/share-text";

/**
 * Nội dung chia sẻ đến từ mọi app khác nhau (Chrome, Kindle, YouTube, trình
 * đọc PDF...) nên không có khuôn dạng nào chắc chắn. Test này chốt cách phân
 * loại: cái gì tra thẳng, cái gì phải cho người dùng chọn.
 */
describe("parseSharedText", () => {
  it("một từ → tra thẳng", () => {
    const r = parseSharedText("serendipity");
    expect(r.isSingleTerm).toBe(true);
    expect(r.term).toBe("serendipity");
    expect(r.candidates).toEqual([]);
  });

  it("cụm ngắn vẫn tra thẳng (phrasal verb, thành ngữ)", () => {
    expect(parseSharedText("look forward to").isSingleTerm).toBe(true);
  });

  it("câu có dấu kết thúc là đoạn văn, không phải cụm từ", () => {
    const r = parseSharedText("She is kind.");
    expect(r.isSingleTerm).toBe(false);
    expect(r.candidates).toEqual(["She", "is", "kind"]);
  });

  it("đoạn văn → tách từ, bỏ trùng (không phân biệt hoa thường), giữ thứ tự", () => {
    const r = parseSharedText("The cat sat on the mat with another cat nearby");
    expect(r.isSingleTerm).toBe(false);
    expect(r.candidates).toEqual([
      "The",
      "cat",
      "sat",
      "on",
      // "the" thứ hai bị bỏ vì trùng "The" đầu câu.
      "mat",
      "with",
      "another",
      "nearby",
    ]);
  });

  it("bỏ từ 1 ký tự và dấu câu bám ngoài", () => {
    const r = parseSharedText('I "love" it, truly — a lot!');
    expect(r.candidates).toEqual(["love", "it", "truly", "lot"]);
  });

  it("chia sẻ một đường link thì không coi link là từ", () => {
    const r = parseSharedText("https://example.com/some-article");
    expect(r.isSingleTerm).toBe(false);
    expect(r.candidates).toEqual([]);
  });

  it("link lẫn trong câu bị loại, phần chữ vẫn dùng được", () => {
    const r = parseSharedText(
      "Read this www.example.com about true resilience"
    );
    expect(r.candidates).toEqual([
      "Read",
      "this",
      "about",
      "true",
      "resilience",
    ]);
  });

  it("nội dung rỗng không làm hỏng gì", () => {
    const r = parseSharedText("   ");
    expect(r).toEqual({
      text: "",
      isSingleTerm: false,
      term: null,
      candidates: [],
    });
  });

  it("cắt nội dung quá dài và chặn số chip", () => {
    // Chữ cái thuần: `w1`, `w2`... sẽ bị rút về "w" rồi coi là trùng nhau.
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const long = Array.from(
      { length: 900 },
      (_, i) => alphabet[i % 26] + alphabet[(i / 26) % 26 | 0] + alphabet[(i / 676) % 26 | 0]
    ).join(" ");
    const r = parseSharedText(long);
    expect(r.text.length).toBeLessThanOrEqual(MAX_SHARED_LEN);
    expect(r.candidates).toHaveLength(MAX_CHIPS);
  });
});
