import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecorderAdapter } from "../src/hooks/useRecorder";
const mocks = vi.hoisted(() => ({ permission: vi.fn(), mode: vi.fn(), prepare: vi.fn(), start: vi.fn(), stop: vi.fn(), info: vi.fn(), deleteFile: vi.fn(), save: vi.fn(), sound: vi.fn(), play: vi.fn(), unload: vi.fn() }));
vi.mock("../mobile/node_modules/expo-av/build/index.js", () => ({ Audio: {
  requestPermissionsAsync: mocks.permission, setAudioModeAsync: mocks.mode,
  RecordingOptionsPresets: { HIGH_QUALITY: {} },
  Recording: class { prepareToRecordAsync = mocks.prepare; startAsync = mocks.start; stopAndUnloadAsync = mocks.stop; getURI() { return "file:///cache/voice.m4a"; } },
  Sound: { createAsync: mocks.sound },
} }));
vi.mock("../mobile/node_modules/expo-file-system/src/index.ts", () => ({ getInfoAsync: mocks.info, deleteAsync: mocks.deleteFile }));
vi.mock("../mobile/src/lib/recordings", () => ({ saveRecording: mocks.save }));
const path = "../mobile/src/lib/recorder";
const { createRecorder } = await import(path) as { createRecorder(): RecorderAdapter };
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
beforeEach(() => {
  vi.resetAllMocks(); mocks.permission.mockResolvedValue({ granted: true }); mocks.mode.mockResolvedValue(undefined); mocks.prepare.mockResolvedValue(undefined); mocks.start.mockResolvedValue(undefined); mocks.stop.mockResolvedValue(undefined);
  mocks.info.mockResolvedValue({ exists: true, size: 100 }); mocks.deleteFile.mockResolvedValue(undefined); mocks.save.mockResolvedValue("linguacards-123.m4a");
  mocks.sound.mockResolvedValue({ sound: { playAsync: mocks.play, unloadAsync: mocks.unload } }); mocks.play.mockResolvedValue(undefined); mocks.unload.mockResolvedValue(undefined);
});
describe("native recording resources", () => {
  it("handles permission denial without preparing the microphone", async () => {
    mocks.permission.mockResolvedValueOnce({ granted: false });
    const recorder = createRecorder(); await expect(recorder.start()).rejects.toThrow("denied"); expect(mocks.prepare).not.toHaveBeenCalled();
    recorder.dispose(); await flush();
  });
  it("stops and restores audio mode, saves a durable copy only once and deletes only the temporary file", async () => {
    const recorder = createRecorder(); await recorder.start(); await recorder.stop();
    expect(mocks.start).toHaveBeenCalledTimes(1); expect(mocks.mode).toHaveBeenLastCalledWith({ allowsRecordingIOS: false });
    await recorder.save(); await recorder.save(); expect(mocks.save).toHaveBeenCalledTimes(1); expect(mocks.save).toHaveBeenCalledWith("file:///cache/voice.m4a");
    await recorder.play(() => {}); expect(mocks.play).toHaveBeenCalledTimes(1);
    recorder.dispose(); await flush(); expect(mocks.unload).toHaveBeenCalled(); expect(mocks.deleteFile).toHaveBeenCalledWith("file:///cache/voice.m4a", { idempotent: true });
  });
  it("does not start recording when permission arrives after the screen is closed", async () => {
    let resolve!: (value: { granted: boolean }) => void;
    mocks.permission.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const recorder = createRecorder(); const pending = recorder.start(); await flush(); recorder.dispose(); resolve({ granted: true }); await pending; await flush();
    expect(mocks.prepare).not.toHaveBeenCalled(); expect(mocks.start).not.toHaveBeenCalled();
  });
  it("unloads a recorder whose preparation finishes after cancellation", async () => {
    let resolve!: () => void;
    mocks.prepare.mockReturnValueOnce(new Promise<void>((done) => { resolve = done; }));
    const recorder = createRecorder(); const pending = recorder.start(); await flush(); recorder.dispose(); resolve(); await pending; await flush();
    expect(mocks.start).not.toHaveBeenCalled(); expect(mocks.stop).toHaveBeenCalled(); expect(mocks.deleteFile).toHaveBeenCalled();
  });
  it("rejects empty recordings so the UI can offer another attempt", async () => {
    mocks.info.mockResolvedValueOnce({ exists: true, size: 0 });
    const recorder = createRecorder(); await recorder.start(); await expect(recorder.stop()).rejects.toThrow("Empty"); recorder.dispose(); await flush();
  });
});
