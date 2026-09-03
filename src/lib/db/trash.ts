"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";
import { fetchAllRows } from "@/lib/db/paginate";
import type { Card, CardProgress, Deck } from "@/types";

const supabase = () => createClient();

/** Thẻ/bộ thẻ trong thùng rác quá số ngày này thì bị dọn hẳn. */
export const TRASH_RETENTION_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * Thùng rác (bảng `deleted_items`, migration 0009).
 *
 * Xóa thẻ hay bộ thẻ **không** xóa thẳng nữa: bản ghi được chuyển sang bảng lưu
 * trữ dạng jsonb rồi mới xóa khỏi `cards`/`decks`. Nhờ vậy mọi truy vấn hiện có
 * (phiên học, thống kê, export, chống trùng từ, cả bản mobile) không cần thêm
 * điều kiện lọc nào — sót một chỗ là thẻ đã xóa lại lọt vào bài học.
 *
 * Giới hạn đã biết: `review_events.card_id` là ON DELETE SET NULL nên nhật ký ôn
 * (streak/heatmap) vẫn còn, nhưng phục hồi thẻ thì không nối lại liên kết đó —
 * nghĩa là "Bạn hay quên" không tính lại các lượt quên cũ của thẻ được phục hồi.
 */
export interface TrashEntry {
  id: string;
  kind: "card" | "deck";
  item_id: string;
  /** Từ (thẻ) hoặc tên bộ thẻ. */
  label: string;
  /** Với thẻ: tên bộ thẻ gốc. */
  deck_name: string | null;
  /** Với bộ thẻ: số thẻ bị xóa kèm. */
  card_count: number;
  deleted_at: string;
  /** Số ngày còn lại trước khi bị dọn hẳn (0 = sẽ dọn ngay lần mở tới). */
  daysLeft: number;
}

/** Bản ghi thẻ kèm tiến độ, dạng lưu trong payload. */
interface ArchivedCard {
  card: Card;
  progress: CardProgress | null;
}

async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new Error("Chưa đăng nhập");
  return userId;
}

/** Tách dòng `cards` kèm `card_progress(*)` thành payload lưu trữ. */
function toArchived(row: any): ArchivedCard {
  const { card_progress, ...card } = row;
  return { card: card as Card, progress: card_progress?.[0] ?? null };
}

// ---------- Chuyển vào thùng rác ----------

/**
 * Chuyển các thẻ vào thùng rác rồi xóa khỏi `cards`.
 *
 * Thứ tự quan trọng: lưu trữ TRƯỚC, xóa SAU. Ngược lại thì lỗi giữa đường là
 * mất thẻ; theo thứ tự này, lỗi giữa đường chỉ để lại một bản lưu trữ dư mà
 * người dùng thấy trong thùng rác (thẻ gốc vẫn còn).
 */
export async function trashCards(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const userId = await requireUserId();
  const sb = supabase();

  const { data: rows, error } = await sb
    .from("cards")
    .select("*, card_progress(*)")
    .in("id", ids)
    .eq("user_id", userId);
  if (error) throw error;
  if (!rows?.length) return;

  const deckIds = Array.from(new Set(rows.map((r: any) => r.deck_id)));
  const { data: decks } = await sb
    .from("decks")
    .select("id, name")
    .in("id", deckIds);
  const deckName = new Map(
    (decks ?? []).map((d: any) => [d.id as string, d.name as string])
  );

  const entries = rows.map((row: any) => {
    const archived = toArchived(row);
    return {
      user_id: userId,
      kind: "card" as const,
      item_id: archived.card.id,
      label: archived.card.term,
      deck_name: deckName.get(archived.card.deck_id) ?? null,
      payload: archived,
      card_count: 1,
    };
  });

  const { error: insertErr } = await sb.from("deleted_items").insert(entries);
  if (insertErr) throw insertErr;

  const { error: delErr } = await sb
    .from("cards")
    .delete()
    .in(
      "id",
      rows.map((r: any) => r.id)
    )
    .eq("user_id", userId);
  if (delErr) throw delErr;
}

/** Chuyển cả bộ thẻ (kèm toàn bộ thẻ bên trong) vào thùng rác. */
export async function trashDeck(deckId: string): Promise<void> {
  const userId = await requireUserId();
  const sb = supabase();

  const { data: deck, error } = await sb
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!deck) return;

  // Bộ thẻ lớn thì phải phân trang: thiếu dòng là phục hồi bị hụt thẻ.
  const rows = await fetchAllRows<any>((from, to) =>
    sb
      .from("cards")
      .select("*, card_progress(*)")
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .order("id")
      .range(from, to)
  );
  const cards = rows.map(toArchived);

  const { error: insertErr } = await sb.from("deleted_items").insert({
    user_id: userId,
    kind: "deck",
    item_id: deck.id,
    label: (deck as Deck).name,
    payload: { deck, cards },
    card_count: cards.length,
  });
  if (insertErr) throw insertErr;

  // Xóa deck kéo theo cards (FK on delete cascade) — bản lưu trữ đã có đủ.
  const { error: delErr } = await sb
    .from("decks")
    .delete()
    .eq("id", deckId)
    .eq("user_id", userId);
  if (delErr) throw delErr;
}

