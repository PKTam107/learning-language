import { supabase } from "@/lib/supabase";
import { startOfDay } from "@/lib/streak";
import type { QueuePolicy } from "@/lib/queue";

/**
 * Số từ mới đã học trong hôm nay, trên toàn tài khoản — đếm phía server
 * (head: true → không tải dòng nào). Bản sao của web `src/lib/db/policy.ts`.
 */
export async function fetchIntroducedToday(): Promise<number> {
  const { count, error } = await supabase
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .gte("introduced_at", startOfDay().toISOString());
  // Cột chưa migrate → coi như chưa dùng hạn mức nào.
  if (error) return 0;
  return count ?? 0;
}

/** Gộp hạn mức trong Cài đặt với mức đã dùng hôm nay thành policy cho hàng đợi. */
export async function resolvePolicy(newPerDay: number): Promise<QueuePolicy> {
  if (!newPerDay || newPerDay <= 0) {
    return { newPerDay: 0, introducedToday: 0 };
  }
  return { newPerDay, introducedToday: await fetchIntroducedToday() };
}
