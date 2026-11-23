"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchLearningCards, type LearningCard } from "@/lib/db/learning";
import { fetchDecks } from "@/lib/db/decks";
import { dictationSentences } from "@/lib/dictation";
import { ShadowingPractice } from "@/components/ShadowingExercise";
import { DictationExercise } from "@/components/DictationExercise";
import type { Deck } from "@/types";
export function DictationPractice({ speaking = false }: { speaking?: boolean }) {
  const [cards, setCards] = useState<LearningCard[] | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(""); setCards(null);
    Promise.all([fetchLearningCards(), fetchDecks()]).then(([rows, list]) => { if (alive) { setCards(rows); setDecks(list); } }).catch(() => { if (alive) setError("Chưa tải được kho từ. Kiểm tra kết nối rồi thử lại."); });
    return () => { alive = false; };
  }, [reload]);
  const sentences = useMemo(() => dictationSentences((cards ?? []).filter((card) => !deckId || card.deck_id === deckId)), [cards, deckId]);
  return <div className="space-y-5"><h1 className="text-2xl font-bold">{speaking ? "Luyện nói theo câu mẫu" : "Nghe chép chính tả"}</h1><p className="text-sm text-slate-500">Luyện bằng câu ví dụ trong kho thẻ, không cần tạo bài bằng AI. Giọng đọc tùy thiết bị.</p>
    <label className="block text-sm">Bộ thẻ<select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="mt-1 block w-full rounded-lg border bg-transparent p-2 dark:bg-slate-900"><option value="">Tất cả bộ thẻ tiếng Anh</option>{decks.filter((deck) => deck.source_language === "en").map((deck) => <option key={deck.id} value={deck.id}>{deck.name}</option>)}</select></label>
    {error ? <p role="alert">{error} <button onClick={() => setReload(reload + 1)} className="underline">Thử lại</button></p> : !cards ? <p role="status">Đang tải câu ví dụ…</p> : speaking ? <ShadowingPractice key={`${deckId}-${reload}`} sentences={sentences} /> : <DictationExercise key={`${deckId}-${reload}`} sentences={sentences} />}
  </div>;
}
