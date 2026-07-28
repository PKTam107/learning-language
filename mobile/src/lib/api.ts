import { supabase } from "@/lib/supabase";
import type { DraftCard } from "@/types";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

/** Gọi API route của web app kèm Bearer token của session hiện tại. */
async function apiFetch(path: string, body: unknown): Promise<Response> {
  if (!API_BASE) {
    throw new Error(
      "Thiếu EXPO_PUBLIC_API_BASE_URL — điền URL web app trong mobile/.env."
    );
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Chưa đăng nhập");

  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
}

/** Tra cứu 1 từ → DraftCard (gọi /api/lookup của web). */
export async function lookupWord(
  word: string,
  source = "en",
  target = "vi"
): Promise<DraftCard> {
  const res = await apiFetch("/api/lookup", { word, source, target });
  if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn");
  if (!res.ok) throw new Error("Tra từ thất bại");
  return (await res.json()) as DraftCard;
}

export interface WordEnrichment {
  cefrLevel?: string;
  wordFamily?: string[];
  collocations?: string[];
}

/** Làm giàu một lô từ (gọi /api/enrich của web) → { [word]: enrichment }. */
export async function enrichWords(
  words: string[]
): Promise<Record<string, WordEnrichment>> {
  const res = await apiFetch("/api/enrich", { words });
  if (res.status === 401) throw new Error("Phiên đăng nhập hết hạn");
  if (!res.ok) {
    const info = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(info?.message ?? "Làm giàu thất bại");
  }
  return (await res.json()) as Record<string, WordEnrichment>;
}
