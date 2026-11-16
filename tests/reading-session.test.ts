import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadingLesson } from "../src/hooks/useReadingLesson";
import type { ReadingLesson, ReadingRequest } from "../src/lib/reading";
const sample: ReadingLesson = {
  title: "A day", passage: "This is a book.", source: "generated",
  words: [{ id: "a", term: "book", meaning: "sách", image: null, audio: null }],
  questions: [0, 1].map((answerIndex) => ({ prompt: "Question?", options: ["A", "B"], answerIndex, explanation: "Giải thích" })),
};
const fetchLesson = vi.fn<(input: ReadingRequest) => Promise<ReadingLesson>>();
let reading: ReturnType<typeof useReadingLesson>;
let renderer: ReactTestRenderer;
function Harness() { reading = useReadingLesson(fetchLesson); return null; }
beforeEach(() => { fetchLesson.mockReset(); act(() => { renderer = create(createElement(Harness)); }); });
afterEach(() => { act(() => renderer.unmount()); });

describe("reading practice session", () => {
  it("does not call AI until requested, then scores only the first answer to each question", async () => {
    expect(fetchLesson).not.toHaveBeenCalled();
    fetchLesson.mockResolvedValue(sample);
    await act(async () => { await reading.generate({ topic: "daily" }); });
    expect(reading.finished).toBe(false);
    act(() => { reading.answer(0, 1); reading.answer(0, 0); reading.answer(1, 1); });
    expect(reading.answers).toEqual([1, 1]);
    expect(reading.score).toBe(1); expect(reading.finished).toBe(true);
  });
  it("keeps the current lesson on network failure, and resets answers and selected word for a new lesson", async () => {
    fetchLesson.mockResolvedValueOnce(sample).mockRejectedValueOnce(new Error("Thử lại sau")).mockResolvedValueOnce({ ...sample, title: "Next" });
    await act(async () => { await reading.generate({ topic: "daily" }); });
    act(() => { reading.answer(0, 0); reading.setSelectedWord(sample.words[0]); });
    await act(async () => { await reading.generate({ topic: "travel" }); });
    expect(reading.lesson?.title).toBe("A day"); expect(reading.error).toBe("Thử lại sau");
    await act(async () => { await reading.generate({ topic: "work" }); });
    expect(reading.lesson?.title).toBe("Next"); expect(reading.error).toBe("");
    expect(reading.answers).toEqual([null, null]); expect(reading.selectedWord).toBeNull();
  });
  it("prevents double generation clicks while a request is pending", async () => {
    let resolve!: (lesson: ReadingLesson) => void;
    fetchLesson.mockReturnValue(new Promise((done) => { resolve = done; }));
    act(() => { void reading.generate({ topic: "daily" }); void reading.generate({ topic: "daily" }); });
    expect(fetchLesson).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(sample); });
    expect(reading.busy).toBe(false);
  });
});
