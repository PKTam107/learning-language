import { describe, expect, it } from "vitest";
import { parseGeneratedReading, readingSegments, ReadingQuestionSchema, type ReadingWord } from "../src/lib/reading";
const word = (id: string, term: string): ReadingWord => ({ id, term, meaning: "nghĩa", image: null, audio: null });
const words = [word("a", "apple"), word("b", "river bank"), word("c", "book")];
const question = { prompt: "Where?", options: ["At home", "At school"], answerIndex: 0, explanation: "Trong bài có nói." };
const passage = "An apple and a book are near the river bank. " + Array(75).fill("word").join(" ");

describe("reading lesson validation and vocabulary links", () => {
  it("matches exact words, preserves text, and prefers full phrases over shorter terms", () => {
    const text = "APPLE, pineapple, river bank, and a book.";
    const parts = readingSegments(text, [...words, word("d", "river")]);
    expect(parts.map((p) => p.text).join("")).toBe(text);
    expect(parts.filter((p) => p.word).map((p) => p.word?.id)).toEqual(["a", "b", "c"]);
    expect(readingSegments("Nothing here.", [])).toEqual([{ text: "Nothing here." }]);
  });
  it("escapes punctuation in terms instead of treating it as regex", () => {
    expect(readingSegments("I work (part-time) today.", [word("p", "part-time")]).find((p) => p.word)?.text).toBe("part-time");
    expect(() => readingSegments("test", [word("p", "a[b")])).not.toThrow();
  });
  it("accepts a bounded story with all selected vocabulary and exactly two valid questions", () => {
    const content = { title: "A day", passage, questions: [question, question] };
    expect(parseGeneratedReading('```json\n' + JSON.stringify(content) + '\n```', words)).toEqual(content);
    for (const patch of [{ passage: "Too short" }, { passage: Array(121).fill("word").join(" ") }, { passage: passage.replace("apple", "pear") }, { questions: [question] }]) {
      expect(() => parseGeneratedReading(JSON.stringify({ ...content, ...patch }), words)).toThrow();
    }
  });
  it("rejects invalid correct-answer indices and duplicate choices", () => {
    expect(ReadingQuestionSchema.safeParse({ ...question, answerIndex: 2 }).success).toBe(false);
    expect(ReadingQuestionSchema.safeParse({ ...question, options: ["same", "same"] }).success).toBe(false);
  });
});
