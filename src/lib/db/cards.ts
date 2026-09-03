"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";
import { fetchAllRows } from "@/lib/db/paginate";
import { resolvePolicy } from "@/lib/db/policy";
import { trashCards } from "@/lib/db/trash";
import { buildDueQueue, type DueQueue } from "@/lib/queue";
import { rowFromState, scheduleReview, stateFromRow } from "@/lib/srs";
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
 * Hàng đợi "Ôn hôm nay" trên **toàn tài khoản** (mọi bộ thẻ).
 *
 * Gồm thẻ tới hạn ôn lại + từ mới trong hạn mức hôm nay (xem `lib/queue.ts`).
 * Điều kiện tới hạn không diễn đạt được bằng filter trên bảng `cards` (thẻ chưa
 * học không có dòng progress), nên lọc phía client. RLS đã giới hạn theo user.
 */
export async function fetchDueQueueAllDecks(
  newPerDay: number
): Promise<DueQueue<CardWithProgress>> {
  const [rows, policy] = await Promise.all([
    fetchAllRows<any>((from, to) =>
      supabase()
        .from("cards")
        .select("*, card_progress(*)")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to)
    ),
    resolvePolicy(newPerDay),
  ]);

  const cards: CardWithProgress[] = rows.map((c: any) => ({
    ...c,
    progress: c.card_progress?.[0] ?? null,
  }));
  return buildDueQueue(cards, policy);
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

/** Xóa thẻ = chuyển vào thùng rác 30 ngày (xem `lib/db/trash.ts`). */
export async function deleteCard(id: string): Promise<void> {
  await trashCards([id]);
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

/** Xóa nhiều thẻ = chuyển cả lô vào thùng rác. */
export async function deleteCards(ids: string[]): Promise<void> {
  await trashCards(ids);
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

/**
 * Cột chưa tồn tại — thường là do migration 0009 chưa chạy. PostgREST trả 42703
 * (undefined_column) hoặc PGRST204 (cache schema không thấy cột).
 */
function isUndefinedColumn(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === "42703" || code === "PGRST204";
}

/** Ảnh chụp một lượt đánh giá — đủ để hoàn tác (xem `undoReview`). */
export interface ReviewReceipt {
  cardId: string;
  /** Dòng `card_progress` TRƯỚC khi ghi; null = thẻ chưa từng ôn. */
  prev: Record<string, unknown> | null;
  /** Id dòng nhật ký ôn vừa ghi; null nếu ghi nhật ký lỗi. */
  eventId: string | null;
}

/**
 * Ghi nhận đánh giá + tính lịch ôn lại (xem `lib/srs.ts`).
 * Trả về ảnh chụp trạng thái cũ để người dùng hoàn tác được nếu bấm nhầm.
 */
export async function recordProgress(
  cardId: string,
  status: CardStatus
): Promise<ReviewReceipt> {
  const userId = await requireUserId();

  // Lấy cả dòng: vừa để tính lịch, vừa làm ảnh chụp cho hoàn tác.
  const { data: existing } = await supabase()
    .from("card_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  const now = new Date();
  const { state, dueAt } = scheduleReview(
    stateFromRow(existing),
    status as "hard" | "good" | "easy",
    now
  );

  const row = rowFromState(state, dueAt, now);
  let { error } = await supabase().from("card_progress").upsert(
    {
      user_id: userId,
      card_id: cardId,
      ...row,
      // Mốc "từ mới hôm nay" chỉ đặt ở lượt ôn đầu tiên rồi giữ nguyên.
      introduced_at:
        (existing?.introduced_at as string | null) ?? now.toISOString(),
    },
    { onConflict: "user_id,card_id" }
  );

  // Migration 0009 chưa chạy → ghi lại bằng bộ cột cũ. Mất bước học và hạn mức
  // từ mới, nhưng phiên học không đứng giữa chừng vì một lệnh SQL chưa chạy.
  if (error && isUndefinedColumn(error)) {
    const { interval_days, srs_phase, learning_step, lapses, ...legacy } = row;
    ({ error } = await supabase()
      .from("card_progress")
      .upsert(
        { user_id: userId, card_id: cardId, ...legacy },
        { onConflict: "user_id,card_id" }
      ));
  }
  if (error) throw error;

  // Ghi nhật ký ôn cho streak/thống kê. Không chặn luồng học nếu lỗi (vd
  // migration review_events chưa chạy) — chỉ mất khả năng hoàn tác dòng này.
  let eventId: string | null = null;
  const { data: event, error: logErr } = await supabase()
    .from("review_events")
    .insert({ user_id: userId, card_id: cardId, status })
    .select("id")
    .single();
  if (logErr) console.warn("review_events:", logErr.message);
  else eventId = (event?.id as string) ?? null;

  return { cardId, prev: existing ?? null, eventId };
}

/**
 * Hoàn tác một lượt đánh giá: trả `card_progress` về đúng ảnh chụp cũ và xóa
 * dòng nhật ký ôn tương ứng (để streak/heatmap không đếm lượt đã hủy).
 *
 * Thẻ trước đó chưa từng ôn thì xóa hẳn dòng progress — đúng trạng thái
 * "Chưa học" ban đầu.
 */
export async function undoReview(receipt: ReviewReceipt): Promise<void> {
  const userId = await requireUserId();
  const sb = supabase();

  if (receipt.prev) {
    const { error } = await sb
      .from("card_progress")
      .upsert(receipt.prev, { onConflict: "user_id,card_id" });
    if (error) throw error;
  } else {
    const { error } = await sb
      .from("card_progress")
      .delete()
      .eq("user_id", userId)
      .eq("card_id", receipt.cardId);
    if (error) throw error;
  }

  if (receipt.eventId) {
    const { error } = await sb
      .from("review_events")
      .delete()
      .eq("id", receipt.eventId)
      .eq("user_id", userId);
    if (error) console.warn("undo review_events:", error.message);
  }
}
