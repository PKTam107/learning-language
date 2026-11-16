import { z } from "zod";
import { CardImageSchema } from "./card-image";

export const ImageCursorSchema = z.object({
  gsroffset: z.number().int().min(0).max(10000),
  continue: z.string().min(1).max(100),
});
export type ImageCursor = z.infer<typeof ImageCursorSchema>;

export const ImageSearchPageSchema = z.object({
  images: CardImageSchema.array(),
  // Older deployed backends do not return a cursor.
  nextCursor: ImageCursorSchema.nullable().default(null),
});
export type ImageSearchPage = z.infer<typeof ImageSearchPageSchema>;
