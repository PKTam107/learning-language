import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createRecorder } from "../src/lib/recorder";
const stopTrack = vi.fn(), getUserMedia = vi.fn(), revoke = vi.fn(), createUrl = vi.fn();
class MockRecorder {
  static isTypeSupported = () => true;
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable?: (event: { data: Blob }) => void;
  onstop?: () => void;
  onerror?: () => void;
  start() { this.state = "recording"; }
  stop() { this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["voice"]) }); this.onstop?.(); }
}
beforeEach(() => {
  vi.clearAllMocks();
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } }); vi.stubGlobal("MediaRecorder", MockRecorder);
  createUrl.mockReturnValue("blob:clip"); vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revoke });
});
afterEach(() => vi.unstubAllGlobals());
describe("web recording resources", () => {
  it("waits for final audio data, stops microphone tracks and releases the blob URL", async () => {
    const recorder = createRecorder();
    expect(getUserMedia).not.toHaveBeenCalled();
    await recorder.start(); expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    await recorder.stop(); expect(stopTrack).toHaveBeenCalled(); expect(createUrl).toHaveBeenCalledWith(expect.any(Blob));
    recorder.dispose(); expect(revoke).toHaveBeenCalledWith("blob:clip");
  });
  it("stops a stream granted after disposal without opening a recording", async () => {
    let resolve!: (value: unknown) => void;
    getUserMedia.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    const recorder = createRecorder(); const pending = recorder.start(); recorder.dispose();
    resolve({ getTracks: () => [{ stop: stopTrack }] }); await pending;
    expect(stopTrack).toHaveBeenCalledTimes(1); expect(createUrl).not.toHaveBeenCalled();
  });
  it("stops tracks when MediaRecorder construction fails", async () => {
    vi.stubGlobal("MediaRecorder", class { static isTypeSupported = () => true; constructor() { throw new Error("unsupported"); } });
    await expect(createRecorder().start()).rejects.toThrow("unsupported"); expect(stopTrack).toHaveBeenCalledTimes(1);
  });
  it("downloads a local audio file without uploading it", async () => {
    const recorder = createRecorder(); await recorder.start(); await recorder.stop();
    const anchor = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", { createElement: () => anchor, body: { appendChild: vi.fn() } });
    expect(await recorder.save()).toContain("tải"); expect(anchor.href).toBe("blob:clip"); expect(anchor.download).toMatch(/\.webm$/); expect(anchor.click).toHaveBeenCalled();
    recorder.dispose();
  });
});
