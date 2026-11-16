import { dayKey, startOfDay } from "./streak";

export const DAILY_GOAL_OPTIONS = [5, 10, 15, 20, 30, 50];
export const DEFAULT_GOALS = { dailyGoal: 10, weeklyDays: 4 };
export interface LearningGoals { dailyGoal: number; weeklyDays: number }

export function sanitizeGoals(raw: Record<string, unknown>): Partial<LearningGoals> {
  const out: Partial<LearningGoals> = {};
  if (raw.dailyGoal !== undefined) out.dailyGoal = typeof raw.dailyGoal === "number" && DAILY_GOAL_OPTIONS.includes(raw.dailyGoal) ? raw.dailyGoal : DEFAULT_GOALS.dailyGoal;
  if (raw.weeklyDays !== undefined) out.weeklyDays = typeof raw.weeklyDays === "number" && Number.isInteger(raw.weeklyDays) && raw.weeklyDays >= 1 && raw.weeklyDays <= 7 ? raw.weeklyDays : DEFAULT_GOALS.weeklyDays;
  return out;
}

export function weekStart(now = new Date()): Date {
  const start = startOfDay(now);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

export interface GoalProgress {
  todayWords: number;
  dailyTarget: number;
  weekDays: number;
  weeklyTarget: number;
  dailyDone: boolean;
  weeklyDone: boolean;
}

export function goalProgress(
  events: { card_id: string | null; reviewed_at: string }[],
  totalCards: number,
  goals: LearningGoals,
  now = new Date()
): GoalProgress {
  const start = weekStart(now).getTime();
  const tomorrow = startOfDay(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const days = new Set<string>();
  const words = new Set<string>();
  for (const event of events) {
    const date = new Date(event.reviewed_at);
    if (!event.card_id || !Number.isFinite(date.getTime()) || date.getTime() < start || date.getTime() >= tomorrow.getTime()) continue;
    const day = dayKey(date);
    days.add(day);
    if (day === dayKey(now)) words.add(event.card_id);
  }
  const dailyTarget = Math.min(goals.dailyGoal, Math.max(0, totalCards));
  return {
    todayWords: words.size, dailyTarget, weekDays: days.size, weeklyTarget: goals.weeklyDays,
    dailyDone: dailyTarget > 0 && words.size >= dailyTarget,
    weeklyDone: days.size >= goals.weeklyDays,
  };
}
