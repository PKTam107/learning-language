"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, ChevronRight, GraduationCap } from "lucide-react";
import {
  fetchWeakWords,
  WEAK_SESSION_SIZE,
  type WeakWord,
} from "@/lib/db/weak";
import { CefrBadge } from "@/components/flashcard/Enrichment";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

/**
 * "Bạn hay quên": các từ bị đánh giá "Chưa thuộc" nhiều nhất.
 * `limit` giới hạn số dòng; khi đủ `limit` sẽ hiện link "Xem tất cả".
 *
 * Kèm nút mở phiên ôn đúng những từ này — trước đây khối này chỉ để đọc, tức
 * app chỉ ra từ yếu của bạn rồi không cho làm gì với nó.
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
    /* min-w-0 là bắt buộc khi thẻ này nằm trong grid: grid item mặc định
    có min-width:auto nên KHÔNG co được xuống dưới min-content, mà bên trong có
    truncate (white-space:nowrap) làm min-content bằng cả chuỗi text → track bị
    nong rộng hơn viewport và cả trang tràn ngang. */
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          <Brain className="h-5 w-5 shrink-0 text-rose-500" />
          <span className="truncate">Bạn hay quên</span>
        </h2>
        {limit && words && words.length >= limit && (
          <Link
            href="/weak"
            className="inline-flex items-center text-sm text-brand dark:text-indigo-400 hover:underline"
          >
            Xem tất cả <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      {words === null ? (
        <div className="flex justify-center py-8 text-slate-400 dark:text-slate-500">
          <Spinner className="h-5 w-5" />
        </div>
      ) : words.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          Chưa có dữ liệu. Học vài phiên và đánh giá <strong>Chưa thuộc</strong>{" "}
          để biết từ nào bạn hay quên.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {words.map((w) => (
            <li key={w.cardId}>
              <Link
                href={`/decks/${w.deckId}`}
                className="flex items-center gap-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                      {w.term}
                    </span>
                    <CefrBadge level={w.cefrLevel} />
                    {w.partOfSpeech && (
                      <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                        {w.partOfSpeech}
                      </span>
                    )}
                  </div>
                  {w.meaningVi && (
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                      {w.meaningVi}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400"
                  title={`Quên ${w.hardCount}/${w.totalCount} lượt ôn`}
                >
                  quên {w.hardCount}×
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!!words?.length && (
        <Link href="/study/weak" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            <GraduationCap size={16} />
            {/* Ở trang chủ, `limit` khiến danh sách chỉ là bản xem trước (6
                dòng) nên KHÔNG biết tổng thật — không được suy số từ đó. Chỉ
                trang /weak (không limit) mới nêu con số. */}
            {limit
              ? "Ôn những từ này"
              : `Ôn ${Math.min(words.length, WEAK_SESSION_SIZE)} từ hay quên`}
          </Button>
        </Link>
      )}
    </div>
  );
}
