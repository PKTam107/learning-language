import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRecorder, RECORDING_LIMIT_MS, type RecorderAdapter } from "../src/hooks/useRecorder";
const adapter = { start: vi.fn<RecorderAdapter["start"]>(), stop: vi.fn<RecorderAdapter["stop"]>(), play: vi.fn<RecorderAdapter["play"]>(), stopPlayback: vi.fn<RecorderAdapter["stopPlayback"]>(), save: vi.fn<RecorderAdapter["save"]>(), dispose: vi.fn() };
let recording: ReturnType<typeof useRecorder>, renderer: ReactTestRenderer;
function Harness() { recording = useRecorder(adapter); return null; }
beforeEach(() => {
  vi.resetAllMocks(); adapter.start.mockResolvedValue(); adapter.stop.mockResolvedValue(); adapter.play.mockResolvedValue(); adapter.stopPlayback.mockResolvedValue(); adapter.save.mockResolvedValue("Saved locally");
  act(() => { renderer = create(createElement(Harness)); });
});
afterEach(() => { act(() => renderer.unmount()); vi.useRealTimers(); });
describe("recording lifecycle", () => {
  it("requests the microphone only on demand and can stop, play, save and discard", async () => {
    expect(adapter.start).not.toHaveBeenCalled();
    await act(async () => { await recording.start(); }); expect(recording.phase).toBe("recording");
    await act(async () => { await recording.finish(); }); expect(recording.phase).toBe("ready");
    await act(async () => { await recording.play(); }); expect(recording.playing).toBe(true);
    act(() => adapter.play.mock.calls[0][0]()); expect(recording.playing).toBe(false);
    await act(async () => { await recording.save(); }); expect(recording.message).toBe("Saved locally");
    act(() => recording.reset()); expect(recording.phase).toBe("idle"); expect(adapter.dispose).toHaveBeenCalled();
  });
  it("shows denial errors and allows retry instead of leaving the controls stuck", async () => {
    adapter.start.mockRejectedValueOnce(new Error("denied"));
    await act(async () => { await recording.start(); });
    expect(recording.phase).toBe("idle"); expect(recording.error).toContain("micro");
    await act(async () => { await recording.start(); }); expect(recording.phase).toBe("recording"); expect(recording.error).toBe("");
  });
  it("prevents overlapping start requests and ignores permission results after leaving", async () => {
    let resolve!: () => void;
    adapter.start.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    let pending!: Promise<void>;
    act(() => { pending = recording.start(); void recording.start(); });
    expect(adapter.start).toHaveBeenCalledTimes(1);
    act(() => recording.reset());
    await act(async () => { resolve(); await pending; }); expect(recording.phase).toBe("idle");
  });
  it("automatically stops after 60 seconds and preserves a clip when saving fails", async () => {
    vi.useFakeTimers();
    await act(async () => { await recording.start(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(RECORDING_LIMIT_MS); });
    expect(adapter.stop).toHaveBeenCalledTimes(1); expect(recording.phase).toBe("ready");
    adapter.save.mockRejectedValueOnce(new Error("disk full"));
    await act(async () => { await recording.save(); }); expect(recording.phase).toBe("ready"); expect(recording.error).toContain("vẫn còn");
    await act(async () => { await recording.save(); }); expect(recording.error).toBe("");
  });
  it("releases device resources when the component unmounts", async () => {
    await act(async () => { await recording.start(); });
    act(() => renderer.unmount()); expect(adapter.dispose).toHaveBeenCalledTimes(1);
  });
});
