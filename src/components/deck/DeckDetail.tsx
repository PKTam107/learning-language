"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Card, Deck } from "@/types";
import { createClient } from "@/lib/supabase/client";
import { fetchCards, deleteCard } from "@/lib/db/cards";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { AudioButton } from "@/components/flashcard/AudioButton";
import { QuickCreator } from "@/components/QuickCreator";

export function DeckDetail({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [{ data: deckData }, cardData] = await Promise.all([
      supabase.from("decks").select("*").eq("id", deckId).maybeSingle(),
      fetchCards(deckId),
    ]);
    setDeck(deckData as Deck | null);
    setCards(cardData);
    setLoading(false);
  }, [deckId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(card: Card) {
    if (!confirm(`Xóa từ "${card.term}"?`)) return;
    await deleteCard(card.id);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!deck) {
    return <p className="py-20 text-center text-slate-500">Không tìm thấy bộ thẻ.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{deck.name}</h1>
          {deck.description && (
            <p className="text-sm text-slate-500">{deck.description}</p>
          )}
          <p className="mt-1 text-sm text-slate-400">{cards.length} từ</p>
        </div>
        {cards.length > 0 && (
          <Link href={`/study/${deck.id}`}>
            <Button size="lg">Học ngay</Button>
          </Link>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          Chưa có từ nào. Bấm nút <strong>+</strong> góc dưới phải để thêm.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{card.term}</span>
                  {card.phonetic && (
                    <span className="text-sm text-slate-400">
                      {card.phonetic}
                    </span>
                  )}
                  <AudioButton url={card.audio_us} label="US" />
                </div>
                <p className="truncate text-sm text-slate-600">
                  {card.part_of_speech && (
                    <span className="mr-1 text-slate-400">
                      ({card.part_of_speech})
                    </span>
                  )}
                  {card.meaning_vi || "—"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(card)}
                className="shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Xóa từ"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}

      <QuickCreator defaultDeckId={deckId} onSaved={load} />
    </div>
  );
}
