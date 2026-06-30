import type { LanguageCode } from "@/types";

export interface TranslateOptions {
  from: LanguageCode;
  to: LanguageCode;
}

export interface TranslationProvider {
  /**
   * Dịch một mảng text, trả về mảng cùng độ dài, cùng thứ tự.
   * Dùng cho cả nghĩa (definition) và ví dụ (example).
   */
  translateBatch(texts: string[], opts: TranslateOptions): Promise<string[]>;
}
