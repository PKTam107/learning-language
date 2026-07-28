"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ChevronRight } from "lucide-react";
import { fetchWeakWords, type WeakWord } from "@/lib/db/weak";
import { CefrBadge } from "@/components/flashcard/Enrichment";
import { Spinner } from "@/components/ui/Spinner";

/**
 * "Bạn hay quên": các từ bị đánh giá "Chưa thuộc" nhiều nhất.
 * `limit` giới hạn số dòng; khi đủ `limit` sẽ hiện link "Xem tất cả".
 */
export function WeakWords({ limit }: { limit?: number }) {
  const [words, setWords] = useState<WeakWord[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchWeakWords(limit ?? 100).then((w) => {
      if (alive) setWords(w);
    });
    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Brain className="h-5 w-5 text-rose-500" /> Bạn hay quên
        </h2>
        {limit && words && words.length >= limit && (
          <Link
            href="/weak"
            className="inline-flex items-center text-sm text-brand hover:underline"
          >
            Xem tất cả <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {words === null ? (
        <div className="flex justify-center py-8 text-slate-400">
          <Spinner className="h-5 w-5" />
        </div>
      ) : words.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Chưa có dữ liệu. Học vài phiên và đánh giá <strong>Chưa thuộc</strong>{" "}
          để biết từ nào bạn hay quên.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {words.map((w) => (
            <li key={w.cardId}>
              <Link
                href={`/decks/${w.deckId}`}
                className="flex items-center gap-3 py-2.5 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-900">
                      {w.term}
                    </span>
                    <CefrBadge level={w.cefrLevel} />
                    {w.partOfSpeech && (
                      <span className="shrink-0 text-xs text-slate-400">
                        {w.partOfSpeech}
                      </span>
                    )}
                  </div>
                  {w.meaningVi && (
                    <p className="truncate text-sm text-slate-500">
                      {w.meaningVi}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600"
                  title={`Quên ${w.hardCount}/${w.totalCount} lượt ôn`}
                >
                  quên {w.hardCount}×
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
