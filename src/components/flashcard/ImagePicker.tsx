"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { CardImage } from "@/lib/card-image";
import { ImageSearchPageSchema, type ImageCursor } from "@/lib/image-search";
import { useImageSearch } from "@/hooks/useImageSearch";
import { CardPhoto } from "./CardPhoto";

async function fetchPage(query: string, cursor: ImageCursor | null) {
  const response = await apiFetch("/api/images", { query, cursor });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Không tìm được ảnh.");
  return ImageSearchPageSchema.parse(data);
}

export function ImagePicker({ term, image, onChange }: { term: string; image?: CardImage | null; onChange: (image: CardImage | null) => void }) {
  const picker = useImageSearch(term, fetchPage);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!picker.open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    input.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [picker.open]);

  function handleKey(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      picker.close();
    }
    if (event.key === "Tab") {
      const items = dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800" aria-label="Ảnh minh họa">
      <p className="text-sm font-medium">Ảnh minh họa (tùy chọn)</p>
      <p className="text-xs text-slate-500">Chọn ảnh đúng với nghĩa bạn muốn học. Có thể tìm cụ thể như “river bank”.</p>
      <button type="button" onClick={picker.show} className="rounded-lg bg-brand px-4 py-2 text-sm text-white">
        {image ? "Đổi ảnh" : "Tìm ảnh"}
      </button>
      {image && <div className="space-y-2"><CardPhoto image={image} /><button type="button" onClick={() => onChange(null)} className="text-sm text-red-500">Bỏ ảnh đã chọn</button></div>}
      {picker.open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={(event) => { event.stopPropagation(); picker.close(); }}>
          <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleKey} onClick={(event) => event.stopPropagation()} className="flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-slate-900 sm:max-w-3xl sm:rounded-2xl">
            <div className="space-y-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <h2 id={titleId} className="text-lg font-semibold">Chọn ảnh minh họa</h2>
                <button type="button" onClick={picker.close} aria-label="Đóng tìm ảnh" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex gap-2">
                <input ref={input} aria-label="Từ khóa tìm ảnh" placeholder="Nhập từ khóa tiếng Anh…" maxLength={100} value={picker.query} onChange={(event) => picker.changeQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void picker.search(); } }} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" />
                <button type="button" disabled={picker.busy || !picker.query.trim()} onClick={() => void picker.search()} className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50">Tìm ảnh</button>
              </div>
              <p className="text-xs text-slate-500">Cuộn để xem ảnh, chọn ảnh để dùng cho thẻ. Đóng cửa sổ để giữ ảnh hiện tại.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {picker.images.map((photo, index) => {
                  const selected = image?.id === photo.id && image?.source === photo.source;
                  return <button type="button" key={`${photo.source ?? "pexels"}-${photo.id}`} aria-label={`Chọn ảnh ${index + 1}: ${photo.alt}`} aria-pressed={selected} onClick={() => { onChange(photo); picker.close(); }} className={`overflow-hidden rounded-xl border-2 p-1 text-left ${selected ? "border-brand" : "border-slate-200 hover:border-brand dark:border-slate-700"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.alt || `Ảnh gợi ý ${index + 1}`} loading="lazy" className="h-36 w-full rounded-lg object-contain" />
                    <span className="mt-1 block truncate text-xs text-slate-500">{photo.photographer}</span>
                    <span className="block truncate text-xs text-slate-500">{photo.source === "commons" ? photo.license : "Pexels"}</span>
                  </button>;
                })}
              </div>
              <p role="status" className="my-4 text-center text-sm text-slate-500">{picker.busy ? "Đang tìm ảnh…" : picker.message}</p>
              {picker.cursor && <button type="button" disabled={picker.busy} onClick={() => void picker.search(picker.cursor)} className="w-full rounded-lg border border-brand px-4 py-3 text-sm text-brand disabled:opacity-50">{picker.busy ? "Đang tải…" : "Tải thêm ảnh"}</button>}
            </div>
            <div className="border-t border-slate-200 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-center dark:border-slate-800">
              <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 underline">Ảnh từ Wikimedia Commons</a>
            </div>
          </div>
        </div>, document.body
      )}
    </section>
  );
}
