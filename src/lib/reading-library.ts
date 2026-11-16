import { z } from "zod";
import { ReadingResponseSchema } from "./reading";
export const SavedReadingSchema = z.object({
  lesson: ReadingResponseSchema,
  answers: z.array(z.number().int().min(0).nullable()),
  updatedAt: z.string().datetime(),
}).refine((entry) => entry.answers.length === entry.lesson.questions.length && entry.answers.every((answer, i) => answer === null || answer < entry.lesson.questions[i].options.length));
export type SavedReading = z.infer<typeof SavedReadingSchema>;
export function parseLibrary(raw: string | null): SavedReading[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => { const entry = SavedReadingSchema.safeParse(item); return entry.success ? [entry.data] : []; }).slice(0, 20);
  } catch { return []; }
}
export interface ReadingStore { load: () => Promise<SavedReading[]>; save: (items: SavedReading[]) => Promise<void> }
