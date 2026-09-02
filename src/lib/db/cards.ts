"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";
import { isDue } from "@/lib/status";
import { fetchAllRows } from "@/lib/db/paginate";
import type { Card, CardStatus, CardWithProgress, DraftCard } from "@/types";

const supabase = () => createClient();

/** Chuẩn hóa từ để so trùng: bỏ khoảng trắng đầu/cuối, gộp khoảng trắng giữa, hạ thường. */
export function normalizeTerm(term: string): string {
  return term.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Postgres unique_violation → thông báo trùng thân thiện. */
function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

/**
 * Ném lỗi nếu deck đã có từ trùng (theo chuẩn hóa). Bỏ qua chính card đang sửa (excludeId).
 * Cùng một từ vẫn được phép ở deck khác.
 */
async function assertNoDuplicate(
  deckId: string,
  term: string,
  excludeId?: string
): Promise<void> {
  const normalized = normalizeTerm(term);
  // So trùng phải quét ĐỦ bộ thẻ: thiếu dòng là để lọt từ trùng.
  const rows = await fetchAllRows<{ id: string; term: string }>((from, to) => {
    let q = supabase()
      .from("cards")
      .select("id, term")
      .eq("deck_id", deckId);
    if (excludeId) q = q.neq("id", excludeId);
    return q.order("id").range(from, to);
  });
  if (rows.some((c) => normalizeTerm(c.term) === normalized)) {
    throw new Error(`Từ “${term.trim()}” đã có trong bộ thẻ này.`);
  }
}

/** Lưu DraftCard thành card trong deck. Chặn trùng từ trong cùng deck. */
export async function saveCard(
  deckId: string,
  draft: DraftCard
): Promise<Card> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const term = draft.term.trim();
  if (!term) throw new Error("Từ không được để trống");
  await assertNoDuplicate(deckId, term);

  const { data, error } = await supabase()
    .from("cards")
    .insert({
      user_id: userId,
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
      cefr_level: draft.cefrLevel ?? null,
      word_family: draft.wordFamily ?? [],
      collocations: draft.collocations ?? [],
      enriched_at: draft.enriched ? new Date().toISOString() : null,
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

/** Cập nhật 1 card đã lưu từ DraftCard (dùng khi sửa thẻ). */
export async function updateCard(
  id: string,
  deckId: string,
  draft: DraftCard
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const term = draft.term.trim();
  if (!term) throw new Error("Từ không được để trống");
  await assertNoDuplicate(deckId, term, id);

  const { error } = await supabase()
    .from("cards")
    .update({
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
      cefr_level: draft.cefrLevel ?? null,
      word_family: draft.wordFamily ?? [],
      collocations: draft.collocations ?? [],
    })
    .eq("id", id)
    .eq("user_id", userId); // chỉ sửa thẻ của chính mình
  if (error) {
    if (isUniqueViolation(error))
      throw new Error(`Từ “${term}” đã có trong bộ thẻ này.`);
    throw error;
  }
}

/** Chuyển Card (snake_case DB) → DraftCard (camelCase) để tái dùng DraftEditor. */
export function cardToDraft(card: Card): DraftCard {
  return {
    term: card.term,
    phonetic: card.phonetic ?? undefined,
    phoneticUk: card.phonetic_uk ?? undefined,
    phoneticUs: card.phonetic_us ?? undefined,
    audioUs: card.audio_us ?? undefined,
    audioUk: card.audio_uk ?? undefined,
    partOfSpeech: card.part_of_speech ?? undefined,
    meaningVi: card.meaning_vi ?? undefined,
    note: card.note ?? undefined,
    definitions: card.definitions ?? [],
    examples: card.examples ?? [],
    cefrLevel: card.cefr_level ?? undefined,
    wordFamily: card.word_family ?? [],
    collocations: card.collocations ?? [],
    sourceLanguage: card.source_language,
    targetLanguage: card.target_language,
  };
}

/**
 * Nhập hàng loạt DraftCard vào deck (dùng cho import Excel).
 * Bỏ qua từ trùng (chuẩn hóa) — cả trùng với từ đã có lẫn trùng trong chính lô nhập.
 * Trả về số đã thêm / số bị bỏ qua.
 */
export async function importCards(
  deckId: string,
  drafts: DraftCard[]
): Promise<{ inserted: number; skipped: number }> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");
  if (drafts.length === 0) return { inserted: 0, skipped: 0 };

  // Phải lấy ĐỦ danh sách từ đã có: thiếu dòng là chặn trùng hụt, bộ thẻ trên
  // 1000 từ sẽ nhận thêm bản trùng khi nhập Excel.
  const existing = await fetchAllRows<{ term: string }>((from, to) =>
    supabase()
      .from("cards")
      .select("term")
      .eq("deck_id", deckId)
      .order("id")
      .range(from, to)
  );

  const taken = new Set(existing.map((c) => normalizeTerm(c.term)));
  const rows: Record<string, unknown>[] = [];
  for (const d of drafts) {
    const term = d.term.trim();
    if (!term) continue;
    const norm = normalizeTerm(term);
    if (taken.has(norm)) continue; // trùng (đã có hoặc lặp trong lô) → bỏ qua
    taken.add(norm);
    rows.push({
      user_id: userId,
      deck_id: deckId,
      term,
      phonetic: d.phonetic ?? null,
      phonetic_uk: d.phoneticUk ?? null,
      phonetic_us: d.phoneticUs ?? null,
      audio_us: d.audioUs ?? null,
      audio_uk: d.audioUk ?? null,
      part_of_speech: d.partOfSpeech ?? null,
      meaning_vi: d.meaningVi ?? null,
      note: d.note ?? null,
      definitions: d.definitions ?? [],
      examples: d.examples ?? [],
      cefr_level: d.cefrLevel ?? null,
      word_family: d.wordFamily ?? [],
      collocations: d.collocations ?? [],
      source_language: d.sourceLanguage ?? "en",
      target_language: d.targetLanguage ?? "vi",
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase().from("cards").insert(rows);
    if (error) throw error;
  }
  return { inserted: rows.length, skipped: drafts.length - rows.length };
}

export async function fetchCards(deckId: string): Promise<Card[]> {
  return (await fetchAllRows<Card>((from, to) =>
    supabase()
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
  )) as Card[];
}

/** Card kèm progress để dùng trong study mode. */
export async function fetchCardsWithProgress(
  deckId: string
): Promise<CardWithProgress[]> {
  // ORDER BY là bắt buộc, vì hai lý do:
  //  1. Không có nó, Postgres trả về theo thứ tự tùy ý — và thứ tự đó *đổi
  //     thật* mỗi khi hàng bị ghi lại (vd "Làm giàu thẻ" set enriched_at),
  //     khiến danh sách từ tự xáo và phiên "không xáo trộn" trông như đã xáo.
  //  2. Phân trang không có thứ tự xác định thì hai trang liên tiếp có thể
  //     trùng dòng hoặc bỏ sót dòng.
  // Chốt thêm `id` vì importCards insert cả lô trong MỘT câu lệnh, nên mọi thẻ
  // nhập từ Excel có created_at giống hệt nhau.
  const rows = await fetchAllRows<any>((from, to) =>
    supabase()
      .from("cards")
      .select("*, card_progress(*)")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
  );

  return rows.map((c: any) => ({
    ...c,
    progress: c.card_progress?.[0] ?? null,
  }));
}

/**
 * Thẻ đến hạn ôn trên **toàn tài khoản** (mọi bộ thẻ), cho phiên "Ôn hôm nay".
 *
 * Điều kiện "đến hạn" (xem `isDue`) là *chưa có dòng progress* HOẶC
 * `next_due_at` đã qua — vế đầu không diễn đạt được bằng filter trên bảng
 * `cards`, nên lọc phía client. RLS đã giới hạn theo user.
 */
export async function fetchDueCardsAllDecks(): Promise<CardWithProgress[]> {
  const rows = await fetchAllRows<any>((from, to) =>
    supabase()
      .from("cards")
      .select("*, card_progress(*)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to)
  );

  const now = Date.now();
  return rows
    .map((c: any) => ({ ...c, progress: c.card_progress?.[0] ?? null }))
    .filter((c: CardWithProgress) => isDue(c.progress?.next_due_at, now));
}

/**
 * Lấy thẻ theo danh sách id, **giữ đúng thứ tự id truyền vào** — dùng cho phiên
 * ôn "Bạn hay quên", nơi thứ tự đã được xếp theo số lần quên. Id không còn thẻ
 * (đã xóa) thì bỏ qua.
 */
export async function fetchCardsByIds(
  ids: string[]
): Promise<CardWithProgress[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase()
    .from("cards")
    .select("*, card_progress(*)")
    .in("id", ids);
  if (error) throw error;

  const byId = new Map(
    (data ?? []).map((c: any) => [
      c.id as string,
      { ...c, progress: c.card_progress?.[0] ?? null } as CardWithProgress,
    ])
  );
  return ids.map((id) => byId.get(id)).filter(Boolean) as CardWithProgress[];
}

/** Lấy id user hiện tại; ném lỗi nếu chưa đăng nhập. */
async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");
  return userId;
}

export async function deleteCard(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase()
    .from("cards")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function moveCard(id: string, deckId: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase()
    .from("cards")
    .update({ deck_id: deckId })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------- Hành động hàng loạt ----------

/** Xóa nhiều thẻ theo id. */
export async function deleteCards(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const userId = await requireUserId();
  const { error } = await supabase()
    .from("cards")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Chuyển nhiều thẻ sang deck khác. Bỏ qua thẻ có từ trùng (chuẩn hóa) đã tồn tại
 * ở deck đích để không vi phạm unique — trả về số thẻ bị bỏ qua.
 */
export async function moveCards(
  ids: string[],
  targetDeckId: string
): Promise<{ moved: number; skipped: number }> {
  if (ids.length === 0) return { moved: 0, skipped: 0 };

  const sb = supabase();
  const userId = await requireUserId();
  const [moving, existing] = await Promise.all([
    fetchAllRows<{ id: string; term: string }>((from, to) =>
      sb
        .from("cards")
        .select("id, term")
        .in("id", ids)
        .eq("user_id", userId)
        .order("id")
        .range(from, to)
    ),
    // Danh sách từ ở bộ đích — thiếu dòng là chuyển vào gây trùng.
    fetchAllRows<{ term: string }>((from, to) =>
      sb
        .from("cards")
        .select("term")
        .eq("deck_id", targetDeckId)
        .eq("user_id", userId)
        .order("id")
        .range(from, to)
    ),
  ]);

  const taken = new Set(existing.map((c) => normalizeTerm(c.term)));
  const okIds = moving
    .filter((c) => !taken.has(normalizeTerm(c.term)))
    .map((c) => c.id);
  const skipped = ids.length - okIds.length;

  if (okIds.length > 0) {
    const { error } = await sb
      .from("cards")
      .update({ deck_id: targetDeckId })
      .in("id", okIds)
      .eq("user_id", userId);
    if (error) throw error;
  }
  return { moved: okIds.length, skipped };
}

/** Reset tiến độ nhiều thẻ về "chưa học" (xóa dòng card_progress tương ứng). */
export async function resetProgress(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");
  const { error } = await supabase()
    .from("card_progress")
    .delete()
    .eq("user_id", userId)
    .in("card_id", ids);
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
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const { data: existing } = await supabase()
    .from("card_progress")
    .select("review_count, ease_factor, last_reviewed_at, next_due_at")
    .eq("user_id", userId)
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
      user_id: userId,
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

  // Ghi nhật ký ôn cho streak/thống kê. Không chặn luồng học nếu lỗi
  // (vd migration review_events chưa chạy) — nuốt lỗi im lặng.
  void supabase()
    .from("review_events")
    .insert({ user_id: userId, card_id: cardId, status })
    .then(({ error: logErr }) => {
      if (logErr) console.warn("review_events:", logErr.message);
    });
}
