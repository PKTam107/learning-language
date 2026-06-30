import type { TranslateOptions, TranslationProvider } from "./types";
import { buildTranslatePrompt, parseTranslationArray } from "./prompt";

/** Dịch qua OpenAI Chat Completions (mặc định gpt-4o-mini). */
export class OpenAIProvider implements TranslationProvider {
  constructor(
    private apiKey: string,
    private model: string = process.env.OPENAI_MODEL || "gpt-4o-mini"
  ) {}

  async translateBatch(
    texts: string[],
    opts: TranslateOptions
  ): Promise<string[]> {
    if (texts.length === 0) return [];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "user", content: buildTranslatePrompt(texts, opts) },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";
    return parseTranslationArray(content, texts.length, texts);
  }
}
