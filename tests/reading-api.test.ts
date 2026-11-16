import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase/getUser", () => ({ getRequestContext: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn(), standardRules: vi.fn(() => []) }));
vi.mock("@/lib/user-agent", () => ({ requestDeviceId: () => null }));
vi.mock("@/lib/ai/reading", () => ({ generateReading: vi.fn() }));
import { getRequestContext } from "../src/lib/supabase/getUser";
import { enforceRateLimit } from "../src/lib/rate-limit";
import { generateReading } from "../src/lib/ai/reading";
import { POST } from "../src/app/api/reading/route";
const cards = ["apple", "book", "river"].map((term, i) => ({ id: `card-${i}`, term, meaning_vi: `nghĩa ${term}`, audio_us: null, image: null, examples: [{ text: `This is my ${term} today.` }], card_progress: [{ status: "good", suspended_at: null }] }));
const db = {
  select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
  limit: vi.fn(),
};
const from = vi.fn(() => db);
const request = (body: unknown = { topic: "daily" }) => new Request("https://example.test/api/reading", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getRequestContext).mockResolvedValue({ user: { id: "owner" }, supabase: { from } } as unknown as NonNullable<Awaited<ReturnType<typeof getRequestContext>>>);
  vi.mocked(enforceRateLimit).mockResolvedValue(null);
  vi.mocked(generateReading).mockRejectedValue(new Error("unavailable"));
  db.limit.mockResolvedValue({ data: cards, error: null });
});

describe("private reading API", () => {
  it("requires authentication before reading cards or calling AI", async () => {
    vi.mocked(getRequestContext).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(from).not.toHaveBeenCalled(); expect(generateReading).not.toHaveBeenCalled();
  });
  it("validates deck/topic and honors rate limits before database and AI calls", async () => {
    expect((await POST(request({ topic: "unknown" }))).status).toBe(400);
    expect((await POST(request({ deckId: "invalid" }))).status).toBe(400);
    vi.mocked(enforceRateLimit).mockResolvedValue(new Response("", { status: 429 }) as never);
    expect((await POST(request())).status).toBe(429);
    expect(from).not.toHaveBeenCalled(); expect(generateReading).not.toHaveBeenCalled();
  });
  it("reads only owned English cards in the requested deck and returns a private generated lesson", async () => {
    const deckId = "ad67d251-0c3c-4d1e-9f6b-e7e7073e43fb";
    vi.mocked(generateReading).mockResolvedValue({ title: "A day", passage: "An apple, a book and a river.", questions: [] });
    const response = await POST(request({ topic: "work", deckId }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(db.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(db.eq).toHaveBeenCalledWith("deck_id", deckId);
    expect(db.eq).toHaveBeenCalledWith("source_language", "en");
    const result = await response.json();
    expect(result.source).toBe("generated"); expect(result.words).toHaveLength(3);
    expect(generateReading).toHaveBeenCalledWith(expect.any(Array), "work");
  });
  it("uses saved examples honestly when generation fails and never writes study progress", async () => {
    const response = await POST(request());
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.source).toBe("examples");
    expect(result.questions).toEqual([]);
    expect(result.words).toHaveLength(3);
    expect(from).toHaveBeenCalledTimes(1); expect(from).toHaveBeenCalledWith("cards");
    for (const card of cards) expect(result.passage).toContain(card.term);
  });
  it("excludes suspended cards, duplicates and cards missing a meaning", async () => {
    db.limit.mockResolvedValue({ data: [cards[0], { ...cards[1], term: "APPLE" }, { ...cards[2], meaning_vi: null }, { ...cards[2], card_progress: [{ suspended_at: "2026-01-01" }] }], error: null });
    expect((await POST(request())).status).toBe(400);
    expect(generateReading).not.toHaveBeenCalled();
  });
  it("offers retry instead of inventing text when no generator or examples are available", async () => {
    db.limit.mockResolvedValue({ data: cards.map((c) => ({ ...c, examples: [] })), error: null });
    expect((await POST(request())).status).toBe(503);
  });
  it("returns a controlled error on database failure without sending data to AI", async () => {
    db.limit.mockResolvedValue({ data: null, error: new Error("private details") });
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("private details");
    expect(generateReading).not.toHaveBeenCalled();
  });
});
