"use client";

import { createClient } from "@/lib/supabase/client";
import type { Card, CardStatus, CardWithProgress, DraftCard } from "@/types";

const supabase = () => createClient();

/** Lưu DraftCard thành card trong deck. */
export async function saveCard(
  deckId: string,
  draft: DraftCard
): Promise<Card> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data, error } = await supabase()
    .from("cards")
    .insert({
      user_id: user.id,
      deck_id: deckId,
      term: draft.term,
      phonetic: draft.phonetic ?? null,
      audio_us: draft.audioUs ?? null,
      audio_uk: draft.audioUk ?? null,
      part_of_speech: draft.partOfSpeech ?? null,
      meaning_vi: draft.meaningVi ?? null,
      definitions: draft.definitions,
      examples: draft.examples,
      source_language: draft.sourceLanguage,
      target_language: draft.targetLanguage,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Card;
}

export async function fetchCards(deckId: string): Promise<Card[]> {
  const { data, error } = await supabase()
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Card[];
}

/** Card kèm progress để dùng trong study mode. */
export async function fetchCardsWithProgress(
  deckId: string
): Promise<CardWithProgress[]> {
  const { data, error } = await supabase()
    .from("cards")
    .select("*, card_progress(*)")
    .eq("deck_id", deckId);
  if (error) throw error;

  return (data ?? []).map((c: any) => ({
    ...c,
    progress: c.card_progress?.[0] ?? null,
  }));
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase().from("cards").delete().eq("id", id);
  if (error) throw error;
}

export async function moveCard(id: string, deckId: string): Promise<void> {
  const { error } = await supabase()
    .from("cards")
    .update({ deck_id: deckId })
    .eq("id", id);
  if (error) throw error;
}

/** Ghi nhận đánh giá thuộc bài (upsert theo user+card). */
export async function recordProgress(
  cardId: string,
  status: CardStatus
): Promise<void> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  // Lấy review_count hiện tại để +1
  const { data: existing } = await supabase()
    .from("card_progress")
    .select("review_count")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .maybeSingle();

  const { error } = await supabase().from("card_progress").upsert(
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
