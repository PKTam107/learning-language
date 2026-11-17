import { createDecipheriv, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createEncryptedAuthStorage } from "../mobile/src/lib/encrypted-auth-storage";

const key = "sb-project-auth-token";
const encryptedKey = `linguacards.auth.v1.${key}`;
const session = JSON.stringify({ access_token: "private-access", refresh_token: "private-refresh", user: { name: "Tiếng Việt 🎴", metadata: "x".repeat(8000) } });

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { values.delete(key); }),
  };
}
function setup() {
  const disk = memoryStorage();
  const vault = memoryStorage();
  const storage = createEncryptedAuthStorage(disk, vault, (size) => new Uint8Array(randomBytes(size)));
  return { disk, vault, storage };
}

describe("encrypted mobile auth storage", () => {
  it("stores only ciphertext on disk and a small key in the vault, including large Unicode OAuth sessions", async () => {
    const { storage, disk, vault } = setup();
    await storage.setItem(key, session);
    const raw = disk.values.get(encryptedKey)!;
    expect(raw).not.toContain("private-access");
    expect(raw).not.toContain("private-refresh");
    expect(disk.values.has(key)).toBe(false);
    expect([...vault.values.values()][0]).toMatch(/^[a-f0-9]{64}$/);
    expect(await storage.getItem(key)).toBe(session);

    // Independently decrypt with Node/OpenSSL, verifying AES-256-GCM and key binding.
    const [, nonce, encrypted] = raw.split(":");
    const bytes = Buffer.from(encrypted, "hex");
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from([...vault.values.values()][0], "hex"), Buffer.from(nonce, "hex"));
    decipher.setAAD(Buffer.from(key));
    decipher.setAuthTag(bytes.subarray(-16));
    expect(Buffer.concat([decipher.update(bytes.subarray(0, -16)), decipher.final()]).toString("utf8")).toBe(session);
  });

  it("persists across adapter restarts and uses a fresh nonce for each refresh", async () => {
    const { storage, disk, vault } = setup();
    await storage.setItem(key, session);
    const first = disk.values.get(encryptedKey)!;
    await storage.setItem(key, session);
    expect(disk.values.get(encryptedKey)!.split(":")[1]).not.toBe(first.split(":")[1]);
    const restarted = createEncryptedAuthStorage(disk, vault, (size) => new Uint8Array(randomBytes(size)));
    expect(await restarted.getItem(key)).toBe(session);
  });

  it("migrates legacy plaintext once and removes it without touching other app data", async () => {
    const { storage, disk } = setup();
    disk.values.set(key, session);
    disk.values.set("theme", "dark");
    expect(await storage.getItem(key)).toBe(session);
    expect(disk.values.has(key)).toBe(false);
    expect(disk.values.has(encryptedKey)).toBe(true);
    expect(disk.values.get("theme")).toBe("dark");
    expect(await storage.getItem(key)).toBe(session);
  });

  it.each(["vault", "disk"])("fails closed and removes legacy plaintext if migration fails in %s", async (failure) => {
    const { storage, disk, vault } = setup();
    disk.values.set(key, session);
    (failure === "vault" ? vault : disk).setItem.mockRejectedValueOnce(new Error("unavailable"));
    await expect(storage.getItem(key)).rejects.toThrow("unavailable");
    expect(disk.values.has(key)).toBe(false);
    expect(disk.setItem.mock.calls.some(([, value]) => value === session)).toBe(false);
    // A rejected operation does not poison the write queue.
    await storage.setItem(key, session);
    expect(await storage.getItem(key)).toBe(session);
  });

  it("does not fall back to plaintext when the OS vault is unavailable", async () => {
    const { storage, disk, vault } = setup();
    await storage.setItem(key, session);
    disk.values.set(key, "stale-plaintext");
    vault.getItem.mockRejectedValueOnce(new Error("device locked"));
    await expect(storage.getItem(key)).rejects.toThrow("device locked");
    expect(disk.values.has(key)).toBe(false);
    expect(disk.values.has(encryptedKey)).toBe(true);
    expect(await storage.getItem(key)).toBe(session);
  });

  it.each(["modified", "malformed", "missing-key"])("requires login for %s encrypted data without reviving a legacy token", async (failure) => {
    const { storage, disk, vault } = setup();
    await storage.setItem(key, session);
    disk.values.set(key, "stale-plaintext");
    const raw = disk.values.get(encryptedKey)!;
    if (failure === "missing-key") vault.values.clear();
    else disk.values.set(encryptedKey, failure === "malformed" ? "v99:invalid" : raw.slice(0, -2) + (raw.endsWith("00") ? "01" : "00"));
    expect(await storage.getItem(key)).toBeNull();
    expect(disk.values.size).toBe(0);
    expect(vault.values.size).toBe(0);
  });

  it("serializes concurrent migration, refresh and sign-out so the session cannot reappear", async () => {
    const { storage, disk, vault } = setup();
    disk.values.set(key, session);
    const results = await Promise.all([storage.getItem(key), storage.setItem(key, "refreshed"), storage.removeItem(key), storage.getItem(key)]);
    expect(results[0]).toBe(session);
    expect(results[3]).toBeNull();
    expect(disk.values.size).toBe(0);
    expect(vault.values.size).toBe(0);
  });

  it("destroys the key even if deleting ciphertext on sign-out fails", async () => {
    const { storage, disk, vault } = setup();
    await storage.setItem(key, session);
    disk.removeItem.mockImplementationOnce(async () => {}).mockRejectedValueOnce(new Error("disk failure"));
    await expect(storage.removeItem(key)).rejects.toThrow("disk failure");
    expect(vault.values.size).toBe(0);
    expect(await storage.getItem(key)).toBeNull();
  });

  it("isolates PKCE verifiers and sessions and clears each key on removal", async () => {
    const { storage } = setup();
    await storage.setItem(key, session);
    await storage.setItem(`${key}-code-verifier`, "secret-verifier");
    await storage.removeItem(`${key}-code-verifier`);
    expect(await storage.getItem(`${key}-code-verifier`)).toBeNull();
    expect(await storage.getItem(key)).toBe(session);
  });
});
