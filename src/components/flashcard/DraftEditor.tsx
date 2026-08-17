"use client";

import { useState } from "react";
import type { DraftCard } from "@/types";
import { Input, Textarea } from "@/components/ui/Input";
import { AudioButton } from "./AudioButton";
import { CefrBadge, EnrichmentSections } from "./Enrichment";

interface DraftEditorProps {
  draft: DraftCard;
  onChange: (draft: DraftCard) => void;
}

/** Form sửa DraftCard trước khi lưu. Mọi trường đều editable. */
export function DraftEditor({ draft, onChange }: DraftEditorProps) {
  const set = (patch: Partial<DraftCard>) => onChange({ ...draft, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold">{draft.term}</span>
        <CefrBadge level={draft.cefrLevel} />
        {draft.phonetic && (
          <span className="text-slate-500 dark:text-slate-400">{draft.phonetic}</span>
        )}
        <AudioButton url={draft.audioUs} text={draft.term} label="US" />
        <AudioButton url={draft.audioUk} text={draft.term} label="UK" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Phiên âm UK">
          <Input
            value={draft.phoneticUk ?? ""}
            onChange={(e) => set({ phoneticUk: e.target.value })}
            placeholder="/…/"
          />
        </Field>
        <Field label="Phiên âm US">
          <Input
            value={draft.phoneticUs ?? ""}
            onChange={(e) => set({ phoneticUs: e.target.value })}
            placeholder="/…/"
          />
        </Field>
      </div>

      {draft.translationSkipped && (
        <p className="rounded-md bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Chưa cấu hình AI dịch (hoặc dịch lỗi) — nghĩa đang để tiếng Anh, bạn có
          thể tự sửa.
        </p>
      )}

      <Field label="Từ loại">
        <Input
          value={draft.partOfSpeech ?? ""}
          onChange={(e) => set({ partOfSpeech: e.target.value })}
          placeholder="noun / verb / adjective..."
        />
      </Field>

      <Field label="Nghĩa tiếng Việt (chính)">
        <Input
          value={draft.meaningVi ?? ""}
          onChange={(e) => set({ meaningVi: e.target.value })}
          placeholder="Nhập hoặc chọn nghĩa..."
        />
      </Field>

      {draft.definitions.length > 0 && (
        <Field label="Các nghĩa (chọn nhanh)">
          <div className="space-y-2">
            {draft.definitions.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => set({ meaningVi: d.definitionVi || d.definition })}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-left text-sm hover:border-brand hover:bg-brand-light dark:hover:bg-indigo-500/15"
              >
                <span className="mr-2 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {d.partOfSpeech}
                </span>
                {d.definitionVi || d.definition}
                {d.definitionVi && (
                  <span className="block text-xs text-slate-400 dark:text-slate-500">
                    {d.definition}
                  </span>
                )}
              </button>
            ))}
          </div>
        </Field>
      )}

      {draft.examples.length > 0 && (
        <Field label="Ví dụ">
          <div className="space-y-2">
            {draft.examples.map((ex, i) => (
              <div key={i} className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2 text-sm">
                <p className="italic">“{ex.text}”</p>
                {ex.textVi && (
                  <p className="mt-0.5 text-slate-500 dark:text-slate-400">→ {ex.textVi}</p>
                )}
              </div>
            ))}
          </div>
        </Field>
      )}

      {(draft.wordFamily?.length || draft.collocations?.length) && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-3">
          <EnrichmentSections
            wordFamily={draft.wordFamily}
            collocations={draft.collocations}
          />
        </div>
      )}

      <Field label="Ghi chú của bạn (tùy chọn)">
        <Textarea
          rows={2}
          value={draft.note ?? ""}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="Mẹo nhớ, ngữ cảnh dùng, collocation..."
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
