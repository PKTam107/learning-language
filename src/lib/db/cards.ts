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

/** Cập nhật 1 card đã lưu từ DraftCard (dùng khi sửa thẻ). */
export async function updateCard(
  id: string,
  draft: DraftCard
): Promise<void> {
  const { error } = await supabase()
    .from("cards")
    .update({
      term: draft.term,
      phonetic: draft.phonetic ?? null,
      audio_us: draft.audioUs ?? null,
      audio_uk: draft.audioUk ?? null,
      part_of_speech: draft.partOfSpeech ?? null,
      meaning_vi: draft.meaningVi ?? null,
      definitions: draft.definitions,
      examples: draft.examples,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Chuyển Card (snake_case DB) → DraftCard (camelCase) để tái dùng DraftEditor. */
export function cardToDraft(card: Card): DraftCard {
  return {
    term: card.term,
    phonetic: card.phonetic ?? undefined,
    audioUs: card.audio_us ?? undefined,
    audioUk: card.audio_uk ?? undefined,
    partOfSpeech: card.part_of_speech ?? undefined,
    meaningVi: card.meaning_vi ?? undefined,
    definitions: card.definitions ?? [],
    examples: card.examples ?? [],
    sourceLanguage: card.source_language,
    targetLanguage: card.target_language,
  };
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

const DAY_MS = 86_400_000;
const MIN_EASE = 1.3;

/**
 * Lịch ôn kiểu SM-2 rút gọn, dựa trên đánh giá + khoảng cách lần trước.
 * Dùng cột có sẵn (ease_factor, next_due_at) — không cần đổi schema.
 */
function computeSchedule(
  status: CardStatus,
  prevEase: number,
  prevIntervalDays: number
): { ease: number; intervalDays: number } {
  if (status === "hard") {
    // Sai/khó → giảm ease, ôn lại sớm (ngày mai).
    return { ease: Math.max(MIN_EASE, prevEase - 0.2), intervalDays: 1 };
  }
  if (status === "easy") {
    const base = prevIntervalDays < 1 ? 3 : prevIntervalDays * prevEase * 1.3;
    return { ease: prevEase + 0.15, intervalDays: Math.round(base) };
  }
  // good
  const base = prevIntervalDays < 1 ? 1 : prevIntervalDays * prevEase;
  return { ease: prevEase, intervalDays: Math.round(base) };
}

/** Ghi nhận đánh giá + tính lịch ôn lại (spaced repetition). */
export async function recordProgress(
  cardId: string,
  status: CardStatus
): Promise<void> {
  const {
    data: { user },
  } = await supabase().auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data: existing } = await supabase()
    .from("card_progress")
    .select("review_count, ease_factor, last_reviewed_at, next_due_at")
    .eq("user_id", user.id)
    .eq("card_id", cardId)
    .maybeSingle();

  const prevEase = existing?.ease_factor ?? 2.5;
  let prevIntervalDays = 0;
  if (existing?.last_reviewed_at && existing?.next_due_at) {
    prevIntervalDays = Math.max(
      0,
      Math.round(
        (new Date(existing.next_due_at).getTime() -
          new Date(existing.last_reviewed_at).getTime()) /
          DAY_MS
      )
    );
  }

  const { ease, intervalDays } = computeSchedule(
    status,
    prevEase,
    prevIntervalDays
  );
  const now = new Date();
  const nextDue = new Date(now.getTime() + intervalDays * DAY_MS);

  const { error } = await supabase().from("card_progress").upsert(
    {
      user_id: user.id,
      card_id: cardId,
      status,
      review_count: (existing?.review_count ?? 0) + 1,
      last_reviewed_at: now.toISOString(),
      next_due_at: nextDue.toISOString(),
      ease_factor: ease,
    },
    { onConflict: "user_id,card_id" }
  );
  if (error) throw error;
}
