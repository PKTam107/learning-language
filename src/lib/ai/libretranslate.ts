import type { TranslateOptions, TranslationProvider } from "./types";

/**
 * Dịch qua LibreTranslate (https://github.com/LibreTranslate/LibreTranslate).
 * Miễn phí, có thể self-host. KHÔNG sinh định nghĩa — chỉ dịch text,
 * nên chỉ dùng cho bước translate, dictionary vẫn giữ nguyên.
 *
 * Endpoint: POST {baseUrl}/translate
 * Chấp nhận `q` là mảng → trả về `translatedText` là mảng cùng thứ tự.
 */
export class LibreTranslateProvider implements TranslationProvider {
  constructor(
    private baseUrl: string = process.env.LIBRETRANSLATE_URL ||
      "http://localhost:5000",
    private apiKey: string = process.env.LIBRETRANSLATE_API_KEY || ""
  ) {
    this.baseUrl = this.baseUrl.replace(/\/+$/, "");
  }

  async translateBatch(
    texts: string[],
    opts: TranslateOptions
  ): Promise<string[]> {
    if (texts.length === 0) return [];

    const res = await fetch(`${this.baseUrl}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: texts,
        source: opts.from,
        target: opts.to,
        format: "text",
        ...(this.apiKey ? { api_key: this.apiKey } : {}),
      }),
    });

    if (!res.ok) {
      throw new Error(`LibreTranslate error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as { translatedText?: string | string[] };
    const out = data.translatedText;

    // q là mảng → translatedText là mảng cùng độ dài
    if (Array.isArray(out) && out.length === texts.length) {
      return out;
    }
    // Một số instance cũ trả về chuỗi khi gửi 1 phần tử
    if (typeof out === "string" && texts.length === 1) {
      return [out];
    }

    // Sai định dạng/độ dài → trả về nguyên bản để không vỡ luồng
    throw new Error("LibreTranslate: unexpected response shape");
  }
}
