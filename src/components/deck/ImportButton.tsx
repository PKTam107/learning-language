"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { DraftCard } from "@/types";
import { parseCardRows, TEMPLATE_HEADERS } from "@/lib/import/xlsx";
import { importCards } from "@/lib/db/cards";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

interface Props {
  deckId: string;
  /** Gọi sau khi import xong để tải lại danh sách thẻ. */
  onImported?: () => void;
}

/** Nút "Nhập Excel" + modal xem trước & xác nhận. */
export function ImportButton({ deckId, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(
    null
  );

  function reset() {
    setDrafts([]);
    setError(null);
    setResult(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    reset();
    setFileName(file.name);
    setOpen(true);
    try {
      const buf = await file.arrayBuffer();
      const parsed = parseCardRows(buf, "array");
      if (parsed.length === 0) {
        setError("Không đọc được từ nào trong file.");
      }
      setDrafts(parsed);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleConfirm() {
    if (drafts.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await importCards(deckId, drafts);
      setResult(res);
      onImported?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    reset();
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      ["example", "ví dụ", "/ɪɡˈzɑːmpəl/", "noun", "ghi chú tuỳ chọn"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "cards");
    XLSX.writeFile(wb, "linguacards-template.xlsx");
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        ⬆️ Nhập Excel
      </Button>

      <Modal open={open} onClose={close} title="Nhập từ vựng từ Excel">
        <div className="space-y-4">
          {result ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                Đã thêm <strong className="text-green-700">{result.inserted}</strong> từ
                {result.skipped > 0 && (
                  <>
                    {" "}
                    · bỏ qua{" "}
                    <strong className="text-amber-600">{result.skipped}</strong> từ
                    trùng
                  </>
                )}
                .
              </p>
              <div className="flex justify-end">
                <Button onClick={close}>Xong</Button>
              </div>
            </div>
          ) : (
            <>
              {fileName && (
                <p className="text-sm text-slate-500">
                  File: <span className="font-medium text-slate-700">{fileName}</span>
                </p>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}

              {drafts.length > 0 && (
                <>
                  <p className="text-sm text-slate-700">
                    Đọc được <strong>{drafts.length}</strong> từ. Xem trước:
                  </p>
                  <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                    {drafts.slice(0, 50).map((d, i) => (
                      <li key={i} className="px-3 py-2 text-sm">
                        <span className="font-semibold">{d.term}</span>
                        {d.partOfSpeech && (
                          <span className="ml-1 text-slate-400">({d.partOfSpeech})</span>
                        )}
                        {d.meaningVi && (
                          <span className="text-slate-600"> — {d.meaningVi}</span>
                        )}
                      </li>
                    ))}
                    {drafts.length > 50 && (
                      <li className="px-3 py-2 text-xs text-slate-400">
                        … và {drafts.length - 50} từ nữa
                      </li>
                    )}
                  </ul>
                  <p className="text-xs text-slate-400">
                    Từ đã tồn tại (trùng) trong bộ thẻ này sẽ được tự động bỏ qua.
                  </p>
                </>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-brand hover:underline"
                  type="button"
                >
                  ⬇️ Tải file mẫu
                </button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={close}>
                    Hủy
                  </Button>
                  <Button onClick={handleConfirm} disabled={busy || drafts.length === 0}>
                    {busy && <Spinner />}
                    Nhập {drafts.length > 0 ? `${drafts.length} từ` : ""}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
