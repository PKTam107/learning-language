import { supabase } from "@/lib/supabase";
import type {
  Card,
  CardStatus,
  CardWithProgress,
  Deck,
  DraftCard,
} from "@/types";

/** Chuẩn hóa từ để so trùng: bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa, hạ thường. */
export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

/** Ném lỗi nếu deck đã có từ trùng (theo chuẩn hóa). Bỏ qua card đang sửa (excludeId). */
async function assertNoDuplicate(
  deckId: string,
  term: string,
  excludeId?: string
): Promise<void> {
  const normalized = normalizeTerm(term);
  let q = supabase.from("cards").select("id, term").eq("deck_id", deckId);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw error;
  if ((data ?? []).some((c: any) => normalizeTerm(c.term) === normalized)) {
    throw new Error(`Từ “${term.trim()}” đã có trong bộ thẻ này.`);
  }
}

/** Lưu DraftCard thành card trong deck. Chặn trùng từ trong cùng deck. */
export async function saveCard(
  deckId: string,
  draft: DraftCard
): Promise<Card> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const term = draft.term.trim();
  if (!term) throw new Error("Từ không được để trống");
  await assertNoDuplicate(deckId, term);

  const { data, error } = await supabase
    .from("cards")
    .insert({
      user_id: user.id,
      deck_id: deckId,
      term,
      phonetic: draft.phonetic ?? null,
      phonetic_uk: draft.phoneticUk ?? null,
      phonetic_us: draft.phoneticUs ?? null,
      audio_us: draft.audioUs ?? null,
      audio_uk: draft.audioUk ?? null,
      part_of_speech: draft.partOfSpeech ?? null,
      meaning_vi: draft.meaningVi ?? null,
      note: draft.note ?? null,
      definitions: draft.definitions,
      examples: draft.examples,
      source_language: draft.sourceLanguage,
      target_language: draft.targetLanguage,
    })
    .select()
    .single();
  if (error) {
    if (isUniqueViolation(error))
      throw new Error(`Từ “${term}” đã có trong bộ thẻ này.`);
    throw error;
  }
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

// ---------- Hành động hàng loạt (đồng bộ với web src/lib/db/cards.ts) ----------

/** Xóa nhiều thẻ theo id. */
export async function deleteCards(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("cards").delete().in("id", ids);
  if (error) throw error;
}

/**
 * Chuyển nhiều thẻ sang deck khác, bỏ qua thẻ trùng từ (chuẩn hóa) đã có ở deck đích.
 * Trả về số thẻ đã chuyển và số bị bỏ qua.
 */
export async function moveCards(
  ids: string[],
  targetDeckId: string
): Promise<{ moved: number; skipped: number }> {
  if (ids.length === 0) return { moved: 0, skipped: 0 };

  const [{ data: moving, error: e1 }, { data: existing, error: e2 }] =
    await Promise.all([
      supabase.from("cards").select("id, term").in("id", ids),
      supabase.from("cards").select("term").eq("deck_id", targetDeckId),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const taken = new Set((existing ?? []).map((c: any) => normalizeTerm(c.term)));
  const okIds = (moving ?? [])
    .filter((c: any) => !taken.has(normalizeTerm(c.term)))
    .map((c: any) => c.id);
  const skipped = ids.length - okIds.length;

  if (okIds.length > 0) {
    const { error } = await supabase
      .from("cards")
      .update({ deck_id: targetDeckId })
      .in("id", okIds);
    if (error) throw error;
  }
  return { moved: okIds.length, skipped };
}

/** Reset tiến độ nhiều thẻ về "chưa học" (xóa dòng card_progress tương ứng). */
export async function resetProgress(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");
  const { error } = await supabase
    .from("card_progress")
    .delete()
    .eq("user_id", user.id)
    .in("card_id", ids);
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
