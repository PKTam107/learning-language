import type { LanguageCode } from "@/types";
import type { DictionaryProvider, DictionaryResult } from "./types";

/**
 * Xâu chuỗi dictionary provider: provider chính hỏng thì rơi sang provider kế.
 *
 * Chỉ rơi khi provider **ném lỗi** (sập/timeout). `notFound` KHÔNG phải lỗi —
 * đó là câu trả lời "từ điển không có từ này", và lib/lookup đã có đường xử lý
 * riêng (ghép phiên âm + dịch nguyên cụm) cho nó.
 *
 * Kèm **cầu dao (circuit breaker)**: provider vừa hỏng thì tạm cho nghỉ
 * COOLDOWN_MS. Không có nó, suốt lúc DictionaryAPI.dev sập thì mỗi lượt tra vẫn
 * phải chờ hết timeout rồi mới xuống dự phòng — tra một cụm 4 từ là chờ tới cả
 * chục giây cho một lỗi đã biết trước.
 */
const COOLDOWN_MS = 60_000;

/** Thời điểm (ms) provider được thử lại. Theo tên lớp nên sống chung cho mọi
 *  instance trong cùng một lambda; lambda mới thì bắt đầu lại từ đầu. */
const cooldownUntil = new Map<string, number>();

export class FallbackDictionaryProvider implements DictionaryProvider {
  constructor(private providers: DictionaryProvider[]) {}

  async lookup(
    word: string,
    sourceLanguage: LanguageCode
  ): Promise<DictionaryResult> {
    let lastError: unknown = null;
    const now = Date.now();

    // Provider đang nghỉ thì đẩy xuống cuối chứ không bỏ hẳn: mọi provider cùng
    // nghỉ mà vẫn phải trả được kết quả.
    const ready = this.providers.filter(
      (p) => (cooldownUntil.get(p.constructor.name) ?? 0) <= now
    );
    const order = [...ready, ...this.providers.filter((p) => !ready.includes(p))];

    for (const provider of order) {
      const name = provider.constructor.name;
      try {
        const result = await provider.lookup(word, sourceLanguage);
        cooldownUntil.delete(name);
        return result;
      } catch (e) {
        lastError = e;
        cooldownUntil.set(name, Date.now() + COOLDOWN_MS);
        console.warn(
          `lookup: ${name} hỏng → thử provider kế:`,
          (e as Error).message
        );
      }
    }

    throw lastError ?? new Error("Không có dictionary provider nào khả dụng");
  }
}
