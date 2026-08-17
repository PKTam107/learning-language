"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Volume2, X } from "lucide-react";
import type { CardWithProgress } from "@/types";
import { buildMcq, checkTyped, type ReviewType } from "@/lib/quiz";
import { speak } from "@/lib/speak";
import { Button } from "@/components/ui/Button";
import { AudioButton } from "./AudioButton";

interface Props {
  card: CardWithProgress;
  /** Nguồn lấy đáp án nhiễu cho trắc nghiệm (toàn bộ thẻ trong deck). */
  pool: CardWithProgress[];
  type: Exclude<ReviewType, "flashcard">;
  autoSpeak: boolean;
  /** Gọi khi người dùng bấm "Câu tiếp" sau khi đã trả lời. */
  onAnswered: (correct: boolean) => void;
}

/** Một câu ôn dạng trắc nghiệm / gõ từ / nghe. Tự chấm rồi báo kết quả về cha. */
export function QuizCard({ card, pool, type, autoSpeak, onAnswered }: Props) {
  const mcq = useMemo(
    () => (type === "mcq" ? buildMcq(card, pool) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, type]
  );

  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const spokeRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const say = () =>
    speak({ url: card.audio_us, text: card.term, label: "US" });

  // Nghe: tự phát âm khi vào câu. Gõ: focus ô nhập.
  useEffect(() => {
    if (type === "listening" && !spokeRef.current) {
      spokeRef.current = true;
      say();
    }
    if (type === "typing" || type === "listening") {
      inputRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  function reveal(correct: boolean) {
    setResult(correct);
    if (autoSpeak) say();
  }

  function chooseMcq(i: number) {
    if (result !== null || !mcq) return;
    setSelected(i);
    reveal(i === mcq.answerIndex);
  }

  function submitText() {
    if (result !== null) return;
    reveal(checkTyped(text, card.term));
  }

  const answered = result !== null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* ----- Đề bài ----- */}
      {type === "mcq" ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{card.term}</p>
          {!!card.phonetic && (
            <p className="text-slate-500 dark:text-slate-400">{card.phonetic}</p>
          )}
          <AudioButton url={card.audio_us} text={card.term} label="US" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chọn nghĩa đúng:</p>
        </div>
      ) : type === "typing" ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Nghĩa
          </p>
          <p className="text-2xl font-bold text-brand-dark dark:text-indigo-300">
            {card.meaning_vi || "(không có nghĩa)"}
          </p>
          {!!card.part_of_speech && (
            <p className="text-sm text-slate-400 dark:text-slate-500">({card.part_of_speech})</p>
          )}
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Gõ lại từ tiếng Anh:</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <button
            type="button"
            onClick={say}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-light dark:bg-indigo-500/15 text-brand-dark dark:text-indigo-300 hover:bg-brand/20"
            aria-label="Nghe lại"
          >
            <Volume2 className="h-8 w-8" />
          </button>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Nghe rồi gõ lại từ
          </p>
        </div>
      )}

      {/* ----- Ô trả lời ----- */}
      <div className="mt-5">
        {type === "mcq" && mcq ? (
          <div className="space-y-2">
            {mcq.options.map((opt, i) => {
              const isAnswer = i === mcq.answerIndex;
              const isPicked = i === selected;
              return (
                <button
                  key={i}
                  onClick={() => chooseMcq(i)}
                  disabled={answered}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border p-4 text-left transition-colors ${
                    answered && isAnswer
                      ? "border-green-600 bg-green-50 dark:bg-green-500/10"
                      : answered && isPicked && !isAnswer
                        ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="text-slate-800 dark:text-slate-100">{opt}</span>
                  {answered && isAnswer && (
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                  )}
                  {answered && isPicked && !isAnswer && (
                    <X className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        ) : type === "mcq" ? (
          // Không dựng được trắc nghiệm cho thẻ này → hiện đáp án để tự đánh giá.
          <p className="text-center text-slate-500 dark:text-slate-400">
            Không đủ dữ liệu để tạo trắc nghiệm. Đáp án: {card.meaning_vi}
          </p>
        ) : (
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={answered}
            placeholder="Nhập từ..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitText();
            }}
            className={`w-full rounded-xl border px-4 py-3 text-center text-lg outline-none focus:border-brand ${
              answered
                ? result
                  ? "border-green-600 bg-green-50 dark:bg-green-500/10"
                  : "border-red-500 bg-red-50 dark:bg-red-500/10"
                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
            }`}
          />
        )}
      </div>

      {/* ----- Phản hồi ----- */}
      {answered && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-center ${
            result ? "bg-green-50 dark:bg-green-500/10" : "bg-red-50 dark:bg-red-500/10"
          }`}
        >
          <p
            className={`font-bold ${
              result ? "text-green-600 dark:text-green-400" : "text-red-500"
            }`}
          >
            {result ? "✓ Chính xác!" : `✗ Đáp án: ${card.term}`}
          </p>
          {type !== "mcq" && !!card.meaning_vi && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{card.meaning_vi}</p>
          )}
        </div>
      )}

      {/* ----- Hành động ----- */}
      <div className="mt-5">
        {!answered && type !== "mcq" && (
          <Button
            size="lg"
            className="w-full"
            onClick={submitText}
            disabled={text.trim().length === 0}
          >
            Kiểm tra
          </Button>
        )}
        {answered && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => onAnswered(!!result)}
          >
            Câu tiếp →
          </Button>
        )}
        {!answered && type === "mcq" && !mcq && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => onAnswered(false)}
          >
            Câu tiếp →
          </Button>
        )}
      </div>
    </div>
  );
}
