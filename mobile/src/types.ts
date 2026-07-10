// Domain types — đồng bộ với web app (../../src/types/index.ts).

export type LanguageCode = string; // 'en' | 'vi' | ...

export type CardStatus = "new" | "hard" | "good" | "easy";

export interface Definition {
  partOfSpeech: string;
  definition: string;
  definitionVi?: string;
}

export interface Example {
  text: string;
  textVi?: string;
}

export interface DraftCard {
  term: string;
  phonetic?: string;
  phoneticUk?: string;
  phoneticUs?: string;
  audioUs?: string;
  audioUk?: string;
  partOfSpeech?: string;
  meaningVi?: string;
  note?: string;
  definitions: Definition[];
  examples: Example[];
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  fromCache?: boolean;
  translationSkipped?: boolean;
  notFound?: boolean;
}

/** Thống kê số thẻ theo trạng thái học trong 1 deck. */
export interface DeckStats {
  total: number;
  byStatus: Record<CardStatus, number>;
  /** Số thẻ đến hạn ôn (chưa học hoặc next_due_at <= hiện tại). */
  due: number;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  source_language: LanguageCode;
  target_language: LanguageCode;
  created_at: string;
  updated_at: string;
  card_count?: number;
  stats?: DeckStats;
}

export interface Card {
  id: string;
  user_id: string;
  deck_id: string;
  term: string;
  phonetic: string | null;
  phonetic_uk: string | null;
  phonetic_us: string | null;
  audio_us: string | null;
  audio_uk: string | null;
  part_of_speech: string | null;
  meaning_vi: string | null;
  note: string | null;
  definitions: Definition[];
  examples: Example[];
  source_language: LanguageCode;
  target_language: LanguageCode;
  created_at: string;
  updated_at: string;
}

export interface CardProgress {
  id: string;
  user_id: string;
  card_id: string;
  status: CardStatus;
  review_count: number;
  last_reviewed_at: string | null;
  next_due_at: string | null;
  ease_factor: number | null;
}

export interface CardWithProgress extends Card {
  progress?: CardProgress | null;
}
