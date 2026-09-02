"use client";

import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/supabase/currentUser";

const supabase = () => createClient();

export interface UnenrichedCard {
  id: string;
  term: string;
}

interface Enrichment {
  cefrLevel?: string;
  wordFamily?: string[];
  collocations?: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Lấy các thẻ chưa từng làm giàu (enriched_at IS NULL). Lọc theo deck nếu có. */
export async function fetchUnenriched(
  deckId?: string
): Promise<UnenrichedCard[]> {
  const userId = await currentUserId();
  if (!userId) return [];

  let q = supabase().from("cards").select("id, term").is("enriched_at", null);
  if (deckId) q = q.eq("deck_id", deckId);
  const { data, error } = await q;
  if (error || !data) return [];
  return data.map((c) => ({ id: c.id as string, term: c.term as string }));
}

/** Gọi server tính enrichment cho một lô từ. */
async function enrichWords(
  words: string[]
): Promise<Record<string, Enrichment>> {
  const res = await fetch("/api/enrich", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words }),
  });
  if (!res.ok) {
    const info = await res.json().catch(() => null);
    throw new Error(info?.message ?? "Làm giàu thất bại");
  }
  return res.json();
}

const CHUNK = 5; // số từ MỚI mỗi lần gọi /api/enrich (≤10 theo giới hạn route)

/**
 * Làm giàu danh sách thẻ cũ. Với mỗi thẻ: lấy enrichment (cache theo từ để
 * không gọi lại từ trùng), rồi cập nhật thẻ + đánh dấu `enriched_at`.
 * Chỉ ghi đè field khi có dữ liệu mới (tránh xóa dữ liệu cũ nếu Datamuse trống).
 * Gọi `onProgress(done, total)` sau mỗi lô. Trả về số thẻ đã xử lý.
 */
export async function runBackfill(
  cards: UnenrichedCard[],
  onProgress?: (done: number, total: number) => void
): Promise<number> {
  const total = cards.length;
  const cache = new Map<string, Enrichment>();
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
        return supabase().from("cards").update(patch).eq("id", c.id);
      })
    );

    done += chunk.length;
    onProgress?.(done, total);
  }

  return done;
}
