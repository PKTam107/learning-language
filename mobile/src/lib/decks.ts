import { supabase } from "@/lib/supabase";
import type { CardWithProgress, Deck, DeckStats } from "@/types";
import { emptyByStatus } from "@/lib/status";
import { computeStats } from "@/lib/queue";
import { fetchAllRows } from "@/lib/paginate";
import { resolvePolicy } from "@/lib/policy";
import { trashDeck } from "@/lib/trash";

/** Lấy danh sách deck của user hiện tại kèm số lượng card. */
export async function fetchDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .from("decks")
    .select("*, cards(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    ...d,
    card_count: d.cards?.[0]?.count ?? 0,
  }));
}

/** DeckStats rỗng cho bộ thẻ chưa có từ nào. */
function emptyStats(): DeckStats {
  return {
    total: 0,
    byStatus: emptyByStatus(),
    due: 0,
    dueReviews: 0,
    newToday: 0,
    newHeldBack: 0,
  };
}

export interface DecksWithStats {
  decks: Deck[];
  /**
   * Thống kê toàn tài khoản, tính từ TẤT CẢ thẻ trong một lần — không cộng dồn
   * từng bộ, vì hạn mức từ mới là chung (cộng dồn sẽ ra số lớn hơn thực tế).
   */
  account: DeckStats;
}

/**
 * Danh sách deck kèm thống kê trạng thái (2 query, không N+1).
 * `stats.due` là hàng đợi hôm nay của bộ đó, đã trừ hạn mức từ mới (lib/queue.ts).
 */
export async function fetchDecksWithStats(
  newPerDay: number
): Promise<DecksWithStats> {
  const [decksRes, cardRows, policy] = await Promise.all([
    supabase.from("decks").select("*").order("created_at", { ascending: false }),
    // Phải phân trang: tài khoản trên 1000 thẻ thì `select()` trần bị cắt im
    // lặng ở 1000 dòng, làm mọi con số thống kê thiếu hụt mà không báo lỗi.
    fetchAllRows<any>((from, to) =>
      supabase
        .from("cards")
        .select("deck_id, card_progress(status, next_due_at, last_reviewed_at)")
        .order("id")
        .range(from, to)
    ),
    resolvePolicy(newPerDay),
  ]);
  if (decksRes.error) throw decksRes.error;

  const now = Date.now();
  const byDeck = new Map<string, CardWithProgress[]>();
  for (const c of cardRows) {
    const list = byDeck.get(c.deck_id) ?? [];
    list.push({ progress: c.card_progress?.[0] ?? null } as CardWithProgress);
    byDeck.set(c.deck_id, list);
  }

  const decks = (decksRes.data ?? []).map((d: any) => {
    const cards = byDeck.get(d.id);
    const stats = cards ? computeStats(cards, policy, now) : emptyStats();
    return { ...d, card_count: stats.total, stats } as Deck;
  });

  const allCards = Array.from(byDeck.values()).flat();
  return {
    decks,
    account: allCards.length ? computeStats(allCards, policy, now) : emptyStats(),
  };
}

export async function createDeck(input: {
  name: string;
  description?: string;
}): Promise<Deck> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data, error } = await supabase
    .from("decks")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description ?? null,
      source_language: "en",
      target_language: "vi",
    })
    .select()
    .single();
  if (error) throw error;
  return data as Deck;
}

export async function updateDeck(
  id: string,
  input: { name?: string; description?: string }
): Promise<void> {
  const { error } = await supabase.from("decks").update(input).eq("id", id);
  if (error) throw error;
}

/** Xóa bộ thẻ = chuyển cả bộ (kèm mọi thẻ bên trong) vào thùng rác 30 ngày. */
export async function deleteDeck(id: string): Promise<void> {
  await trashDeck(id);
}