// ---------- Đọc / dọn ----------

function withDaysLeft(row: any): TrashEntry {
  const elapsed = Date.now() - new Date(row.deleted_at).getTime();
  const daysLeft = Math.max(
    0,
    TRASH_RETENTION_DAYS - Math.floor(elapsed / DAY_MS)
  );
  return { ...(row as TrashEntry), daysLeft };
}

/** Dọn hẳn những mục đã quá hạn lưu. Gọi mỗi khi mở thùng rác. */
export async function purgeExpired(): Promise<number> {
  const userId = await currentUserId();
  if (!userId) return 0;
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * DAY_MS);
  const { data, error } = await supabase()
    .from("deleted_items")
    .delete()
    .lt("deleted_at", cutoff.toISOString())
    .eq("user_id", userId)
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
}

export async function fetchTrash(): Promise<TrashEntry[]> {
  const rows = await fetchAllRows<any>((from, to) =>
    supabase()
      .from("deleted_items")
      .select("id, kind, item_id, label, deck_name, card_count, deleted_at")
      .order("deleted_at", { ascending: false })
      .order("id")
      .range(from, to)
  );
  return rows.map(withDaysLeft);
}

/** Số mục trong thùng rác (đếm phía server) — để hiện badge ở Cài đặt. */
export async function fetchTrashCount(): Promise<number> {
  const { count, error } = await supabase()
    .from("deleted_items")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}

export async function purgeTrashItem(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase()
    .from("deleted_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function emptyTrash(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase()
    .from("deleted_items")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// ---------- Phục hồi ----------

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
}

/** Ghi lại các thẻ đã lưu trữ. Thẻ trùng từ ở bộ đích được bỏ qua, không chặn cả lô. */
async function restoreCards(
  items: ArchivedCard[]
): Promise<{ restored: number; skipped: number }> {
  const sb = supabase();
  let restored = 0;
  let skipped = 0;

  for (const item of items) {
    const { error } = await sb.from("cards").insert(item.card);
    if (error) {
      // Từ đã được tạo lại bằng tay trong lúc thẻ ở thùng rác → bỏ qua thẻ này.
      if (isUniqueViolation(error)) {
        skipped++;
        continue;
      }
      throw error;
    }
    restored++;
    if (item.progress) {
      const { error: progErr } = await sb
        .from("card_progress")
        .upsert(item.progress, { onConflict: "user_id,card_id" });
      // Mất tiến độ thì thẻ vẫn về (thành "Chưa học") — không hủy cả lần phục hồi.
      if (progErr) console.warn("restore progress:", progErr.message);
    }
  }
  return { restored, skipped };
}

export interface RestoreResult {
  kind: "card" | "deck";
  label: string;
  restored: number;
  skipped: number;
}

/**
 * Phục hồi một mục trong thùng rác.
 *
 * Thẻ chỉ về được khi bộ thẻ gốc còn tồn tại (khóa ngoại `deck_id`) — bộ thẻ
 * cũng bị xóa thì phải phục hồi bộ thẻ trước.
 */
export async function restoreTrashItem(id: string): Promise<RestoreResult> {
  const userId = await requireUserId();
  const sb = supabase();

  const { data: entry, error } = await sb
    .from("deleted_items")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!entry) throw new Error("Mục này không còn trong thùng rác.");

  const payload = entry.payload as any;

  if (entry.kind === "card") {
    const item = payload as ArchivedCard;
    const { count } = await sb
      .from("decks")
      .select("id", { count: "exact", head: true })
      .eq("id", item.card.deck_id);
    if (!count) {
      throw new Error(
        `Bộ thẻ “${entry.deck_name ?? "gốc"}” đã bị xóa — hãy phục hồi bộ thẻ trước.`
      );
    }
    const result = await restoreCards([item]);
    if (result.restored === 0) {
      throw new Error(
        `Từ “${entry.label}” đã có lại trong bộ thẻ — không phục hồi để tránh trùng.`
      );
    }
    await purgeTrashItem(id);
    return { kind: "card", label: entry.label, ...result };
  }

  // Bộ thẻ: dựng lại deck trước rồi tới thẻ (thẻ có khóa ngoại tới deck).
  const { error: deckErr } = await sb.from("decks").insert(payload.deck);
  if (deckErr && !isUniqueViolation(deckErr)) throw deckErr;

  const result = await restoreCards((payload.cards ?? []) as ArchivedCard[]);
  await purgeTrashItem(id);
  return { kind: "deck", label: entry.label, ...result };
}
