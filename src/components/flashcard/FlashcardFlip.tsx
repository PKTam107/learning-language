"use client";

import type { CardWithProgress } from "@/types";
import { AudioButton } from "./AudioButton";

interface FlashcardFlipProps {
  card: CardWithProgress;
  flipped: boolean;
  onFlip: () => void;
}

/** Thẻ lật: mặt trước = từ + phiên âm + audio; mặt sau = nghĩa + từ loại + ví dụ. */
export function FlashcardFlip({ card, flipped, onFlip }: FlashcardFlipProps) {
  return (
    <div
      className="flip-card h-80 w-full cursor-pointer select-none sm:h-96"
      onClick={onFlip}
      role="button"
      aria-label="Lật thẻ"
    >
      <div className={`flip-inner h-full w-full ${flipped ? "flipped" : ""}`}>
        {/* Mặt trước */}
        <div className="flip-face flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-center text-4xl font-bold sm:text-5xl">
            {card.term}
          </h2>
          {card.phonetic && (
            <p className="text-lg text-slate-500">{card.phonetic}</p>
          )}
          <div className="flex gap-2">
            <AudioButton url={card.audio_us} label="US" />
            <AudioButton url={card.audio_uk} label="UK" />
          </div>
          <p className="absolute bottom-4 text-xs text-slate-400">
            Nhấn để lật (Space)
          </p>
        </div>

        {/* Mặt sau */}
        <div className="flip-face flip-back flex h-full w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{card.term}</span>
            {card.part_of_speech && (
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {card.part_of_speech}
              </span>
            )}
          </div>
          {card.meaning_vi && (
            <p className="text-lg font-medium text-brand-dark">
              {card.meaning_vi}
            </p>
          )}

          {card.definitions?.length > 0 && (
            <ul className="space-y-1 text-sm text-slate-600">
              {card.definitions.slice(0, 3).map((d, i) => (
                <li key={i}>• {d.definitionVi || d.definition}</li>
              ))}
            </ul>
          )}

          {card.examples?.length > 0 && (
            <div className="mt-auto space-y-1 border-t border-slate-100 pt-2 text-sm">
              {card.examples.slice(0, 2).map((ex, i) => (
                <div key={i}>
                  <p className="italic text-slate-700">“{ex.text}”</p>
                  {ex.textVi && (
                    <p className="text-slate-400">→ {ex.textVi}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
