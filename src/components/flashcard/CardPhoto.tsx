"use client";

import { useState } from "react";
import { parseCardImage } from "@/lib/card-image";

export function CardPhoto({ image, quiz = false }: { image: unknown; quiz?: boolean }) {
  const photo = parseCardImage(image);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!photo) return null;
  return (
    <figure className="w-full max-w-sm text-center">
      {failedUrl === photo.url ? (
        <p className="rounded-lg bg-slate-100 p-4 text-sm text-slate-500 dark:bg-slate-800">Không tải được ảnh. Lật thẻ để xem từ.</p>
      ) : (
        // External images are restricted to approved image hosts by schema and CSP.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={quiz ? "Hình gợi ý — hãy đoán từ tiếng Anh" : photo.alt || "Ảnh minh họa"} draggable={false} onError={() => setFailedUrl(photo.url)} className="mx-auto h-32 w-full rounded-lg object-contain sm:h-40" />
      )}
      <figcaption className="mt-1 text-xs text-slate-500">
        Ảnh: <a onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} href={photo.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.photographer}</a> / <a onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} href={photo.source === "commons" ? "https://commons.wikimedia.org" : "https://www.pexels.com"} target="_blank" rel="noopener noreferrer" className="underline">{photo.source === "commons" ? "Wikimedia Commons" : "Pexels"}</a>
        {photo.source === "commons" && <> · <a onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">{photo.license}</a></>}
      </figcaption>
    </figure>
  );
}
