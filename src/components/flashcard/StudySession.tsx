"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, PartyPopper, Undo2 } from "lucide-react";
import type { CardStatus, CardWithProgress } from "@/types";
import {
  fetchCardsByIds,
  fetchCardsWithProgress,
  fetchDueQueueAllDecks,
  recordProgress,
  undoReview,
  type ReviewReceipt,
} from "@/lib/db/cards";
import { fetchWeakWords, WEAK_SESSION_SIZE } from "@/lib/db/weak";
import { resolvePolicy } from "@/lib/db/policy";
import { buildDueQueue, UNLIMITED, type QueuePolicy } from "@/lib/queue";
import { STATUS_META } from "@/lib/status";
import { MCQ_TYPES, REVIEW_TYPES, type ReviewType } from "@/lib/quiz";
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

/**
 * Nguồn thẻ của phiên học.
 *  - `deck`: một bộ thẻ — người dùng còn được chọn Mode (tất cả / hôm nay / chưa thuộc).
 *  - `due`: thẻ đến hạn trên **toàn tài khoản**, gộp mọi bộ thẻ.
 *  - `weak`: những từ bị đánh giá "Chưa thuộc" nhiều nhất.
 *
 * Với `due`/`weak` thì tập thẻ **đã là** lựa chọn rồi, nên màn chuẩn bị bỏ phần
 * chọn Mode và chỉ còn kiểu ôn / số thẻ / xáo trộn.
 */
export type StudySource =
  | { kind: "deck"; deckId: string }
  | { kind: "due" }
  | { kind: "weak" };


const SOURCE_META: Record<
  StudySource["kind"],
  { title: string; subtitle: string; empty: string }
> = {
  deck: {
    title: "Bắt đầu học",
    subtitle: "Chọn cách ôn tập.",
    empty: "Bộ thẻ này chưa có từ nào để học.",
  },
  due: {
    title: "Ôn hôm nay",
    subtitle: "Thẻ đến hạn ôn từ mọi bộ thẻ, gộp vào một phiên.",
    empty: "Hôm nay không còn thẻ nào đến hạn. Quay lại mai nhé!",
  },
  weak: {
    title: "Ôn từ hay quên",
    subtitle: "Những từ bạn đánh giá “Chưa thuộc” nhiều nhất.",
    empty:
      "Chưa có từ nào bị đánh giá “Chưa thuộc”. Học vài phiên rồi quay lại.",
  },
};
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

/** Một lượt đánh giá đã ghi, giữ lại để hoàn tác được. */
interface HistoryEntry {
  /** Vị trí thẻ trong hàng đợi — để quay lại đúng thẻ đó. */
  index: number;
  status: Assessed;
  /**
   * Lời hứa ghi tiến độ. Giữ nguyên promise (không await lúc đánh giá) để phiên
   * học không phải chờ mạng, nhưng hoàn tác vẫn có đủ ảnh chụp trạng thái cũ.
   */
  receipt: Promise<ReviewReceipt | null>;
}

