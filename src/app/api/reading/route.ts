import { NextResponse } from "next/server";
import { getRequestContext } from "@/lib/supabase/getUser";
import { enforceRateLimit, standardRules } from "@/lib/rate-limit";
import { requestDeviceId } from "@/lib/user-agent";
import { generateReading } from "@/lib/ai/reading";
import { parseCardImage } from "@/lib/card-image";
import { ReadingRequestSchema, ReadingResponseSchema, readingSegments, type ReadingWord } from "@/lib/reading";

export const maxDuration = 30;
interface ReadingCard {
  id: string; term: string; meaning_vi: string | null; audio_us: string | null; image: unknown;
  examples: { text?: string }[] | null;
  card_progress: { status?: string; suspended_at?: string | null }[] | null;
}

export async function POST(request: Request) {
  const context = await getRequestContext(request);
  if (!context) return NextResponse.json({ error: "Bạn cần đăng nhập để đọc bằng kho từ của mình." }, { status: 401 });
  const parsed = ReadingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Chọn lại chủ đề hoặc bộ thẻ." }, { status: 400 });
  const limited = await enforceRateLimit({ userId: context.user.id, deviceId: requestDeviceId(request), rules: standardRules("reading", 3, 3, 20), message: "Bạn đã tạo nhiều bài đọc. Hãy đọc lại bài vừa tạo hoặc thử sau." });
  if (limited) return limited;
  try {
    // The caller's client and explicit ownership filter both protect private decks.
    let query = context.supabase.from("cards")
      .select("id,term,meaning_vi,audio_us,image,examples,card_progress(status,suspended_at)")
      .eq("user_id", context.user.id).eq("source_language", "en").eq("target_language", "vi");
    if (parsed.data.deckId) query = query.eq("deck_id", parsed.data.deckId);
    const { data, error } = await query.order("created_at", { ascending: false }).order("id").limit(200);
    if (error) throw error;
    const candidates = (data as ReadingCard[] ?? []).filter((c) =>
      !c.card_progress?.[0]?.suspended_at && c.term.trim() && c.term.length <= 100 && c.meaning_vi?.trim());
    // Prefer words already studied; sample the latest 200 cards and vary the words per lesson.
    const rank = (c: ReadingCard) => ["good", "easy"].includes(c.card_progress?.[0]?.status ?? "") ? 0 : 1;
    const shuffled = candidates.map((card) => ({ card, random: Math.random() })).sort((a, b) => rank(a.card) - rank(b.card) || a.random - b.random);
    const seen = new Set<string>();
    const selected = shuffled.map((r) => r.card).filter((c) => {
      const key = c.term.trim().toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true;
    }).slice(0, 5);
    if (selected.length < 3) return NextResponse.json({ error: "Cần ít nhất 3 từ tiếng Anh có nghĩa tiếng Việt. Hãy thêm từ hoặc chọn bộ thẻ khác." }, { status: 400 });
    const words: ReadingWord[] = selected.map((c) => ({ id: c.id, term: c.term.trim(), meaning: c.meaning_vi!.trim().slice(0, 2000), audio: c.audio_us, image: parseCardImage(c.image) }));
    let lesson;
    try {
      lesson = { ...await generateReading(words, parsed.data.topic), words, source: "generated" as const };
    } catch {
      // An honest fallback: saved example sentences, never presented as a generated story.
      const examples = selected.flatMap((card) => {
        const sentence = card.examples?.find((ex) => typeof ex.text === "string" && readingSegments(ex.text, words.filter((w) => w.id === card.id)).some((s) => s.word));
        return sentence?.text ? [sentence.text] : [];
      });
      const passage = [...new Set(examples)].join("\n\n").slice(0, 2500);
      if (!passage) return NextResponse.json({ error: "Chưa tạo được bài đọc. Hãy thử lại sau hoặc thêm câu ví dụ cho các từ trong bộ thẻ." }, { status: 503 });
      const used = new Set(readingSegments(passage, words).flatMap((s) => s.word ? [s.word.id] : []));
      lesson = { title: "Đọc câu ví dụ trong kho từ", passage, questions: [], words: words.filter((w) => used.has(w.id)), source: "examples" as const };
    }
    return NextResponse.json(ReadingResponseSchema.parse(lesson), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Chưa tải được bài đọc. Hãy thử lại sau." }, { status: 502 });
  }
}
