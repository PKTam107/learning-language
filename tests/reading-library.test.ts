import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { parseLibrary, type SavedReading } from "../src/lib/reading-library";
import { useReadingLibrary } from "../src/hooks/useReadingLibrary";
const entry: SavedReading = {
  lesson: { title: "A book", passage: "This is a book.", source: "examples", words: [{ id: "a", term: "book", meaning: "sách", audio: null, image: null }], questions: [{ prompt: "What?", options: ["Book", "Car"], answerIndex: 0, explanation: "A book." }] },
  answers: [null], updatedAt: "2026-11-16T00:00:00.000Z",
};
describe("saved reading lessons", () => {
  it("restores valid lessons and discards corrupted entries and invalid answers", () => {
    expect(parseLibrary(JSON.stringify([entry, { ...entry, answers: [9] }, { broken: true }]))).toEqual([entry]);
    expect(parseLibrary("broken")).toEqual([]);
    expect(parseLibrary(null)).toEqual([]);
    expect(parseLibrary(JSON.stringify(Array(30).fill(entry)))).toHaveLength(20);
  });
  it("loads before writing and updates one saved lesson with the latest answers", async () => {
    const store = { load: vi.fn().mockResolvedValue([entry]), save: vi.fn().mockResolvedValue(undefined) };
    let library!: ReturnType<typeof useReadingLibrary>;
    function Harness({ answers }: { answers: (number | null)[] }) { library = useReadingLibrary(store, entry.lesson, answers); return null; }
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(createElement(Harness, { answers: [null] })); });
    expect(store.load).toHaveBeenCalledTimes(1);
    expect(library.items).toHaveLength(1);
    await act(async () => { renderer.update(createElement(Harness, { answers: [0] })); });
    expect(library.items[0].answers).toEqual([0]);
    expect(store.save).toHaveBeenLastCalledWith(expect.arrayContaining([expect.objectContaining({ answers: [0] })]));
    act(() => renderer.unmount());
  });
  it("deletes an active lesson without autosaving it again, and clears the remaining library", async () => {
    const other = { ...entry, lesson: { ...entry.lesson, title: "Other", passage: "Another passage." } };
    const store = { load: vi.fn().mockResolvedValue([entry, other]), save: vi.fn().mockResolvedValue(undefined) };
    let library!: ReturnType<typeof useReadingLibrary>;
    function Harness({ answers }: { answers: (number | null)[] }) { library = useReadingLibrary(store, entry.lesson, answers); return null; }
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(createElement(Harness, { answers: [null] })); });
    await act(async () => { library.remove(entry.lesson.passage); });
    expect(library.items.map((item) => item.lesson.title)).toEqual(["Other"]);
    await act(async () => { renderer.update(createElement(Harness, { answers: [0] })); });
    expect(library.items.map((item) => item.lesson.title)).toEqual(["Other"]);
    await act(async () => { library.clear(); });
    expect(library.items).toEqual([]);
    expect(store.save).toHaveBeenLastCalledWith([]);
    act(() => renderer.unmount());
  });

});
