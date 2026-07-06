"use client";

import { createClient } from "@/lib/supabase/client";
import type { CardStatus, Deck, DeckStats } from "@/types";
import { emptyByStatus, isDue } from "@/lib/status";

const supabase = () => createClient();

/** Lấy danh sách deck của user hiện tại kèm số lượng card. */
export async function fetchDecks(): Promise<Deck[]> {
  const { data, error } = await supabase()
    .from("decks")
    .select("*, cards(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((d: any) => ({
    ...d,
    card_count: d.cards?.[0]?.count ?? 0,
  }));
}

/**
 * Danh sách deck kèm thống kê trạng thái, chỉ 2 query (không N+1):
 * 1 query decks + 1 query toàn bộ cards (RLS đã giới hạn theo user) kèm status.
 */
export async function fetchDecksWithStats(): Promise<Deck[]> {
  const sb = supabase();
  const [decksRes, cardsRes] = await Promise.all([
    sb.from("decks").select("*").order("created_at", { ascending: false }),
    sb.from("cards").select("deck_id, card_progress(status, next_due_at)"),
  ]);
  if (decksRes.error) throw decksRes.error;
  if (cardsRes.error) throw cardsRes.error;

  const now = Date.now();
  const statsByDeck = new Map<string, DeckStats>();
  for (const c of (cardsRes.data ?? []) as any[]) {
    const progress = c.card_progress?.[0];
    const status = (progress?.status ?? "new") as CardStatus;
    let s = statsByDeck.get(c.deck_id);
    if (!s) {
      s = { total: 0, byStatus: emptyByStatus(), due: 0 };
      statsByDeck.set(c.deck_id, s);
    }
    s.total++;
    s.byStatus[status]++;
    if (isDue(progress?.next_due_at, now)) s.due++;
  }

  return (decksRes.data ?? []).map((d: any) => {
    const stats = statsByDeck.get(d.id) ?? {
      total: 0,
      byStatus: emptyByStatus(),
      due: 0,
    };
    return { ...d, card_count: stats.total, stats } as Deck;
  });
}

export async function createDeck(input: {
  name: string;
  description?: string;
}): Promise<Deck> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data, error } = await supabase()
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
  const { error } = await supabase().from("decks").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteDeck(id: string): Promise<void> {
  const { error } = await supabase().from("decks").delete().eq("id", id);
  if (error) throw error;
}
