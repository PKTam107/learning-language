import { z } from "zod";

const hostedUrl = (host: string) => z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && url.hostname === host && !url.username && !url.password;
});

const common = {
  id: z.number().int().positive(),
  photographer: z.string().max(2000),
  alt: z.string().max(1000),
};

// Keep previously selected Pexels photos readable.
const legacyImage = z.object({
  ...common,
  source: z.literal("pexels").optional(),
  url: hostedUrl("images.pexels.com"),
  pageUrl: hostedUrl("www.pexels.com"),
});
const commonsImage = z.object({
  ...common,
  source: z.literal("commons"),
  url: z.union([hostedUrl("upload.wikimedia.org"), hostedUrl("thumb.wikimedia.org")]),
  pageUrl: hostedUrl("commons.wikimedia.org"),
  license: z.string().min(1).max(200),
  licenseUrl: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:" && ["creativecommons.org", "commons.wikimedia.org"].includes(url.hostname) && !url.username && !url.password;
  }),
});
export const CardImageSchema = z.union([commonsImage, legacyImage]);
export type CardImage = z.infer<typeof CardImageSchema>;

export function parseCardImage(value: unknown): CardImage | null {
  const parsed = CardImageSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
