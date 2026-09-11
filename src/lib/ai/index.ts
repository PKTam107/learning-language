import type { TranslationProvider } from "./types";
import { FallbackProvider } from "./chain";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { LibreTranslateProvider } from "./libretranslate";
import { MyMemoryProvider } from "./mymemory";

/**
 * Chọn provider dịch theo env, kèm **provider dự phòng**.
 *
 * Thứ tự ưu tiên (`AI_PROVIDER` để trống thì tự dò theo key có sẵn):
 *   1. Gemini — free tier, chất lượng nghĩa/ví dụ hơn hẳn dịch máy thuần.
 *   2. OpenAI — nếu có key (trả tiền).
 *   3. MyMemory — free, không cần key. Cũng là **dự phòng mặc định** cho mọi
 *      provider khác, nên hết quota LLM thì thẻ vẫn có nghĩa tiếng Việt.
 *
 * Đặt `AI_FALLBACK=off` để tắt dự phòng, hoặc đặt tên provider khác để đổi.
 * Trả `null` khi không dựng được provider nào → caller bỏ qua bước dịch
 * (`translationSkipped`), thẻ vẫn tạo được với nghĩa tiếng Anh.
 */
export function getTranslationProvider(): TranslationProvider | null {
  const chain = buildChain();
  if (chain.length === 0) return null;
  return chain.length === 1 ? chain[0] : new FallbackProvider(chain);
}

/** Tên provider chính: lấy từ env, không có thì dò theo key đang cấu hình. */
function primaryName(): string {
  const explicit = (process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mymemory";
}

function buildChain(): TranslationProvider[] {
  const primary = primaryName();
  const chain: TranslationProvider[] = [];

  const first = createProvider(primary);
  if (first) chain.push(first);

  const fallback = (process.env.AI_FALLBACK ?? "mymemory").trim().toLowerCase();
  if (fallback && fallback !== "off" && fallback !== primary) {
    const second = createProvider(fallback);
    if (second) chain.push(second);
  }
  return chain;
}

/** Dựng một provider theo tên; null nếu thiếu key bắt buộc hoặc tên lạ. */
function createProvider(name: string): TranslationProvider | null {
  switch (name) {
    case "mymemory":
      // Free, không cần key; truyền MYMEMORY_EMAIL để tăng quota.
      return new MyMemoryProvider();
    case "libretranslate":
      // Self-host không cần key; instance công khai mới cần LIBRETRANSLATE_API_KEY.
      return new LibreTranslateProvider();
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      return key ? new GeminiProvider(key) : null;
    }
    case "openai": {
      const key = process.env.OPENAI_API_KEY;
      return key ? new OpenAIProvider(key) : null;
    }
    default:
      return null;
  }
}

export type { TranslationProvider } from "./types";
