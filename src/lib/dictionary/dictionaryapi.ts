import type { Definition, Example } from "@/types";
import type { DictionaryProvider, DictionaryResult } from "./types";

// Shape (rút gọn) trả về từ DictionaryAPI.dev
interface ApiPhonetic {
  text?: string;
  audio?: string;
}
interface ApiDefinition {
  definition: string;
  example?: string;
}
interface ApiMeaning {
  partOfSpeech: string;
  definitions: ApiDefinition[];
}
interface ApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: ApiPhonetic[];
  meanings?: ApiMeaning[];
}

const MAX_DEFINITIONS = 6;
const MAX_EXAMPLES = 4;

/** Cắt request khi upstream treo. DictionaryAPI.dev có lúc TTFB ~20s — để mặc
 *  thì serverless function hết giờ trước, người dùng chỉ thấy lỗi trắng. */
const TIMEOUT_MS = 7000;
/** Số lần gọi tối đa (1 lần thử + 1 lần lại): 5xx của upstream này thường là
 *  chập chờn, gọi lại ngay là được. Timeout thì KHÔNG thử lại — xem dưới. */
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 300;

/** Provider mặc định: https://dictionaryapi.dev (miễn phí, không cần key, chỉ tiếng Anh). */
export class DictionaryApiDevProvider implements DictionaryProvider {
  async lookup(word: string): Promise<DictionaryResult> {
    const term = word.trim();
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      term
    )}`;

    const res = await fetchWithRetry(url);

    if (res.status === 404) {
      return { term, definitions: [], examples: [], notFound: true };
    }
    if (!res.ok) {
      throw new Error(`DictionaryAPI error: ${res.status}`);
    }

    const entries = (await res.json()) as ApiEntry[];
    if (!Array.isArray(entries) || entries.length === 0) {
      return { term, definitions: [], examples: [], notFound: true };
    }

    return parseEntries(term, entries);
  }
}

/**
 * Gọi upstream, thử lại khi timeout/lỗi mạng hoặc 5xx (522 = Cloudflare không
 * nối được origin của dictionaryapi.dev — lỗi của họ, không phải của từ cần tra).
 * 4xx trả thẳng về cho caller xử lý (404 = không có từ).
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status < 500) return res;
      lastError = new Error(`DictionaryAPI error: ${res.status}`);
    } catch (e) {
      lastError = e;
      // Timeout nghĩa là upstream đang chậm chứ không phải rớt gói: thử lại chỉ
      // tốn thêm đúng TIMEOUT_MS nữa rồi cũng hỏng. Bỏ qua luôn cho nhanh xuống
      // provider dự phòng.
      if (e instanceof Error && e.name === "TimeoutError") break;
    }
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("DictionaryAPI không phản hồi");
}

function parseEntries(term: string, entries: ApiEntry[]): DictionaryResult {
  // Phonetic: lấy text đầu tiên có giá trị; đồng thời tách IPA UK/US theo audio locale.
  let phonetic: string | undefined;
  let phoneticUk: string | undefined;
  let phoneticUs: string | undefined;
  let audioUs: string | undefined;
  let audioUk: string | undefined;

  for (const entry of entries) {
    if (!phonetic && entry.phonetic) phonetic = entry.phonetic;
    for (const p of entry.phonetics ?? []) {
      if (!phonetic && p.text) phonetic = p.text;
      if (p.audio) {
        const lower = p.audio.toLowerCase();
        if (!audioUs && lower.includes("-us")) {
          audioUs = ensureHttps(p.audio);
          if (!phoneticUs && p.text) phoneticUs = p.text;
        }
        if (!audioUk && lower.includes("-uk")) {
          audioUk = ensureHttps(p.audio);
          if (!phoneticUk && p.text) phoneticUk = p.text;
        }
      }
    }
  }
  // Fallback: nếu không phân biệt được US/UK, dùng audio bất kỳ
  if (!audioUs && !audioUk) {
    const anyAudio = entries
      .flatMap((e) => e.phonetics ?? [])
      .find((p) => p.audio)?.audio;
    if (anyAudio) audioUs = ensureHttps(anyAudio);
  }

  const definitions: Definition[] = [];
  const examples: Example[] = [];
  let primaryPartOfSpeech: string | undefined;

  for (const entry of entries) {
    for (const meaning of entry.meanings ?? []) {
      if (!primaryPartOfSpeech) primaryPartOfSpeech = meaning.partOfSpeech;
      for (const def of meaning.definitions) {
        if (definitions.length < MAX_DEFINITIONS) {
          definitions.push({
            partOfSpeech: meaning.partOfSpeech,
            definition: def.definition,
          });
        }
        if (def.example && examples.length < MAX_EXAMPLES) {
          examples.push({ text: def.example });
        }
      }
    }
  }

  return {
    term,
    phonetic,
    phoneticUk,
    phoneticUs,
    audioUs,
    audioUk,
    partOfSpeech: primaryPartOfSpeech,
    definitions,
    examples,
  };
}

function ensureHttps(url: string): string {
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}
