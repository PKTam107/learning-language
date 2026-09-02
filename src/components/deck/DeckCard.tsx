"use client";

import Link from "next/link";
import type { Deck } from "@/types";
import { StatusBar } from "@/components/status/StatusBar";
import { Pencil, Trash2 } from "lucide-react";

interface DeckCardProps {
  deck: Deck;
  onEdit: (deck: Deck) => void;
  onDelete: (deck: Deck) => void;
}

export function DeckCard({ deck, onEdit, onDelete }: DeckCardProps) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <Link href={`/decks/${deck.id}`} className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100 hover:text-brand dark:hover:text-indigo-400">
            {deck.name}
          </h3>
          {deck.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
              {deck.description}
            </p>
          )}
        </Link>
        {/* Vùng chạm 40px: icon 16px với padding cũ chỉ ra ~28px, quá nhỏ cho
            ngón tay và hai nút lại nằm sát nhau (dễ bấm Xóa khi muốn Sửa). */}
        <div className="-mr-1.5 -mt-1.5 ml-1 flex shrink-0">
          <button
            onClick={() => onEdit(deck)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Sửa"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => onDelete(deck)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            aria-label="Xóa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {deck.stats && deck.stats.total > 0 && (
        <StatusBar stats={deck.stats} showLegend={false} className="mt-4" />
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="min-w-0 text-sm text-slate-500 dark:text-slate-400">
          {deck.card_count ?? 0} từ
          {deck.stats && deck.stats.total > 0 && (
            <> · {deck.stats.byStatus.easy} đã thuộc</>
          )}
          {deck.stats && deck.stats.due > 0 && (
            <span className="text-amber-600 dark:text-amber-400"> · {deck.stats.due} cần ôn</span>
          )}
        </span>
        <Link
          href={`/study/${deck.id}`}
          className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          Học ngay
        </Link>
      </div>
    </div>
  );
}
