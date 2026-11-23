import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/paginate";
import { analyzeReviews, type ReviewEvent } from "@/lib/learning-insights";
import type { Card } from "@/types";

const client = () => supabase;
export type LearningCard = Card & { card_progress: { lapses: number }[] | null };
export async function fetchLearningCards(deckId?: string): Promise<LearningCard[]> {
  const sb = client();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Chưa đăng nhập");
  return fetchAllRows<LearningCard>((from, to) => {
    let query = sb.from("cards").select("*, card_progress(lapses)").eq("user_id", user.id);
    if (deckId) query = query.eq("deck_id", deckId);
    return query.order("id").range(from, to);
  });
}
export async function fetchReviewReport() {
  const sb = client();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error("Chưa đăng nhập");
  const now = new Date();
  const since = new Date(now);
  since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - 6);
  let events: ReviewEvent[];
  let contextAvailable = true;
  try {
    events = await fetchAllRows<ReviewEvent>((from, to) => sb.from("review_events")
      .select("card_id, status, reviewed_at, review_type, was_due, interval_before")
      .eq("user_id", user.id).gte("reviewed_at", since.toISOString()).lte("reviewed_at", now.toISOString()).order("id").range(from, to));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "42703" && code !== "PGRST204") throw error;
    contextAvailable = false;
    const legacy = await fetchAllRows<Pick<ReviewEvent, "card_id" | "status" | "reviewed_at">>((from, to) => sb.from("review_events")
      .select("card_id, status, reviewed_at").eq("user_id", user.id).gte("reviewed_at", since.toISOString()).lte("reviewed_at", now.toISOString()).order("id").range(from, to));
    events = legacy.map((event) => ({ ...event, review_type: null, was_due: null, interval_before: null }));
  }
  const report = analyzeReviews(events, now);
  // Read current cards before limiting: deleted cards must not occupy the top five.
  const candidates = report.forgotten.map((item) => item.cardId);
  const cards: { id: string; term: string; deck_id: string }[] = [];
  for (let offset = 0; offset < candidates.length; offset += 100) {
    const { data, error } = await sb.from("cards").select("id, term, deck_id").eq("user_id", user.id).in("id", candidates.slice(offset, offset + 100));
    if (error) throw error;
    cards.push(...(data ?? []));
    if (cards.length >= 5) break;
  }
  const byId = new Map(cards.map((card) => [card.id, card]));
  const forgotten = report.forgotten.flatMap((item) => {
    const card = byId.get(item.cardId);
    return card ? [{ ...card, count: item.count }] : [];
  }).slice(0, 5);
  return { ...report, forgotten, contextAvailable };
}
export type LearningReport = Awaited<ReturnType<typeof fetchReviewReport>>;
