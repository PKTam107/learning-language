import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), mkdir: vi.fn(), copy: vi.fn(), info: vi.fn(), read: vi.fn(), remove: vi.fn(), available: vi.fn(), share: vi.fn() }));
vi.mock("../mobile/src/lib/supabase", () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock("../mobile/node_modules/expo-file-system/src/index.ts", () => ({ documentDirectory: "file:///documents/", makeDirectoryAsync: mocks.mkdir, copyAsync: mocks.copy, getInfoAsync: mocks.info, readDirectoryAsync: mocks.read, deleteAsync: mocks.remove }));
vi.mock("../mobile/node_modules/expo-sharing/build/Sharing.js", () => ({ isAvailableAsync: mocks.available, shareAsync: mocks.share }));
const path = "../mobile/src/lib/recordings";
const recordings = await import(path) as { saveRecording(uri: string): Promise<string>; listRecordings(): Promise<string[]>; removeRecording(name: string): Promise<void>; shareRecording(name: string): Promise<void> };
beforeEach(() => {
  vi.resetAllMocks(); mocks.session.mockResolvedValue({ data: { session: { user: { id: "user-a" } } } }); mocks.mkdir.mockResolvedValue(undefined); mocks.copy.mockResolvedValue(undefined); mocks.info.mockResolvedValue({ exists: true }); mocks.read.mockResolvedValue(["linguacards-123.m4a", "other-file.txt"]); mocks.available.mockResolvedValue(true); mocks.share.mockResolvedValue(undefined); mocks.remove.mockResolvedValue(undefined);
});
describe("saved native recordings", () => {
  it("uses a private per-account directory and copies only after an explicit save", async () => {
    expect(mocks.copy).not.toHaveBeenCalled(); const name = await recordings.saveRecording("file:///cache/voice.m4a");
    expect(name).toMatch(/^linguacards-\d+\.m4a$/);
    expect(mocks.copy).toHaveBeenCalledWith({ from: "file:///cache/voice.m4a", to: `file:///documents/recordings/user-a/${name}` });
    expect(await recordings.listRecordings()).toEqual(["linguacards-123.m4a"]);
    mocks.session.mockResolvedValue({ data: { session: { user: { id: "user-b" } } } }); await recordings.listRecordings();
    expect(mocks.read).toHaveBeenLastCalledWith("file:///documents/recordings/user-b/");
  });
  it("requires a signed-in account and rejects path traversal names", async () => {
    await expect(recordings.removeRecording("../secret")).rejects.toThrow("không hợp lệ"); expect(mocks.remove).not.toHaveBeenCalled();
    mocks.session.mockResolvedValue({ data: { session: null } }); await expect(recordings.saveRecording("file:///cache/a")).rejects.toThrow("Chưa đăng nhập"); expect(mocks.copy).not.toHaveBeenCalled();
  });
  it("removes a partial destination when saving fails", async () => {
    mocks.copy.mockRejectedValueOnce(new Error("disk full"));
    await expect(recordings.saveRecording("file:///cache/voice.m4a")).rejects.toThrow("disk full");
    expect(mocks.remove).toHaveBeenCalledWith(expect.stringContaining("/recordings/user-a/linguacards-"), { idempotent: true });
  });
  it("exports and deletes only the selected recording of the current account", async () => {
    await recordings.shareRecording("linguacards-123.m4a"); expect(mocks.share).toHaveBeenCalledWith("file:///documents/recordings/user-a/linguacards-123.m4a", expect.any(Object));
    await recordings.removeRecording("linguacards-123.m4a"); expect(mocks.remove).toHaveBeenCalledWith("file:///documents/recordings/user-a/linguacards-123.m4a", { idempotent: true });
  });
});
