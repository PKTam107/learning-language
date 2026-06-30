import type { DictionaryProvider } from "./types";
import { DictionaryApiDevProvider } from "./dictionaryapi";

/**
 * Factory chọn dictionary provider. Hiện chỉ có DictionaryAPI.dev (tiếng Anh).
 * Mở rộng đa ngôn ngữ: route theo sourceLanguage để chọn provider phù hợp.
 */
export function getDictionaryProvider(
  _sourceLanguage: string = "en"
): DictionaryProvider {
  return new DictionaryApiDevProvider();
}

export type { DictionaryProvider, DictionaryResult } from "./types";
