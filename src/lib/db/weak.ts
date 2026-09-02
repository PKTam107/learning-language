"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";

const supabase = () => createClient();

/**
 * Số từ "hay quên" tối đa đưa vào một phiên ôn. Nhãn nút và tập thẻ thật phải
 * cùng đọc hằng số này, nếu không nút sẽ hứa một số khác với số thực học.
 */
export const WEAK_SESSION_SIZE = 30;

export interface WeakWord {
  cardId: string;
  term: string;
  meaningVi: string | null;
  partOfSpeech: string | null;
  cefrLevel: string | null;
  deckId: string;
  /** Số lần bị đánh giá "Chưa thuộc". */
  hardCount: number;
  /** Tổng số lượt ôn (để tính tỷ lệ quên). */
  totalCount: number;
}

/**
 * Các từ hay quên: xếp theo số lần bị đánh giá "Chưa thuộc" (hard) trong
 * `review_events` (180 ngày gần nhất), nối với thẻ còn tồn tại.
 * Trả [] nếu chưa đăng nhập hoặc chưa có dữ liệu.
 */
export async function fetchWeakWords(limit = 20): Promise<WeakWord[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  const since = new Date();
  since.setDate(since.getDate() - 180);

  const { data, error } = await supabase()
    .from("review_events")
    .select("card_id, status")
    .gte("reviewed_at", since.toISOString())
    .not("card_id", "is", null);
  if (error || !data) return [];

  const hard = new Map<string, number>();
  const total = new Map<string, number>();
  for (const r of data) {
    const id = r.card_id as string;
    total.set(id, (total.get(id) ?? 0) + 1);
    if (r.status === "hard") hard.set(id, (hard.get(id) ?? 0) + 1);
  }

  const ranked = [...hard.entries()]
    .filter(([, c]) => c > 0)
    .sort(
      (a, b) => b[1] - a[1] || (total.get(b[0]) ?? 0) - (total.get(a[0]) ?? 0)
    )
    .slice(0, limit);
  if (ranked.length === 0) return [];

  const ids = ranked.map(([id]) => id);
  const { data: cards } = await supabase()
    .from("cards")
    .select("id, term, meaning_vi, part_of_speech, cefr_level, deck_id")
    .in("id", ids);

  const byId = new Map((cards ?? []).map((c) => [c.id as string, c]));
  const out: WeakWord[] = [];
  for (const [id, hardCount] of ranked) {
    const c = byId.get(id);
    if (!c) continue; // thẻ đã bị xóa
    out.push({
      cardId: id,
      term: c.term as string,
      meaningVi: (c.meaning_vi as string) ?? null,
      partOfSpeech: (c.part_of_speech as string) ?? null,
      cefrLevel: (c.cefr_level as string) ?? null,
      deckId: c.deck_id as string,
      hardCount,
      totalCount: total.get(id) ?? hardCount,
    });
  }
  return out;
}
