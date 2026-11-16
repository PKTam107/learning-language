import { z } from "zod";
import { CardImageSchema } from "./card-image";

export const READING_TOPICS = [
  { value: "daily", label: "Cuộc sống hằng ngày" },
  { value: "travel", label: "Du lịch" },
  { value: "work", label: "Công việc" },
  { value: "hobbies", label: "Sở thích" },
] as const;
export const ReadingRequestSchema = z.object({
  topic: z.enum(["daily", "travel", "work", "hobbies"]).default("daily"),
  deckId: z.string().uuid().optional(),
});
export type ReadingRequest = z.infer<typeof ReadingRequestSchema>;
export const ReadingWordSchema = z.object({
  id: z.string(), term: z.string().min(1).max(100), meaning: z.string().min(1).max(2000),
  audio: z.string().nullable(), image: CardImageSchema.nullable(),
});
export type ReadingWord = z.infer<typeof ReadingWordSchema>;
export const ReadingQuestionSchema = z.object({
  prompt: z.string().min(1).max(500), options: z.array(z.string().min(1).max(500)).min(2).max(4),
  answerIndex: z.number().int().min(0), explanation: z.string().min(1).max(1000),
}).refine((q) => q.answerIndex < q.options.length && new Set(q.options).size === q.options.length);
export const ReadingContentSchema = z.object({
  title: z.string().min(1).max(200), passage: z.string().min(1).max(2500),
  questions: z.array(ReadingQuestionSchema).max(3),
});
export const ReadingResponseSchema = ReadingContentSchema.extend({
  source: z.enum(["generated", "examples"]), words: z.array(ReadingWordSchema).min(1).max(5),
});
export type ReadingLesson = z.infer<typeof ReadingResponseSchema>;

const escape = (term: string) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
export function readingSegments(passage: string, words: ReadingWord[]): { text: string; word?: ReadingWord }[] {
  const sorted = [...words].sort((a, b) => b.term.length - a.term.length);
  if (!sorted.length) return [{ text: passage }];
  const regex = new RegExp(`\\b(?:${sorted.map((w) => escape(w.term)).join("|")})\\b`, "gi");
  const segments: { text: string; word?: ReadingWord }[] = [];
  let offset = 0;
  for (const match of passage.matchAll(regex)) {
    if (match.index! > offset) segments.push({ text: passage.slice(offset, match.index) });
    const text = match[0];
    const word = sorted.find((w) => w.term.toLowerCase().replace(/\s+/g, " ") === text.toLowerCase().replace(/\s+/g, " "));
    segments.push({ text, word });
    offset = match.index! + text.length;
  }
  if (offset < passage.length) segments.push({ text: passage.slice(offset) });
  return segments;
}

export function parseGeneratedReading(text: string, words: ReadingWord[]) {
  const raw = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const lesson = ReadingContentSchema.parse(JSON.parse(raw));
  const count = lesson.passage.trim().split(/\s+/).length;
  if (count < 80 || count > 120 || lesson.questions.length !== 2) throw new Error(`Invalid reading: ${count} words, ${lesson.questions.length} questions`);
  const used = new Set(readingSegments(lesson.passage, words).flatMap((s) => s.word ? [s.word.id] : []));
  if (words.some((w) => !used.has(w.id))) throw new Error("Missing vocabulary");
  return lesson;
}
