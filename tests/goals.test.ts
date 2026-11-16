import { describe, expect, it } from "vitest";
import { DEFAULT_GOALS, goalProgress, sanitizeGoals, weekStart } from "../src/lib/goals";
import { buildDailyChallenge, EMPTY_CHALLENGE_METRICS } from "../src/lib/challenge";
const now = new Date(2026, 10, 18, 12); // Wednesday, local time.
const event = (id: string | null, day: number) => ({ card_id: id, reviewed_at: new Date(2026, 10, day, 10).toISOString() });

describe("flexible learning goals", () => {
  it("uses defaults only for invalid provided fields and accepts flexible weekly goals", () => {
    expect(sanitizeGoals({})).toEqual({});
    expect(sanitizeGoals({ dailyGoal: 20, weeklyDays: 1 })).toEqual({ dailyGoal: 20, weeklyDays: 1 });
    for (const value of [null, "10", NaN, 0, -1, 2.5, 100]) {
      expect(sanitizeGoals({ dailyGoal: value, weeklyDays: value })).toEqual(DEFAULT_GOALS);
    }
  });
  it("counts a card once per day and permits rest days in the week", () => {
    const progress = goalProgress([event("a", 16), event("b", 18), event("b", 18), event("c", 18), event(null, 18)], 10, { dailyGoal: 5, weeklyDays: 2 }, now);
    expect(progress).toMatchObject({ todayWords: 2, dailyTarget: 5, weekDays: 2, weeklyDone: true, dailyDone: false });
  });
  it("caps today's goal to available cards and does not mark an empty account complete", () => {
    expect(goalProgress([event("a", 18)], 1, DEFAULT_GOALS, now).dailyDone).toBe(true);
    expect(goalProgress([], 0, DEFAULT_GOALS, now)).toMatchObject({ dailyTarget: 0, dailyDone: false });
  });
  it("starts weeks on Monday, including when today is Sunday, excluding old/future events", () => {
    const sunday = new Date(2026, 10, 22, 12);
    expect(weekStart(sunday).getDate()).toBe(16);
    expect(goalProgress([event("a", 15), event("b", 16), event("c", 23), { card_id: "d", reviewed_at: "invalid" }], 10, DEFAULT_GOALS, sunday).weekDays).toBe(1);
    expect(weekStart(new Date(2026, 10, 23)).getDate()).toBe(23);
  });
  it("rewards distinct practice, never clicking a high self-rating", () => {
    const m = { ...EMPTY_CHALLENGE_METRICS, totalCards: 50, dueToday: 10, reviewsToday: 20, distinctToday: 2, masteredToday: 20 };
    const challenge = buildDailyChallenge(m, now, DEFAULT_GOALS);
    expect(challenge.quests.find((q) => q.id === "review")).toMatchObject({ current: 2, target: 10, done: false, unit: "từ" });
    expect(challenge.quests.some((q) => q.id === "mastered")).toBe(false);
    const after = buildDailyChallenge({ ...m, dueToday: 2 }, now, DEFAULT_GOALS);
    expect(after.quests.find((q) => q.id === "review")?.target).toBe(10);
  });
  it("drops new-word tasks during backlog and keeps a first-card task for empty accounts", () => {
    const m = { ...EMPTY_CHALLENGE_METRICS, totalCards: 100, dueToday: 21 };
    expect(buildDailyChallenge(m, now).quests.some((q) => q.action === "create")).toBe(false);
    expect(buildDailyChallenge(EMPTY_CHALLENGE_METRICS, now).quests[0].id).toBe("first-card");
  });
});
