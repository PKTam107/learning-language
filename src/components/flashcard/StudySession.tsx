"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PartyPopper } from "lucide-react";
import type { CardStatus, CardWithProgress } from "@/types";
import { fetchCardsWithProgress, recordProgress } from "@/lib/db/cards";
import { STATUS_META, isDue } from "@/lib/status";
import { REVIEW_TYPES, type ReviewType } from "@/lib/quiz";
import { useSettings } from "@/lib/settings";
import { speak } from "@/lib/speak";
import { Button } from "@/components/ui/Button";
import { Confetti } from "@/components/ui/Confetti";
import { CountUp } from "@/components/ui/CountUp";
import { Spinner } from "@/components/ui/Spinner";
import { FlashcardFlip } from "./FlashcardFlip";
import { QuizCard } from "./QuizCard";

type Mode = "all" | "weak" | "due";
type Phase = "setup" | "studying" | "done";
/** Trạng thái người dùng gán khi đánh giá (3 nút). */
type Assessed = "hard" | "good" | "easy";

const statusOf = (c: CardWithProgress): CardStatus => c.progress?.status ?? "new";
const isWeak = (c: CardWithProgress) =>
  statusOf(c) === "new" || statusOf(c) === "hard";

/**
 * Ưu tiên thẻ chưa học / "hard" lên đầu; trong cùng một hạng thì theo thứ tự
 * đã thêm (cũ trước).
 *
 * Phần so sánh phải là **thứ tự toàn phần** — chỉ so `weight` thì mọi thẻ cùng
 * hạng đều "bằng nhau", và thứ tự cuối cùng rơi về thứ tự đầu vào. Bộ thẻ mới
 * toàn từ "Chưa học" thì cả hàm thành vô nghĩa, nên phiên "không xáo trộn"
 * trông y như đã xáo. Chốt thêm `id` vì thẻ nhập từ Excel dùng chung một
 * created_at (insert cả lô trong một câu lệnh).
 */
function orderCards(cards: CardWithProgress[]): CardWithProgress[] {
  const weight = (c: CardWithProgress) => {
    const s = statusOf(c);
    if (s === "hard") return 0;
    if (s === "new") return 1;
    if (s === "good") return 2;
    return 3; // easy
  };
  return [...cards].sort(
    (a, b) =>
      weight(a) - weight(b) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id)
  );
}

