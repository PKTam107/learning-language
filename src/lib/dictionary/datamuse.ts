import type { Definition } from "@/types";
import type { DictionaryProvider, DictionaryResult } from "./types";

/**
 * Provider **dự phòng**: Datamuse (miễn phí, không key, đã dùng ở /lib/enrich).
 *
 * Vì sao cần: DictionaryAPI.dev chạy sau Cloudflare và thỉnh thoảng sập hẳn
 * (522 = Cloudflare không nối được origin) hoặc chậm tới ~20s. Không có dự phòng
 * thì đúng lúc đó người dùng không tra được từ nào, /api/lookup trả 502.
 *
 * Đánh đổi: Datamuse chỉ có **định nghĩa**, không có IPA/audio/ví dụ. Nên kết quả
 * ở đây luôn gắn `degraded: true` — caller (lib/lookup) sẽ KHÔNG ghi cache, tránh
 * đóng đinh một thẻ thiếu phiên âm cho những lần tra sau khi upstream đã hồi.
 */
const TIMEOUT_MS = 4000;
const MAX_DEFINITIONS = 6;

interface DatamuseWord {
  word: string;
  defs?: string[];
}

/** Mã từ loại của Datamuse → tên đầy đủ, cho khớp cách DictionaryAPI trả về. */
const POS: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  u: "",
};

export class DatamuseProvider implements DictionaryProvider {
  async lookup(word: string): Promise<DictionaryResult> {
    const term = word.trim();
    const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(
      term
    )}&md=d&max=1`;

    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`Datamuse error: ${res.status}`);
    }

    const words = (await res.json()) as DatamuseWord[];
    // `sp=` là tìm gần đúng: "a number of" trả về "a number 1". Chỉ nhận khi
    // trùng khít, không thì coi như không có từ.
    const hit = words.find(
      (w) => w.word.toLowerCase() === term.toLowerCase() && w.defs?.length
    );
    if (!hit) {
      return {
        term,
        definitions: [],
        examples: [],
        notFound: true,
        degraded: true,
      };
    }

    const definitions: Definition[] = [];
    for (const raw of hit.defs ?? []) {
      if (definitions.length >= MAX_DEFINITIONS) break;
      // Mỗi def có dạng "adj\tReturning quickly to normal..."
      const tab = raw.indexOf("\t");
      const code = tab === -1 ? "" : raw.slice(0, tab);
      const text = (tab === -1 ? raw : raw.slice(tab + 1)).trim();
      if (!text) continue;
      definitions.push({ partOfSpeech: POS[code] ?? code, definition: text });
    }

    return {
      term,
      partOfSpeech: definitions[0]?.partOfSpeech || undefined,
      definitions,
      examples: [],
      degraded: true,
    };
  }
}
