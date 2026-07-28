import { supabase } from "@/lib/supabase";
import { enrichWords, type WordEnrichment } from "@/lib/api";

export interface UnenrichedCard {
  id: string;
  term: string;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Lấy các thẻ chưa từng làm giàu (enriched_at IS NULL). Lọc theo deck nếu có. */
export async function fetchUnenriched(
  deckId?: string
): Promise<UnenrichedCard[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase.from("cards").select("id, term").is("enriched_at", null);
  if (deckId) q = q.eq("deck_id", deckId);
  const { data, error } = await q;
  if (error || !data) return [];
  return (data as { id: string; term: string }[]).map((c) => ({
    id: c.id,
    term: c.term,
  }));
}

const CHUNK = 5;

/**
 * Làm giàu danh sách thẻ cũ: gọi /api/enrich theo lô (cache theo từ), rồi cập
 * nhật thẻ + đánh dấu enriched_at. Chỉ ghi đè field khi có dữ liệu mới.
 */
export async function runBackfill(
  cards: UnenrichedCard[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const cache = new Map<string, WordEnrichment>();
  let done = 0;

  for (let i = 0; i < cards.length; i += CHUNK) {
    const chunk = cards.slice(i, i + CHUNK);

    const need = [
      ...new Set(chunk.map((c) => norm(c.term)).filter((w) => !cache.has(w))),
    ];
    if (need.length) {
      const map = await enrichWords(need);
      for (const w of need) cache.set(w, map[w] ?? {});
    }

    await Promise.all(
      chunk.map((c) => {
        const e = cache.get(norm(c.term)) ?? {};
        const patch: Record<string, unknown> = {
          enriched_at: new Date().toISOString(),
        };
        if (e.cefrLevel) patch.cefr_level = e.cefrLevel;
        if (e.wordFamily?.length) patch.word_family = e.wordFamily;
        if (e.collocations?.length) patch.collocations = e.collocations;
        return supabase.from("cards").update(patch).eq("id", c.id);
      })
    );

    done += chunk.length;
    onProgress?.(done, cards.length);
  }

  return done;
}