function shuffleArr<T>(a: T[]): T[] {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const LIMIT_OPTIONS = [0, 10, 20, 30, 50]; // 0 = tất cả

export function StudySession({ deckId }: { deckId: string }) {
  const [all, setAll] = useState<CardWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("setup");
  const [inited, setInited] = useState(false);

  // Tùy chọn phiên học
  const [mode, setMode] = useState<Mode>("all");
  const [reviewType, setReviewType] = useState<ReviewType>("flashcard");
  const [limit, setLimit] = useState(0);
  const [shuffle, setShuffle] = useState(false);

  const { settings } = useSettings();

  // Trạng thái phiên đang chạy
  const [queue, setQueue] = useState<CardWithProgress[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<Record<Assessed, number>>({
    hard: 0,
    good: 0,
    easy: 0,
  });

  const load = useCallback(() => {
    return fetchCardsWithProgress(deckId).then(setAll);
  }, [deckId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const weakCount = useMemo(() => all.filter(isWeak).length, [all]);
  const dueCount = useMemo(
    () => all.filter((c) => isDue(c.progress?.next_due_at)).length,
    [all]
  );

  // Mặc định chọn "Ôn hôm nay" khi có thẻ đến hạn (khuyến nghị spaced repetition).
  useEffect(() => {
    if (inited || all.length === 0) return;
    setInited(true);
    if (all.some((c) => isDue(c.progress?.next_due_at))) setMode("due");
  }, [all, inited]);

  function start() {
    const pool =
      mode === "weak"
        ? all.filter(isWeak)
        : mode === "due"
          ? all.filter((c) => isDue(c.progress?.next_due_at))
          : all;
    let list = shuffle ? shuffleArr(pool) : orderCards(pool);
    if (limit > 0) list = list.slice(0, limit);
    setQueue(list);
    setIndex(0);
    setFlipped(false);
    setCounts({ hard: 0, good: 0, easy: 0 });
    setPhase("studying");
  }

  function backToSetup() {
    setPhase("setup");
    setLoading(true);
    load().finally(() => setLoading(false)); // refresh trạng thái vừa cập nhật
  }

  const current = queue[index];

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => {
      if (i + 1 >= queue.length) {
        setPhase("done");
        return i;
      }
      return i + 1;
    });
  }, [queue.length]);

  const assess = useCallback(
    (status: Assessed) => {
      if (!current) return;
      void recordProgress(current.id, status).catch(() => {});
      setCounts((c) => ({ ...c, [status]: c[status] + 1 }));
      next();
    },
    [current, next]
  );

  // Kết quả câu ôn (trắc nghiệm/gõ/nghe): đúng → "good", sai → "hard".
  const handleQuizAnswer = useCallback(
    (correct: boolean) => assess(correct ? "good" : "hard"),
    [assess]
  );

  // Tự phát âm khi lật thẻ (chế độ lật thẻ) — nếu bật trong Cài đặt.
  useEffect(() => {
    if (phase !== "studying" || reviewType !== "flashcard") return;
    if (!flipped || !settings.autoSpeak || !current) return;
    speak({ url: current.audio_us, text: current.term, label: "US" });
    // Chỉ chạy khi trạng thái lật đổi (cùng thẻ) — không thêm `current`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, phase, reviewType, settings.autoSpeak]);

  // Phím tắt khi đang học (chỉ chế độ lật thẻ)
  useEffect(() => {
    if (phase !== "studying" || reviewType !== "flashcard") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["Digit1", "Digit2", "Digit3"].includes(e.code)) {
        const map: Record<string, Assessed> = {
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
  }, [phase, flipped, assess, next, reviewType]);

  const progressPct = useMemo(
    () => (queue.length ? Math.round((index / queue.length) * 100) : 0),
    [index, queue.length]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-slate-400 dark:text-slate-500">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (all.length === 0) {
    return (
      <div className="py-20 text-center text-slate-500 dark:text-slate-400">
        <p>Bộ thẻ này chưa có từ nào để học.</p>
        <Link
          href={`/decks/${deckId}`}
          className="mt-3 inline-flex items-center gap-1 text-brand dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft size={16} />
          Quay lại thêm từ
        </Link>
      </div>
    );
  }

  // ---------- Pha 1: Chọn chế độ ----------
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-xl font-bold">Bắt đầu học</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Chọn cách ôn tập.</p>

        <div className="space-y-2">
          <ModeOption
            label="Ôn hôm nay"
            desc="Thẻ đến hạn ôn (spaced repetition)"
            count={dueCount}
            active={mode === "due"}
            onClick={() => setMode("due")}
            disabled={dueCount === 0}
          />
          <ModeOption
            label="Ôn tất cả"
            desc="Toàn bộ từ trong bộ thẻ"
            count={all.length}
            active={mode === "all"}
            onClick={() => setMode("all")}
          />
          <ModeOption
            label="Chỉ từ chưa thuộc"
            desc="Từ chưa học hoặc đánh giá khó"
            count={weakCount}
            active={mode === "weak"}
            onClick={() => setMode("weak")}
            disabled={weakCount === 0}
          />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">Kiểu ôn</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TYPES.map((rt) => {
              const disabled = rt.value === "mcq" && all.length < 4;
              const active = reviewType === rt.value;
              return (
                <button
                  key={rt.value}
                  onClick={() => setReviewType(rt.value)}
                  disabled={disabled}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-40 ${
                    active
                      ? "border-brand bg-brand-light dark:bg-indigo-500/15 font-semibold text-brand-dark dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {rt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">Số thẻ/phiên</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-base dark:border-slate-700 sm:text-sm"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Tất cả" : n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
            />
            Xáo trộn
          </label>
        </div>

        <div className="mt-8 flex gap-3">
          <Button
            size="lg"
            className="flex-1"
            onClick={start}
            disabled={
              (mode === "weak" && weakCount === 0) ||
              (mode === "due" && dueCount === 0)
            }
          >
            Bắt đầu
          </Button>
          <Link href={`/decks/${deckId}`} className="shrink-0">
            <Button size="lg" variant="secondary">
              Thoát
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Pha 3: Tóm tắt ----------
  if (phase === "done") {
    const reviewed = counts.hard + counts.good + counts.easy;
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        {/* Chỉ ăn mừng khi thật sự có ôn — thoát ngay lúc đầu thì không bắn pháo. */}
        {reviewed > 0 && <Confetti />}

        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-brand/30">
          <PartyPopper className="h-9 w-9" />
        </span>

        <h2 className="mt-5 text-2xl font-bold">Hoàn thành phiên học!</h2>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Bạn đã ôn{" "}
          <CountUp
            value={reviewed}
            className="text-lg font-bold text-brand dark:text-indigo-300"
          />{" "}
          từ trong phiên này.
        </p>

        <div className="mx-auto mt-6 max-w-xs space-y-2 text-left">
          <SummaryRow status="hard" value={counts.hard} />
          <SummaryRow status="good" value={counts.good} />
          <SummaryRow status="easy" value={counts.easy} />
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={backToSetup}>Học tiếp</Button>
          <Link href={`/decks/${deckId}`}>
            <Button variant="secondary">Về bộ thẻ</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------- Pha 2: Đang học ----------
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4">
        <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Đang học: {index + 1}/{queue.length} từ
          </span>
          <button onClick={backToSetup} className="hover:text-brand dark:hover:text-indigo-400">
            Thoát
          </button>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {current && reviewType === "flashcard" && (
        <>
          <FlashcardFlip
            card={current}
            flipped={flipped}
            onFlip={() => setFlipped((f) => !f)}
          />

          <div className="mt-6">
            {flipped ? (
              <div className="grid grid-cols-3 gap-3">
                <Button
                  size="lg"
                  className="!px-2 !text-sm bg-red-500 text-white hover:bg-red-600 sm:!px-6 sm:!text-base"
                  onClick={() => assess("hard")}
                >
                  Chưa thuộc
                </Button>
                <Button
                  size="lg"
                  className="!px-2 !text-sm bg-amber-500 text-white hover:bg-amber-600 sm:!px-6 sm:!text-base"
                  onClick={() => assess("good")}
                >
                  Tạm nhớ
                </Button>
                <Button
                  size="lg"
                  className="!px-2 !text-sm bg-green-600 text-white hover:bg-green-700 sm:!px-6 sm:!text-base"
                  onClick={() => assess("easy")}
                >
                  Đã thuộc
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
        </>
      )}

      {current && reviewType !== "flashcard" && (
        <QuizCard
          key={current.id}
          card={current}
          pool={all}
          type={reviewType}
          autoSpeak={settings.autoSpeak}
          onAnswered={handleQuizAnswer}
        />
      )}
    </div>
  );
}

function ModeOption({
  label,
  desc,
  count,
  active,
  onClick,
  disabled,
}: {
  label: string;
  desc: string;
  count: number;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors disabled:opacity-40 ${
        active
          ? "border-brand bg-brand-light dark:bg-indigo-500/15"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${
          active ? "bg-brand text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SummaryRow({
  status,
  value,
}: {
  status: Assessed;
  value: number;
}) {
  const m = STATUS_META[status];
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2">
      <span className="inline-flex items-center gap-2 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
        <span className={m.text}>{m.label}</span>
      </span>
      <span className="font-semibold text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}
