import { z } from "zod";
import { parseCardImage, type CardImage } from "./card-image";

const Metadata = z.record(z.object({ value: z.string() }).passthrough());
const ResponseSchema = z.object({
  query: z.object({ pages: z.array(z.object({
    pageid: z.number(), title: z.string(), index: z.number().optional(),
    imageinfo: z.array(z.object({
      thumburl: z.string().optional(), thumbmime: z.string().optional(), descriptionurl: z.string(), mime: z.string(),
      extmetadata: Metadata,
    })).optional(),
  })) }).optional(),
  error: z.unknown().optional(),
});

// Metadata contains HTML. Render text only, never inject provider markup.
function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g, (entity) => ({ "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&nbsp;": " " }[entity] ?? entity)).replace(/\s+/g, " ").trim();
}

export function commonsImages(value: unknown): CardImage[] {
  const data = ResponseSchema.parse(value);
  if (data.error) throw new Error("Wikimedia API error");
  return (data.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).flatMap((page) => {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) return [];
    const bitmapTypes = ["image/jpeg", "image/png", "image/webp"];
    // Commons renders SVG diagrams as bitmap thumbnails for display in cards.
    if (![...bitmapTypes, "image/svg+xml"].includes(info.mime)) return [];
    if (!bitmapTypes.includes(info.thumbmime ?? info.mime)) return [];
    const meta = info.extmetadata;
    const license = plainText(meta.LicenseShortName?.value ?? "");
    // Only show files with explicit, supported reuse terms and author attribution.
    if (!/^(CC BY(?:-SA)? [\d.]+|CC0(?: [\d.]+)?|Public domain)$/i.test(license)) return [];
    const artist = plainText(meta.Artist?.value ?? "");
    if (!artist) return [];
    const rawLicenseUrl = meta.LicenseUrl?.value;
    const licenseUrl = rawLicenseUrl ? rawLicenseUrl.replace(/^http:/, "https:").replace(/^\/\//, "https://") : "https://commons.wikimedia.org/wiki/Help:Public_domain";
    if (!rawLicenseUrl && license !== "Public domain") return [];
    const image = parseCardImage({
      id: page.pageid, source: "commons", url: info.thumburl, pageUrl: info.descriptionurl,
      photographer: artist.slice(0, 2000), alt: plainText(page.title.replace(/^File:/, "")).slice(0, 1000),
      license, licenseUrl,
    });
    return image ? [image] : [];
  }).slice(0, 4);
}
