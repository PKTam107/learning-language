import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paginate";
import type { Card, CardProgress, Deck } from "@/types";

/**
 * Thùng rác (bảng `deleted_items`, migration 0009) — bản sao của web
 * `src/lib/db/trash.ts`, giữ phần cần cho bản điện thoại: **chuyển vào thùng
 * rác** khi xóa. Việc phục hồi / dọn hẳn hiện làm trên web.
 *
 * Quan trọng là hai client xóa giống nhau: nếu mobile vẫn xóa thẳng thì thẻ xóa
 * trên điện thoại sẽ không có đường về, dù web có thùng rác.
 */
export const TRASH_RETENTION_DAYS = 30;

interface ArchivedCard {
  card: Card;
  progress: CardProgress | null;
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Chưa đăng nhập");
  return user.id;
}

function toArchived(row: any): ArchivedCard {
  const { card_progress, ...card } = row;
  return { card: card as Card, progress: card_progress?.[0] ?? null };
}

/**
 * Chuyển các thẻ vào thùng rác rồi xóa khỏi `cards`.
 * Lưu trữ TRƯỚC, xóa SAU — lỗi giữa đường thì thà dư một bản lưu trữ còn hơn mất thẻ.
 */
export async function trashCards(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const userId = await requireUserId();

  const { data: rows, error } = await supabase
    .from("cards")
    .select("*, card_progress(*)")
    .in("id", ids)
    .eq("user_id", userId);
  if (error) throw error;
  if (!rows?.length) return;

  const deckIds = Array.from(new Set(rows.map((r: any) => r.deck_id)));
  const { data: decks } = await supabase
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

  const { error: insertErr } = await supabase
    .from("deleted_items")
    .insert(entries);
  if (insertErr) throw insertErr;

  const { error: delErr } = await supabase
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

  const { data: deck, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!deck) return;

  // Bộ thẻ lớn thì phải phân trang: thiếu dòng là phục hồi bị hụt thẻ.
  const rows = await fetchAllRows<any>((from, to) =>
    supabase
      .from("cards")
      .select("*, card_progress(*)")
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .order("id")
      .range(from, to)
  );
  const cards = rows.map(toArchived);

  const { error: insertErr } = await supabase.from("deleted_items").insert({
    user_id: userId,
    kind: "deck",
    item_id: (deck as Deck).id,
    label: (deck as Deck).name,
    payload: { deck, cards },
    card_count: cards.length,
  });
  if (insertErr) throw insertErr;

  const { error: delErr } = await supabase
    .from("decks")
    .delete()
    .eq("id", deckId)
    .eq("user_id", userId);
  if (delErr) throw delErr;
}

/** Số mục đang nằm trong thùng rác (để hiện ghi chú ở Cài đặt). */
export async function fetchTrashCount(): Promise<number> {
  const { count, error } = await supabase
    .from("deleted_items")
    .select("id", { count: "exact", head: true });
  if (error) return 0;
  return count ?? 0;
}
