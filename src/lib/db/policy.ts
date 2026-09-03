"use client";

import { createClient } from "@/lib/supabase/client";
import { startOfDay } from "@/lib/streak";
import type { QueuePolicy } from "@/lib/queue";

/**
 * Số từ mới đã học trong hôm nay, trên **toàn tài khoản** — đếm phía server
 * (head: true → không tải dòng nào), dùng index card_progress_user_introduced.
 *
 * `introduced_at` được ghi ở lượt ôn ĐẦU TIÊN của mỗi thẻ, nên đếm theo cột này
 * chính là "hôm nay đã đưa bao nhiêu từ mới vào học".
 */
export async function fetchIntroducedToday(): Promise<number> {
  const { count, error } = await createClient()
    .from("card_progress")
    .select("id", { count: "exact", head: true })
    .gte("introduced_at", startOfDay().toISOString());
  // Cột chưa migrate → coi như chưa dùng hạn mức nào (thà cho học nhiều hơn là
  // chặn oan cả hàng đợi).
  if (error) return 0;
  return count ?? 0;
}

/** Gộp hạn mức trong Cài đặt với mức đã dùng hôm nay thành policy cho hàng đợi. */
export async function resolvePolicy(newPerDay: number): Promise<QueuePolicy> {
  if (!newPerDay || newPerDay <= 0) {
    return { newPerDay: 0, introducedToday: 0 }; // không giới hạn → không cần đếm
  }
  return { newPerDay, introducedToday: await fetchIntroducedToday() };
}
