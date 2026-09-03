// Domain types dùng chung cho client & server.

export type LanguageCode = string; // 'en' | 'vi' | ... (mở rộng đa ngôn ngữ)

export type CardStatus = "new" | "hard" | "good" | "easy";

/** Giai đoạn lịch ôn của một thẻ — chi tiết ở [lib/srs.ts](../lib/srs.ts). */
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

/** Kết quả lookup chưa lưu — hiển thị trong DraftEditor để người dùng sửa trước khi lưu. */
export interface DraftCard {
  term: string;
  phonetic?: string;
  /** IPA giọng Anh (nếu tách được từ nguồn). */
  phoneticUk?: string;
  /** IPA giọng Mỹ (nếu tách được từ nguồn). */
  phoneticUs?: string;
  audioUs?: string;
  audioUk?: string;
  partOfSpeech?: string;
  meaningVi?: string;
  /** Ghi chú cá nhân của người dùng. */
  note?: string;
  definitions: Definition[];
  examples: Example[];
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  fromCache?: boolean;
  translationSkipped?: boolean;
  /** Có khi DictionaryAPI không tìm thấy từ → người dùng nhập tay. */
  notFound?: boolean;
  // ----- Làm giàu (enrichment) tự sinh khi tra từ mới -----
  /** true nếu đã CHẠY bước làm giàu (dù có/không tìm được dữ liệu) → set enriched_at khi lưu. */
  enriched?: boolean;
  /** Cấp độ CEFR (A1..C2) tra từ danh sách CEFR-J. */
  cefrLevel?: string;
  /** Họ từ (word family): các dạng phái sinh — happy → happiness, happily... */
  wordFamily?: string[];
  /** Kết hợp từ (collocations) hay gặp — strong coffee, make a decision... */
  collocations?: string[];
}

/** Thống kê số thẻ theo trạng thái học trong 1 deck. */
export interface DeckStats {
  total: number;
  byStatus: Record<CardStatus, number>;
  /**
   * Hàng đợi hôm nay: thẻ tới hạn ôn lại + từ mới trong hạn mức
   * (= `dueReviews + newToday`, xem [lib/queue.ts](../lib/queue.ts)).
   */
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
  phonetic_uk: string | null;
  phonetic_us: string | null;
  audio_us: string | null;
  audio_uk: string | null;
  part_of_speech: string | null;
  meaning_vi: string | null;
  note: string | null;
  definitions: Definition[];
  examples: Example[];
  /** CEFR (A1..C2) — null nếu chưa xác định. */
  cefr_level: string | null;
  /** Họ từ (word family) — mảng dạng phái sinh. */
  word_family: string[];
  /** Collocations hay gặp. */
  collocations: string[];
  /** Thời điểm đã thử làm giàu (null = chưa) — dùng để đếm thẻ cần backfill. */
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

/** Card kèm progress, dùng trong study mode. */
export interface CardWithProgress extends Card {
  progress?: CardProgress | null;
}
