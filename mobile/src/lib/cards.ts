import { supabase } from "@/lib/supabase";
import type { Card, CardStatus, CardWithProgress, Deck } from "@/types";

/** Lấy thông tin 1 deck theo id (null nếu không có / không thuộc user). */
export async function fetchDeck(deckId: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .maybeSingle();
  if (error) throw error;
  return (data as Deck) ?? null;
}

/** Danh sách card trong 1 deck, mới nhất trước. */
export async function fetchCards(deckId: string): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Card[];
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) throw error;
}

/** Card kèm progress để dùng trong study mode. */
export async function fetchCardsWithProgress(
  deckId: string
): Promise<CardWithProgress[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*, card_progress(*)")
    .eq("deck_id", deckId);
  if (error) throw error;

  return (data ?? []).map((c: any) => ({
    ...c,
    progress: c.card_progress?.[0] ?? null,
  }));
}

/** Ghi nhận đánh giá thuộc bài (upsert theo user+card). */
export async function recordProgress(
  cardId: string,
  status: CardStatus
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  // Lấy review_count hiện tại để +1
  const { data: existing } = await supabase
    .from("card_progress")
    .select("review_count")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .maybeSingle();

  const { error } = await supabase.from("card_progress").upsert(
    {
      user_id: user.id,
      card_id: cardId,
      status,
      review_count: (existing?.review_count ?? 0) + 1,
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,card_id" }
  );
  if (error) throw error;
}
