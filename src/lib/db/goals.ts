"use client";

import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/db/paginate";
import { goalProgress, weekStart, type LearningGoals } from "@/lib/goals";

export async function fetchGoalProgress(goals: LearningGoals) {
  const now = new Date();
  const sb = createClient();
  const [events, total, suspended] = await Promise.all([
    fetchAllRows<{ card_id: string | null; reviewed_at: string }>((from, to) => sb.from("review_events")
      .select("card_id, reviewed_at").gte("reviewed_at", weekStart(now).toISOString()).order("id").range(from, to)),
    sb.from("cards").select("id", { count: "exact", head: true }),
    sb.from("card_progress").select("id", { count: "exact", head: true }).not("suspended_at", "is", null),
  ]);
  if (total.error) throw total.error;
  if (suspended.error) throw suspended.error;
  return goalProgress(events, Math.max(0, (total.count ?? 0) - (suspended.count ?? 0)), goals, now);
}
