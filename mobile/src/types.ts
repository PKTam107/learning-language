// Domain types — đồng bộ với web app (../../src/types/index.ts).

export type LanguageCode = string; // 'en' | 'vi' | ...

export type CardStatus = "new" | "hard" | "good" | "easy";

/** Giai đoạn lịch ôn của một thẻ — chi tiết ở lib/srs.ts. */
export type SrsPhase = "learning" | "review" | "relearning";

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
  // ----- Làm giàu (enrichment) — đồng bộ với web -----
  /** true nếu đã chạy bước làm giàu → set enriched_at khi lưu. */
  enriched?: boolean;
  cefrLevel?: string;
  wordFamily?: string[];
  collocations?: string[];
}

/** Thống kê số thẻ theo trạng thái học trong 1 deck. */
export interface DeckStats {
  total: number;
  byStatus: Record<CardStatus, number>;
  /** Hàng đợi hôm nay: thẻ tới hạn ôn lại + từ mới trong hạn mức (lib/queue.ts). */
  due: number;
  /** Thẻ đã học và đã tới hạn ôn lại. */
  dueReviews: number;
  /** Từ mới sẽ được đưa vào học hôm nay, sau khi trừ hạn mức. */
  newToday: number;
  /** Từ mới còn chờ vì hôm nay đã hết hạn mức. */
  newHeldBack: number;
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
  cefr_level: string | null;
  word_family: string[];
  collocations: string[];
  enriched_at: string | null;
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
  /** Khoảng ôn đã chốt cho lần kế (ngày); 0 khi thẻ còn trong giai đoạn học. */
  interval_days: number;
  srs_phase: SrsPhase;
  /** Số bước học đã qua trong giai đoạn hiện tại. */
  learning_step: number;
  /** Số lần quên sau khi thẻ đã tốt nghiệp (nhận diện thẻ "leech"). */
  lapses: number;
  /** Lần ôn đầu tiên — dùng đếm hạn mức "từ mới mỗi ngày". */
  introduced_at: string | null;
}

export interface CardWithProgress extends Card {
  progress?: CardProgress | null;
}
