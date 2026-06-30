import type { TranslateOptions } from "./types";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  ja: "Japanese",
  ko: "Korean",
  fr: "French",
  zh: "Chinese",
};

export function langName(code: string): string {
  return LANG_NAMES[code] ?? code;
}

/** Prompt chung cho mọi AI provider: dịch mảng text, trả JSON array đúng thứ tự. */
export function buildTranslatePrompt(
  texts: string[],
  opts: TranslateOptions
): string {
  const from = langName(opts.from);
  const to = langName(opts.to);
  return [
    `You are a translation engine for a vocabulary flashcard app.`,
    `Translate each ${from} item below into natural, concise ${to}.`,
    `Keep dictionary meanings short (suitable for a flashcard); keep example sentences faithful.`,
    `Return ONLY a JSON array of strings, same length and order as the input. No markdown, no extra keys.`,
    ``,
    `Input (JSON array):`,
    JSON.stringify(texts),
  ].join("\n");
}

/** Parse output của model thành mảng string đúng độ dài; fallback giữ nguyên input. */
export function parseTranslationArray(
  raw: string,
  expectedLength: number,
  fallback: string[]
): string[] {
  try {
    // Bóc khối ```json nếu model lỡ wrap
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length === expectedLength) {
      return parsed.map((x) => String(x));
    }
  } catch {
    // ignore
  }
  return fallback;
}
