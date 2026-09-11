import type { DictionaryProvider } from "./types";
import { DictionaryApiDevProvider } from "./dictionaryapi";
import { DatamuseProvider } from "./datamuse";
import { FallbackDictionaryProvider } from "./chain";

/**
 * Factory chọn dictionary provider (tiếng Anh), kèm **provider dự phòng**:
 * DictionaryAPI.dev (đủ IPA/audio/ví dụ) → Datamuse (chỉ định nghĩa).
 * DictionaryAPI.dev hay sập 522/chậm, có dự phòng thì lúc đó việc tra từ chỉ
 * **thiếu phiên âm**, không chết hẳn.
 *
 * Đặt `DICTIONARY_FALLBACK=off` để tắt dự phòng.
 * Mở rộng đa ngôn ngữ: route theo sourceLanguage để chọn provider phù hợp.
 */
export function getDictionaryProvider(
  _sourceLanguage: string = "en"
): DictionaryProvider {
  const primary = new DictionaryApiDevProvider();
  if ((process.env.DICTIONARY_FALLBACK || "").trim().toLowerCase() === "off") {
    return primary;
  }
  return new FallbackDictionaryProvider([primary, new DatamuseProvider()]);
}

export type { DictionaryProvider, DictionaryResult } from "./types";
