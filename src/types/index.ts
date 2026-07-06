// Domain types dùng chung cho client & server.

export type LanguageCode = string; // 'en' | 'vi' | ... (mở rộng đa ngôn ngữ)

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

/** Kết quả lookup chưa lưu — hiển thị trong DraftEditor để người dùng sửa trước khi lưu. */
export interface DraftCard {
  term: string;
  phonetic?: string;
  audioUs?: string;
  audioUk?: string;
  partOfSpeech?: string;
  meaningVi?: string;
  definitions: Definition[];
  examples: Example[];
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  fromCache?: boolean;
  translationSkipped?: boolean;
  /** Có khi DictionaryAPI không tìm thấy từ → người dùng nhập tay. */
  notFound?: boolean;
}

/** Thống kê số thẻ theo trạng thái học trong 1 deck. */
export interface DeckStats {
  total: number;
  byStatus: Record<CardStatus, number>;
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
  /** Tổng số card (join/đếm khi cần). */
  card_count?: number;
  /** Thống kê trạng thái (khi lấy qua fetchDecksWithStats). */
  stats?: DeckStats;
}

export interface Card {
  id: string;
  user_id: string;
  deck_id: string;
  term: string;
  phonetic: string | null;
  audio_us: string | null;
  audio_uk: string | null;
  part_of_speech: string | null;
  meaning_vi: string | null;
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

/** Card kèm progress, dùng trong study mode. */
export interface CardWithProgress extends Card {
  progress?: CardProgress | null;
}
