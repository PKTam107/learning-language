import type { TranslateOptions, TranslationProvider } from "./types";
import { buildTranslatePrompt, parseTranslationArray } from "./prompt";

/**
 * Dịch qua Google Gemini — dòng Flash có **free tier**, nên là provider mặc định
 * khi có key.
 *
 * Mặc định lấy bản **Flash-Lite**: việc ở đây chỉ là dịch vài chuỗi ngắn, mà
 * Flash-Lite lại có hạn mức free rộng nhất — đúng thứ cần khi quota là ràng buộc
 * chứ không phải chất lượng suy luận.
 *
 * Model đổi được qua `GEMINI_MODEL`. **Google có khai tử model theo thời gian**
 * (2.0-flash đã shut down, 1.5-flash không còn trong tài liệu), nên nếu bỗng dưng
 * dịch hỏng hàng loạt thì kiểm tra tên model trước tiên — chuỗi dự phòng sẽ che
 * lỗi này bằng MyMemory nên nó không tự lộ ra.
 */
export class GeminiProvider implements TranslationProvider {
  constructor(
    private apiKey: string,
    private model: string = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
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
