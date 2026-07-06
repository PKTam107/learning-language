import { supabase } from "@/lib/supabase";
import type {
  Card,
  CardStatus,
  CardWithProgress,
  Deck,
  DraftCard,
} from "@/types";

/** Lưu DraftCard thành card trong deck. */
export async function saveCard(
  deckId: string,
  draft: DraftCard
): Promise<Card> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data, error } = await supabase
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

const DAY_MS = 86_400_000;
const MIN_EASE = 1.3;

/** Lịch ôn kiểu SM-2 rút gọn (đồng bộ với web src/lib/db/cards.ts). */
function computeSchedule(
  status: CardStatus,
  prevEase: number,
  prevIntervalDays: number
): { ease: number; intervalDays: number } {
  if (status === "hard") {
    return { ease: Math.max(MIN_EASE, prevEase - 0.2), intervalDays: 1 };
  }
  if (status === "easy") {
    const base = prevIntervalDays < 1 ? 3 : prevIntervalDays * prevEase * 1.3;
    return { ease: prevEase + 0.15, intervalDays: Math.round(base) };
  }
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
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const { data: existing } = await supabase
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

  const { error } = await supabase.from("card_progress").upsert(
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
