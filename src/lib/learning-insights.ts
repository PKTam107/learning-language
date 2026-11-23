/** Pure analysis, shared by web and mobile. No network or paid services. */
export const HEALTH_LABELS = {
  meaning: "Thiếu nghĩa tiếng Việt",
  examples: "Thiếu câu ví dụ",
  duplicate: "Trùng từ giữa các bộ",
  leech: "Hay quên (từ 6 lần)",
};
export type HealthIssue = keyof typeof HEALTH_LABELS;
export interface HealthCard {
  id: string;
  deck_id: string;
  term: string;
  source_language: string;
  target_language: string;
  meaning_vi: string | null;
  examples: { text: string }[] | null;
  card_progress?: { lapses: number }[] | null;
}
const normalize = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();
export function analyzeHealth<T extends HealthCard>(cards: T[]) {
  // Same spelling in different language pairs is not a duplicate.
  const key = (card: T) => JSON.stringify([card.source_language, card.target_language, normalize(card.term)]);
  const groups = new Map<string, Set<string>>();
  for (const card of cards) {
    const decks = groups.get(key(card)) ?? new Set<string>();
    decks.add(card.deck_id);
    groups.set(key(card), decks);
  }
  return cards.map((card) => {
    const issues: HealthIssue[] = [];
    if (!card.meaning_vi?.trim()) issues.push("meaning");
    if (!card.examples?.some((example) => example.text?.trim())) issues.push("examples");
    if ((groups.get(key(card))?.size ?? 0) > 1) issues.push("duplicate");
    if ((card.card_progress?.[0]?.lapses ?? 0) >= 6) issues.push("leech");
    return { card, issues };
  }).filter((item) => item.issues.length > 0);
}

export interface ReviewEvent {
  card_id: string | null;
  status: string;
  reviewed_at: string;
  review_type: string | null;
  was_due: boolean | null;
  interval_before: number | null;
}
export const REVIEW_LABELS: Record<string, string> = {
  flashcard: "Lật thẻ", mcq: "Trắc nghiệm", mcq_reverse: "Việt → Anh",
  typing: "Gõ từ", listening: "Nghe", cloze: "Điền chỗ trống",
};
export function analyzeReviews(events: ReviewEvent[], now = new Date()) {
  // Calendar window including today, matching the local study calendar.
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);
  const valid = events.filter((event) => {
    const time = Date.parse(event.reviewed_at);
    return time >= since.getTime() && time <= now.getTime() && ["hard", "good", "easy"].includes(event.status);
  });
  // interval > 0 excludes initial learning/relearning steps. Legacy NULLs are unknown.
  const due = valid.filter((event) => event.was_due === true && (event.interval_before ?? 0) > 0);
  const remembered = due.filter((event) => event.status !== "hard").length;
  const modes = Object.entries(REVIEW_LABELS).map(([type, label]) => {
    const rows = valid.filter((event) => event.review_type === type);
    return { type, label, total: rows.length, forgotten: rows.filter((event) => event.status === "hard").length };
  }).filter((mode) => mode.total > 0);
  const forgotten = new Map<string, number>();
  for (const event of valid) {
    if (event.status === "hard" && event.card_id) forgotten.set(event.card_id, (forgotten.get(event.card_id) ?? 0) + 1);
  }
  return {
    total: valid.length, due: due.length, remembered,
    retention: due.length ? Math.round(remembered / due.length * 100) : null,
    unknown: valid.filter((event) => event.was_due === null || event.interval_before === null).length,
    modes,
    forgotten: [...forgotten].map(([cardId, count]) => ({ cardId, count })).sort((a, b) => b.count - a.count || a.cardId.localeCompare(b.cardId)),
  };
}
export type ReviewReport = ReturnType<typeof analyzeReviews>;
