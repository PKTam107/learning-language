import { supabase } from "@/lib/supabase";
import type { Card, Deck } from "@/types";

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