export function StudySession({ source }: { source: StudySource }) {
  const [all, setAll] = useState<CardWithProgress[]>([]);
  const [policy, setPolicy] = useState<QueuePolicy>(UNLIMITED);
  /** Từ mới bị giữ lại vì hết hạn mức hôm nay (chỉ để thông báo). */
  const [heldBack, setHeldBack] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("setup");
  const [inited, setInited] = useState(false);

  // Tùy chọn phiên học
  const [mode, setMode] = useState<Mode>("all");
  const [reviewType, setReviewType] = useState<ReviewType>("flashcard");
  const [limit, setLimit] = useState(0);
  const [shuffle, setShuffle] = useState(false);

  const { settings, ready } = useSettings();

  // Trạng thái phiên đang chạy
  const [queue, setQueue] = useState<CardWithProgress[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [counts, setCounts] = useState<Record<Assessed, number>>({
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [undoing, setUndoing] = useState(false);
  /** Tăng sau mỗi lần hoàn tác để QuizCard mount lại → trả lời lại được. */
  const [attempt, setAttempt] = useState(0);

  // Tách ra giá trị nguyên thủy: `source` là object literal do page truyền vào
  // nên mỗi lần render là một object mới — phụ thuộc trực tiếp vào nó sẽ làm
  // useCallback đổi liên tục và effect nạp dữ liệu chạy vô hạn.
  const kind = source.kind;
  const deckId = source.kind === "deck" ? source.deckId : null;

  const load = useCallback(async () => {
    if (kind === "deck" && deckId) {
      // Cần cả hạn mức từ mới: chế độ "Ôn hôm nay" của một bộ thẻ cũng phải tôn
      // trọng hạn mức chung của tài khoản.
      const [cards, queuePolicy] = await Promise.all([
        fetchCardsWithProgress(deckId),
        resolvePolicy(settings.newPerDay),
      ]);
      setAll(cards);
      setPolicy(queuePolicy);
      return;
    }
    if (kind === "due") {
      const queue = await fetchDueQueueAllDecks(settings.newPerDay);
      setAll(queue.cards);
      setHeldBack(queue.newHeldBack);
      return;
    }
    // weak: xếp hạng theo số lần quên rồi lấy thẻ đầy đủ theo đúng thứ tự đó.
    const ranked = await fetchWeakWords(WEAK_SESSION_SIZE);
    setAll(await fetchCardsByIds(ranked.map((w) => w.cardId)));
  }, [kind, deckId, settings.newPerDay]);

  const meta = SOURCE_META[kind];
  // Đường thoát khỏi phiên: về đúng nơi người dùng vừa đi ra.
  const back =
    kind === "deck"
      ? { href: `/decks/${deckId}`, label: "Về bộ thẻ" }
      : kind === "weak"
        ? { href: "/weak", label: "Về danh sách" }
        : { href: "/dashboard", label: "Về trang chủ" };

  // Chờ cài đặt (hạn mức từ mới) nạp xong mới nạp thẻ, để không phải nạp hai lần.
  useEffect(() => {
    if (!ready) return;
    load().finally(() => setLoading(false));
  }, [load, ready]);

  const weakCount = useMemo(() => all.filter(isWeak).length, [all]);
  /** Hàng đợi hôm nay của bộ thẻ này (đã trừ hạn mức từ mới). */
  const dueQueue = useMemo(() => buildDueQueue(all, policy), [all, policy]);
  const dueCount = dueQueue.cards.length;

  // Mặc định chọn "Ôn hôm nay" khi có thẻ đến hạn (khuyến nghị spaced repetition).
  useEffect(() => {
    if (kind !== "deck" || inited || all.length === 0) return;
    setInited(true);
    if (dueCount > 0) setMode("due");
  }, [all, dueCount, inited, kind]);

  function start() {
    // Chỉ nguồn "deck" mới lọc theo Mode; due/weak đã được lọc từ lúc nạp.
    const pool =
      kind !== "deck"
        ? all
        : mode === "weak"
          ? all.filter(isWeak)
          : mode === "due"
            ? dueQueue.cards
            : all;
    let list = shuffle ? shuffleArr(pool) : orderCards(pool);
    if (limit > 0) list = list.slice(0, limit);
    setQueue(list);
    setIndex(0);
    setFlipped(false);
    setCounts({ hard: 0, good: 0, easy: 0 });
    setHistory([]);
    setPhase("studying");
  }

  function backToSetup() {
    setPhase("setup");
    setHistory([]);
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
      // Không await: lượt học không nên chờ mạng. Promise được giữ lại trong
      // history để hoàn tác có đủ ảnh chụp trạng thái cũ.
      const receipt = recordProgress(current.id, status).catch((e: unknown) => {
        console.warn("recordProgress:", (e as Error).message);
        return null;
      });
      setHistory((h) => [...h, { index, status, receipt }]);
      setCounts((c) => ({ ...c, [status]: c[status] + 1 }));
      next();
    },
    [current, index, next]
  );

  /**
   * Hoàn tác lượt đánh giá gần nhất: trả tiến độ + nhật ký ôn về trạng thái
   * trước đó rồi quay lại đúng thẻ đó. Bấm nhầm "Đã thuộc" không còn đẩy thẻ đi
   * cả tuần mà không sửa được.
   */
  const undo = useCallback(async () => {
    const last = history[history.length - 1];
    if (!last || undoing) return;
    setUndoing(true);
    try {
      const receipt = await last.receipt;
      if (receipt) await undoReview(receipt);
      setHistory((h) => h.slice(0, -1));
      setCounts((c) => ({
        ...c,
        [last.status]: Math.max(0, c[last.status] - 1),
      }));
      setIndex(last.index);
      setFlipped(false);
      setAttempt((a) => a + 1);
      setPhase("studying");
    } catch (e) {
      alert(`Không hoàn tác được: ${(e as Error).message}`);
    } finally {
      setUndoing(false);
    }
  }, [history, undoing]);

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

  // Hoàn tác bằng bàn phím — dùng được ở mọi kiểu ôn, kể cả màn tóm tắt.
  useEffect(() => {
    if (phase === "setup") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyZ" && e.code !== "Backspace") return;
      const el = e.target as HTMLElement | null;
      // Đang gõ từ trong ô nhập thì Backspace là xóa chữ, không phải hoàn tác.
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return;
      e.preventDefault();
      void undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, undo]);

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
        <p>{meta.empty}</p>
        <Link
          href={back.href}
          className="mt-3 inline-flex items-center gap-1 text-brand dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft size={16} />
          {back.label}
        </Link>
      </div>
    );
  }

  // ---------- Pha 1: Chọn chế độ ----------
  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-xl font-bold">{meta.title}</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {meta.subtitle}
        </p>

        {kind === "deck" ? (
          <div className="space-y-2">
            <ModeOption
              label="Ôn hôm nay"
              desc={
                dueQueue.newCount > 0
                  ? `${dueQueue.reviewCount} thẻ tới hạn + ${dueQueue.newCount} từ mới`
                  : "Thẻ đến hạn ôn (spaced repetition)"
              }
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
        ) : (
          /* due/weak: tập thẻ đã cố định, chỉ cho biết có bao nhiêu từ. */
          <div className="rounded-xl border border-brand/30 bg-brand-light/50 px-4 py-3 dark:bg-indigo-500/10">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <strong className="text-brand-dark dark:text-indigo-300">
                {all.length}
              </strong>{" "}
              từ trong phiên này.
            </p>
          </div>
        )}

        {(heldBack > 0 || dueQueue.newHeldBack > 0) && (
          <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Còn{" "}
            <strong>{kind === "deck" ? dueQueue.newHeldBack : heldBack}</strong>{" "}
            từ mới đang chờ tới lượt — hôm nay đã dùng hết hạn mức{" "}
            {settings.newPerDay} từ mới/ngày (đổi được trong{" "}
            <Link href="/settings" className="underline hover:text-brand">
              Cài đặt
            </Link>
            ).
          </p>
        )}

        <div className="mt-6">
          <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-400">Kiểu ôn</p>
          <div className="flex flex-wrap gap-2">
            {REVIEW_TYPES.map((rt) => {
              // Cả hai chiều trắc nghiệm đều cần đủ thẻ để dựng đáp án nhiễu.
              const disabled = MCQ_TYPES.includes(rt.value) && all.length < 4;
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
              kind === "deck" &&
              ((mode === "weak" && weakCount === 0) ||
                (mode === "due" && dueCount === 0))
            }
          >
            Bắt đầu
          </Button>
          <Link href={back.href} className="shrink-0">
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

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={backToSetup}>Học tiếp</Button>
          <Link href={back.href}>
            <Button variant="secondary">{back.label}</Button>
          </Link>
        </div>

        {/* Bấm nhầm ở thẻ cuối thì vẫn sửa được sau khi phiên đã kết thúc. */}
        {history.length > 0 && (
          <button
            onClick={() => void undo()}
            disabled={undoing}
            className="mx-auto mt-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand disabled:opacity-40 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            <Undo2 className="h-4 w-4" />
            Hoàn tác thẻ cuối
          </button>
        )}
      </div>
    );
  }

  // ---------- Pha 2: Đang học ----------
  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>
            Đang học: {index + 1}/{queue.length} từ
          </span>
          <span className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={() => void undo()}
                disabled={undoing}
                title="Hoàn tác lượt vừa đánh giá (Z)"
                className="inline-flex items-center gap-1 hover:text-brand disabled:opacity-40 dark:hover:text-indigo-400"
              >
                <Undo2 className="h-4 w-4" />
                Hoàn tác
              </button>
            )}
            <button onClick={backToSetup} className="hover:text-brand dark:hover:text-indigo-400">
              Thoát
            </button>
          </span>
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
          key={`${current.id}:${attempt}`}
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
