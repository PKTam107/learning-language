import { useEffect, useRef, useState } from "react";
import type { CardImage } from "@/lib/card-image";
import type { ImageCursor, ImageSearchPage } from "@/lib/image-search";

export function useImageSearch(
  term: string,
  fetchPage: (query: string, cursor: ImageCursor | null) => Promise<ImageSearchPage>
) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(term);
  const [images, setImages] = useState<CardImage[]>([]);
  const [cursor, setCursor] = useState<ImageCursor | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const version = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    const requests = version;
    requests.current++;
    pending.current = false;
    setOpen(false);
    setQuery(term);
    setImages([]);
    setCursor(null);
    setMessage("");
    setBusy(false);
    return () => { requests.current++; };
  }, [term]);

  function changeQuery(value: string) {
    version.current++;
    pending.current = false;
    setQuery(value);
    setImages([]);
    setCursor(null);
    setMessage("");
    setBusy(false);
  }

  async function search(next: ImageCursor | null = null) {
    if (!query.trim() || pending.current) return;
    const request = ++version.current;
    pending.current = true;
    setBusy(true);
    setMessage("");
    if (!next) { setImages([]); setCursor(null); }
    try {
      const page = await fetchPage(query.trim(), next);
      if (request !== version.current) return;
      setImages((previous) => {
        const merged = new Map((next ? previous : []).map((photo) => [`${photo.source ?? "pexels"}-${photo.id}`, photo]));
        page.images.forEach((photo) => merged.set(`${photo.source ?? "pexels"}-${photo.id}`, photo));
        return [...merged.values()];
      });
      setCursor(page.nextCursor);
      if (!page.images.length) {
        setMessage(page.nextCursor
          ? "Chưa có ảnh phù hợp trong lượt này. Bấm Tải thêm ảnh hoặc đổi từ khóa."
          : next ? "Đã hết kết quả cho từ khóa này." : "Chưa có ảnh phù hợp. Thử từ khóa cụ thể hơn.");
      }
    } catch (error) {
      if (request === version.current) setMessage(error instanceof Error ? error.message : "Không tìm được ảnh.");
    } finally {
      if (request === version.current) { pending.current = false; setBusy(false); }
    }
  }

  function show() {
    setOpen(true);
    if (!images.length) void search();
  }

  function close() {
    version.current++;
    pending.current = false;
    setBusy(false);
    setOpen(false);
  }

  return { open, query, images, cursor, busy, message, changeQuery, search, show, close };
}
