import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), from: vi.fn(), calls: [] as unknown[][], responses: [] as { data: unknown[] | null; error: { code?: string; message: string } | null }[] }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getUser: mocks.getUser }, from: mocks.from }) }));
import { fetchLearningCards, fetchReviewReport } from "../src/lib/db/learning";
beforeEach(() => {
  vi.resetAllMocks(); mocks.calls.length = 0; mocks.responses.length = 0;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null });
  mocks.from.mockImplementation((table: string) => {
    mocks.calls.push(["from", table]);
    const query: Record<string, unknown> = {};
    for (const method of ["select", "eq", "gte", "lte", "order", "range", "in"]) query[method] = (...args: unknown[]) => { mocks.calls.push([method, ...args]); return query; };
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.responses.shift() ?? { data: [], error: null }).then(resolve);
    return query;
  });
});
describe("learning data loading", () => {
  it("rejects unauthenticated reads and auth failures before querying data", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(fetchLearningCards()).rejects.toThrow("Chưa đăng nhập");
    await expect(fetchReviewReport()).rejects.toThrow("Chưa đăng nhập");
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("auth unavailable") });
    await expect(fetchLearningCards()).rejects.toThrow("auth unavailable");
  });
  it("paginates card scans past 1000 and scopes to account and selected deck", async () => {
    mocks.responses.push({ data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null }, { data: [{ id: 1000 }], error: null });
    expect(await fetchLearningCards("deck")).toHaveLength(1001);
    expect(mocks.calls).toContainEqual(["eq", "user_id", "user"]);
    expect(mocks.calls).toContainEqual(["eq", "deck_id", "deck"]);
    expect(mocks.calls).toContainEqual(["range", 1000, 1999]);
  });
  it("falls back on missing context columns without fabricating a retention rate", async () => {
    mocks.responses.push({ data: null, error: { code: "42703", message: "missing column" } }, { data: [{ card_id: "a", status: "hard", reviewed_at: new Date().toISOString() }], error: null }, { data: [{ id: "a", deck_id: "deck", term: "book" }], error: null });
    const report = await fetchReviewReport();
    expect(report.contextAvailable).toBe(false); expect(report.retention).toBeNull(); expect(report.unknown).toBe(1);
    expect(report.forgotten).toEqual([{ id: "a", deck_id: "deck", term: "book", count: 1 }]);
  });
  it("does not mask permission/network errors as an empty report", async () => {
    mocks.responses.push({ data: null, error: { code: "42501", message: "permission denied" } });
    await expect(fetchReviewReport()).rejects.toMatchObject({ code: "42501" });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("skips deleted cards in the forgotten list while retaining their events in aggregate counts", async () => {
    mocks.responses.push({ data: ["deleted", "present"].map((card_id) => ({ card_id, status: "hard", reviewed_at: new Date().toISOString(), review_type: "typing", was_due: true, interval_before: 3 })), error: null }, { data: [{ id: "present", term: "book", deck_id: "deck" }], error: null });
    const report = await fetchReviewReport();
    expect(report.due).toBe(2); expect(report.retention).toBe(0);
    expect(report.forgotten.map((card) => card.id)).toEqual(["present"]);
    expect(mocks.calls).toContainEqual(["eq", "user_id", "user"]);
  });
});
