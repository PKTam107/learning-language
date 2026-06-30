"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CardStatus, CardWithProgress } from "@/types";
import { fetchCardsWithProgress, recordProgress } from "@/lib/db/cards";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FlashcardFlip } from "./FlashcardFlip";

/** Ưu tiên thẻ chưa học / "hard" lên đầu, phần còn lại giữ nguyên thứ tự. */
function orderCards(cards: CardWithProgress[]): CardWithProgress[] {
  const weight = (c: CardWithProgress) => {
    const s = c.progress?.status ?? "new";
    if (s === "hard") return 0;
    if (s === "new") return 1;
    if (s === "good") return 2;
    return 3; // easy
  };
  return [...cards].sort((a, b) => weight(a) - weight(b));
}

export function StudySession({ deckId }: { deckId: string }) {
  const [cards, setCards] = useState<CardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetchCardsWithProgress(deckId)
      .then((data) => setCards(orderCards(data)))
      .finally(() => setLoading(false));
  }, [deckId]);

  const current = cards[index];

  const next = useCallback(() => {
    setFlipped(false);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, cards.length]);

  const assess = useCallback(
    async (status: CardStatus) => {
      if (!current) return;
      // optimistic: chuyển thẻ ngay, ghi DB nền
      void recordProgress(current.id, status).catch(() => {});
      next();
    },
    [current, next]
  );

  // Phím tắt: Space lật; 1/2/3 đánh giá; ←/→ điều hướng
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["Digit1", "Digit2", "Digit3"].includes(e.code)) {
        const map: Record<string, CardStatus> = {
          Digit1: "hard",
          Digit2: "good",
          Digit3: "easy",
        };
        assess(map[e.code]);
      } else if (e.code === "ArrowRight") {
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, done, assess, next]);

  const progressPct = useMemo(
    () => (cards.length ? Math.round((index / cards.length) * 100) : 0),
    [index, cards.length]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="py-20 text-center text-slate-500">
        <p>Bộ thẻ này chưa có từ nào để học.</p>
        <Link href={`/decks/${deckId}`} className="mt-3 inline-block text-brand hover:underline">
          ← Quay lại thêm từ
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="py-20 text-center">
        <p className="text-2xl font-bold">🎉 Hoàn thành phiên học!</p>
        <p className="mt-2 text-slate-500">Bạn đã ôn {cards.length} từ.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            onClick={() => {
              setIndex(0);
              setFlipped(false);
              setDone(false);
            }}
          >
            Học lại
          </Button>
          <Link href={`/decks/${deckId}`}>
            <Button variant="secondary">Về bộ thẻ</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm text-slate-500">
          <span>
            Đang học: {index + 1}/{cards.length} từ
          </span>
          <Link href={`/decks/${deckId}`} className="hover:text-brand">
            Thoát
          </Link>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <FlashcardFlip
        card={current}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {/* Đánh giá — chỉ hiện sau khi lật */}
      <div className="mt-6">
        {flipped ? (
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="danger"
              size="lg"
              onClick={() => assess("hard")}
            >
              Chưa thuộc
              <span className="ml-1 hidden text-xs opacity-70 sm:inline">(1)</span>
            </Button>
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => assess("good")}
            >
              Tạm nhớ
              <span className="ml-1 hidden text-xs opacity-70 sm:inline">(2)</span>
            </Button>
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => assess("easy")}
            >
              Đã thuộc
              <span className="ml-1 hidden text-xs opacity-70 sm:inline">(3)</span>
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            variant="secondary"
            className="w-full"
            onClick={() => setFlipped(true)}
          >
            Hiện đáp án (Space)
          </Button>
        )}
      </div>
    </div>
  );
}
