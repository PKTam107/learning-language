import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DictationExercise } from "../src/components/DictationExercise";
const speech = { cancel: vi.fn(), speak: vi.fn() };
let renderer: ReactTestRenderer;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("window", { speechSynthesis: speech });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  act(() => { renderer = create(createElement(DictationExercise, { sentences: ["I read a book.", "We like good coffee."] })); });
});
afterEach(() => { act(() => renderer.unmount()); vi.unstubAllGlobals(); });
const button = (text: string) => renderer.root.findAllByType("button").find((node) => node.children.includes(text))!;
describe("dictation interaction", () => {
  it("hides the answer before submission, aligns mistakes and resets the next question", () => {
    expect(JSON.stringify(renderer.toJSON())).not.toContain("I read a book.");
    expect(speech.speak).not.toHaveBeenCalled();
    act(() => button("Nghe câu").props.onClick());
    expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ text: "I read a book.", lang: "en-US" }));
    act(() => renderer.root.findByType("textarea").props.onChange({ target: { value: "I read book" } }));
    act(() => renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }));
    expect(JSON.stringify(renderer.toJSON())).toContain("Thiếu: a");
    expect(renderer.root.findByType("textarea").props.disabled).toBe(true);
    act(() => button("Câu tiếp theo").props.onClick());
    expect(renderer.root.findByType("textarea").props.value).toBe("");
    expect(renderer.root.findByType("textarea").props.disabled).toBe(false);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("We like good coffee.");
  });
  it("ignores late audio errors after stopping and cancels speech when leaving", () => {
    act(() => button("Nghe câu").props.onClick());
    const utterance = speech.speak.mock.calls[0][0];
    act(() => button("Dừng").props.onClick());
    act(() => utterance.onerror({ error: "network" }));
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
    const count = speech.cancel.mock.calls.length;
    act(() => renderer.unmount());
    expect(speech.cancel.mock.calls.length).toBe(count + 1);
  });
});
