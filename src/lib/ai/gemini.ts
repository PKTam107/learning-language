import type { TranslateOptions, TranslationProvider } from "./types";
import { buildTranslatePrompt, parseTranslationArray } from "./prompt";

/** Dịch qua Google Gemini (mặc định gemini-1.5-flash). */
export class GeminiProvider implements TranslationProvider {
  constructor(
    private apiKey: string,
    private model: string = process.env.GEMINI_MODEL || "gemini-1.5-flash"
  ) {}

  async translateBatch(
    texts: string[],
    opts: TranslateOptions
  ): Promise<string[]> {
    if (texts.length === 0) return [];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: buildTranslatePrompt(texts, opts) }] },
        ],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const content: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseTranslationArray(content, texts.length, texts);
  }
}
