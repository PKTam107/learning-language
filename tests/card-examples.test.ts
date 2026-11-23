import { createElement, useState } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { DraftEditor } from "../src/components/flashcard/DraftEditor";
import type { DraftCard } from "../src/types";
vi.mock("@/components/flashcard/ImagePicker", () => ({ ImagePicker: () => null }));
vi.mock("@/components/flashcard/AudioButton", () => ({ AudioButton: () => null }));
let current: DraftCard;
function Harness() {
  const [draft, setDraft] = useState<DraftCard>({ term: "book", meaningVi: "sách", definitions: [], examples: [], sourceLanguage: "en", targetLanguage: "vi", note: "Keep this note" });
  current = draft;
  return createElement(DraftEditor, { draft, onChange: setDraft });
}
describe("repairing example-less cards", () => {
  it("adds, edits and removes examples without losing other card fields", () => {
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(createElement(Harness)); });
    try {
      const button = (label: string) => renderer.root.findAllByType("button").find((node) => node.children.join("") === label)!;
      act(() => button("Thêm câu ví dụ").props.onClick());
      act(() => renderer.root.findByProps({ "aria-label": "Câu ví dụ tiếng Anh 1" }).props.onChange({ target: { value: "I read a book." } }));
      act(() => renderer.root.findByProps({ "aria-label": "Nghĩa câu ví dụ 1" }).props.onChange({ target: { value: "Tôi đọc sách." } }));
      expect(current.examples).toEqual([{ text: "I read a book.", textVi: "Tôi đọc sách." }]);
      expect(current).toMatchObject({ term: "book", meaningVi: "sách", note: "Keep this note" });
      act(() => button("Bỏ câu 1").props.onClick());
      expect(current.examples).toEqual([]);
    } finally { act(() => renderer.unmount()); }
  });
});
