"use client";

import type { Card } from "@/types";
import { AudioButton } from "./AudioButton";

/** Xem chi tiết 1 card đã lưu (read-only): phiên âm, audio US/UK, mọi nghĩa & ví dụ. */
export function CardDetail({ card }: { card: Card }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold">{card.term}</span>
        {card.phonetic && (
          <span className="text-slate-500">{card.phonetic}</span>
        )}
        {card.part_of_speech && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            {card.part_of_speech}
          </span>
        )}
        <AudioButton url={card.audio_us} label="US" />
        <AudioButton url={card.audio_uk} label="UK" />
      </div>

      {(card.phonetic_uk || card.phonetic_us) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
          {card.phonetic_uk && (
            <span>
              <span className="font-medium text-slate-400">UK</span>{" "}
              {card.phonetic_uk}
            </span>
          )}
          {card.phonetic_us && (
            <span>
              <span className="font-medium text-slate-400">US</span>{" "}
              {card.phonetic_us}
            </span>
          )}
        </div>
      )}

      {card.meaning_vi && (
        <p className="text-lg font-medium text-brand-dark">{card.meaning_vi}</p>
      )}

      {card.note && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="mb-0.5 block text-xs font-medium uppercase tracking-wide text-amber-600">
            Ghi chú
          </span>
          {card.note}
        </div>
      )}

      {card.definitions?.length > 0 && (
        <Section label="Các nghĩa">
          <ul className="space-y-2">
            {card.definitions.map((d, i) => (
              <li key={i} className="rounded-lg border border-slate-200 p-2 text-sm">
                {d.partOfSpeech && (
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {d.partOfSpeech}
                  </span>
                )}
                {d.definitionVi || d.definition}
                {d.definitionVi && (
                  <span className="block text-xs text-slate-400">
                    {d.definition}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {card.examples?.length > 0 && (
        <Section label="Ví dụ">
          <div className="space-y-2">
            {card.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-2 text-sm">
                <p className="italic">“{ex.text}”</p>
                {ex.textVi && (
                  <p className="mt-0.5 text-slate-500">→ {ex.textVi}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {!card.meaning_vi &&
        !card.definitions?.length &&
        !card.examples?.length && (
          <p className="text-sm text-slate-400">Thẻ này chưa có nghĩa/ví dụ.</p>
        )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      {children}
    </div>
  );
}
