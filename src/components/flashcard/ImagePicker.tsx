"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { CardImageSchema, type CardImage } from "@/lib/card-image";
import { CardPhoto } from "./CardPhoto";

export function ImagePicker({ term, image, onChange }: { term: string; image?: CardImage | null; onChange: (image: CardImage | null) => void }) {
  const [query, setQuery] = useState(term);
  const [images, setImages] = useState<CardImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const version = useRef(0);
  useEffect(() => {
    // This counter invalidates responses from a previous card or an unmounted picker.
    const requests = version;
    requests.current++;
    setQuery(term);
    setImages([]);
    setMessage("");
    setBusy(false);
    return () => { requests.current++; };
  }, [term]);

  async function search() {
    const requestVersion = ++version.current;
    setBusy(true); setMessage(""); setImages([]);
    try {
      const response = await apiFetch("/api/images", { query: query.trim() });
      const data = await response.json();
      if (requestVersion !== version.current) return;
      if (!response.ok) throw new Error(data.message || data.error || "Không tìm được ảnh.");
      const results = CardImageSchema.array().parse(data.images);
      setImages(results);
      if (!results.length) setMessage("Chưa có ảnh phù hợp. Thử từ khóa khác hoặc bỏ qua ảnh.");
    } catch (error) {
      if (requestVersion === version.current) setMessage(error instanceof Error ? error.message : "Không tìm được ảnh.");
    } finally { if (requestVersion === version.current) setBusy(false); }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800" aria-label="Ảnh minh họa">
      <p className="text-sm font-medium">Ảnh minh họa (tùy chọn)</p>
      <p className="text-xs text-slate-500">Chọn ảnh đúng với nghĩa bạn muốn học. Có thể dùng từ khóa cụ thể như “river bank”.</p>
      <div className="flex gap-2">
        <input aria-label="Từ khóa tìm ảnh" maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!busy && query.trim()) void search(); } }} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
        <button type="button" disabled={busy || !query.trim()} onClick={() => void search()} className="rounded-lg bg-brand px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? "Đang tìm…" : "Tìm ảnh"}</button>
      </div>
      {image && <div className="space-y-2"><CardPhoto image={image} /><button type="button" onClick={() => onChange(null)} className="text-sm text-red-500">Bỏ ảnh đã chọn</button></div>}
      <p role="status" className="text-sm text-slate-500">{message}</p>
      <div className="grid grid-cols-2 gap-2">
        {images.map((photo, index) => <button type="button" key={`${photo.source ?? "pexels"}-${photo.id}`} aria-label={`Chọn ảnh ${index + 1}`} aria-pressed={image?.id === photo.id && image?.source === photo.source} onClick={() => onChange(photo)} className={`overflow-hidden rounded-lg border-2 p-1 ${image?.id === photo.id && image?.source === photo.source ? "border-brand" : "border-transparent"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={photo.alt || `Ảnh gợi ý ${index + 1}`} className="h-28 w-full rounded object-cover" />
          <span className="text-xs text-slate-500">{photo.photographer}</span>
        </button>)}
      </div>
      <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 underline">Ảnh từ Wikimedia Commons · Không cần API key</a>
    </section>
  );
}
