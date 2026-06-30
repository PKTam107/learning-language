"use client";

import Link from "next/link";
import type { Deck } from "@/types";

interface DeckCardProps {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}

export function DeckCard({ deck, onEdit, onDelete }: DeckCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <Link href={`/decks/${deck.id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-slate-900 hover:text-brand">
            {deck.name}
          </h3>
          {deck.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
              {deck.description}
            </p>
          )}
        </Link>
        <div className="ml-2 flex shrink-0 gap-1">
          <button
            onClick={() => onEdit(deck)}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Sửa"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(deck)}
            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label="Xóa"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {deck.card_count ?? 0} từ
        </span>
        <Link
          href={`/study/${deck.id}`}
          className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Học ngay
        </Link>
      </div>
    </div>
  );
}
