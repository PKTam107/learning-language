import type { TranslationProvider } from "./types";
import { OpenAIProvider } from "./openai";
import { GeminiProvider } from "./gemini";
import { LibreTranslateProvider } from "./libretranslate";
import { MyMemoryProvider } from "./mymemory";

/**
 * Factory chọn AI translation provider theo env.
 * Trả về null nếu chưa cấu hình key → caller sẽ bỏ qua bước dịch (translationSkipped).
 */
export function getTranslationProvider(): TranslationProvider | null {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();

  if (provider === "mymemory") {
    // Free, không cần key; truyền MYMEMORY_EMAIL để tăng quota.
    return new MyMemoryProvider();
  }

  if (provider === "libretranslate") {
    // Self-host không cần key; instance công khai mới cần LIBRETRANSLATE_API_KEY.
    return new LibreTranslateProvider();
  }

  if (provider === "gemini") {
    const key = process.env.GEMINI_API_KEY;
    return key ? new GeminiProvider(key) : null;
  }

  // default: openai
  const key = process.env.OPENAI_API_KEY;
  return key ? new OpenAIProvider(key) : null;
}

export type { TranslationProvider } from "./types";
