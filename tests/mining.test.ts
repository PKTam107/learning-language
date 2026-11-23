import { describe, expect, it } from "vitest";
import { mineWords, MINING_MAX_TEXT } from "../src/lib/mining";
describe("mining words from English text", () => {
  it("deduplicates, counts occurrences, retains original context and marks known CEFR", () => {
    const result = mineWords("I read a Book. This book is great!");
    expect(result.find((word) => word.term === "book")).toMatchObject({ term: "book", count: 2, context: "I read a Book.", level: "A1" });
    expect(result.some((word) => word.term === "i")).toBe(false);
    expect(mineWords("zzqv")[0].level).toBeNull();
  });
  it("excludes URLs and partial accented/numeric tokens while retaining contractions", () => {
    const terms = mineWords("Visit https://example.com/path?q=book and www.test.net. Don't café book123 well-known!").map((word) => word.term);
    expect(terms).toEqual(["visit", "and", "don't", "well-known"]);
  });
  it("preserves context around a word late in a long paragraph", () => {
    const word = mineWords("ordinary ".repeat(100) + "A unique treasure appears here.").find((item) => item.term === "treasure")!;
    expect(word.context).toContain("treasure"); expect(word.context.length).toBeLessThanOrEqual(600);
  });
  it("bounds input length and candidate count", () => {
    const many = Array.from({ length: 300 }, (_, i) => `word${String.fromCharCode(97 + Math.floor(i / 26))}${String.fromCharCode(97 + i % 26)}`).join(" ");
    expect(mineWords(many)).toHaveLength(200);
    expect(mineWords(" ".repeat(MINING_MAX_TEXT) + "hidden")).toEqual([]);
  });
});
