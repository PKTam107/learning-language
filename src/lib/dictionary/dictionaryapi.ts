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

/** Provider mặc định: https://dictionaryapi.dev (miễn phí, không cần key, chỉ tiếng Anh). */
export class DictionaryApiDevProvider implements DictionaryProvider {
  async lookup(word: string): Promise<DictionaryResult> {
    const term = word.trim();
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
      term
    )}`;

    const res = await fetch(url, { cache: "no-store" });

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

function parseEntries(term: string, entries: ApiEntry[]): DictionaryResult {
  // Phonetic: lấy text đầu tiên có giá trị
  let phonetic: string | undefined;
  let audioUs: string | undefined;
  let audioUk: string | undefined;

  for (const entry of entries) {
    if (!phonetic && entry.phonetic) phonetic = entry.phonetic;
    for (const p of entry.phonetics ?? []) {
      if (!phonetic && p.text) phonetic = p.text;
      if (p.audio) {
        const lower = p.audio.toLowerCase();
        if (!audioUs && lower.includes("-us")) audioUs = ensureHttps(p.audio);
        if (!audioUk && lower.includes("-uk")) audioUk = ensureHttps(p.audio);
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
