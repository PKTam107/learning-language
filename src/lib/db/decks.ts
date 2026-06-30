"use client";

import { createClient } from "@/lib/supabase/client";
import type { Deck } from "@/types";

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
