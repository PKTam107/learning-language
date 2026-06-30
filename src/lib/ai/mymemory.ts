import type { TranslateOptions, TranslationProvider } from "./types";

/**
 * Dịch qua MyMemory (https://mymemory.translated.net/doc/spec.php).
 * Miễn phí, KHÔNG cần API key. Quota: ~5.000 từ/ngày (ẩn danh),
 * lên ~50.000 từ/ngày nếu truyền email hợp lệ (`MYMEMORY_EMAIL`).
 *
 * KHÔNG sinh định nghĩa — chỉ dịch text, nên chỉ dùng cho bước translate;
 * phần dictionary (phiên âm, từ loại, audio) vẫn lấy từ DictionaryAPI.
 *
 * Khác LibreTranslate: endpoint dịch MỘT chuỗi mỗi request
 * (GET /get?q=...&langpair=en|vi), nên translateBatch gọi song song từng phần tử.
 */
export class MyMemoryProvider implements TranslationProvider {
  constructor(
    private baseUrl: string = process.env.MYMEMORY_URL ||
      "https://api.mymemory.translated.net",
    private email: string = process.env.MYMEMORY_EMAIL || ""
  ) {
    this.baseUrl = this.baseUrl.replace(/\/+$/, "");
  }

  async translateBatch(
    texts: string[],
    opts: TranslateOptions
  ): Promise<string[]> {
    if (texts.length === 0) return [];
    return Promise.all(texts.map((t) => this.translateOne(t, opts)));
  }

  private async translateOne(
    text: string,
    opts: TranslateOptions
  ): Promise<string> {
    // Chuỗi rỗng/trắng → trả nguyên, không tốn quota.
    if (!text.trim()) return text;

    const params = new URLSearchParams({
      q: text,
      langpair: `${opts.from}|${opts.to}`,
    });
    if (this.email) params.set("de", this.email);

    const res = await fetch(`${this.baseUrl}/get?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`MyMemory error: ${res.status} ${await res.text()}`);
    }

    const data = (await res.json()) as {
      responseStatus?: number | string;
      responseData?: { translatedText?: string };
      responseDetails?: string;
    };

    const status = Number(data.responseStatus);
    const translated = data.responseData?.translatedText;

    // Quota hết / lỗi → status != 200 hoặc trả về cảnh báo trong text.
    if (
      status !== 200 ||
      !translated ||
      /^MYMEMORY WARNING/i.test(translated)
    ) {
      throw new Error(
        `MyMemory: ${data.responseDetails || translated || "unexpected response"}`
      );
    }

    return translated;
  }
}
