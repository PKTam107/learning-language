import type { Definition, Example, LanguageCode } from "@/types";

/** Kết quả thô từ dictionary provider (chưa dịch). */
export interface DictionaryResult {
  term: string;
  phonetic?: string;
  phoneticUk?: string;
  phoneticUs?: string;
  audioUs?: string;
  audioUk?: string;
  partOfSpeech?: string;
  definitions: Definition[]; // definitionVi để trống ở bước này
  examples: Example[]; // textVi để trống ở bước này
  notFound?: boolean;
}

export interface DictionaryProvider {
  /** Tra một từ/cụm ở ngôn ngữ nguồn. */
  lookup(word: string, sourceLanguage: LanguageCode): Promise<DictionaryResult>;
}
