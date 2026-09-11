import type { TranslateOptions, TranslationProvider } from "./types";

/**
 * Xâu chuỗi nhiều provider dịch: thử lần lượt, ai trả kết quả dùng được thì lấy.
 *
 * Vì sao cần: provider chất lượng cao nhất (LLM) lại là provider dễ **hết quota**
 * nhất — Gemini free tier có trần theo phút/ngày. Không có dự phòng thì đúng lúc
 * hết quota là thẻ tạo ra không có nghĩa tiếng Việt, mà người dùng không hiểu vì
 * sao. Nay hết quota chỉ làm **chất lượng dịch giảm**, không làm hỏng việc tạo thẻ.
 *
 * "Kết quả dùng được" khắt khe hơn "không ném lỗi": provider LLM parse hỏng thì
 * `parseTranslationArray` trả về **chính input** thay vì ném — nhìn thì thành công
 * mà thực chất là không dịch gì. Trường hợp đó cũng phải rơi sang provider kế.
 */
export class FallbackProvider implements TranslationProvider {
  constructor(private providers: TranslationProvider[]) {}

  async translateBatch(
    texts: string[],
    opts: TranslateOptions
  ): Promise<string[]> {
    if (texts.length === 0) return [];

    let lastError: unknown = null;
    for (const provider of this.providers) {
      const name = provider.constructor.name;
      try {
        const out = await provider.translateBatch(texts, opts);
        if (out.length !== texts.length) {
          throw new Error(`trả về ${out.length}/${texts.length} phần tử`);
        }
        if (isUntranslated(texts, out)) {
          throw new Error("trả về y hệt input (parse hỏng hoặc không dịch được)");
        }
        return out;
      } catch (e) {
        lastError = e;
        console.warn(`translate: ${name} hỏng → thử provider kế:`, (e as Error).message);
      }
    }
    throw lastError ?? new Error("Không có provider dịch nào khả dụng");
  }
}

/**
 * Mọi phần tử trả về giống hệt input ⇒ coi như không dịch được.
 *
 * Chỉ xét khi có ít nhất một chuỗi **không rỗng**: batch toàn khoảng trắng thì
 * "giống input" mới là đáp án đúng, không phải dấu hiệu hỏng.
 */
function isUntranslated(texts: string[], out: string[]): boolean {
  const meaningful = texts.filter((t) => t.trim().length > 0);
  if (meaningful.length === 0) return false;
  return texts.every((t, i) => t.trim() === (out[i] ?? "").trim());
}
