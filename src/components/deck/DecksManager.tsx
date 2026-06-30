"use client";

import { useCallback, useEffect, useState } from "react";
import type { Deck } from "@/types";
import { fetchDecks, deleteDeck } from "@/lib/db/decks";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { DeckCard } from "./DeckCard";
import { DeckForm } from "./DeckForm";

interface DecksManagerProps {
  /** Hiển thị thanh thống kê phía trên (dùng ở dashboard). */
  showStats?: boolean;
}

export function DecksManager({ showStats }: DecksManagerProps) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Deck | null>(null);

  const load = useCallback(async () => {
    try {
      setDecks(await fetchDecks());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(deck: Deck) {
    if (
      !confirm(
        `Xóa bộ thẻ "${deck.name}"? Toàn bộ ${deck.card_count ?? 0} từ trong bộ sẽ bị xóa.`
      )
    )
      return;
    await deleteDeck(deck.id);
    load();
  }

  const totalCards = decks.reduce((s, d) => s + (d.card_count ?? 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div>
      {showStats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Bộ thẻ" value={decks.length} />
          <Stat label="Tổng số từ" value={totalCards} />
          <Stat label="Ngôn ngữ" value="EN → VI" />
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Bộ từ vựng của bạn</h2>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Tạo bộ thẻ
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center text-slate-500">
          <p>Chưa có bộ thẻ nào.</p>
          <p className="mt-1 text-sm">
            Tạo bộ thẻ đầu tiên, rồi bấm nút <strong>+</strong> để thêm từ.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onEdit={(d) => {
                setEditing(d);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <DeckForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        deck={editing}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
