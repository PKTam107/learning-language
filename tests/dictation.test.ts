import { describe, expect, it } from "vitest";
import { checkDictation, dictationSentences } from "../src/lib/dictation";
describe("sentence dictation", () => {
  it("ignores case, punctuation, whitespace and curly quotes but preserves contractions and spelling", () => {
    expect(checkDictation("I don’t like coffee!", "i don't LIKE coffee.").correct).toBe(true);
    expect(checkDictation("I don't like coffee.", "I dont like coffee").correct).toBe(false);
    expect(checkDictation("A book", "A bok").tokens).toContainEqual({ text: "bok", expected: "book", kind: "wrong" });
    expect(checkDictation("!!!", "").correct).toBe(false);
  });
  it("aligns missing and extra words without marking the rest of the sentence wrong", () => {
    expect(checkDictation("I read a book every day.", "I read book every day").tokens).toEqual([
      { text: "i", kind: "correct" }, { text: "read", kind: "correct" }, { text: "a", kind: "missing" }, { text: "book", kind: "correct" }, { text: "every", kind: "correct" }, { text: "day", kind: "correct" },
    ]);
    expect(checkDictation("I read books", "I often read books").tokens[1]).toEqual({ text: "often", kind: "extra" });
    expect(checkDictation("I read books", "").tokens.every((token) => token.kind === "missing")).toBe(true);
  });
  it("selects English examples, deduplicates and skips empty/too short/too long content", () => {
    const examples = ["I read a book.", "i read a book!", "Hi!", " ", "word ".repeat(61), "long".repeat(130)].map((text) => ({ text }));
    expect(dictationSentences([{ source_language: "en", examples }, { source_language: "vi", examples: [{ text: "Tôi đọc sách." }] }, { source_language: "en", examples: null }])).toEqual(["I read a book."]);
  });
});
