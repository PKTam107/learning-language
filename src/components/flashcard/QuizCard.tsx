"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Volume2, X } from "lucide-react";
import type { CardWithProgress } from "@/types";
import { buildCloze, buildMcq, checkCloze, checkTyped, type ReviewType } from "@/lib/quiz";
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
  // "Việt → Anh" dùng chung cơ chế trắc nghiệm, chỉ đảo chiều đề/đáp án.
  const isMcq = type === "mcq" || type === "mcq_reverse";
  const reverse = type === "mcq_reverse";
  const mcq = useMemo(
    () =>
      isMcq
        ? buildMcq(card, pool, reverse ? "meaningToTerm" : "termToMeaning")
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, type]
  );

  // Câu khoét chỗ trống dựng từ chính ví dụ của thẻ (không cần pool).
  const cloze = useMemo(
    () => (type === "cloze" ? buildCloze(card) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [card.id, type]
  );
  /** Ba kiểu gõ tay: gõ từ, nghe, điền chỗ trống. */
  const isTyped = !isMcq;

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
    if (isTyped) {
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
    reveal(
      cloze ? checkCloze(text, cloze, card.term) : checkTyped(text, card.term)
    );
  }

  const answered = result !== null;
  /**
   * Không dựng được câu hỏi cho thẻ này (thiếu thẻ làm nhiễu, hoặc không có ví
   * dụ chứa từ). Hiện thẳng đáp án để tự đánh giá — dựng câu hỏng còn tệ hơn.
   */
  const unbuildable = (isMcq && !mcq) || (type === "cloze" && !cloze);
  // Đáp án đúng để hiện lúc phản hồi: chỉ chiều nhận diện (mcq) mới là nghĩa
  // tiếng Việt; ba kiểu còn lại đáp án đều là từ tiếng Anh.
  const correctAnswer =
    type === "mcq" ? card.meaning_vi : (cloze?.answer ?? card.term);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
      {/* ----- Đề bài ----- */}
      {type === "mcq_reverse" ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Nghĩa
          </p>
          <p className="text-2xl font-bold text-brand-dark dark:text-indigo-300">
            {card.meaning_vi || "(không có nghĩa)"}
          </p>
          {!!card.part_of_speech && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              ({card.part_of_speech})
            </p>
          )}
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Chọn từ tiếng Anh đúng:
          </p>
        </div>
      ) : type === "mcq" ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{card.term}</p>
          {!!card.phonetic && (
            <p className="text-slate-500 dark:text-slate-400">{card.phonetic}</p>
          )}
          <AudioButton url={card.audio_us} text={card.term} label="US" />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Chọn nghĩa đúng:</p>
        </div>
      ) : type === "cloze" ? (
        <div className="flex flex-col gap-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Điền vào chỗ trống
          </p>
          {cloze ? (
            <p className="text-lg leading-8 text-slate-800 dark:text-slate-100">
              {cloze.before}
              <span
                className={`mx-0.5 inline-block min-w-[5rem] border-b-2 px-2 font-semibold ${
                  answered
                    ? result
                      ? "border-green-600 text-green-700 dark:text-green-400"
                      : "border-red-500 text-red-500"
                    : "border-brand text-transparent"
                }`}
              >
                {/* Trước khi trả lời vẫn phải chiếm chỗ, không thì câu bị co lại. */}
                {answered ? cloze.answer : "\u00a0"}
              </span>
              {cloze.after}
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">
              Thẻ này chưa có ví dụ chứa từ để khoét chỗ trống.
            </p>
          )}
          {/* Chỗ trống trong câu có thể điền được nhiều từ — nghĩa tiếng Việt
              chốt lại là đang hỏi từ nào. Đây là bài "dùng đúng từ trong ngữ
              cảnh", không phải bài đoán chữ. */}
          {!!card.meaning_vi && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gợi ý: {card.meaning_vi}
            </p>
          )}
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
        {isMcq && mcq ? (
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
        ) : unbuildable ? (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Không đủ dữ liệu để tạo câu hỏi. Đáp án:{" "}
            {type === "mcq" ? card.meaning_vi : card.term}
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
            {result ? "✓ Chính xác!" : `✗ Đáp án: ${correctAnswer}`}
          </p>
          {/* Chiều nhận diện đã hiện nghĩa ngay trong đáp án → không nhắc lại.
              Cloze thì nghĩa đã nằm ở phần gợi ý của đề. */}
          {type !== "mcq" && type !== "cloze" && !!card.meaning_vi && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{card.meaning_vi}</p>
          )}
          {!!cloze?.translation && (
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {cloze.translation}
            </p>
          )}
        </div>
      )}

      {/* ----- Hành động ----- */}
      <div className="mt-5">
        {!answered && isTyped && !unbuildable && (
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
        {!answered && unbuildable && (
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
