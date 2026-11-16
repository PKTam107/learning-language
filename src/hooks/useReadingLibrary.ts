import { useCallback, useEffect, useRef, useState } from "react";
import type { ReadingStore, SavedReading } from "@/lib/reading-library";
import type { ReadingLesson } from "@/lib/reading";

export function useReadingLibrary(store: ReadingStore, lesson: ReadingLesson | null, answers: (number | null)[]) {
  const [items, setItems] = useState<SavedReading[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const current = useRef<SavedReading[]>([]);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let alive = true;
    store.load().then((loaded) => { if (alive) { current.current = loaded; setItems(loaded); setReady(true); } }).catch(() => { if (alive) setError("Chưa tải được bài đã lưu. Hãy mở lại màn hình để thử lại."); });
    return () => { alive = false; };
  }, [store]);
  const persist = useCallback((next: SavedReading[]) => {
    current.current = next; setItems(next);
    writes.current = writes.current.then(() => store.save(next)).then(() => setError("")).catch(() => setError("Chưa lưu được bài đọc trên thiết bị. Kiểm tra dung lượng và thử lưu lại."));
  }, [store]);
  useEffect(() => {
    if (!ready || !lesson) return;
    const entry = { lesson, answers, updatedAt: new Date().toISOString() };
    persist([entry, ...current.current.filter((item) => item.lesson.passage !== lesson.passage)].slice(0, 20));
  }, [ready, lesson, answers, persist]);
  const retry = () => { if (ready) persist(current.current); };
  return { items, ready, error, retry };
}
